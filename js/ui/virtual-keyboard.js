(function (global) {
    'use strict';

    const FAVORITES_STORAGE_KEY = 'virtualKeyboardFavorites';
    const CLASS_KEY_CUSTOM = 'key-has-custom-instrument';
    const CLASS_KEY_ACTIVE = 'is-active';
    const PANEL_HIDDEN_CLASS = 'is-hidden';

    function normalizeAssignments(assignments, validNotes) {
        if (!assignments || typeof assignments !== 'object') {
            return {};
        }
        const normalized = {};
        Object.entries(assignments).forEach(([note, instrumentKey]) => {
            if (!instrumentKey || typeof instrumentKey !== 'string') {
                return;
            }
            if (validNotes && !validNotes.includes(note)) {
                return;
            }
            normalized[note] = instrumentKey;
        });
        return normalized;
    }

    class VirtualKeyboard {
        constructor(options = {}) {
            this.container = options.container || null;
            this.wrapper = options.wrapper || (this.container ? this.container.closest('.virtual-keyboard') : null);
            this.app = options.app || null;
            this.soundfontManager = options.soundfontManager || global.soundfontManager || null;
            this.audioEngine = options.audioEngine || global.audioEngine || null;
            this.catalogManager = options.catalogManager || global.catalogManager || null;

            this.keys = new Map();
            this.assignments = {};
            this.activeNotes = new Set();
            this.favorites = [];

            this.configPanel = null;
            this.configSelect = null;
            this.configStatus = null;
            this.currentConfigNote = null;
            this.boundHandlePointerUp = null;
            this.boundHandleOutsideClick = null;
            this.boundHandleSoundfontReady = null;
            this.boundHandleCatalogReady = null;
            this.boundHandleSoundfontLoaded = null;

            this.favoritesPanel = null;
            this.favoritesList = null;
            this.favoriteNameInput = null;

            this.instrumentCatalog = this.buildInstrumentCatalog();
            
            // Listener para catálogo completo
            this.boundHandleCatalogReady = null;
            this.boundHandleInstrumentSelectorReady = null;

            if (typeof global.addEventListener === 'function') {
                this.boundHandleSoundfontReady = (event) => {
                    const manager = event && event.detail ? event.detail : null;
                    if (manager) {
                        this.setSoundfontManager(manager);
                    }
                };
                global.addEventListener('soundfont-manager-ready', this.boundHandleSoundfontReady);
                
                this.boundHandleCatalogReady = async () => {
                    if (this.soundfontManager) {
                        this.instrumentCatalog = await this.buildFullInstrumentCatalog();
                        if (this.configSelect) {
                            await this.populateConfigSelect();
                        }
                    }
                };
                global.addEventListener('soundfont-catalog-ready', this.boundHandleCatalogReady);
                
                // 🆕 Listener para quando o Instrument Selector estiver pronto
                this.boundHandleInstrumentSelectorReady = async () => {
                    if (this.configSelect) {
                        await this.populateConfigSelect();
                    }
                    // Atualizar labels das teclas com catálogo global
                    this.updateAllSoundfontLabels();
                };
                global.addEventListener('instrument-selector-ready', this.boundHandleInstrumentSelectorReady);
                
                // Listener para atualizar labels quando soundfont global mudar
                this.boundHandleSoundfontLoaded = () => {
                    this.updateAllSoundfontLabels();
                };
                global.addEventListener('soundfont-loaded', this.boundHandleSoundfontLoaded);
            }
        }

        buildInstrumentCatalog() {
            if (!this.soundfontManager || !this.soundfontManager.availableInstruments) {
                return { order: [], byCategory: new Map(), metadata: new Map() };
            }

            const byCategory = new Map();
            const metadata = new Map();
            const categoriesHelper = this.soundfontManager.instrumentCategories || null;
            const categoryRank = new Map();
            if (categoriesHelper) {
                categoriesHelper.getDisplayOrder().forEach((name, index) => {
                    if (!categoryRank.has(name)) {
                        categoryRank.set(name, index);
                    }
                });
            }

            Object.entries(this.soundfontManager.availableInstruments).forEach(([key, data]) => {
                const rawCategory = data.category || 'Instrumentos';
                const category = categoriesHelper ? categoriesHelper.normalizeCategory(rawCategory) : rawCategory;
                if (!byCategory.has(category)) {
                    byCategory.set(category, []);
                }
                const icon = data.icon || (categoriesHelper ? categoriesHelper.getCategoryIcon(category) : '🎵');
                byCategory.get(category).push({
                    key,
                    name: data.name || key,
                    icon
                });
                metadata.set(key, {
                    key,
                    name: data.name || key,
                    icon,
                    category,
                    categoryInfo: categoriesHelper ? categoriesHelper.getCategoryInfo(category) : null
                });
            });

            const order = Array.from(byCategory.keys());
            if (categoryRank.size) {
                order.sort((a, b) => {
                    const rankA = categoryRank.has(a) ? categoryRank.get(a) : Number.MAX_SAFE_INTEGER;
                    const rankB = categoryRank.has(b) ? categoryRank.get(b) : Number.MAX_SAFE_INTEGER;
                    if (rankA === rankB) {
                        return a.localeCompare(b, 'pt-BR');
                    }
                    return rankA - rankB;
                });
            } else {
                order.sort((a, b) => a.localeCompare(b, 'pt-BR'));
            }
            order.forEach(category => {
                byCategory.get(category).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            });

            return { order, byCategory, metadata };
        }
        
        /**
         * Constrói catálogo de instrumentos usando catalogManager (861 soundfonts completos)
         * Similar ao buildInstrumentEntries() do instrumentSelector.js
         */
        buildInstrumentCatalogFromCatalogManager() {
            if (!this.catalogManager) {
                console.warn('🚨 catalogManager não disponível, usando catálogo básico');
                return this.buildInstrumentCatalog();
            }

            console.log('📊 Construindo catálogo completo via catalogManager...');
            
            const byCategory = new Map();
            const metadata = new Map();
            const allEntries = [];
            
            // Obter todas as categorias
            const categories = this.catalogManager.getCategories();
            console.log(`📁 ${categories.length} categorias encontradas`);
            
            // Iterar por categorias → subcategorias → variações
            categories.forEach(category => {
                const subcategories = this.catalogManager.getSubcategories(category);
                
                subcategories.forEach(subcategory => {
                    const variations = this.catalogManager.getVariations(category, subcategory);
                    
                    variations.forEach((variation, variationIndex) => {
                        const key = variation.variable;
                        const displayName = `${subcategory}${variation.label ? ' - ' + variation.label : ''}`;
                        
                        allEntries.push({
                            key,
                            name: displayName,
                            category,
                            subcategory,
                            variation: variation,
                            variationLabel: variation.label || '',
                            variationIndex,
                            isCurated: variation.isCurated || false,
                            font: variation.font || 'Unknown'
                        });
                    });
                });
            });
            
            // 🔧 CORREÇÃO: Ordenar usando a mesma lógica do instrumentSelector.js
            // Para garantir numeração sequencial idêntica (1-861)
            allEntries.sort((a, b) => {
                // 1. Ordenar por ordem de categoria
                const orderA = this.getCategoryOrderValue(a.category);
                const orderB = this.getCategoryOrderValue(b.category);
                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                // 2. Tratamento especial para Baterias GM (ordenar por nota MIDI)
                if (a.category === 'Baterias GM' && b.category === 'Baterias GM') {
                    const midiA = parseInt(a.variation?.gmNote ?? a.variation?.midiNumber, 10) || 0;
                    const midiB = parseInt(b.variation?.gmNote ?? b.variation?.midiNumber, 10) || 0;
                    if (midiA !== midiB) {
                        return midiA - midiB;
                    }
                    // Subcategorizar por kit (soundfont)
                    const kitCompare = (a.variation?.soundfont || '').localeCompare(b.variation?.soundfont || '', 'pt-BR');
                    if (kitCompare !== 0) {
                        return kitCompare;
                    }
                } else {
                    // 3. Ordenar por subcategoria (nome do instrumento)
                    const nameCompare = (a.subcategory || '').localeCompare(b.subcategory || '', 'pt-BR');
                    if (nameCompare !== 0) {
                        return nameCompare;
                    }
                    // 4. Ordenar por soundfont
                    const soundfontCompare = (a.variation?.soundfont || '').localeCompare(b.variation?.soundfont || '', 'pt-BR');
                    if (soundfontCompare !== 0) {
                        return soundfontCompare;
                    }
                }

                // 5. Fallback: ordenar por índice de variação
                return (a.variationIndex || 0) - (b.variationIndex || 0);
            });
            
            // 🔧 SINCRONIZAÇÃO CRÍTICA: Buscar globalIndex do instrumentSelector
            // para garantir numeração IDÊNTICA em ambos os dropdowns
            console.log('🔄 Sincronizando globalIndex com instrumentSelector...');
            
            // Tentar acessar o catálogo global do instrumentSelector
            const instrumentSelectorCatalog = window.instrumentSelectorState?.catalogByKey || 
                                             globalThis.instrumentSelectorState?.catalogByKey;
            
            // 🔍 DIAGNÓSTICO: Verificar catálogo
            if (instrumentSelectorCatalog) {
                console.log(`📋 Catálogo global encontrado: ${instrumentSelectorCatalog.size} soundfonts`);
                // Mostrar primeiras 3 chaves para debug
                const firstKeys = Array.from(instrumentSelectorCatalog.keys()).slice(0, 3);
                console.log(`🔑 Primeiras chaves no catálogo global:`, firstKeys);
            } else {
                console.error('❌ Catálogo global NÃO encontrado! window.instrumentSelectorState não existe.');
            }
            
            let syncedCount = 0;
            let keyMismatches = [];
            
            allEntries.forEach((entry, index) => {
                // Tentar obter globalIndex do catálogo do instrumentSelector
                if (instrumentSelectorCatalog && instrumentSelectorCatalog.has(entry.key)) {
                    const catalogEntry = instrumentSelectorCatalog.get(entry.key);
                    if (catalogEntry && catalogEntry.globalIndex) {
                        entry.globalIndex = catalogEntry.globalIndex;
                        syncedCount++;
                        
                        // Debug para Clavinet especificamente
                        if (entry.name.includes('Clavinet')) {
                            console.log(`🎹 Clavinet sincronizado: ${entry.name} → globalIndex ${entry.globalIndex}`);
                        }
                    } else {
                        // Fallback: índice sequencial local
                        entry.globalIndex = index + 1;
                        if (entry.name.includes('Clavinet')) {
                            console.warn(`⚠️ Clavinet com catalogEntry inválido:`, catalogEntry);
                        }
                    }
                } else {
                    // Fallback: índice sequencial local (1-861)
                    entry.globalIndex = index + 1;
                    
                    // Guardar alguns casos de chave não encontrada para debug
                    if (keyMismatches.length < 5) {
                        keyMismatches.push({ name: entry.name, key: entry.key });
                    }
                }
            });
            
            if (syncedCount > 0) {
                console.log(`✅ ${syncedCount}/${allEntries.length} soundfonts sincronizados com instrumentSelector`);
            } else {
                console.error(`❌ Nenhum soundfont sincronizado - usando índices locais`);
            }
            
            if (keyMismatches.length > 0) {
                console.warn(`🔍 Exemplos de chaves não encontradas no catálogo global:`, keyMismatches);
            }
            
            // Agrupar por categoria
            allEntries.forEach(entry => {
                if (!byCategory.has(entry.category)) {
                    byCategory.set(entry.category, []);
                }
                
                const icon = this.getCategoryIcon(entry.category);
                
                byCategory.get(entry.category).push({
                    key: entry.key,
                    name: entry.name,
                    icon,
                    isCurated: entry.isCurated,
                    globalIndex: entry.globalIndex
                });
                
                metadata.set(entry.key, {
                    key: entry.key,
                    name: entry.name,
                    icon,
                    category: entry.category,
                    isCurated: entry.isCurated,
                    globalIndex: entry.globalIndex
                });
            });
            
            // 🔧 CORREÇÃO: Ordem de exibição das categorias usando mesma lógica do instrumentSelector
            const order = Array.from(byCategory.keys()).sort((a, b) => {
                return this.getCategoryOrderValue(a) - this.getCategoryOrderValue(b);
            });
            
            console.log(`✅ ${allEntries.length} soundfonts enumerados via catalogManager`);
            
            return { order, byCategory, metadata };
        }
        
        /**
         * Retorna ícone da categoria (similar ao instrumentSelector)
         */
        getCategoryIcon(category) {
            const icons = {
                'Pianos': '🎹',
                'Percussão Melódica': '🥁',
                'Órgãos': '🎼',
                'Guitarras': '🎸',
                'Baixos': '🎸',
                'Cordas': '🎻',
                'Vozes': '🎤',
                'Metais': '🎺',
                'Palhetas': '🎷',
                'Flautas': '🎶',
                'Synth Leads': '🎛️',
                'Synth Pads': '🌌',
                'Efeitos Ambientais': '✨',
                'Instrumentos Étnicos': '🌍',
                'Percussão Suave': '🔔',
                'Baterias GM': '🥁',
                'Sons da Natureza': '🌿'
            };
            return icons[category] || '🎵';
        }

        getCategoryOrderValue(category) {
            // 🔧 ORDEM IDÊNTICA ao instrumentSelector.js para garantir numeração sequencial correta
            const CATEGORY_DISPLAY_ORDER = [
                'Pianos',
                'Cordas',
                'Guitarras',
                'Baixos',
                'Órgãos',
                'Metais',
                'Palhetas',
                'Flautas',
                'Vozes',
                'Synth Pads',
                'Synth Leads',
                'Instrumentos Étnicos',
                'Efeitos Ambientais',
                'Sons da Natureza',
                'Percussão Melódica',
                'Percussão Suave',
                'Baterias GM'
            ];
            
            const orderIndex = CATEGORY_DISPLAY_ORDER.indexOf(category);
            return orderIndex === -1 ? CATEGORY_DISPLAY_ORDER.length : orderIndex;
        }
        
        async buildFullInstrumentCatalog() {
            if (!this.soundfontManager || typeof this.soundfontManager.getAllAvailableInstruments !== 'function') {
                return this.buildInstrumentCatalog();
            }
            
            const allInstruments = await this.soundfontManager.getAllAvailableInstruments();
            
            const byCategory = new Map();
            const metadata = new Map();
            const categoriesHelper = this.soundfontManager.instrumentCategories || null;
            const categoryRank = new Map();
            
            if (categoriesHelper) {
                categoriesHelper.getDisplayOrder().forEach((name, index) => {
                    categoryRank.set(name, index);
                });
            }
            
            allInstruments.forEach((data, key) => {
                const rawCategory = data.category || 'Instrumentos';
                const category = categoriesHelper ? categoriesHelper.normalizeCategory(rawCategory) : rawCategory;
                
                if (!byCategory.has(category)) {
                    byCategory.set(category, []);
                }
                
                const icon = data.icon || (categoriesHelper ? categoriesHelper.getCategoryIcon(category) : '🎵');
                const displayName = data.name || data.baseName || key;
                
                byCategory.get(category).push({
                    key,
                    name: displayName,
                    icon,
                    isCurated: data.isCurated || false,
                    globalIndex: data.globalIndex // 🆕 Preservar globalIndex para numeração
                });
                
                metadata.set(key, {
                    key,
                    name: displayName,
                    icon,
                    category,
                    isCurated: data.isCurated || false,
                    globalIndex: data.globalIndex, // 🆕 Preservar globalIndex
                    categoryInfo: categoriesHelper ? categoriesHelper.getCategoryInfo(category) : null
                });
            });
            
            // Ordenar categorias
            const order = Array.from(byCategory.keys());
            if (categoryRank.size) {
                order.sort((a, b) => {
                    const rankA = categoryRank.has(a) ? categoryRank.get(a) : Number.MAX_SAFE_INTEGER;
                    const rankB = categoryRank.has(b) ? categoryRank.get(b) : Number.MAX_SAFE_INTEGER;
                    if (rankA === rankB) {
                        return a.localeCompare(b, 'pt-BR');
                    }
                    return rankA - rankB;
                });
            } else {
                order.sort((a, b) => a.localeCompare(b, 'pt-BR'));
            }
            
            // Ordenar instrumentos dentro de cada categoria (curados primeiro)
            order.forEach(category => {
                const items = byCategory.get(category);
                items.sort((a, b) => {
                    if (a.isCurated && !b.isCurated) return -1;
                    if (!a.isCurated && b.isCurated) return 1;
                    return a.name.localeCompare(b.name, 'pt-BR');
                });
            });
            
            return { order, byCategory, metadata };
        }

        setSoundfontManager(manager) {
            if (!manager || manager === this.soundfontManager) {
                return;
            }

            this.soundfontManager = manager;
            
            // Aguardar carregamento do catálogo completo antes de rebuildar
            if (manager.fullCatalog) {
                this.rebuildCatalogAsync();
            } else {
                this.instrumentCatalog = this.buildInstrumentCatalog();
                if (this.configSelect) {
                    // Não usar await aqui pois não estamos em contexto async
                    this.populateConfigSelect();
                }
            }

            Object.keys(this.assignments).forEach(note => this.updateKeyVisual(note));
        }
        
        async rebuildCatalogAsync() {
            this.instrumentCatalog = await this.buildFullInstrumentCatalog();
            if (this.configSelect) {
                await this.populateConfigSelect();
            }
            Object.keys(this.assignments).forEach(note => this.updateKeyVisual(note));
        }

        init() {
            if (!this.container) {
                console.warn('VirtualKeyboard: container não encontrado.');
                return;
            }

            // 🆕 Priorizar catalogManager para ter lista completa de 861 soundfonts
            if (this.catalogManager) {
                console.log('🎹 VirtualKeyboard: usando catalogManager (861 soundfonts)');
                this.instrumentCatalog = this.buildInstrumentCatalogFromCatalogManager();
            } else {
                console.log('🎹 VirtualKeyboard: usando soundfontManager (fallback)');
                this.instrumentCatalog = this.buildInstrumentCatalog();
            }

            this.collectKeys();
            this.createConfigPanel();
            this.createFavoritesPanel();
            this.loadFavorites();
            this.renderFavorites();
            
            // 🔓 Inicializar botão de bloqueio de instrumentos rápidos
            this.initQuickInstrumentLockButton();

            if (!this.boundHandlePointerUp) {
                this.boundHandlePointerUp = () => this.releaseAllNotes();
            }
            document.addEventListener('mouseup', this.boundHandlePointerUp);
            document.addEventListener('touchend', this.boundHandlePointerUp);

            if (!this.boundHandleOutsideClick) {
                this.boundHandleOutsideClick = (event) => this.handleOutsideClick(event);
            }
            document.addEventListener('click', this.boundHandleOutsideClick);
            
            // 🔥 CORREÇÃO: Aguardar catálogo global antes de atualizar labels
            this.initializeSoundfontLabels();
        }

        async initializeSoundfontLabels() {
            // Aguardar catálogo global estar disponível (sem logs excessivos)
            const maxWaitTime = 3000; // 3 segundos
            const startTime = Date.now();

            const checkAndUpdate = () => {
                const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;

                if (globalState?.catalogByKey && globalState.catalogByKey.size > 0) {
                    this.updateAllSoundfontLabels();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed < maxWaitTime) {
                    setTimeout(checkAndUpdate, 200); // Verificar a cada 200ms
                } else {
                    // Fallback silencioso após timeout
                    this.updateAllSoundfontLabels();
                }
            };

            checkAndUpdate();
        }

        destroy() {
            if (this.boundHandlePointerUp) {
                document.removeEventListener('mouseup', this.boundHandlePointerUp);
                document.removeEventListener('touchend', this.boundHandlePointerUp);
            }
            if (this.boundHandleOutsideClick) {
                document.removeEventListener('click', this.boundHandleOutsideClick);
            }
            if (typeof global.removeEventListener === 'function' && this.boundHandleSoundfontReady) {
                global.removeEventListener('soundfont-manager-ready', this.boundHandleSoundfontReady);
            }
            if (typeof global.removeEventListener === 'function' && this.boundHandleCatalogReady) {
                global.removeEventListener('soundfont-catalog-ready', this.boundHandleCatalogReady);
            }
            if (typeof global.removeEventListener === 'function' && this.boundHandleSoundfontLoaded) {
                global.removeEventListener('soundfont-loaded', this.boundHandleSoundfontLoaded);
            }
            if (this.configPanel && this.configPanel.parentNode) {
                this.configPanel.parentNode.removeChild(this.configPanel);
            }
        }

        collectKeys() {
            const keyElements = this.container.querySelectorAll('.key[data-note]');
            keyElements.forEach(keyEl => {
                const note = keyEl.getAttribute('data-note');
                if (!note) {
                    return;
                }
                this.decorateKey(keyEl, note);
                this.keys.set(note, keyEl);
                this.bindKeyEvents(keyEl, note);
            });
        }

        decorateKey(keyEl, note) {
            if (!keyEl.querySelector('.vk-key-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'vk-key-indicator';
                indicator.setAttribute('aria-hidden', 'true');
                keyEl.appendChild(indicator);
            }

            if (!keyEl.querySelector('.vk-key-config')) {
                const configBtn = document.createElement('button');
                configBtn.type = 'button';
                configBtn.className = 'vk-key-config';
                configBtn.setAttribute('aria-label', `Personalizar instrumento da nota ${note}`);
                configBtn.innerHTML = '<span aria-hidden="true">⚙️</span>';
                configBtn.addEventListener('pointerdown', (event) => {
                    event.stopPropagation();
                });
                configBtn.addEventListener('touchstart', (event) => {
                    event.stopPropagation();
                }, { passive: true });
                configBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.openConfigPanel(note, keyEl);
                });
                keyEl.appendChild(configBtn);
            }
        }

        bindKeyEvents(keyEl, note) {
            const start = (event) => {
                if (event.type === 'mousedown' && event.button !== 0) {
                    return;
                }
                event.preventDefault();
                this.startNote(note);
            };

            const stop = (event) => {
                if (event) {
                    event.preventDefault();
                }
                this.stopNote(note);
            };

            keyEl.addEventListener('mousedown', start);
            keyEl.addEventListener('mouseup', stop);
            keyEl.addEventListener('mouseleave', stop);
            keyEl.addEventListener('touchstart', (event) => {
                start(event);
            }, { passive: false });
            keyEl.addEventListener('touchend', stop);
            keyEl.addEventListener('touchcancel', stop);
        }

        createConfigPanel() {
            if (this.configPanel) {
                return;
            }

            const panel = document.createElement('div');
            panel.className = 'vk-config-panel is-hidden';
            panel.innerHTML = `
                <div class="vk-config-header">
                    <h4 class="vk-config-title">Configurar tecla <span class="vk-config-note"></span></h4>
                    <button type="button" class="vk-config-close" aria-label="Fechar">×</button>
                </div>
                <div class="vk-config-body">
                    <label class="vk-config-label" for="vk-config-select">Instrumento para esta nota</label>
                    <select class="vk-config-select" id="vk-config-select">
                        <option value="">Usar instrumento principal</option>
                    </select>
                    <div class="vk-config-actions">
                        <button type="button" class="vk-config-preview">Pré-visualizar</button>
                        <button type="button" class="vk-config-clear">Remover personalizado</button>
                    </div>
                    <p class="vk-config-status" role="status" aria-live="polite"></p>
                </div>
            `;

            document.body.appendChild(panel);

            this.configPanel = panel;
            this.configSelect = panel.querySelector('.vk-config-select');
            this.configStatus = panel.querySelector('.vk-config-status');

            // 🔧 CORREÇÃO: Aguardar catálogo global estar pronto antes de popular
            this.waitForGlobalCatalogAndPopulate();

            panel.querySelector('.vk-config-close').addEventListener('click', () => this.closeConfigPanel());
            panel.querySelector('.vk-config-preview').addEventListener('click', () => this.previewCurrentSelection());
            panel.querySelector('.vk-config-clear').addEventListener('click', () => this.clearCurrentAssignment());
            this.configSelect.addEventListener('change', (event) => this.handleConfigSelection(event.target.value));

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !panel.classList.contains(PANEL_HIDDEN_CLASS)) {
                    this.closeConfigPanel();
                }
            });
        }

        async waitForGlobalCatalogAndPopulate() {
            // Aguardar catálogo global (sem logs excessivos)
            const maxWaitTime = 3000; // 3 segundos
            const startTime = Date.now();

            const checkAndPopulate = async () => {
                const globalCatalog = window.instrumentSelectorState?.catalogByKey || 
                                     globalThis.instrumentSelectorState?.catalogByKey;

                if (globalCatalog && globalCatalog.size > 0) {
                    await this.populateConfigSelect();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed < maxWaitTime) {
                    setTimeout(checkAndPopulate, 200); // Verificar a cada 200ms
                } else {
                    // Fallback silencioso
                    await this.populateConfigSelect();
                }
            };

            checkAndPopulate();
        }

        async populateConfigSelect() {
            if (!this.configSelect) {
                return;
            }

            // 🔥 CORREÇÃO DEFINITIVA: Usar catálogo DIRETO do instrumentSelector
            // NÃO criar catálogo próprio, garantindo numeração IDÊNTICA
            const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
            
            if (!globalState || !globalState.entries || globalState.entries.length === 0) {
                // Silencioso - aguarda evento 'instrument-selector-ready'
                return;
            }

            // ✅ USAR CATÁLOGO GLOBAL DO INSTRUMENTSELECTOR
            console.log(`✅ Usando catálogo global: ${globalState.entries.length} soundfonts`);
            
            const currentValue = this.configSelect.value;
            this.configSelect.innerHTML = '<option value="">Usar instrumento principal</option>';
            
            // Agrupar entries por categoria mantendo ordem original
            const byCategory = new Map();
            const categoryOrder = [];
            
            globalState.entries.forEach(entry => {
                const category = entry.category;
                if (!byCategory.has(category)) {
                    byCategory.set(category, []);
                    categoryOrder.push(category);
                }
                byCategory.get(category).push(entry);
            });
            
            const categoriesHelper = this.soundfontManager?.instrumentCategories;
            
            // Criar options usando a ordem e globalIndex do instrumentSelector
            categoryOrder.forEach(category => {
                const group = document.createElement('optgroup');
                
                if (categoriesHelper && typeof categoriesHelper.getCategoryInfo === 'function') {
                    const info = categoriesHelper.getCategoryInfo(category);
                    group.label = info?.icon ? `${info.icon} ${category}` : category;
                } else {
                    group.label = category;
                }
                
                const entries = byCategory.get(category) || [];
                entries.forEach(entry => {
                    const option = document.createElement('option');
                    
                    // ✅ USAR variation.variable como value (compatível com chave do Map)
                    option.value = entry.variation?.variable || entry.id;
                    
                    // ✅ USAR globalIndex do instrumentSelector (garantido ser 1-861 em ordem)
                    const numberPrefix = entry.globalIndex ? `${entry.globalIndex}. ` : '';
                    
                    // Montar label: pode vir como entry.label ou entry.subcategory
                    const displayName = entry.label || 
                                       `${entry.subcategory}${entry.variation?.label ? ' - ' + entry.variation.label : ''}`;
                    
                    // Destacar instrumentos curados
                    const curatedPrefix = entry.variation?.isCurated ? '⭐ ' : '';
                    
                    // Ícone da categoria
                    const icon = categoriesHelper?.getCategoryInfo?.(category)?.icon || '🎵';
                    
                    option.textContent = `${numberPrefix}${curatedPrefix}${icon} ${displayName}`;
                    
                    group.appendChild(option);
                });
                
                this.configSelect.appendChild(group);
            });

            if (currentValue) {
                this.configSelect.value = currentValue;
            }
            
            console.log(`✅ Dropdown populado com ${globalState.entries.length} soundfonts do catálogo global`);
        }        createFavoritesPanel() {
            if (!this.wrapper) {
                return;
            }

            const panel = document.createElement('section');
            panel.className = 'vk-favorites-panel';
            panel.innerHTML = `
                <header class="vk-favorites-header">
                    <h4>Combinações favoritas</h4>
                </header>
                <div class="vk-favorites-controls">
                    <input type="text" class="vk-favorite-name" placeholder="Nome da combinação" aria-label="Nome da combinação">
                    <button type="button" class="vk-save-favorite">Salvar combinação atual</button>
                </div>
                <ul class="vk-favorites-list" aria-live="polite"></ul>
                <p class="vk-favorites-empty">Nenhuma combinação favorita salva ainda.</p>
            `;

            this.wrapper.appendChild(panel);

            this.favoritesPanel = panel;
            this.favoritesList = panel.querySelector('.vk-favorites-list');
            this.favoriteNameInput = panel.querySelector('.vk-favorite-name');

            panel.querySelector('.vk-save-favorite').addEventListener('click', () => this.handleSaveFavorite());
            this.favoritesList.addEventListener('click', (event) => this.handleFavoriteAction(event));
        }

        openConfigPanel(note, keyEl) {
            if (!this.configPanel || !this.configSelect) {
                return;
            }

            this.currentConfigNote = note;
            const indicator = this.configPanel.querySelector('.vk-config-note');
            if (indicator) {
                indicator.textContent = note;
            }

            const currentInstrument = this.assignments[note] || '';
            this.configSelect.value = currentInstrument;
            this.updateConfigStatus('');

            const rect = keyEl.getBoundingClientRect();
            const panelRect = this.configPanel.getBoundingClientRect();
            const top = window.scrollY + rect.bottom + 12;
            let left = window.scrollX + rect.left + rect.width / 2 - panelRect.width / 2;
            left = Math.max(16, Math.min(left, window.scrollX + window.innerWidth - panelRect.width - 16));

            this.configPanel.style.top = `${top}px`;
            this.configPanel.style.left = `${left}px`;

            this.configPanel.classList.remove(PANEL_HIDDEN_CLASS);
        }

        closeConfigPanel() {
            if (this.configPanel) {
                this.configPanel.classList.add(PANEL_HIDDEN_CLASS);
                this.currentConfigNote = null;
            }
        }

        handleOutsideClick(event) {
            if (!this.configPanel || this.configPanel.classList.contains(PANEL_HIDDEN_CLASS)) {
                return;
            }

            if (this.configPanel.contains(event.target)) {
                return;
            }

            if (event.target.closest && event.target.closest('.vk-key-config')) {
                return;
            }

            this.closeConfigPanel();
        }

        async handleConfigSelection(instrumentKey) {
            if (!this.currentConfigNote) {
                return;
            }

            await this.setAssignment(this.currentConfigNote, instrumentKey || null, { showStatus: true });
        }

        async setAssignment(note, instrumentKey, options = {}) {
            const { showStatus = false } = options;
            const keyEl = this.keys.get(note);

            if (!instrumentKey) {
                delete this.assignments[note];
                this.updateKeyVisual(note);
                
                // 🔓 Atualizar botão de bloqueio
                this.updateLockButtonState();
                
                // 🆕 Sincronizar com Board Bells se estiver integrado
                this.notifyAssignmentChange();
                
                if (showStatus) {
                    this.updateConfigStatus('Instrumento padrão restaurado.');
                }
                return;
            }

            if (!this.soundfontManager) {
                console.warn('VirtualKeyboard: soundfontManager não disponível.');
                return;
            }

            if (showStatus) {
                this.updateConfigStatus('Carregando instrumento personalizado…');
            }

            // 🆕 CARREGAR INSTRUMENTO COM VALIDAÇÃO ROBUSTA
            const success = await this.soundfontManager.loadInstrument(instrumentKey, {
                setCurrent: false,
                clearKit: false
            });

            if (!success) {
                if (showStatus) {
                    this.updateConfigStatus('Não foi possível carregar este instrumento.', true);
                }
                return;
            }

            // 🆕 VALIDAR SE O PRESET ESTÁ REALMENTE PRONTO PARA USO
            const preset = this.soundfontManager.loadedSoundfonts.get(instrumentKey);
            if (!preset) {
                console.warn(`VirtualKeyboard: preset ${instrumentKey} não encontrado após carregamento`);
                if (showStatus) {
                    this.updateConfigStatus('Instrumento carregado, mas não está pronto.', true);
                }
                return;
            }

            // 🆕 Verificar se preset tem zones válidas
            if (!preset.zones || !Array.isArray(preset.zones) || preset.zones.length === 0) {
                console.warn(`VirtualKeyboard: preset ${instrumentKey} sem zones válidas. Estrutura:`, {
                    hasZones: !!preset.zones,
                    isArray: Array.isArray(preset.zones),
                    length: preset.zones ? preset.zones.length : 0
                });
                if (showStatus) {
                    this.updateConfigStatus('Instrumento inválido (sem zones).', true);
                }
                return;
            }

            // 🆕 Verificar se pelo menos uma zone tem buffer OU dados para decodificação futura
            // ✅ CORREÇÃO: Aceitar zones com sample/file (decodificação pendente) além de buffer
            const hasValidZones = preset.zones.some(zone => {
                if (!zone) return false;
                return zone.buffer || zone.sample || zone.file;
            });
            
            if (!hasValidZones) {
                console.warn(`VirtualKeyboard: preset ${instrumentKey} sem zones válidas (sem buffer/sample/file)`);
                if (showStatus) {
                    this.updateConfigStatus('Aguarde, instrumento ainda carregando…', true);
                }
                
                // Tentar esperar um pouco mais pela decodificação
                await new Promise(resolve => setTimeout(resolve, 800)); // Aumentado de 500ms para 800ms
                
                const hasValidZonesNow = preset.zones.some(zone => {
                    if (!zone) return false;
                    return zone.buffer || zone.sample || zone.file;
                });
                
                if (!hasValidZonesNow) {
                    console.warn(`VirtualKeyboard: preset ${instrumentKey} ainda sem zones válidas após espera adicional`);
                    if (showStatus) {
                        this.updateConfigStatus('Instrumento não pôde ser preparado.', true);
                    }
                    return;
                }
            }

            // 🆕 Log de sucesso com informações úteis
            const bufferedZones = preset.zones.filter(z => z && z.buffer).length;
            const totalZones = preset.zones.length;
            console.log(`✅ Preset ${instrumentKey} pronto: ${bufferedZones}/${totalZones} zones com buffer`);

            this.assignments[note] = instrumentKey;
            
            // � Atualizar botão de bloqueio
            this.updateLockButtonState();
            
            // �🔍 DEBUG: Log do assignment sendo adicionado
            console.log(`📝 Virtual Keyboard: Assignment adicionado`);
            console.log(`   Nota: ${note}`);
            console.log(`   Instrumento: ${instrumentKey}`);
            console.log(`   Total de assignments: ${Object.keys(this.assignments).length}`);
            console.log(`   Assignments atuais:`, { ...this.assignments });
            
            // ✅ CORREÇÃO: Atualizar todos os labels após configurar instrumento individual
            // Isso garante que as teclas sem assignment mostrem o soundfont global correto
            this.updateAllSoundfontLabels();
            
            // 🆕 Sincronizar com Board Bells se estiver integrado
            this.notifyAssignmentChange();
            
            if (showStatus) {
                // 🔥 CORREÇÃO: Buscar nome do catálogo global
                const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
                let name = instrumentKey;
                
                if (globalState?.catalogByKey) {
                    const globalEntry = globalState.catalogByKey.get(instrumentKey);
                    if (globalEntry) {
                        name = globalEntry.label || name;
                    }
                } else {
                    const instrumentMeta = this.instrumentCatalog.metadata.get(instrumentKey);
                    name = instrumentMeta ? instrumentMeta.name : instrumentKey;
                }
                
                this.updateConfigStatus(`Instrumento ${name} aplicado à nota ${note}.`);
            }

            if (keyEl) {
                keyEl.focus({ preventScroll: true });
            }
        }

        updateKeyVisual(note) {
            const keyEl = this.keys.get(note);
            if (!keyEl) {
                return;
            }

            const indicator = keyEl.querySelector('.vk-key-indicator');
            const soundfontLabel = keyEl.querySelector('.soundfont-label');
            const instrumentKey = this.assignments[note];

            if (instrumentKey) {
                // 🔥 CORREÇÃO: Buscar globalIndex do catálogo GLOBAL, não local
                const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
                const meta = this.instrumentCatalog.metadata.get(instrumentKey);
                
                // Tentar obter globalIndex do catálogo global primeiro
                let globalIndex = null;
                let displayName = meta ? meta.name : 'Instrumento personalizado';
                
                if (globalState?.catalogByKey) {
                    const globalEntry = globalState.catalogByKey.get(instrumentKey);
                    if (globalEntry) {
                        globalIndex = globalEntry.globalIndex;
                        displayName = globalEntry.label || displayName;
                    }
                } else if (meta) {
                    // Fallback: usar globalIndex local se global não disponível
                    globalIndex = meta.globalIndex;
                }
                
                const icon = meta ? meta.icon : '⭐';
                keyEl.classList.add(CLASS_KEY_CUSTOM);
                keyEl.setAttribute('data-instrument-key', instrumentKey);
                if (indicator) {
                    indicator.textContent = icon;
                    indicator.title = displayName;
                    indicator.classList.add('is-visible');
                }
                // 🆕 Atualiza o label COM NUMERAÇÃO do instrumento personalizado
                if (soundfontLabel) {
                    const numberPrefix = globalIndex ? `${globalIndex}. ` : '';
                    soundfontLabel.textContent = `${numberPrefix}${displayName}`;
                    soundfontLabel.title = `${numberPrefix}${displayName}`; // Tooltip com nome completo e número
                }
            } else {
                keyEl.classList.remove(CLASS_KEY_CUSTOM);
                keyEl.removeAttribute('data-instrument-key');
                if (indicator) {
                    indicator.textContent = '';
                    indicator.title = '';
                    indicator.classList.remove('is-visible');
                }
                // 🔥 CORREÇÃO: Usar updateKeyVisualCompact para manter padrão visual
                const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
                
                if (globalState?.currentId && globalState.catalogByKey) {
                    // Buscar do catálogo GLOBAL ativo
                    const globalEntry = globalState.catalogByKey.get(globalState.currentId);
                    if (globalEntry) {
                        const number = globalEntry.globalIndex || '?';
                        const icon = globalEntry.icon || '🎹';
                        const displayName = globalEntry.label || 'Soundfont';
                        this.updateKeyVisualCompact(keyEl, number, icon, displayName);
                    }
                } else if (this.soundfontManager) {
                    // Fallback: usar soundfontManager (pode estar desatualizado)
                    const globalSoundfont = this.soundfontManager.getCurrentSoundfontName();
                    let globalIndex = this.soundfontManager.getCurrentSoundfontIndex();
                    
                    // Tentar buscar do catálogo global pelo currentInstrument
                    if (globalState?.catalogByKey && this.soundfontManager.currentInstrument) {
                        const globalEntry = globalState.catalogByKey.get(this.soundfontManager.currentInstrument);
                        if (globalEntry) {
                            globalIndex = globalEntry.globalIndex;
                        }
                    }
                    
                    const number = globalIndex || '?';
                    const icon = '🎹';
                    this.updateKeyVisualCompact(keyEl, number, icon, globalSoundfont || 'Soundfont');
                }
            }
        }

        /**
         * Atualiza os labels de soundfont em todas as teclas
         * Mostra apenas o NÚMERO do soundfont e adiciona o ÍCONE no topo
         */
        updateAllSoundfontLabels() {
            const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
            
            this.keys.forEach((keyEl, note) => {
                const soundfontLabel = keyEl.querySelector('.soundfont-label');
                if (!soundfontLabel) return;
                
                // Se a tecla tem instrumento personalizado, manter o nome dele
                const instrumentKey = this.assignments[note];
                if (instrumentKey) {
                    // 🔥 CORREÇÃO: Buscar do catálogo GLOBAL primeiro
                    let globalIndex = null;
                    let displayName = 'Instrumento personalizado';
                    let icon = '⭐';
                    
                    if (globalState?.catalogByKey) {
                        const globalEntry = globalState.catalogByKey.get(instrumentKey);
                        if (globalEntry) {
                            globalIndex = globalEntry.globalIndex;
                            displayName = globalEntry.label || displayName;
                            icon = globalEntry.icon || icon;
                        }
                    }
                    
                    // Fallback: catálogo local
                    if (!globalIndex) {
                        const meta = this.instrumentCatalog.metadata.get(instrumentKey);
                        if (meta) {
                            globalIndex = meta.globalIndex;
                            displayName = meta.name;
                            icon = meta.icon || icon;
                        }
                    }
                    
                    // ✨ NOVO VISUAL: Apenas número + ícone no topo
                    const number = globalIndex || '?';
                    this.updateKeyVisualCompact(keyEl, number, icon, displayName);
                } else {
                    // 🔥 CORREÇÃO: Buscar globalIndex do catálogo GLOBAL para soundfont padrão
                    if (globalState?.currentId && globalState.catalogByKey) {
                        // Usar catálogo GLOBAL ativo
                        const globalEntry = globalState.catalogByKey.get(globalState.currentId);
                        if (globalEntry) {
                            const number = globalEntry.globalIndex || '?';
                            const icon = globalEntry.icon || '🎹';
                            const displayName = globalEntry.label || 'Soundfont';
                            this.updateKeyVisualCompact(keyEl, number, icon, displayName);
                        } else {
                            // Não encontrado no catálogo global
                            soundfontLabel.textContent = '';
                            soundfontLabel.title = '';
                        }
                    } else if (this.soundfontManager) {
                        // Fallback: usar soundfontManager (pode estar desatualizado)
                        const currentInstrumentKey = this.soundfontManager.currentInstrument;
                        let globalSoundfont = this.soundfontManager.getCurrentSoundfontName();
                        let globalIndex = null;
                        let icon = '🎹';
                        
                        // Tentar buscar globalIndex do catálogo global pelo currentInstrument
                        if (globalState?.catalogByKey && currentInstrumentKey) {
                            const globalEntry = globalState.catalogByKey.get(currentInstrumentKey);
                            if (globalEntry) {
                                globalIndex = globalEntry.globalIndex;
                                globalSoundfont = globalEntry.label || globalSoundfont;
                                icon = globalEntry.icon || icon;
                            }
                        }
                        
                        // Último fallback: usar método antigo do soundfontManager
                        if (!globalIndex) {
                            globalIndex = this.soundfontManager.getCurrentSoundfontIndex();
                        }
                        
                        // ✨ NOVO VISUAL: Apenas número + ícone no topo
                        const number = globalIndex || '?';
                        this.updateKeyVisualCompact(keyEl, number, icon, globalSoundfont || 'Soundfont');
                    }
                }
            });
        }
        
        /**
         * ✨ NOVO: Atualiza visual compacto da tecla (apenas número + ícone)
         * @param {HTMLElement} keyEl - Elemento da tecla
         * @param {string|number} number - Número do soundfont
         * @param {string} icon - Ícone do instrumento
         * @param {string} fullName - Nome completo (para tooltip)
         */
        updateKeyVisualCompact(keyEl, number, icon, fullName) {
            const soundfontLabel = keyEl.querySelector('.soundfont-label');
            if (!soundfontLabel) return;
            
            // Criar ou atualizar estrutura HTML
            let iconSpan = keyEl.querySelector('.soundfont-icon');
            let numberSpan = keyEl.querySelector('.soundfont-number');
            
            if (!iconSpan) {
                iconSpan = document.createElement('span');
                iconSpan.className = 'soundfont-icon';
                keyEl.insertBefore(iconSpan, soundfontLabel);
            }
            
            if (!numberSpan) {
                numberSpan = document.createElement('span');
                numberSpan.className = 'soundfont-number';
                soundfontLabel.appendChild(numberSpan);
            }
            
            // Atualizar conteúdo
            iconSpan.textContent = icon;
            iconSpan.title = fullName;
            numberSpan.textContent = number;
            soundfontLabel.title = `${number}. ${fullName}`;
            
            // Limpar texto direto (manter apenas dentro do span)
            Array.from(soundfontLabel.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = '';
                }
            });
        }

        updateConfigStatus(message, isError = false) {
            if (!this.configStatus) {
                return;
            }
            this.configStatus.textContent = message;
            this.configStatus.classList.toggle('is-error', !!isError);
        }

        /**
         * 🆕 Notifica Board Bells sobre mudanças nos assignments
         * Chamado quando um instrumento é atribuído ou removido de uma tecla
         */
        notifyAssignmentChange() {
            // 🔍 DEBUG: Log antes de notificar
            const assignmentsCount = Object.keys(this.assignments).length;
            console.log(`🔔 Virtual Keyboard: Notificando mudança nos assignments`);
            console.log(`   Total de assignments: ${assignmentsCount}`);
            console.log(`   Assignments completos:`, { ...this.assignments });
            
            // Notificar via evento global para qualquer dispositivo MIDI interessado
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                const event = new CustomEvent('virtual-keyboard-assignment-changed', {
                    detail: { assignments: this.assignments }
                });
                window.dispatchEvent(event);
                console.log(`   ✅ Evento 'virtual-keyboard-assignment-changed' disparado`);
            }
            
            // Se houver referência direta ao midiDeviceManager, sincronizar diretamente
            if (window.midiDeviceManager && window.midiDeviceManager.syncBoardBellsAssignments) {
                console.log(`   🔄 Chamando midiDeviceManager.syncBoardBellsAssignments()`);
                window.midiDeviceManager.syncBoardBellsAssignments(this.assignments);
            }
        }

        previewCurrentSelection() {
            if (!this.currentConfigNote) {
                return;
            }

            const instrumentKey = this.configSelect ? this.configSelect.value : '';
            const key = instrumentKey || this.assignments[this.currentConfigNote] || null;

            if (this.soundfontManager && key) {
                this.soundfontManager.playNoteWithInstrument(this.currentConfigNote, key, 1.2, 0.8);
            } else if (this.soundfontManager) {
                this.soundfontManager.playNote(this.currentConfigNote, 1.0, 0.8);
            }
        }

        clearCurrentAssignment() {
            if (!this.currentConfigNote) {
                return;
            }
            this.configSelect.value = '';
            this.setAssignment(this.currentConfigNote, null, { showStatus: true });
        }

        startNote(note) {
            if (this.activeNotes.has(note)) {
                return;
            }

            const keyEl = this.keys.get(note);
            if (!keyEl) {
                return;
            }

            const instrumentKey = this.assignments[note] || null;

            // 🆕 VALIDAR INSTRUMENTO PERSONALIZADO ANTES DE TOCAR
            if (instrumentKey && this.soundfontManager) {
                const preset = this.soundfontManager.loadedSoundfonts.get(instrumentKey);
                
                // Se o preset não está carregado ou não está pronto, usar instrumento padrão
                if (!preset || !preset.zones || preset.zones.length === 0) {
                    console.warn(`VirtualKeyboard: instrumento ${instrumentKey} não está pronto, usando padrão`);
                    // Tocar com instrumento padrão
                    if (this.app && typeof this.app.startNote === 'function') {
                        this.app.startNote(note, keyEl, null);
                    } else if (this.soundfontManager) {
                        this.soundfontManager.startSustainedNote(note, 1.0);
                    }
                    
                    keyEl.classList.add(CLASS_KEY_ACTIVE);
                    this.activeNotes.add(note);
                    return;
                }
                
                // Verificar se tem pelo menos um buffer válido
                const hasBuffer = preset.zones.some(zone => zone && zone.buffer);
                if (!hasBuffer) {
                    console.warn(`VirtualKeyboard: preset ${instrumentKey} sem buffers, usando padrão`);
                    // Tocar com instrumento padrão
                    if (this.app && typeof this.app.startNote === 'function') {
                        this.app.startNote(note, keyEl, null);
                    } else if (this.soundfontManager) {
                        this.soundfontManager.startSustainedNote(note, 1.0);
                    }
                    
                    keyEl.classList.add(CLASS_KEY_ACTIVE);
                    this.activeNotes.add(note);
                    return;
                }
            }

            if (this.app && typeof this.app.startNote === 'function') {
                this.app.startNote(note, keyEl, instrumentKey);
            } else if (this.soundfontManager) {
                if (instrumentKey) {
                    this.soundfontManager.startSustainedNoteWithInstrument(note, instrumentKey, 1.0);
                } else {
                    this.soundfontManager.startSustainedNote(note, 1.0);
                }
            }

            keyEl.classList.add(CLASS_KEY_ACTIVE);
            this.activeNotes.add(note);
        }

        stopNote(note) {
            if (!this.activeNotes.has(note)) {
                return;
            }

            const keyEl = this.keys.get(note);
            if (this.app && typeof this.app.stopNote === 'function') {
                this.app.stopNote(note, keyEl || null);
            } else if (this.soundfontManager) {
                // Sem app: rely on soundfontManager for fallback (não há noteId isolado)
                this.soundfontManager.stopSustainedNoteByNote?.(note);
            }

            if (keyEl) {
                keyEl.classList.remove(CLASS_KEY_ACTIVE);
            }

            this.activeNotes.delete(note);
        }

        /**
         * 🆕 INTEGRAÇÃO BOARD BELLS → VIRTUAL KEYBOARD
         * Método público para dispositivos MIDI acionarem teclas do Virtual Keyboard
         * 
         * @param {string} noteName - Nome da nota (ex: 'C4', 'D#3')
         * @param {number} velocity - Velocity normalizado (0.0 a 1.0)
         * @param {string} source - Identificador da origem (ex: 'board-bells', 'midi-controller')
         */
        pressKey(noteName, velocity = 1.0, source = 'external') {
            console.log(`🎹 Virtual Keyboard: pressKey('${noteName}', ${velocity}, '${source}')`);
            
            // Validar nota
            if (!noteName || typeof noteName !== 'string') {
                console.error('❌ pressKey: noteName inválido', noteName);
                return;
            }
            
            // Verificar se já está ativa
            if (this.activeNotes.has(noteName)) {
                console.warn(`⚠️ pressKey: nota ${noteName} já está ativa`);
                return;
            }
            
            // Verificar se a tecla existe no teclado
            const keyEl = this.keys.get(noteName);
            if (!keyEl) {
                console.warn(`⚠️ pressKey: tecla ${noteName} não encontrada no Virtual Keyboard`);
                return;
            }
            
            // Obter instrumento personalizado (se configurado)
            const instrumentKey = this.assignments[noteName] || null;
            
            // Log detalhado
            if (instrumentKey) {
                console.log(`   ↳ Instrumento personalizado: ${instrumentKey}`);
            } else {
                console.log(`   ↳ Instrumento padrão (global)`);
            }
            
            // Tocar áudio
            try {
                if (this.app && typeof this.app.startNote === 'function') {
                    // Usar método do app (melhor opção, gerencia noteId)
                    this.app.startNote(noteName, keyEl, instrumentKey, velocity);
                } else if (this.soundfontManager) {
                    // Fallback: usar soundfontManager diretamente
                    if (instrumentKey) {
                        this.soundfontManager.startSustainedNoteWithInstrument(noteName, instrumentKey, velocity);
                    } else {
                        this.soundfontManager.startSustainedNote(noteName, velocity);
                    }
                }
                
                // Ativar feedback visual
                keyEl.classList.add(CLASS_KEY_ACTIVE);
                keyEl.setAttribute('data-source', source); // Identificar origem para CSS customizado
                
                // Adicionar ao set de notas ativas
                this.activeNotes.add(noteName);
                
                console.log(`✅ pressKey: nota ${noteName} acionada com sucesso`);
                
            } catch (error) {
                console.error(`❌ pressKey: erro ao acionar ${noteName}:`, error);
            }
        }

        /**
         * 🆕 INTEGRAÇÃO BOARD BELLS → VIRTUAL KEYBOARD
         * Método público para dispositivos MIDI liberarem teclas do Virtual Keyboard
         * 
         * @param {string} noteName - Nome da nota (ex: 'C4', 'D#3')
         * @param {string} source - Identificador da origem (ex: 'board-bells', 'midi-controller')
         */
        releaseKey(noteName, source = 'external') {
            console.log(`🎹 Virtual Keyboard: releaseKey('${noteName}', '${source}')`);
            
            // Validar nota
            if (!noteName || typeof noteName !== 'string') {
                console.error('❌ releaseKey: noteName inválido', noteName);
                return;
            }
            
            // Verificar se está ativa
            if (!this.activeNotes.has(noteName)) {
                console.warn(`⚠️ releaseKey: nota ${noteName} não está ativa`);
                return;
            }
            
            // Parar áudio
            try {
                const keyEl = this.keys.get(noteName);
                
                if (this.app && typeof this.app.stopNote === 'function') {
                    // Usar método do app (melhor opção)
                    this.app.stopNote(noteName, keyEl || null);
                } else if (this.soundfontManager) {
                    // Fallback: usar soundfontManager diretamente
                    this.soundfontManager.stopSustainedNote(noteName);
                }
                
                // Remover feedback visual
                if (keyEl) {
                    keyEl.classList.remove(CLASS_KEY_ACTIVE);
                    keyEl.removeAttribute('data-source');
                }
                
                // Remover do set de notas ativas
                this.activeNotes.delete(noteName);
                
                console.log(`✅ releaseKey: nota ${noteName} liberada com sucesso`);
                
            } catch (error) {
                console.error(`❌ releaseKey: erro ao liberar ${noteName}:`, error);
            }
        }

        releaseAllNotes() {
            Array.from(this.activeNotes).forEach(note => this.stopNote(note));
        }

        handleSaveFavorite() {
            const name = (this.favoriteNameInput ? this.favoriteNameInput.value.trim() : '') || '';
            if (!name) {
                this.updateFavoritesStatus('Informe um nome para salvar a combinação.', true);
                return;
            }

            if (!Object.keys(this.assignments).length) {
                this.updateFavoritesStatus('Nenhuma tecla personalizada para salvar.', true);
                return;
            }

            const normalized = normalizeAssignments(this.assignments, Array.from(this.keys.keys()));
            this.favorites.push({
                id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                name,
                assignments: normalized,
                createdAt: Date.now()
            });

            this.saveFavorites();
            this.renderFavorites();
            if (this.favoriteNameInput) {
                this.favoriteNameInput.value = '';
            }
            this.updateFavoritesStatus(`Combinação "${name}" salva!`);
        }

        updateFavoritesStatus(message, isError = false) {
            if (!this.favoritesPanel) {
                return;
            }
            const statusElem = this.favoritesPanel.querySelector('.vk-favorites-status');
            if (statusElem) {
                statusElem.textContent = message;
                statusElem.classList.toggle('is-error', !!isError);
                return;
            }

            if (message) {
                const hint = document.createElement('p');
                hint.className = `vk-favorites-status${isError ? ' is-error' : ''}`;
                hint.textContent = message;
                this.favoritesPanel.appendChild(hint);
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.parentNode.removeChild(hint);
                    }
                }, 3000);
            }
        }

        handleFavoriteAction(event) {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }

            const action = button.getAttribute('data-action');
            const favoriteId = button.getAttribute('data-id');
            const favorite = this.favorites.find(item => item.id === favoriteId);

            if (!favorite) {
                return;
            }

            if (action === 'apply') {
                this.applyFavorite(favorite);
            } else if (action === 'delete') {
                this.deleteFavorite(favoriteId);
            }
        }

        async applyFavorite(favorite) {
            const assignments = normalizeAssignments(favorite.assignments, Array.from(this.keys.keys()));
            const instrumentKeys = Array.from(new Set(Object.values(assignments)));

            if (instrumentKeys.length && this.soundfontManager) {
                await Promise.all(instrumentKeys.map(key => this.soundfontManager.loadInstrument(key, {
                    setCurrent: false,
                    clearKit: false
                })));
            }

            this.assignments = assignments;
            this.keys.forEach((_element, note) => this.updateKeyVisual(note));
            this.updateFavoritesStatus(`Combinação "${favorite.name}" aplicada.`);
            
            // 🔒 Atualizar estado do botão de bloqueio após aplicar favoritos
            this.updateLockButtonState();
        }

        deleteFavorite(favoriteId) {
            this.favorites = this.favorites.filter(item => item.id !== favoriteId);
            this.saveFavorites();
            this.renderFavorites();
            this.updateFavoritesStatus('Combinação removida.');
        }

        // ========================================
        // 🔓 Sistema de Bloqueio de Instrumentos Rápidos
        // ========================================

        /**
         * Inicializa o botão de bloqueio/desbloqueio de instrumentos rápidos
         */
        initQuickInstrumentLockButton() {
            const lockButton = document.getElementById('toggle-quick-instrument-lock');
            if (!lockButton) {
                console.warn('⚠️ Botão de bloqueio de instrumentos não encontrado');
                return;
            }

            // Estado inicial: verificar se há soundfonts individuais
            this.updateLockButtonState(lockButton);

            // Event listener para o clique
            lockButton.addEventListener('click', () => {
                this.toggleQuickInstrumentLock(lockButton);
            });

            console.log('✅ Botão de bloqueio de instrumentos inicializado');
        }

        /**
         * Verifica se há soundfonts individuais configurados
         */
        hasIndividualSoundfonts() {
            return Object.keys(this.assignments).length > 0;
        }

        /**
         * Atualiza o estado visual do botão
         */
        updateLockButtonState(lockButton) {
            if (!lockButton) {
                lockButton = document.getElementById('toggle-quick-instrument-lock');
            }
            if (!lockButton) return;

            const hasIndividual = this.hasIndividualSoundfonts();

            if (hasIndividual) {
                // Há soundfonts individuais = Notas BLOQUEADAS
                lockButton.classList.remove('unlocked');
                lockButton.classList.add('locked');
                lockButton.title = 'Notas bloqueadas por soundfonts individuais - Clique para liberar';
                lockButton.textContent = 'Notas Bloqueadas';
            } else {
                // Não há soundfonts individuais = Notas LIBERADAS
                lockButton.classList.remove('locked');
                lockButton.classList.add('unlocked');
                lockButton.title = 'Notas liberadas - Seleção rápida de instrumentos disponível';
                lockButton.textContent = 'Notas Liberadas';
            }
        }

        /**
         * Alterna o estado do bloqueio
         */
        toggleQuickInstrumentLock(lockButton) {
            if (!lockButton) {
                lockButton = document.getElementById('toggle-quick-instrument-lock');
            }
            if (!lockButton) return;

            const isCurrentlyLocked = lockButton.classList.contains('locked');
            
            if (isCurrentlyLocked) {
                // Desbloquear: limpar TODOS os soundfonts individuais
                this.clearAllIndividualAssignments();
                
                lockButton.classList.remove('locked');
                lockButton.classList.add('unlocked');
                lockButton.title = 'Notas liberadas - Seleção rápida de instrumentos disponível';
                lockButton.textContent = 'Notas Liberadas';

                // Registrar no SystemLogger
                if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                    SystemLogger.log('success', '🔓 Notas liberadas - Todas as teclas voltaram para seleção rápida');
                }
                console.log('🔓 Notas LIBERADAS - seleção rápida ativa');
            } else {
                // Este bloco não deveria ser acionado porque o botão só aparece quando há individuais
                // Mas mantém por segurança
                lockButton.classList.remove('unlocked');
                lockButton.classList.add('locked');
                lockButton.title = 'Notas bloqueadas por soundfonts individuais - Clique para liberar';
                lockButton.textContent = 'Notas Bloqueadas';

                // Registrar no SystemLogger
                if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                    SystemLogger.log('info', '🔒 Notas bloqueadas - Configure soundfonts individuais');
                }
                console.log('🔒 Notas BLOQUEADAS - soundfonts individuais ativos');
            }
        }

        /**
         * Limpa todos os soundfonts individuais configurados
         */
        clearAllIndividualAssignments() {
            // Limpar assignments
            const clearedNotes = Object.keys(this.assignments);
            this.assignments = {};

            // Atualizar visualmente todas as teclas afetadas
            clearedNotes.forEach(note => {
                this.updateKeyVisual(note);
            });

            // 🔥 FORÇAR atualização completa com catálogo GLOBAL
            this.updateAllSoundfontLabels();

            // 🔒 Atualizar estado do botão de bloqueio após limpar assignments
            this.updateLockButtonState();

            console.log(`✅ ${clearedNotes.length} soundfonts individuais removidos - notas liberadas`);
        }

        /**
         * Verifica se pode usar seleção rápida de instrumentos
         */
        canUseQuickInstrumentSelection() {
            const lockButton = document.getElementById('toggle-quick-instrument-lock');
            if (!lockButton) return true; // Se não tem botão, permitir

            const isUnlocked = lockButton.classList.contains('unlocked');
            const hasIndividual = this.hasIndividualSoundfonts();

            // Pode usar se estiver desbloqueado OU se não tiver soundfonts individuais
            return isUnlocked || !hasIndividual;
        }

        loadFavorites() {
            try {
                const stored = global.localStorage.getItem(FAVORITES_STORAGE_KEY);
                if (!stored) {
                    this.favorites = [];
                    return;
                }
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.favorites = parsed;
                } else {
                    this.favorites = [];
                }
            } catch (error) {
                console.warn('VirtualKeyboard: falha ao carregar favoritos.', error);
                this.favorites = [];
            }
        }

        saveFavorites() {
            try {
                global.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.favorites));
            } catch (error) {
                console.warn('VirtualKeyboard: falha ao salvar favoritos.', error);
            }
        }

        renderFavorites() {
            if (!this.favoritesList) {
                return;
            }

            this.favoritesList.innerHTML = '';
            if (!this.favorites.length) {
                const empty = this.favoritesPanel.querySelector('.vk-favorites-empty');
                if (empty) {
                    empty.style.display = 'block';
                }
                return;
            }

            const empty = this.favoritesPanel.querySelector('.vk-favorites-empty');
            if (empty) {
                empty.style.display = 'none';
            }

            this.favorites
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .forEach(favorite => {
                    const item = document.createElement('li');
                    item.className = 'vk-favorite-item';
                    item.innerHTML = `
                        <span class="vk-favorite-name-label">${favorite.name}</span>
                        <div class="vk-favorite-actions">
                            <button type="button" data-action="apply" data-id="${favorite.id}">Aplicar</button>
                            <button type="button" data-action="delete" data-id="${favorite.id}">Excluir</button>
                        </div>
                    `;
                    this.favoritesList.appendChild(item);
                });
        }
    }

    global.virtualKeyboard = {
        init(options) {
            if (!options || !options.container) {
                console.warn('virtualKeyboard.init requer um container.');
                return null;
            }

            const instance = new VirtualKeyboard(options);
            instance.init();
            return instance;
        }
    };
})(window);
