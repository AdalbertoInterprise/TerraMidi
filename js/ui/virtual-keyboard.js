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
            this.noteDisplayState = new Map();
            this.favorites = [];

            this.configPanel = null;
            this.configPanelOpenTime = 0; // 🔧 Timestamp de quando o painel foi aberto
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

            this.soundfontSelectorJustOpened = false;
            this.soundfontSelectorDismissGuard = null;

            this.lastKnownDefaultSoundfontInfo = null;

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
            this.createSoundfontSelector();
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
            // 🔧 MOBILE FIX: Usar eventos que não conflitam com abertura do painel
            document.addEventListener('mousedown', this.boundHandleOutsideClick, { capture: true });
            document.addEventListener('touchstart', this.boundHandleOutsideClick, { passive: true, capture: true });
            
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
                document.removeEventListener('mousedown', this.boundHandleOutsideClick);
                document.removeEventListener('touchstart', this.boundHandleOutsideClick);
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
            this.clearSoundfontSelectorDismissGuard();
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
                    console.log(`⚙️ Botão de config clicado para nota ${note}`);
                    event.stopPropagation();
                    event.preventDefault();
                    // 🆕 Abrir seletor de soundfonts centralizado
                    this.openSoundfontSelector(note);
                });
                keyEl.appendChild(configBtn);
                console.log(`🔧 Botão de config criado para nota ${note}`);
            }
        }

        bindKeyEvents(keyEl, note) {
            // 🆕 Handler para abrir seletor centralizado de soundfonts ao clicar na tecla
            const openSoundfontSelector = (event) => {
                if (event.type === 'mousedown' && event.button !== 0) {
                    return;
                }
                
                console.log(`⌨️ Evento '${event.type}' na tecla ${note} - abrindo seletor`);
                
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                requestAnimationFrame(() => {
                    console.log(`⚡ requestAnimationFrame disposto para nota ${note}`);
                    this.openSoundfontSelector(note);
                });
            };

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

            // Clique/toque abre seletor de soundfonts centralizado
            keyEl.addEventListener('mousedown', openSoundfontSelector);
            keyEl.addEventListener('touchstart', openSoundfontSelector, { passive: false });
            
            // Listeners de release permanecem para casos de MIDI
            keyEl.addEventListener('mouseup', stop);
            keyEl.addEventListener('mouseleave', stop);
            keyEl.addEventListener('touchend', stop);
            keyEl.addEventListener('touchcancel', stop);

            console.log(`🔗 Listeners vinculados para nota ${note}`);
        }

        activateSoundfontSelectorDismissGuard() {
            if (this.soundfontSelectorDismissGuard) {
                clearTimeout(this.soundfontSelectorDismissGuard);
            }
            this.soundfontSelectorJustOpened = true;
            this.soundfontSelectorDismissGuard = setTimeout(() => {
                this.soundfontSelectorJustOpened = false;
                this.soundfontSelectorDismissGuard = null;
            }, 220);
        }

        clearSoundfontSelectorDismissGuard() {
            if (this.soundfontSelectorDismissGuard) {
                clearTimeout(this.soundfontSelectorDismissGuard);
                this.soundfontSelectorDismissGuard = null;
            }
            this.soundfontSelectorJustOpened = false;
        }

        /**
         * 🆕 Cria seletor centralizado e elegante de soundfonts
         * Substituiu o antigo painel vk-config-panel
         */
        createSoundfontSelector() {
            if (this.soundfontSelector) {
                console.log('ℹ️ Seletor de soundfonts já foi criado');
                return;
            }

            console.log('🔨 Criando seletor DIRETO de soundfonts...');

            // Criar overlay com LISTA expandida (não dropdown)
            const overlay = document.createElement('div');
            overlay.id = 'vk-soundfont-overlay';
            overlay.className = 'vk-soundfont-overlay is-hidden';

            // Estrutura: título + lista expandida + info
            overlay.innerHTML = `
                <div class="vk-soundfont-wrapper">
                    <h3 class="vk-soundfont-title">🎹 Escolha seu instrumento</h3>
                    <div class="vk-soundfont-list-container">
                        <div class="vk-soundfont-list" id="vk-soundfont-list" role="listbox" aria-label="Lista de instrumentos">
                            <!-- Opções serão populadas aqui -->
                        </div>
                    </div>
                    <div class="vk-soundfont-info" role="status" aria-live="polite"></div>
                </div>
            `;

            document.body.appendChild(overlay);
            console.log('✅ Overlay adicionado ao DOM');

            this.soundfontSelector = overlay;
            this.soundfontList = overlay.querySelector('.vk-soundfont-list');
            this.soundfontInfo = overlay.querySelector('.vk-soundfont-info');

            console.log('📍 Referências de elementos obtidas');

            // Popular lista com soundfonts
            this.waitForGlobalCatalogAndPopulate();

            // Fechar com ESC
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !overlay.classList.contains('is-hidden')) {
                    console.log('⏱️ ESC pressionado - fechando seletor');
                    this.closeSoundfontSelector();
                }
            });

            // Fechar ao clicar fora (no overlay)
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    if (this.soundfontSelectorJustOpened) {
                        console.log('⏳ Ignorando clique imediato após abertura do seletor');
                        return;
                    }
                    console.log('👆 Clique fora - fechando seletor');
                    this.closeSoundfontSelector();
                }
            });

            console.log('✅ Seletor DIRETO criado com sucesso (LISTA EXPANDIDA - SEM DROPDOWN)');
        }

        /**
         * 🆕 Abre seletor direto de soundfonts (sem modal intermediária)
         */
        openSoundfontSelector(note) {
            if (!this.soundfontSelector) {
                console.warn('❌ Seletor de soundfonts não criado');
                return;
            }

            // Registrar ação
            console.log(`🎛️ ABRINDO seletor para nota: ${note}`);

            this.currentConfigNote = note;

            // Limpar feedback anterior
            if (this.soundfontInfo) {
                this.soundfontInfo.textContent = '';
            }

            this.activateSoundfontSelectorDismissGuard();

            // Mostrar overlay com LISTA EXPANDIDA (sem intermediários)
            this.soundfontSelector.classList.remove('is-hidden');
            
            console.log(`✅ Overlay visível, LISTA EXPANDIDA aberta`);

            // Scroll para o topo da lista
            setTimeout(() => {
                if (this.soundfontList) {
                    this.soundfontList.scrollTop = 0;
                    console.log(`📍 Lista scrollada para o topo`);
                }
            }, 50);

            console.log(`✅ Seletor DIRETO pronto para nota: ${note} (LISTA EXPANDIDA - SEM DROPDOWN)`);
        }

        /**
         * 🆕 Fecha seletor de soundfonts
         */
        closeSoundfontSelector() {
            if (this.soundfontSelector) {
                console.log('🔒 Fechando seletor de soundfonts');
                this.soundfontSelector.classList.add('is-hidden');
                this.currentConfigNote = null;
                this.clearSoundfontSelectorDismissGuard();
                if (this.soundfontInfo) {
                    this.soundfontInfo.textContent = '';
                }
                console.log('✅ Seletor fechado e oculto');
            }
        }

        /**
         * 🆕 Manipula seleção de soundfont
         */
        async handleSoundfontSelection(instrumentKey) {
            if (!this.currentConfigNote) {
                console.warn('⚠️ Nenhuma nota configurada');
                return;
            }

            console.log(`📝 Processando seleção: instrumentKey="${instrumentKey}" para nota ${this.currentConfigNote}`);

            await this.setAssignment(this.currentConfigNote, instrumentKey || null, { showStatus: true });
            
            // Feedback visual
            if (instrumentKey) {
                this.soundfontInfo.textContent = '✅ Instrumento aplicado!';
                this.soundfontInfo.style.color = '#4caf50';
                console.log(`✅ Instrumento ${instrumentKey} aplicado para nota ${this.currentConfigNote}`);
            } else {
                this.soundfontInfo.textContent = 'Instrumento padrão restaurado.';
                this.soundfontInfo.style.color = '#2196f3';
                console.log(`♻️ Instrumento padrão restaurado para nota ${this.currentConfigNote}`);
            }

            // Fechar após seleção
            console.log('⏰ Agendando fechamento do seletor em 500ms...');
            setTimeout(() => {
                console.log('🎬 Executando fechamento do seletor');
                this.closeSoundfontSelector();
            }, 500);
        }

        /**
         * DEPRECATED: createConfigPanel() - Substituid por createSoundfontSelector()
         * Mantido como stub para compatibilidade
         */
        createConfigPanel() {
            // Esta função foi completamente removida
            // Use createSoundfontSelector() em seu lugar
            console.warn('⚠️ createConfigPanel() foi descontinuado. Use createSoundfontSelector().');
        }

        async waitForGlobalCatalogAndPopulate() {
            // Aguardar catálogo global (sem logs excessivos)
            const maxWaitTime = 3000; // 3 segundos
            const startTime = Date.now();

            const checkAndPopulate = async () => {
                const globalCatalog = window.instrumentSelectorState?.catalogByKey || 
                                     globalThis.instrumentSelectorState?.catalogByKey;

                if (globalCatalog && globalCatalog.size > 0) {
                    await this.populateSoundfontSelect();
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed < maxWaitTime) {
                    setTimeout(checkAndPopulate, 200); // Verificar a cada 200ms
                } else {
                    // Fallback silencioso
                    await this.populateSoundfontSelect();
                }
            };

            checkAndPopulate();
        }

        async populateSoundfontSelect() {
            if (!this.soundfontList) {
                return;
            }

            // Usar catálogo DIRETO do instrumentSelector
            const globalState = window.instrumentSelectorState || globalThis.instrumentSelectorState;
            
            if (!globalState || !globalState.entries || globalState.entries.length === 0) {
                // Silencioso - aguarda evento 'instrument-selector-ready'
                return;
            }

            console.log(`✅ Populando LISTA: ${globalState.entries.length} soundfonts visíveis`);
            
            // Limpar lista
            this.soundfontList.innerHTML = '';
            
            // Opção padrão
            const defaultOption = document.createElement('div');
            defaultOption.className = 'vk-soundfont-item vk-soundfont-default';
            defaultOption.dataset.value = '';
            defaultOption.textContent = '🎹 Usar instrumento principal';
            defaultOption.addEventListener('click', () => {
                console.log('🎵 Seleção: instrumento principal');
                this.handleSoundfontSelection('');
            });
            this.soundfontList.appendChild(defaultOption);
            
            // Agrupar entries por categoria
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
            
            // Criar itens da lista (sem optgroup, apenas items visíveis)
            categoryOrder.forEach(category => {
                const entries = byCategory.get(category) || [];
                
                entries.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'vk-soundfont-item';
                    item.dataset.value = entry.variation?.variable || entry.id;
                    item.role = 'option';
                    
                    const numberPrefix = entry.globalIndex ? `${entry.globalIndex}. ` : '';
                    const displayName = entry.label || 
                                       `${entry.subcategory}${entry.variation?.label ? ' - ' + entry.variation.label : ''}`;
                    const curatedPrefix = entry.variation?.isCurated ? '⭐ ' : '';
                    const icon = categoriesHelper?.getCategoryInfo?.(category)?.icon || '🎵';
                    
                    item.innerHTML = `<span class="vk-soundfont-item-text">${numberPrefix}${curatedPrefix}${icon} ${displayName}</span>`;
                    
                    // Click handler para selecionar
                    item.addEventListener('click', () => {
                        const value = item.dataset.value;
                        console.log(`🎵 Seleção: ${displayName} (${value})`);
                        this.handleSoundfontSelection(value);
                    });
                    
                    // Hover para feedback visual
                    item.addEventListener('mouseenter', () => {
                        this.soundfontList.querySelectorAll('.vk-soundfont-item').forEach(el => {
                            el.classList.remove('vk-soundfont-item-hover');
                        });
                        item.classList.add('vk-soundfont-item-hover');
                    });
                    
                    this.soundfontList.appendChild(item);
                });
            });

            console.log('✅ Lista de soundfonts preenchida e visível');
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

        /**
         * DEPRECATED: Estes métodos foram substituídos por createSoundfontSelector() e relacionados
         * Mantidos como stubs para compatibilidade regressiva
         */
        
        openConfigPanel(note, keyEl) {
            console.warn('⚠️ openConfigPanel() foi descontinuado. Use openSoundfontSelector().');
            this.openSoundfontSelector(note);
        }

        closeConfigPanel() {
            console.warn('⚠️ closeConfigPanel() foi descontinuado. Use closeSoundfontSelector().');
            this.closeSoundfontSelector();
        }

        handleOutsideClick(event) {
            // Verificar cliques fora do seletor de soundfonts
            if (!this.soundfontSelector || this.soundfontSelector.classList.contains('is-hidden')) {
                return;
            }

            // Se clicou dentro do seletor, não fechar
            if (this.soundfontSelector.contains(event.target)) {
                return;
            }

            if (this.soundfontSelectorJustOpened) {
                return;
            }

            // Fechar ao clicar fora
            this.closeSoundfontSelector();
        }

        async handleConfigSelection(instrumentKey) {
            // Compatibilidade - chama handleSoundfontSelection
            return this.handleSoundfontSelection(instrumentKey);
        }

        updateConfigStatus(message, isError = false) {
            // Compatibilidade - usar soundfontInfo em vez disso
            if (this.soundfontInfo) {
                this.soundfontInfo.textContent = message;
                this.soundfontInfo.style.color = isError ? '#f44336' : '#2196f3';
            }
        }

        async setAssignment(note, instrumentKey, options = {}) {
            const { showStatus = false } = options;
            const keyEl = this.keys.get(note);

            if (!instrumentKey) {
                const hadAssignment = Object.prototype.hasOwnProperty.call(this.assignments, note);
                if (hadAssignment) {
                    delete this.assignments[note];
                }

                this.updateKeyVisual(note);
                this.refreshGlobalKeyLabels(note);

                // 🔓 Atualizar botão de bloqueio
                this.updateLockButtonState();

                if (hadAssignment) {
                    // 🆕 Sincronizar com Board Bells se estiver integrado
                    this.notifyAssignmentChange(note);
                }

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

            const previousInstrument = this.assignments[note] || null;
            this.assignments[note] = instrumentKey;
            
            // � Atualizar botão de bloqueio
            this.updateLockButtonState();
            
            // �🔍 DEBUG: Log do assignment sendo adicionado
            console.log(`📝 Virtual Keyboard: Assignment adicionado`);
            console.log(`   Nota: ${note}`);
            console.log(`   Instrumento: ${instrumentKey}`);
            console.log(`   Total de assignments: ${Object.keys(this.assignments).length}`);
            console.log(`   Assignments atuais:`, { ...this.assignments });
            
            // ✅ CORREÇÃO: Atualizar apenas as teclas necessárias após configurar instrumento individual
            this.updateKeyVisual(note);
            this.refreshGlobalKeyLabels(note);
            
            // 🆕 Sincronizar com Board Bells se estiver integrado
            if (previousInstrument !== instrumentKey) {
                this.notifyAssignmentChange(note);
            }
            
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

        getInstrumentSelectorState() {
            return window.instrumentSelectorState || globalThis.instrumentSelectorState || null;
        }

        getCurrentInstrumentSelectorEntry() {
            const state = this.getInstrumentSelectorState();
            if (!state) {
                return null;
            }

            if (state.currentEntry) {
                return state.currentEntry;
            }

            if (typeof state.getCurrentEntry === 'function') {
                try {
                    return state.getCurrentEntry() || null;
                } catch (error) {
                    console.warn('VirtualKeyboard: falha ao obter entry atual do instrumentSelector.', error);
                }
            }

            if (state.currentId && state.entriesById && typeof state.entriesById.get === 'function') {
                const entry = state.entriesById.get(state.currentId);
                if (entry) {
                    return entry;
                }
            }

            if (state.entries && Array.isArray(state.entries) && state.currentId) {
                return state.entries.find(item => item.id === state.currentId) || null;
            }

            return null;
        }

        getGlobalSoundfontSnapshot() {
            const entry = this.getCurrentInstrumentSelectorEntry();
            let instrumentKey = entry?.variation?.variable || entry?.id || null;
            let fallbackNumber = entry?.globalIndex ?? null;
            let fallbackName = entry?.label || '';
            let fallbackIcon = entry ? this.getCategoryIcon(entry.category) : '🎹';

            if (!instrumentKey && this.soundfontManager) {
                instrumentKey = this.soundfontManager.currentInstrument || null;
            }

            if (!fallbackName && this.soundfontManager?.getCurrentSoundfontName) {
                try {
                    const currentName = this.soundfontManager.getCurrentSoundfontName();
                    if (currentName) {
                        fallbackName = currentName;
                    }
                } catch (error) {
                    console.warn('VirtualKeyboard: falha ao obter nome do soundfont atual.', error);
                }
            }

            if (fallbackNumber == null && this.soundfontManager?.getCurrentSoundfontIndex) {
                try {
                    const currentIndex = this.soundfontManager.getCurrentSoundfontIndex();
                    if (currentIndex != null) {
                        fallbackNumber = currentIndex;
                    }
                } catch (error) {
                    console.warn('VirtualKeyboard: falha ao obter índice do soundfont atual.', error);
                }
            }

            if (fallbackNumber == null && instrumentKey) {
                const parsed = this.extractNumberFromInstrumentKey(instrumentKey);
                if (parsed != null) {
                    fallbackNumber = parsed;
                }
            }

            const info = this.resolveSoundfontInfo(instrumentKey, {
                fallbackName,
                fallbackIcon,
                fallbackNumber
            });

            return {
                key: instrumentKey,
                info,
                fallbackNumber
            };
        }

        isInstrumentReady(instrumentKey) {
            if (!instrumentKey) {
                return false;
            }

            if (!this.soundfontManager) {
                return false;
            }

            const loaded = this.soundfontManager.loadedSoundfonts;
            if (loaded instanceof Map && loaded.has(instrumentKey)) {
                const preset = loaded.get(instrumentKey);
                if (preset && Array.isArray(preset.zones) && preset.zones.length > 0) {
                    const hasPlayableZone = preset.zones.some(zone => zone && (zone.buffer || zone.sample || zone.file));
                    if (hasPlayableZone) {
                        return true;
                    }
                }
            }

            if (this.soundfontManager.fullCatalog instanceof Map && this.soundfontManager.fullCatalog.has(instrumentKey)) {
                return true;
            }

            return false;
        }

        resolveDisplayForInstrument(instrumentKey, options = {}) {
            const {
                fallbackNumber = null,
                fallbackName = '',
                fallbackIcon = '🎹'
            } = options;

            if (!instrumentKey && fallbackNumber == null) {
                return {
                    number: null,
                    tooltip: 'Soundfont não definido',
                    name: fallbackName,
                    icon: fallbackIcon,
                    isKnown: false
                };
            }

            const info = this.resolveSoundfontInfo(instrumentKey, {
                fallbackNumber,
                fallbackName,
                fallbackIcon
            });

            let number = info.number;
            if (number == null && fallbackNumber != null) {
                number = fallbackNumber;
            }
            if (number == null && instrumentKey) {
                number = this.extractNumberFromInstrumentKey(instrumentKey);
            }

            if (number == null) {
                return {
                    number: null,
                    tooltip: 'Soundfont não definido',
                    name: info.name,
                    icon: info.icon,
                    isKnown: false
                };
            }

            const numberText = String(number);

            return {
                number: numberText,
                tooltip: info.name ? `${numberText}. ${info.name}` : `Soundfont ${numberText}`,
                name: info.name || fallbackName || numberText,
                icon: info.icon || fallbackIcon,
                isKnown: true
            };
        }

        resolveNoteDisplay(note) {
            const assignmentKey = this.assignments[note];

            if (assignmentKey) {
                const display = this.resolveDisplayForInstrument(assignmentKey, {
                    fallbackNumber: this.extractNumberFromInstrumentKey(assignmentKey),
                    fallbackName: 'Instrumento personalizado',
                    fallbackIcon: '⭐'
                });

                const isValid = this.isInstrumentReady(assignmentKey) && display.isKnown;

                const result = {
                    instrumentKey: assignmentKey,
                    number: display.number ?? '?',
                    tooltip: display.tooltip,
                    name: display.name,
                    icon: display.icon,
                    source: 'individual',
                    isValid
                };

                this.noteDisplayState.set(note, result);
                return result;
            }

            const snapshot = this.getGlobalSoundfontSnapshot();
            const display = this.resolveDisplayForInstrument(snapshot.key, {
                fallbackNumber: snapshot.fallbackNumber,
                fallbackName: snapshot.info?.name,
                fallbackIcon: snapshot.info?.icon
            });

            const isValid = Boolean(snapshot.key) ? this.isInstrumentReady(snapshot.key) && display.isKnown : display.isKnown;

            const result = {
                instrumentKey: snapshot.key,
                number: display.number ?? '?',
                tooltip: display.tooltip,
                name: display.name,
                icon: display.icon,
                source: 'global',
                isValid
            };

            this.noteDisplayState.set(note, result);
            return result;
        }

        resolveSoundfontInfo(instrumentKey, options = {}) {
            const {
                fallbackName = '',
                fallbackIcon = '🎹',
                fallbackNumber = null
            } = options;

            const info = {
                number: fallbackNumber ?? null,
                name: fallbackName,
                icon: fallbackIcon
            };

            if (!instrumentKey || typeof instrumentKey !== 'string') {
                return info;
            }

            const globalState = this.getInstrumentSelectorState();
            const catalogEntry = globalState?.catalogByKey && typeof globalState.catalogByKey.get === 'function'
                ? globalState.catalogByKey.get(instrumentKey)
                : null;

            if (catalogEntry) {
                if (catalogEntry.globalIndex != null) {
                    info.number = catalogEntry.globalIndex;
                }
                if (catalogEntry.label) {
                    info.name = catalogEntry.label;
                }
                if (catalogEntry.category) {
                    const categoryIcon = this.getCategoryIcon(catalogEntry.category);
                    if (categoryIcon) {
                        info.icon = categoryIcon;
                    }
                }
            }

            const metadataEntry = this.instrumentCatalog?.metadata?.get?.(instrumentKey);
            if (metadataEntry) {
                if (info.number == null && metadataEntry.globalIndex != null) {
                    info.number = metadataEntry.globalIndex;
                }
                if (!info.name && metadataEntry.name) {
                    info.name = metadataEntry.name;
                }
                if ((!info.icon || info.icon === '🎹') && metadataEntry.icon) {
                    info.icon = metadataEntry.icon;
                }
            }

            if (this.soundfontManager?.fullCatalog instanceof Map && this.soundfontManager.fullCatalog.has(instrumentKey)) {
                const fullCatalogEntry = this.soundfontManager.fullCatalog.get(instrumentKey);
                if (fullCatalogEntry) {
                    if (info.number == null && fullCatalogEntry.globalIndex != null) {
                        info.number = fullCatalogEntry.globalIndex;
                    }
                    if (!info.name && fullCatalogEntry.name) {
                        info.name = fullCatalogEntry.name;
                    }
                    if ((!info.icon || info.icon === '🎹') && fullCatalogEntry.icon) {
                        info.icon = fullCatalogEntry.icon;
                    }
                }
            }

            if (info.number == null) {
                const parsed = this.extractNumberFromInstrumentKey(instrumentKey);
                if (parsed != null) {
                    info.number = parsed;
                }
            }

            return info;
        }

        extractNumberFromInstrumentKey(instrumentKey) {
            if (!instrumentKey || typeof instrumentKey !== 'string') {
                return null;
            }

            const match = instrumentKey.match(/(\d{3,5})/);
            if (match && match[1]) {
                const parsed = parseInt(match[1], 10);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }

            return null;
        }

        buildDisplayDataForInstrument(instrumentKey, options = {}) {
            const info = this.resolveSoundfontInfo(instrumentKey, options);

            let number = info.number;
            if (number == null && options.fallbackNumber != null) {
                number = options.fallbackNumber;
            }
            if (number == null && typeof options.defaultNumber !== 'undefined') {
                number = options.defaultNumber;
            }
            if (number == null) {
                number = this.extractNumberFromInstrumentKey(instrumentKey);
            }

            const name = info.name || options.fallbackName || '';
            const icon = info.icon || options.fallbackIcon || '🎹';

            return {
                number,
                name,
                icon
            };
        }

        updateKeyVisual(note) {
            const keyEl = this.keys.get(note);
            if (!keyEl) {
                return;
            }

            const indicator = keyEl.querySelector('.vk-key-indicator');
            const display = this.resolveNoteDisplay(note);

            if (display.source === 'individual') {
                keyEl.classList.add(CLASS_KEY_CUSTOM);
                if (display.instrumentKey) {
                    keyEl.setAttribute('data-instrument-key', display.instrumentKey);
                }
            } else {
                keyEl.classList.remove(CLASS_KEY_CUSTOM);
                keyEl.removeAttribute('data-instrument-key');
            }

            if (indicator) {
                const hasNumber = display.number !== null && display.number !== undefined && display.number !== '';
                indicator.textContent = hasNumber ? String(display.number) : '';
                indicator.title = display.tooltip || '';
                indicator.classList.toggle('is-visible', hasNumber);
                indicator.classList.toggle('is-invalid', display.isValid === false);
                indicator.classList.toggle('is-custom', display?.source === 'individual');
            }

            this.updateKeyVisualCompact(keyEl, display);
        }

    /**
     * Atualiza os labels de soundfont em todas as teclas
     * Mostra o número do soundfont atualmente ativo em cada nota
     */
        updateAllSoundfontLabels() {
            const snapshot = this.getGlobalSoundfontSnapshot();
            if (snapshot?.info) {
                this.lastKnownDefaultSoundfontInfo = {
                    number: snapshot.info.number ?? snapshot.fallbackNumber ?? null,
                    name: snapshot.info.name || 'Soundfont',
                    icon: snapshot.info.icon || '🎹',
                    key: snapshot.key || null
                };
            }

            this.keys.forEach((_, note) => {
                this.updateKeyVisual(note);
            });
        }

        refreshGlobalKeyLabels(excludeNote = null) {
            const snapshot = this.getGlobalSoundfontSnapshot();
            if (snapshot?.info) {
                this.lastKnownDefaultSoundfontInfo = {
                    number: snapshot.info.number ?? snapshot.fallbackNumber ?? null,
                    name: snapshot.info.name || 'Soundfont',
                    icon: snapshot.info.icon || '🎹',
                    key: snapshot.key || null
                };
            }

            this.keys.forEach((_, note) => {
                if (note === excludeNote) {
                    return;
                }

                if (!this.assignments[note]) {
                    this.updateKeyVisual(note);
                }
            });
        }
        
        /**
         * Atualiza visual compacto da tecla exibindo o número do soundfont
         * @param {HTMLElement} keyEl - Elemento da tecla
         * @param {string|number} number - Número do soundfont
         * @param {string} icon - Ícone do instrumento (mantido para compatibilidade)
         * @param {string} fullName - Nome completo (para tooltip)
         */
        updateKeyVisualCompact(keyEl, display) {
            const soundfontLabel = keyEl.querySelector('.soundfont-label');
            if (!soundfontLabel) return;
            
            // Remover indicadores antigos duplicados, caso existam
            const legacyIcons = keyEl.querySelectorAll('.soundfont-icon');
            legacyIcons.forEach(icon => icon.remove());

            const numberText = display?.number !== undefined && display?.number !== null
                ? String(display.number)
                : '';
            const tooltip = display?.tooltip || (numberText ? `Soundfont ${numberText}` : '');

            // Exibir apenas número via indicador principal; label fica como suporte de tooltip
            soundfontLabel.textContent = '';
            soundfontLabel.title = tooltip;
            if (numberText) {
                soundfontLabel.dataset.soundfontNumber = numberText;
            } else {
                delete soundfontLabel.dataset.soundfontNumber;
            }
            if (display?.name) {
                soundfontLabel.dataset.soundfontName = display.name;
            } else {
                delete soundfontLabel.dataset.soundfontName;
            }
            soundfontLabel.classList.toggle('has-soundfont', !!numberText);

            if (tooltip) {
                keyEl.setAttribute('title', tooltip);
                keyEl.dataset.soundfontTooltip = tooltip;
            } else {
                keyEl.removeAttribute('title');
                delete keyEl.dataset.soundfontTooltip;
            }
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
        notifyAssignmentChange(changedNote = null) {
            // 🔍 DEBUG: Log antes de notificar
            const assignmentsCount = Object.keys(this.assignments).length;
            console.log(`🔔 Virtual Keyboard: Notificando mudança nos assignments`);
            console.log(`   Total de assignments: ${assignmentsCount}`);
            console.log(`   Assignments completos:`, { ...this.assignments });
            if (changedNote) {
                console.log(`   Nota afetada: ${changedNote}`);
                console.log(`   Instrumento atual da nota: ${this.assignments[changedNote] || null}`);
            }
            
            // Notificar via evento global para qualquer dispositivo MIDI interessado
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                const assignmentsSnapshot = { ...this.assignments };
                const event = new CustomEvent('virtual-keyboard-assignment-changed', {
                    detail: {
                        assignments: assignmentsSnapshot,
                        changedNote,
                        instrumentKey: changedNote ? assignmentsSnapshot[changedNote] || null : null
                    }
                });
                window.dispatchEvent(event);
                console.log(`   ✅ Evento 'virtual-keyboard-assignment-changed' disparado`);
            }
            
            // Se houver referência direta ao midiDeviceManager, sincronizar diretamente
            if (window.midiDeviceManager && window.midiDeviceManager.syncBoardBellsAssignments) {
                console.log(`   🔄 Chamando midiDeviceManager.syncBoardBellsAssignments()`);
                window.midiDeviceManager.syncBoardBellsAssignments({ ...this.assignments });
            }
        }

        // 🔧 COMENTADO: Funções de pré-visualização e limpeza removidas
        // As mesmas funcionalidades estão disponíveis no seletor de instrumentos global
        /*
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
        */

        startNote(note) {
            if (this.activeNotes.has(note)) {
                return;
            }

            const keyEl = this.keys.get(note) || null;
            const instrumentKey = this.assignments[note] || null;

            const startWithFallbackInstrument = () => {
                if (this.app && typeof this.app.startNote === 'function') {
                    this.app.startNote(note, keyEl, null);
                } else if (this.soundfontManager) {
                    this.soundfontManager.startSustainedNote(note, 1.0);
                }
            };

            // 🆕 VALIDAR INSTRUMENTO PERSONALIZADO ANTES DE TOCAR
            if (instrumentKey && this.soundfontManager) {
                const preset = this.soundfontManager.loadedSoundfonts.get(instrumentKey);

                // Se o preset não está carregado ou não está pronto, usar instrumento padrão
                if (!preset || !preset.zones || preset.zones.length === 0) {
                    console.warn(`VirtualKeyboard: instrumento ${instrumentKey} não está pronto, usando padrão`);
                    startWithFallbackInstrument();
                    if (keyEl) {
                        keyEl.classList.add(CLASS_KEY_ACTIVE);
                    }
                    this.activeNotes.add(note);
                    return;
                }

                // Verificar se tem pelo menos um buffer válido
                const hasBuffer = preset.zones.some(zone => zone && zone.buffer);
                if (!hasBuffer) {
                    console.warn(`VirtualKeyboard: preset ${instrumentKey} sem buffers, usando padrão`);
                    startWithFallbackInstrument();
                    if (keyEl) {
                        keyEl.classList.add(CLASS_KEY_ACTIVE);
                    }
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

            if (keyEl) {
                keyEl.classList.add(CLASS_KEY_ACTIVE);
            }
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
         * ⚠️ IMPORTANTE: Este método NÃO abre o painel de configuração (vk-config-panel)
         * Ele apenas toca a nota com feedback visual, permitindo uso via MIDI
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
            const keyEl = this.keys.get(noteName) || null;
            
            // Obter instrumento personalizado (se configurado)
            const instrumentKey = this.assignments[noteName] || null;
            
            // Log detalhado
            if (instrumentKey) {
                console.log(`   ↳ Instrumento personalizado: ${instrumentKey}`);
            } else {
                console.log(`   ↳ Instrumento padrão (global)`);
            }
            
            // Tocar áudio SEM abrir painel de configuração
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
                
                if (keyEl) {
                    // Ativar feedback visual (classe diferenciada para MIDI)
                    keyEl.classList.add(CLASS_KEY_ACTIVE);
                    keyEl.classList.add('from-midi'); // 🆕 Classe para identificar origem MIDI
                    keyEl.setAttribute('data-source', source); // Identificar origem para CSS customizado
                }
                
                // Adicionar ao set de notas ativas
                this.activeNotes.add(noteName);
                
                console.log(`✅ pressKey: nota ${noteName} acionada via ${source} com sucesso`);
                
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
                const keyEl = this.keys.get(noteName) || null;
                
                if (this.app && typeof this.app.stopNote === 'function') {
                    // Usar método do app (melhor opção)
                    this.app.stopNote(noteName, keyEl);
                } else if (this.soundfontManager) {
                    // Fallback: usar soundfontManager diretamente
                    this.soundfontManager.stopSustainedNote(noteName);
                }
                
                // Remover feedback visual (incluindo classe MIDI)
                if (keyEl) {
                    keyEl.classList.remove(CLASS_KEY_ACTIVE);
                    keyEl.classList.remove('from-midi'); // 🆕 Remover classe MIDI
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
