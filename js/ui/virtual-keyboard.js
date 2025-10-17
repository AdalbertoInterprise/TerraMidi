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

            this.favoritesPanel = null;
            this.favoritesList = null;
            this.favoriteNameInput = null;

            this.instrumentCatalog = this.buildInstrumentCatalog();
            
            // Listener para catálogo completo
            this.boundHandleCatalogReady = null;

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
                            this.populateConfigSelect();
                        }
                    }
                };
                global.addEventListener('soundfont-catalog-ready', this.boundHandleCatalogReady);
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
                    isCurated: data.isCurated || false
                });
                
                metadata.set(key, {
                    key,
                    name: displayName,
                    icon,
                    category,
                    isCurated: data.isCurated || false,
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
                    this.populateConfigSelect();
                }
            }

            Object.keys(this.assignments).forEach(note => this.updateKeyVisual(note));
        }
        
        async rebuildCatalogAsync() {
            this.instrumentCatalog = await this.buildFullInstrumentCatalog();
            if (this.configSelect) {
                this.populateConfigSelect();
            }
            Object.keys(this.assignments).forEach(note => this.updateKeyVisual(note));
        }

        init() {
            if (!this.container) {
                console.warn('VirtualKeyboard: container não encontrado.');
                return;
            }

            this.collectKeys();
            this.createConfigPanel();
            this.createFavoritesPanel();
            this.loadFavorites();
            this.renderFavorites();

            if (!this.boundHandlePointerUp) {
                this.boundHandlePointerUp = () => this.releaseAllNotes();
            }
            document.addEventListener('mouseup', this.boundHandlePointerUp);
            document.addEventListener('touchend', this.boundHandlePointerUp);

            if (!this.boundHandleOutsideClick) {
                this.boundHandleOutsideClick = (event) => this.handleOutsideClick(event);
            }
            document.addEventListener('click', this.boundHandleOutsideClick);
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

            this.populateConfigSelect();

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

        populateConfigSelect() {
            if (!this.configSelect) {
                return;
            }

            if ((!this.instrumentCatalog || !this.instrumentCatalog.order.length) && this.soundfontManager && this.soundfontManager.availableInstruments) {
                this.instrumentCatalog = this.buildInstrumentCatalog();
            }

            const currentValue = this.configSelect.value;
            this.configSelect.innerHTML = '<option value="">Usar instrumento principal</option>';
            
            const categoriesHelper = this.soundfontManager ? this.soundfontManager.instrumentCategories : null;

            this.instrumentCatalog.order.forEach(category => {
                const group = document.createElement('optgroup');
                if (categoriesHelper && typeof categoriesHelper.getCategoryInfo === 'function') {
                    const info = categoriesHelper.getCategoryInfo(category);
                    group.label = info && info.icon ? `${info.icon} ${category}` : category;
                } else {
                    group.label = category;
                }
                const entries = this.instrumentCatalog.byCategory.get(category) || [];
                entries.forEach(entry => {
                    const option = document.createElement('option');
                    option.value = entry.key;
                    
                    // Destacar instrumentos curados
                    const prefix = entry.isCurated ? '⭐ ' : '';
                    option.textContent = `${prefix}${entry.icon} ${entry.name}`;
                    
                    group.appendChild(option);
                });
                this.configSelect.appendChild(group);
            });

            if (currentValue) {
                this.configSelect.value = currentValue;
            }
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
            this.updateKeyVisual(note);
            if (showStatus) {
                const instrumentMeta = this.instrumentCatalog.metadata.get(instrumentKey);
                const name = instrumentMeta ? instrumentMeta.name : instrumentKey;
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
            const instrumentKey = this.assignments[note];

            if (instrumentKey) {
                const meta = this.instrumentCatalog.metadata.get(instrumentKey);
                const icon = meta ? meta.icon : '⭐';
                keyEl.classList.add(CLASS_KEY_CUSTOM);
                keyEl.setAttribute('data-instrument-key', instrumentKey);
                if (indicator) {
                    indicator.textContent = icon;
                    indicator.title = meta ? meta.name : 'Instrumento personalizado';
                    indicator.classList.add('is-visible');
                }
            } else {
                keyEl.classList.remove(CLASS_KEY_CUSTOM);
                keyEl.removeAttribute('data-instrument-key');
                if (indicator) {
                    indicator.textContent = '';
                    indicator.title = '';
                    indicator.classList.remove('is-visible');
                }
            }
        }

        updateConfigStatus(message, isError = false) {
            if (!this.configStatus) {
                return;
            }
            this.configStatus.textContent = message;
            this.configStatus.classList.toggle('is-error', !!isError);
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
        }

        deleteFavorite(favoriteId) {
            this.favorites = this.favorites.filter(item => item.id !== favoriteId);
            this.saveFavorites();
            this.renderFavorites();
            this.updateFavoritesStatus('Combinação removida.');
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
