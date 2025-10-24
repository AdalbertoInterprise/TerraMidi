// Módulo de UI: seletor de instrumentos e catálogo compacto
(function (global) {
    'use strict';

    const CATEGORY_ICON_MAP = Object.freeze({
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
    });

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

    const DRUM_SECTION_DEFINITIONS = Object.freeze([
        { label: 'Bumbos e Caixas', min: 35, max: 40 },
        { label: 'Toms e Chimbais', min: 41, max: 48 },
        { label: 'Pratos e Ataques', min: 49, max: 59 },
        { label: 'Percussão Latina', min: 60, max: 68 },
        { label: 'Percussão de Mão', min: 69, max: 76 },
        { label: 'FX e Outros', min: 77, max: 81 }
    ]);

    const MIN_SEARCH_QUERY_LENGTH = 2;

    function getCategoryIcon(category) {
        return CATEGORY_ICON_MAP[category] || '🎵';
    }

    function getCategoryOrderValue(category) {
        const orderIndex = CATEGORY_DISPLAY_ORDER.indexOf(category);
        return orderIndex === -1 ? CATEGORY_DISPLAY_ORDER.length : orderIndex;
    }

    function resolveDrumSectionLabel(gmNote) {
        if (typeof gmNote !== 'number' || Number.isNaN(gmNote)) {
            return 'FX e Outros';
        }

        const matched = DRUM_SECTION_DEFINITIONS.find(section => gmNote >= section.min && gmNote <= section.max);
        return matched ? matched.label : 'FX e Outros';
    }

    function compareInstrumentEntries(a, b) {
        const orderDelta = getCategoryOrderValue(a.category) - getCategoryOrderValue(b.category);
        if (orderDelta !== 0) {
            return orderDelta;
        }

        if (a.category === 'Baterias GM' && b.category === 'Baterias GM') {
            const midiA = parseInt(a.variation?.gmNote ?? a.variation?.midiNumber, 10) || 0;
            const midiB = parseInt(b.variation?.gmNote ?? b.variation?.midiNumber, 10) || 0;
            if (midiA !== midiB) {
                return midiA - midiB;
            }
            const kitCompare = (a.variation?.soundfont || '').localeCompare(b.variation?.soundfont || '', 'pt-BR');
            if (kitCompare !== 0) {
                return kitCompare;
            }
        } else {
            const nameCompare = (a.subcategory || '').localeCompare(b.subcategory || '', 'pt-BR');
            if (nameCompare !== 0) {
                return nameCompare;
            }
            const soundfontCompare = (a.variation?.soundfont || '').localeCompare(b.variation?.soundfont || '', 'pt-BR');
            if (soundfontCompare !== 0) {
                return soundfontCompare;
            }
        }

        return (a.variationIndex || 0) - (b.variationIndex || 0);
    }

    function notifyChange(message) {
        if (typeof global.showInstrumentChangeNotification === 'function') {
            global.showInstrumentChangeNotification(message);
        } else {
            console.info('Instrument change:', message);
        }
    }

    function notifyError(message) {
        if (typeof global.showErrorNotification === 'function') {
            global.showErrorNotification(message);
        } else {
            console.error('Instrument error:', message);
        }
    }

    function ensureCatalogManager() {
        if (!global.catalogManager) {
            global.catalogManager = new global.CatalogManager();
        }
        // Tornar disponível também em globalThis para outros módulos
        if (typeof globalThis !== 'undefined' && !globalThis.catalogManager) {
            globalThis.catalogManager = global.catalogManager;
        }
        return global.catalogManager;
    }

    function getCategoryIcon(category) {
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

    function buildInstrumentEntries(catalogManager) {
        const entries = [];
        const categories = catalogManager.getCategories();

        categories.forEach(category => {
            const subcategories = catalogManager.getSubcategories(category);
            subcategories.forEach(subcategory => {
                const variations = catalogManager.getVariations(category, subcategory);
                variations.forEach((variation, index) => {
                    const id = `${category}::${subcategory}::${index}`;
                    const label = `${subcategory} — ${variation.soundfont}`;
                    const keywords = [
                        subcategory,
                        category,
                        variation.soundfont,
                        variation.midiNumber
                    ].join(' ').toLowerCase();

                    entries.push({
                        id,
                        label,
                        category,
                        subcategory,
                        variation,
                        variationIndex: index,
                        keywords
                    });
                });
            });
        });

        entries.sort(compareInstrumentEntries);
        
        // ✨ ENUMERAÇÃO SEQUENCIAL: Adicionar índice global fixo após ordenação
        // Isso garante que cada soundfont tenha um número único e persistente
        entries.forEach((entry, globalIndex) => {
            entry.globalIndex = globalIndex + 1; // Índice começa em 1
        });
        
        console.log(`📊 ${entries.length} soundfonts enumerados (1-${entries.length})`);
        
        return entries;
    }

    function setupInstrumentSelection() {
        console.log('🎛️ setupInstrumentSelection: Iniciando configuração do seletor...');
        
        const instrumentGrid = document.getElementById('instrument-grid');

        if (!instrumentGrid) {
            console.error('❌ setupInstrumentSelection: Elemento instrument-grid não encontrado no DOM');
            console.error('   Verifique se o elemento existe em index.html e se o script está carregando após DOMContentLoaded');
            return null; // Retorno explícito de null
        }
        
        console.log('✅ Elemento instrument-grid encontrado');

        const catalogManager = ensureCatalogManager();
        if (!catalogManager) {
            console.error('❌ setupInstrumentSelection: CatalogManager não está disponível');
            return null;
        }
        
        console.log('✅ CatalogManager disponível');
        
        const entries = buildInstrumentEntries(catalogManager);

        if (!entries.length) {
            console.warn('⚠️ Nenhuma entrada de instrumento encontrada no catálogo');
            instrumentGrid.innerHTML = `
                <div class="catalog-empty">
                    <span class="catalog-empty-icon">📭</span>
                    <p>Nenhum instrumento encontrado no catálogo.</p>
                </div>
            `;
            return null; // Retorno explícito de null
        }
        
        console.log(`✅ ${entries.length} entradas de instrumentos carregadas`);

        const entriesById = new Map(entries.map(entry => [entry.id, entry]));
        const allIds = entries.map(entry => entry.id);

        const state = {
            allIds,
            filteredIds: [...allIds],
            currentId: allIds[0] || null,
            isLoading: false,
            activeKitId: null
        };

        // � SINCRONIZAÇÃO: Exportar catálogo globalmente para virtual-keyboard
        // Cria um mapa de `variable` → entry completa para sincronização de globalIndex
        const catalogByKey = new Map();
        entries.forEach(entry => {
            // ✅ CORREÇÃO: Usar variation.variable como chave (ex: "_tone_0000_Aspirin_sf2_file")
            // para coincidir com virtual-keyboard.js
            const key = entry.variation?.variable || entry.id;
            catalogByKey.set(key, entry);
        });
        
        const globalStateExport = {
            catalogByKey,
            entries,
            entriesById,
            allIds,
            getEntryByKey: (key) => catalogByKey.get(key) || null,
            getEntryById: (id) => entriesById.get(id) || null,
            getCurrentEntry: () => state.currentId ? entriesById.get(state.currentId) || null : null,
            getCurrentGlobalIndex: () => {
                const entry = state.currentId ? entriesById.get(state.currentId) : null;
                return entry?.globalIndex ?? null;
            },
            currentId: state.currentId,
            currentEntry: state.currentId ? entriesById.get(state.currentId) || null : null,
            filteredIds: [...state.filteredIds],
            activeKitId: state.activeKitId
        };

        const exportGlobalState = () => {
            globalStateExport.currentId = state.currentId;
            globalStateExport.currentEntry = state.currentId ? entriesById.get(state.currentId) || null : null;
            globalStateExport.filteredIds = [...state.filteredIds];
            globalStateExport.activeKitId = state.activeKitId;

            if (typeof window !== 'undefined') {
                window.instrumentSelectorState = globalStateExport;
            }
            if (typeof globalThis !== 'undefined') {
                globalThis.instrumentSelectorState = globalStateExport;
            }
        };

        exportGlobalState();
        
        console.log(`📤 Catálogo exportado globalmente: ${catalogByKey.size} soundfonts com globalIndex`);
        
        // 🔔 Disparar evento para notificar que o catálogo está pronto
        if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
            const event = new CustomEvent('instrument-selector-ready', {
                detail: {
                    catalogByKey,
                    entries,
                    entriesById,
                    allIds,
                    currentId: state.currentId,
                    count: catalogByKey.size
                }
            });
            window.dispatchEvent(event);
            console.log('🔔 Evento "instrument-selector-ready" disparado');
        }

        // �🔄 FILA DE NAVEGAÇÃO: Armazena comandos recebidos durante carregamento
        const navigationQueue = {
            pending: null,  // { direction: 1 ou -1, timestamp: Date.now() }
            
            /**
             * Adiciona comando de navegação à fila
             * Se já existe um comando pendente, substitui pelo mais recente
             */
            enqueue: function(direction) {
                this.pending = {
                    direction: direction,
                    timestamp: Date.now()
                };
                console.log(`📥 Comando de navegação enfileirado: ${direction > 0 ? '▼' : '▲'} (${this.pending.timestamp})`);
            },
            
            /**
             * Processa comando pendente se existir
             * Retorna true se havia comando para processar
             */
            process: function() {
                if (!this.pending) {
                    return false;
                }
                
                const cmd = this.pending;
                this.pending = null;
                
                console.log(`📤 Processando comando enfileirado: ${cmd.direction > 0 ? '▼' : '▲'} (idade: ${Date.now() - cmd.timestamp}ms)`);
                
                // Executar navegação do comando enfileirado
                stepInstrument(cmd.direction);
                return true;
            },
            
            /**
             * Limpa fila (usado quando usuário navega por outro método)
             */
            clear: function() {
                if (this.pending) {
                    console.log(`🗑️ Fila de navegação limpa (comando ${this.pending.direction > 0 ? '▼' : '▲'} descartado)`);
                    this.pending = null;
                }
            },
            
            /**
             * Verifica se há comandos pendentes
             */
            hasPending: function() {
                return this.pending !== null;
            }
        };

        let catalogList;

        instrumentGrid.innerHTML = '';

        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'instrument-selector';

        const favoriteBtn = document.createElement('button');
        favoriteBtn.type = 'button';
        favoriteBtn.className = 'selector-favorite';
        favoriteBtn.title = 'Adicionar aos favoritos';
        favoriteBtn.textContent = '☆';

        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'instrument-selector-field';

        const selectEl = document.createElement('select');
        selectEl.id = 'instrument-select';
        selectEl.className = 'instrument-select';
        selectEl.setAttribute('aria-label', 'Instrumentos disponíveis');

        const spinContainer = document.createElement('div');
        spinContainer.className = 'instrument-selector-spin';

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'selector-spin-btn spin-up';
        upBtn.setAttribute('aria-label', 'Instrumento anterior');
        upBtn.innerHTML = '<span aria-hidden="true">▲</span>';

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'selector-spin-btn spin-down';
        downBtn.setAttribute('aria-label', 'Próximo instrumento');
        downBtn.innerHTML = '<span aria-hidden="true">▼</span>';

        spinContainer.append(upBtn, downBtn);
        fieldWrapper.append(selectEl, spinContainer);

        selectorContainer.append(favoriteBtn, fieldWrapper);
        instrumentGrid.appendChild(selectorContainer);

        const panel = document.createElement('div');
        panel.className = 'catalog-panel';
        panel.id = 'instrument-catalog-panel';

        const panelBody = document.createElement('div');
        panelBody.className = 'catalog-panel-body';
        panel.appendChild(panelBody);

        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'catalog-search-wrapper';
        searchWrapper.innerHTML = `
            <label for="catalog-search" class="catalog-search-label">Buscar por nome, categoria ou MIDI</label>
            <input id="catalog-search" type="search" class="catalog-search" placeholder="Digite para filtrar (mín. 2 letras)" autocomplete="off" />
        `;
        panelBody.appendChild(searchWrapper);

        const listContainer = document.createElement('div');
        listContainer.className = 'catalog-list';
        listContainer.setAttribute('role', 'listbox');
        panelBody.appendChild(listContainer);

        instrumentGrid.appendChild(panel);

    const searchInput = panel.querySelector('#catalog-search');

    let loadToken = 0;

        const drumKits = catalogManager.getDrumKits();

        function getFavoritesKeySet() {
            const favorites = catalogManager.getFavorites();
            const set = new Set();
            favorites.forEach(item => {
                if (item) {
                    set.add(`${item.category}::${item.subcategory}::${item.variationIndex}`);
                }
            });
            return set;
        }

        const KIT_OPTION_PREFIX = 'kit::';

        function refreshSelectOptions() {
            console.log('🔄 refreshSelectOptions iniciado');
            console.log(`   ├─ state.currentId: ${state.currentId}`);
            console.log(`   ├─ state.activeKitId: ${state.activeKitId}`);
            console.log(`   └─ state.filteredIds.length: ${state.filteredIds.length}`);
            
            const favoritesSet = getFavoritesKeySet();
            selectEl.innerHTML = '';

            let hasInstrumentOptions = false;
            let pendingKitGroup = null;
            let selectedOptionFound = false;

            if (drumKits.length) {
                pendingKitGroup = document.createElement('optgroup');
                pendingKitGroup.label = '🥁 Kits completos de bateria';
                drumKits.forEach(kit => {
                    const option = document.createElement('option');
                    option.value = `${KIT_OPTION_PREFIX}${kit.id}`;
                    const curatedCount = kit.curatedPieces?.length || 0;
                    const extraPieces = kit.extraPieces || (kit.totalPieces - curatedCount);
                    const descriptor = curatedCount
                        ? `${curatedCount} peças essenciais${extraPieces > 0 ? ` (+${extraPieces} GM)` : ''}`
                        : `${kit.totalPieces} peças GM`;
                    option.textContent = `${kit.label} — ${descriptor}`;
                    option.dataset.kitId = kit.id;
                    if (state.activeKitId === kit.id) {
                        option.selected = true;
                    }
                    pendingKitGroup.appendChild(option);
                });
            }

            const createOption = (entry, isFavorite) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.dataset.favorite = isFavorite ? 'true' : 'false';

                // ✨ NUMERAÇÃO SEQUENCIAL: Adicionar índice global ao início
                const numberPrefix = `${entry.globalIndex}. `;
                const prefix = isFavorite ? '⭐ ' : '';
                const categoryIcon = getCategoryIcon(entry.category);

                if (entry.category === 'Baterias GM') {
                    const midiNumber = parseInt(entry.variation?.gmNote ?? entry.variation?.midiNumber, 10);
                    const gmDisplay = Number.isFinite(midiNumber) ? `GM ${String(midiNumber).padStart(2, '0')}` : entry.subcategory;
                    option.textContent = `${numberPrefix}${prefix}${categoryIcon} ${gmDisplay} • ${entry.subcategory} — ${entry.variation.soundfont}`;
                } else {
                    option.textContent = `${numberPrefix}${prefix}${categoryIcon} ${entry.subcategory} — ${entry.variation.soundfont}`;
                }

                if (!state.activeKitId && entry.id === state.currentId) {
                    option.selected = true;
                    selectedOptionFound = true;
                    console.log(`✅ Opção marcada como selected: ${entry.subcategory} (id: ${entry.id})`);
                }

                hasInstrumentOptions = true;
                return option;
            };

            const favoritesList = catalogManager.getFavorites();
            const favoriteEntries = [];
            const favoriteIds = new Set();

            favoritesList.forEach(fav => {
                if (!fav) return;
                const favId = `${fav.category}::${fav.subcategory}::${fav.variationIndex}`;
                if (!state.filteredIds.includes(favId)) return;
                const entry = entriesById.get(favId);
                if (!entry) return;
                favoriteEntries.push(entry);
                favoriteIds.add(favId);
            });

            if (favoriteEntries.length) {
                const favoritesGroup = document.createElement('optgroup');
                const countLabel = favoriteEntries.length === 1 
                    ? '1 favorito' 
                    : `${favoriteEntries.length} favoritos`;
                favoritesGroup.label = `⭐ Meus Favoritos (${countLabel})`;
                favoriteEntries.forEach(entry => {
                    favoritesGroup.appendChild(createOption(entry, true));
                });
                selectEl.appendChild(favoritesGroup);
            }

            const categoriesMap = new Map();

            state.filteredIds.forEach(id => {
                if (favoriteIds.has(id)) {
                    return;
                }
                const entry = entriesById.get(id);
                if (!entry) return;
                if (!categoriesMap.has(entry.category)) {
                    categoriesMap.set(entry.category, []);
                }
                categoriesMap.get(entry.category).push(entry);
            });

            const sortedCategories = Array.from(categoriesMap.keys()).sort((a, b) => {
                const delta = getCategoryOrderValue(a) - getCategoryOrderValue(b);
                if (delta !== 0) return delta;
                return a.localeCompare(b, 'pt-BR');
            });

            sortedCategories.forEach(category => {
                const categoryEntries = categoriesMap.get(category);
                if (!categoryEntries || !categoryEntries.length) {
                    return;
                }

                if (category === 'Baterias GM') {
                    const sectionBuckets = new Map();

                    categoryEntries.forEach(entry => {
                        const midiNumber = parseInt(entry.variation?.gmNote ?? entry.variation?.midiNumber, 10);
                        const sectionLabel = resolveDrumSectionLabel(midiNumber);
                        if (!sectionBuckets.has(sectionLabel)) {
                            sectionBuckets.set(sectionLabel, []);
                        }
                        sectionBuckets.get(sectionLabel).push(entry);
                    });

                    DRUM_SECTION_DEFINITIONS.forEach(section => {
                        const items = sectionBuckets.get(section.label);
                        if (!items || !items.length) {
                            return;
                        }

                        items.sort(compareInstrumentEntries);
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `${getCategoryIcon(category)} ${category} • ${section.label}`;
                        items.forEach(entry => {
                            optgroup.appendChild(createOption(entry, favoritesSet.has(entry.id)));
                        });
                        selectEl.appendChild(optgroup);
                        sectionBuckets.delete(section.label);
                    });

                    sectionBuckets.forEach((items, sectionLabel) => {
                        if (!items.length) {
                            return;
                        }
                        items.sort(compareInstrumentEntries);
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = `${getCategoryIcon(category)} ${category} • ${sectionLabel}`;
                        items.forEach(entry => {
                            optgroup.appendChild(createOption(entry, favoritesSet.has(entry.id)));
                        });
                        selectEl.appendChild(optgroup);
                    });

                    return;
                }

                categoryEntries.sort(compareInstrumentEntries);
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${getCategoryIcon(category)} ${category}`;
                categoryEntries.forEach(entry => {
                    optgroup.appendChild(createOption(entry, favoritesSet.has(entry.id)));
                });
                selectEl.appendChild(optgroup);
            });

            if (pendingKitGroup) {
                selectEl.appendChild(pendingKitGroup);
            }

            if (!hasInstrumentOptions) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'Nenhum instrumento disponível';
                emptyOption.disabled = true;
                emptyOption.selected = true;
                selectEl.appendChild(emptyOption);
            }
            
            // 🔍 LOG DIAGNÓSTICO: Estado final após refreshSelectOptions
            console.log('🔍 refreshSelectOptions concluído');
            console.log(`   ├─ Total de opções criadas: ${selectEl.options.length}`);
            console.log(`   ├─ Opção com selected=true encontrada: ${selectedOptionFound ? '✅' : '❌'}`);
            console.log(`   ├─ selectEl.selectedIndex: ${selectEl.selectedIndex}`);
            console.log(`   ├─ selectEl.value: ${selectEl.value}`);
            
            if (selectEl.selectedOptions[0]) {
                console.log(`   └─ Texto da opção selecionada: ${selectEl.selectedOptions[0].textContent.substring(0, 60)}...`);
            } else {
                console.warn('   └─ ❌ Nenhuma opção está selecionada no DOM!');
            }
        }

        function handleCatalogVisibleChange({ visibleIds = [], mode, query }) {
            const idsArray = Array.isArray(visibleIds) ? visibleIds : [];
            const trimmedQuery = typeof query === 'string' ? query.trim() : '';
            const isSearchActive = trimmedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

            const nextIds = isSearchActive ? [...idsArray] : [...state.allIds];
            state.filteredIds = nextIds;

            if (isSearchActive) {
                state.activeKitId = null;
            }

            const currentIsVisible = state.currentId && nextIds.includes(state.currentId);
            if (!currentIsVisible && nextIds.length) {
                const nextId = nextIds[0];
                selectInstrument(nextId, { force: true, shouldLoad: false, ensureVisible: true });
                return;
            }

            if (!nextIds.length) {
                state.currentId = null;
            }

            refreshSelectOptions();
            updateFavoriteButtonState();
            exportGlobalState();
        }

        function initializeCatalogList() {
            if (!global.catalogList || typeof global.catalogList.create !== 'function') {
                console.warn('Módulo catalogList não encontrado. A lista será desativada.');
                handleCatalogVisibleChange({ visibleIds: [], mode: 'favorites', query: '' });
                return;
            }

            const getFavoriteIds = () => {
                const favorites = catalogManager.getFavorites();
                return favorites
                    .map(fav => fav && `${fav.category}::${fav.subcategory}::${fav.variationIndex}`)
                    .filter(Boolean);
            };

            catalogList = global.catalogList.create({
                container: listContainer,
                searchInput,
                entriesById,
                allIds: state.allIds,
                getFavoriteIds,
                onSelect: (id, options = {}) => {
                    if (!id) {
                        return;
                    }
                    const shouldLoad = options.shouldLoad !== false;
                    selectInstrument(id, { force: true, ensureVisible: true, shouldLoad });
                },
                onToggleFavorite: (id) => {
                    const entry = entriesById.get(id);
                    if (!entry) {
                        return false;
                    }

                    const isFav = toggleFavorite(entry);
                    const instrumentName = entry.subcategory || 'Instrumento';
                    const favCount = catalogManager.getFavorites().length;

                    notifyChange(isFav
                        ? `⭐ #${entry.globalIndex} — ${instrumentName} adicionado aos favoritos (${favCount} total${favCount !== 1 ? 'is' : ''})`
                        : `☆ #${entry.globalIndex} — ${instrumentName} removido dos favoritos${favCount > 0 ? ` (${favCount} restante${favCount !== 1 ? 's' : ''})` : ''}`
                    );

                    return isFav;
                },
                onStep: stepInstrument,
                onVisibleChange: handleCatalogVisibleChange,
                getActiveId: () => state.currentId,
                isFavorite: (id) => {
                    const entry = entriesById.get(id);
                    if (!entry) {
                        return false;
                    }
                    return catalogManager.isFavorite(entry.category, entry.subcategory, entry.variationIndex);
                }
            });

            catalogList.refresh();
        }

        function resolveKitPieces(kit, { curatedOnly = true } = {}) {
            const sourcePieces = (curatedOnly && kit.curatedPieces && kit.curatedPieces.length)
                ? kit.curatedPieces
                : kit.pieces;

            return sourcePieces.map(piece => {
                const id = `${piece.category}::${piece.subcategory}::${piece.variationIndex}`;
                const entry = entriesById.get(id);
                if (!entry) return null;

                return {
                    id,
                    title: entry.subcategory,
                    gmNote: piece.gmNote,
                    midiNumber: piece.midiNumber,
                    soundfont: piece.soundfont,
                    variation: entry.variation,
                    entry
                };
            }).filter(Boolean);
        }

            async function applyDrumKitSelection(targetKit) {
                if (!targetKit) {
                    return;
                }

                const pieces = resolveKitPieces(targetKit);
                if (!pieces.length) {
                    notifyError('Kit selecionado não possui peças disponíveis.');
                    return;
                }

                if (!global.soundfontManager || typeof global.soundfontManager.applyDrumKit !== 'function') {
                    notifyError('Gerenciador de soundfonts não suporta kits completos.');
                    return;
                }

                const firstPiece = pieces[0];
                if (!firstPiece) {
                    return;
                }

                if (searchInput) {
                    searchInput.value = '';
                }

                if (catalogList) {
                    if (typeof catalogList.setQuery === 'function') {
                        catalogList.setQuery('');
                    }
                    if (typeof catalogList.refresh === 'function') {
                        catalogList.refresh();
                    }
                }

                const token = ++loadToken;
                setLoadingState(true);

                try {
                    const mappingPayload = {
                        kitId: targetKit.id,
                        label: targetKit.label,
                        curatedCount: targetKit.curatedPieces?.length || pieces.length,
                        totalPieces: targetKit.totalPieces,
                        pieces: pieces.map(piece => ({
                            id: piece.id,
                            gmNote: piece.gmNote,
                            midiNumber: piece.midiNumber,
                            soundfont: piece.soundfont,
                            variation: piece.variation
                        }))
                    };

                    await global.soundfontManager.applyDrumKit(mappingPayload, { origin: 'ui' });

                    if (token !== loadToken) {
                        return;
                    }

                    state.activeKitId = targetKit.id;

                    selectInstrument(firstPiece.id, {
                        force: true,
                        ensureVisible: true,
                        shouldLoad: false,
                        preserveKit: true
                    });

                    notifyChange(`Kit carregado: ${targetKit.label}`);
                } catch (error) {
                    console.error('Erro ao aplicar kit completo:', error);
                    if (token === loadToken) {
                        notifyError('Erro ao carregar kit completo de bateria.');
                    }
                } finally {
                    if (token === loadToken) {
                        setLoadingState(false);
                    }
                }
            }

        function updateFavoriteButtonState() {
            // Atualizar contador de favoritos
            const favoritesCount = catalogManager.getFavorites().length;
            favoriteBtn.setAttribute('data-count', favoritesCount > 0 ? favoritesCount : '');
            
            if (state.activeKitId) {
                favoriteBtn.disabled = true;
                favoriteBtn.classList.remove('is-favorite');
                favoriteBtn.textContent = '☆';
                favoriteBtn.title = `Favoritos não disponíveis para kits completos${favoritesCount > 0 ? ` (${favoritesCount} favoritos)` : ''}`;
                favoriteBtn.setAttribute('aria-pressed', 'false');
                return;
            }

            if (!state.currentId) {
                favoriteBtn.disabled = true;
                favoriteBtn.classList.remove('is-favorite');
                favoriteBtn.textContent = '☆';
                favoriteBtn.title = favoritesCount > 0 ? `${favoritesCount} instrumento${favoritesCount !== 1 ? 's' : ''} favorito${favoritesCount !== 1 ? 's' : ''}` : 'Nenhum instrumento selecionado';
                return;
            }

            favoriteBtn.disabled = false;
            const entry = entriesById.get(state.currentId);
            const isFav = entry ? catalogManager.isFavorite(entry.category, entry.subcategory, entry.variationIndex) : false;
            favoriteBtn.classList.toggle('is-favorite', !!isFav);
            favoriteBtn.textContent = isFav ? '⭐' : '☆';
            
            // Tooltip informativo
            const instrumentName = entry ? entry.subcategory : '';
            if (isFav) {
                favoriteBtn.title = `${instrumentName} está nos favoritos (${favoritesCount} total${favoritesCount !== 1 ? 'is' : ''})`;
            } else {
                favoriteBtn.title = favoritesCount > 0 
                    ? `Adicionar ${instrumentName} aos favoritos (${favoritesCount} favorito${favoritesCount !== 1 ? 's' : ''})` 
                    : `Adicionar ${instrumentName} aos favoritos`;
            }
            
            favoriteBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
            favoriteBtn.setAttribute('aria-label', `Favoritos: ${favoritesCount} instrumento${favoritesCount !== 1 ? 's' : ''}`);
        }
        function setLoadingState(isLoading) {
            state.isLoading = isLoading;
            selectorContainer.classList.toggle('is-loading', isLoading);
            selectEl.disabled = isLoading;
            upBtn.disabled = isLoading;
            downBtn.disabled = isLoading;
            
            // 🔄 Processar fila de navegação quando carregamento terminar
            if (!isLoading && navigationQueue.hasPending()) {
                console.log('🔄 Carregamento concluído, processando fila de navegação...');
                // Pequeno delay para garantir que o estado esteja estável
                setTimeout(() => {
                    if (!state.isLoading) { // Verificação dupla
                        navigationQueue.process();
                    }
                }, 50);
            }
        }

        function updateInstrumentInfo(entry) {
            // Card removed - function kept for compatibility but does nothing
        }
        
        /**
         * ========================================================================
         * SINCRONIZAÇÃO VISUAL FORÇADA DO ELEMENTO <SELECT>
         * ========================================================================
         * Força o elemento visual <select> a refletir o estado atual (state.currentId).
         * 
         * Útil quando:
         * - Mudanças assíncronas podem não refletir imediatamente
         * - Após carregamento de soundfont via MIDI
         * - Em navegações rápidas que podem causar race conditions
         * - Para garantir consistência entre UI e backend de áudio
         * 
         * Técnicas aplicadas:
         * 1. Definição direta do value
         * 2. Reconstrução das opções se necessário
         * 3. Force reflow do navegador
         * 4. Validação do resultado final
         */
        function forceSyncVisualSelect() {
            if (!state.currentId) {
                console.warn('⚠️ forceSyncVisualSelect: state.currentId não definido');
                return;
            }
            
            if (!selectEl) {
                console.error('❌ forceSyncVisualSelect: selectEl não encontrado');
                return;
            }
            
            console.log('🔄 forceSyncVisualSelect - Forçando sincronização visual');
            console.log(`   └─ state.currentId: ${state.currentId}`);
            
            // Salvar valor anterior para comparação
            const previousValue = selectEl.value;
            
            // Tentativa 1: Definir valor diretamente
            selectEl.value = state.currentId;
            
            // Verificar se funcionou
            if (selectEl.value === state.currentId) {
                // ✅ Sucesso imediato!
                const selectedText = selectEl.selectedOptions[0]?.textContent || 'N/A';
                console.log(`   ✅ Sincronização imediata bem-sucedida`);
                console.log(`   └─ Exibindo: ${selectedText.substring(0, 60)}...`);
                
                // Force reflow para garantir renderização visual
                selectEl.style.display = 'none';
                selectEl.offsetHeight; // Trigger reflow
                selectEl.style.display = '';
                
                return;
            }
            
            // ⚠️ Valor não sincronizou - precisamos reconstruir as opções
            console.warn(`   ⚠️ Sincronização direta falhou`);
            console.warn(`   ├─ Valor anterior: ${previousValue}`);
            console.warn(`   ├─ Valor após tentativa: ${selectEl.value}`);
            console.warn(`   ├─ Esperado: ${state.currentId}`);
            console.warn(`   └─ Ação: Reconstruindo opções...`);
            
            // Tentativa 2: Reconstruir opções do select
            refreshSelectOptions();
            
            // Verificar novamente
            if (selectEl.value === state.currentId) {
                console.log(`   ✅ Sincronização após refreshSelectOptions bem-sucedida`);
            } else {
                console.error(`   ❌ FALHA CRÍTICA: Não foi possível sincronizar mesmo após refresh`);
                console.error(`   ├─ selectEl.value: ${selectEl.value}`);
                console.error(`   ├─ state.currentId: ${state.currentId}`);
                console.error(`   └─ Total de opções: ${selectEl.options.length}`);
                
                // Debug: Listar todas as opções disponíveis
                console.error('   📋 Opções disponíveis:');
                for (let i = 0; i < Math.min(selectEl.options.length, 10); i++) {
                    const opt = selectEl.options[i];
                    console.error(`      ${i + 1}. value="${opt.value}" ${opt.value === state.currentId ? '← ESPERADO' : ''}`);
                }
                if (selectEl.options.length > 10) {
                    console.error(`      ... e mais ${selectEl.options.length - 10} opções`);
                }
            }
            
            // Tentativa 3: Force reflow sempre, independentemente do resultado
            selectEl.style.display = 'none';
            selectEl.offsetHeight; // Force reflow
            selectEl.style.display = '';
            
            // Validação final
            const finalValue = selectEl.value;
            const finalText = selectEl.selectedOptions[0]?.textContent || 'N/A';
            const isCorrect = finalValue === state.currentId;
            
            console.log(`   ${isCorrect ? '✅' : '❌'} Resultado final da sincronização:`);
            console.log(`   ├─ Correto: ${isCorrect ? 'SIM ✅' : 'NÃO ❌'}`);
            console.log(`   ├─ selectEl.value: ${finalValue}`);
            console.log(`   ├─ state.currentId: ${state.currentId}`);
            console.log(`   └─ Texto exibido: ${finalText.substring(0, 60)}${finalText.length > 60 ? '...' : ''}`);
        }

        /**
         * ========================================================================
         * SELEÇÃO DE INSTRUMENTO COM SINCRONIZAÇÃO COMPLETA
         * ========================================================================
         * Função central que gerencia a seleção de instrumentos no catálogo.
         * 
         * Responsabilidades:
         * 1. Atualizar state.currentId
         * 2. Sincronizar visualmente o <select> (#instrument-select)
         * 3. Atualizar botão de favoritos
         * 4. Destacar item na lista do catálogo
         * 5. Carregar soundfont via soundfontManager
         * 6. Mostrar notificação ao usuário
         * 
         * @param {string} id - ID único do instrumento (gerado por buildInstrumentId)
         * @param {Object} options - Opções de configuração
         * @param {boolean} options.force - Força seleção mesmo se já for o instrumento atual
         * @param {boolean} options.shouldLoad - Se deve carregar o soundfont (default: true)
         * @param {boolean} options.ensureVisible - Se deve rolar para o item na lista
         * @param {boolean} options.preserveKit - Se deve preservar kit de bateria ativo
         */
        async function selectInstrument(id, options = {}) {
            const entry = entriesById.get(id);
            if (!entry) {
                console.warn(`⚠️ selectInstrument: Entry não encontrada para id "${id}"`);
                notifyError('Instrumento não encontrado');
                return;
            }

            // 🔓 Verificar se seleção rápida está bloqueada por soundfonts individuais
            if (window.virtualKeyboard || window.musicTherapyApp?.virtualKeyboard) {
                const keyboard = window.virtualKeyboard || window.musicTherapyApp.virtualKeyboard;
                if (keyboard && typeof keyboard.canUseQuickInstrumentSelection === 'function') {
                    if (!keyboard.canUseQuickInstrumentSelection()) {
                        const message = '🔒 Notas bloqueadas! Soundfonts individuais configurados. Clique no botão "Notas Bloqueadas" para liberar todas as teclas.';
                        console.warn('⚠️', message);
                        
                        if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                            SystemLogger.log('warn', message);
                        }
                        
                        notifyError(message);
                        return;
                    }
                }
            }

            const shouldLoad = options.shouldLoad !== false;
            const force = options.force === true;
            const preserveKit = options.preserveKit === true;

            // 🔍 LOG DIAGNÓSTICO: Entrada no selectInstrument
            console.log('🎼 selectInstrument - Selecionando instrumento');
            console.log(`   ├─ #${entry.globalIndex} de ${entries.length}`);
            console.log(`   ├─ ID: ${id}`);
            console.log(`   ├─ Instrumento: ${entry.subcategory}`);
            console.log(`   ├─ Categoria: ${entry.category}`);
            console.log(`   ├─ Soundfont: ${entry.variation.soundfont}`);
            console.log(`   ├─ MIDI: ${entry.variation.midiNumber}`);
            console.log(`   ├─ force: ${force}`);
            console.log(`   ├─ shouldLoad: ${shouldLoad}`);
            console.log(`   └─ state.currentId (antes): ${state.currentId}`);

            if (!preserveKit) {
                state.activeKitId = null;
            }

            // 🗑️ Limpar fila de navegação (usuário navegou por outro método)
            navigationQueue.clear();

            // Se já é o instrumento atual e não está forçando, pular
            if (id === state.currentId && !force) {
                console.log('⚠️ Instrumento já selecionado (pulando)');
                if (options.ensureVisible && catalogList && typeof catalogList.setActive === 'function') {
                    catalogList.setActive(state.currentId, { ensureVisible: true });
                }
                return;
            }

            // ✅ PASSO 1: Atualizar estado interno
            const previousId = state.currentId;
            state.currentId = id;
            console.log(`✅ PASSO 1: state.currentId atualizado`);
            console.log(`   └─ ${previousId} → ${id}`);
            exportGlobalState();
            
            // ✅ PASSO 2: Atualizar opções do <select> (reconstruir dropdown)
            refreshSelectOptions();
            console.log(`✅ PASSO 2: refreshSelectOptions() executado`);
            
            // ✅ PASSO 3: Sincronização FORÇADA do elemento visual
            // Alguns navegadores podem não atualizar imediatamente após refreshSelectOptions
            if (selectEl) {
                const selectedOption = selectEl.selectedOptions[0];
                const isCorrect = selectEl.value === id && selectedOption;
                
                console.log('🔍 PASSO 3: Validação da sincronização visual');
                console.log(`   ├─ selectEl.value: ${selectEl.value}`);
                console.log(`   ├─ Esperado: ${id}`);
                console.log(`   ├─ Sincronizado: ${isCorrect ? '✅ SIM' : '❌ NÃO'}`);
                
                if (selectedOption) {
                    const displayText = selectedOption.textContent.substring(0, 80);
                    console.log(`   └─ Texto exibido: "${displayText}${selectedOption.textContent.length > 80 ? '...' : ''}"`);
                }
                
                // Se não sincronizou corretamente, forçar manualmente
                if (!isCorrect) {
                    console.warn('⚠️ Sincronização falhou, aplicando correções...');
                    
                    // Tentativa 1: Definir valor diretamente
                    selectEl.value = id;
                    console.log('   ├─ Tentativa 1: selectEl.value = id');
                    
                    // Tentativa 2: Disparar evento change
                    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    selectEl.dispatchEvent(changeEvent);
                    console.log('   ├─ Tentativa 2: dispatchEvent(change)');
                    
                    // Tentativa 3: Forçar reflow do navegador
                    selectEl.style.display = 'none';
                    selectEl.offsetHeight; // Force reflow
                    selectEl.style.display = '';
                    console.log('   ├─ Tentativa 3: force reflow');
                    
                    // Verificar resultado
                    const nowCorrect = selectEl.value === id;
                    console.log(`   └─ Resultado: ${nowCorrect ? '✅ Corrigido' : '❌ Ainda incorreto'}`);
                    
                    if (!nowCorrect) {
                        console.error('❌ ERRO CRÍTICO: Não foi possível sincronizar o elemento select!');
                        console.error('   Isso pode causar inconsistência entre UI e áudio');
                    }
                }
            }
            
            // ✅ PASSO 4: Atualizar botão de favoritos
            updateFavoriteButtonState();
            console.log('✅ PASSO 4: Botão de favoritos atualizado');
            
            // ✅ PASSO 5: Atualizar info do instrumento (se existir)
            updateInstrumentInfo(entry);
            
            // ✅ PASSO 6: Destacar na lista do catálogo lateral
            if (catalogList && typeof catalogList.setActive === 'function') {
                catalogList.setActive(state.currentId, {
                    ensureVisible: options.ensureVisible === true
                });
                console.log(`✅ PASSO 6: Item destacado na lista do catálogo${options.ensureVisible ? ' (scroll automático)' : ''}`);
            }

            // Se não deve carregar soundfont, parar aqui
            if (!shouldLoad || !global.soundfontManager) {
                console.log('ℹ️ Carregamento de soundfont pulado (shouldLoad=false ou soundfontManager ausente)');
                return;
            }

            // ✅ PASSO 7: Carregar soundfont no backend de áudio
            const token = ++loadToken;
            setLoadingState(true);
            
            console.log('🔄 PASSO 7: Iniciando carregamento do soundfont...');
            console.log(`   ├─ Token: ${token}`);
            console.log(`   ├─ Arquivo: ${entry.variation.file}`);
            console.log(`   └─ URL: ${entry.variation.url}`);

            try {
                await global.soundfontManager.loadFromCatalog(entry.variation);
                
                // Verificar se ainda é a requisição mais recente (evita race conditions)
                if (token === loadToken) {
                    console.log('✅ PASSO 7: Soundfont carregado com sucesso!');
                    
                    // Notificação visual ao usuário com número sequencial
                    notifyChange(`#${entry.globalIndex} — ${entry.subcategory} (${entry.variation.soundfont})`);
                    
                    // ✅ PASSO 8: Sincronização visual final (garantia dupla)
                    console.log('🔄 PASSO 8: Sincronização visual final...');
                    forceSyncVisualSelect();
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('✅ SELEÇÃO DE INSTRUMENTO CONCLUÍDA COM SUCESSO');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                } else {
                    console.warn('⚠️ Token desatualizado (nova requisição em andamento)');
                }
            } catch (error) {
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('❌ ERRO AO CARREGAR SOUNDFONT');
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('Erro:', error);
                console.error('Stack:', error.stack);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                if (token === loadToken) {
                    // 🔄 FALLBACK: Tentar carregar um instrumento de emergência (Piano padrão)
                    console.warn('🔄 Tentando fallback para Piano padrão (0000_FluidR3)...');
                    try {
                        // Buscar piano padrão no catálogo de entries
                        let fallbackEntry = entries.find(e => 
                            e.variation && e.variation.variable && e.variation.variable.includes('0000_FluidR3')
                        );
                        
                        // Se não encontrou FluidR3, tentar qualquer piano
                        if (!fallbackEntry) {
                            console.warn('⚠️ FluidR3 não encontrado, buscando qualquer Piano...');
                            fallbackEntry = entries.find(e => 
                                e.category === 'Pianos' && e.variation && e.variation.variable
                            );
                        }
                        
                        // Se ainda não encontrou, usar o primeiro instrumento disponível
                        if (!fallbackEntry && entries.length > 0) {
                            console.warn('⚠️ Nenhum piano encontrado, usando primeiro instrumento do catálogo...');
                            fallbackEntry = entries[0];
                        }
                        
                        if (fallbackEntry) {
                            console.log(`🎹 Carregando fallback: ${fallbackEntry.subcategory || fallbackEntry.variation.soundfont}`);
                            await global.soundfontManager.loadFromCatalog(fallbackEntry.variation);
                            notifyError(`Instrumento indisponível. Usando ${fallbackEntry.subcategory || 'instrumento padrão'}.`);
                            console.log('✅ Fallback carregado com sucesso');
                            
                            // Atualizar interface para refletir o instrumento de fallback
                            state.currentId = fallbackEntry.id;
                            exportGlobalState();
                            forceSyncVisualSelect();
                        } else {
                            console.error('❌ Nenhum instrumento disponível para fallback!');
                            notifyError('Erro ao carregar instrumento. Catálogo vazio.');
                        }
                    } catch (fallbackError) {
                        console.error('❌ Fallback também falhou:', fallbackError);
                        notifyError('Erro crítico ao carregar instrumento.');
                    }
                }
            } finally {
                if (token === loadToken) {
                    setLoadingState(false);
                }
            }
        }

        /**
         * ========================================================================
         * NAVEGAÇÃO INCREMENTAL DE INSTRUMENTOS (+1 / -1)
         * ========================================================================
         * Navega pelo catálogo de soundfonts usando os botões "spin-up" (▲) e "spin-down" (▼).
         * 
         * Características:
         * - Navegação circular: do último vai para o primeiro e vice-versa
         * - Sincronização imediata: state.currentId → selectEl.value → soundfont
         * - Feedback visual: animação nos botões
         * - Carregamento automático: dispara loadFromCatalog()
         * - Logs detalhados: rastreamento completo da navegação
         * 
         * @param {number} direction - Direção da navegação: -1 (anterior) ou +1 (próximo)
         */
        function stepInstrument(direction) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎯 STEP INSTRUMENT - Navegação Incremental');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`   ├─ Direção: ${direction > 0 ? '▼ Próximo (+1)' : '▲ Anterior (-1)'}`);
            console.log(`   ├─ state.currentId (antes): ${state.currentId}`);
            console.log(`   ├─ Total de instrumentos filtrados: ${state.filteredIds.length}`);
            
            // 🔄 Se estiver em carregamento, enfileirar comando
            if (state.isLoading) {
                console.log('📥 stepInstrument: enfileirando (carregamento em andamento)');
                navigationQueue.enqueue(direction);
                return;
            }
            
            // Validação: verificar se há instrumentos disponíveis
            if (!state.filteredIds.length) {
                console.error('❌ Nenhum instrumento disponível para navegação');
                console.error('   └─ state.filteredIds está vazio');
                notifyError('Nenhum instrumento disponível');
                return;
            }

            // Encontrar índice atual no array filtrado
            const currentIndex = state.filteredIds.indexOf(state.currentId);
            console.log(`   ├─ Índice atual no array: ${currentIndex}`);
            
            // Calcular próximo índice com wrap-around circular
            // Se currentIndex === -1 (não encontrado), começa do índice 0
            const nextIndex = currentIndex === -1
                ? 0
                : (currentIndex + direction + state.filteredIds.length) % state.filteredIds.length;
            
            const nextId = state.filteredIds[nextIndex];
            const nextEntry = entriesById.get(nextId);
            
            console.log(`   ├─ Próximo índice: ${nextIndex} / ${state.filteredIds.length - 1}`);
            console.log(`   ├─ Próximo ID: ${nextId}`);
            console.log(`   ├─ Próximo instrumento: #${nextEntry?.globalIndex || '?'} — ${nextEntry?.subcategory || 'N/A'}`);
            console.log(`   └─ Soundfont: ${nextEntry?.variation?.soundfont || 'N/A'}`);
            
            // Validação: verificar se o próximo ID existe
            if (!nextEntry) {
                console.error('❌ Próximo instrumento não encontrado no entriesById');
                console.error(`   └─ ID procurado: ${nextId}`);
                notifyError('Instrumento não encontrado');
                return;
            }
            
            // ✅ FEEDBACK VISUAL: Adicionar classe de animação ao botão clicado
            const clickedButton = direction > 0 ? downBtn : upBtn;
            clickedButton.classList.add('active', 'midi-triggered');
            
            // Remover animação após 300ms
            setTimeout(() => {
                clickedButton.classList.remove('active', 'midi-triggered');
            }, 300);
            
            // ✅ NAVEGAÇÃO: Selecionar próximo instrumento
            // force: true → garante que o instrumento será carregado mesmo se já estiver selecionado
            // shouldLoad: true → carrega o soundfont automaticamente
            // ensureVisible: true → rola a lista do catálogo para o instrumento
            console.log('🔄 Chamando selectInstrument com force=true...');
            selectInstrument(nextId, { 
                force: true,
                shouldLoad: true,
                ensureVisible: true
            });
            
            console.log('✅ stepInstrument concluído');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        function toggleFavorite(entry) {
            const newState = catalogManager.toggleFavorite(entry.category, entry.subcategory, entry.variationIndex);
            updateFavoriteButtonState();
            if (catalogList && typeof catalogList.refresh === 'function') {
                catalogList.refresh();
            } else {
                refreshSelectOptions();
            }
            return newState;
        }

        selectEl.addEventListener('change', (event) => {
            const selectedId = event.target.value;

            if (selectedId && selectedId.startsWith(KIT_OPTION_PREFIX)) {
                const kitKey = selectedId.slice(KIT_OPTION_PREFIX.length);
                const kit = drumKits.find(item => item.id === kitKey);
                if (!kit) {
                    notifyError('Kit selecionado não está disponível.');
                    return;
                }

                applyDrumKitSelection(kit);
                return;
            }

            if (selectedId) {
                selectInstrument(selectedId, { force: true });
            }
        });

        selectEl.addEventListener('wheel', (event) => {
            if (state.isLoading) return;
            if (document.activeElement !== selectEl) return;
            event.preventDefault();
            const direction = event.deltaY > 0 ? 1 : -1;
            stepInstrument(direction);
        }, { passive: false });

        upBtn.addEventListener('click', () => stepInstrument(-1));
        downBtn.addEventListener('click', () => stepInstrument(1));

        favoriteBtn.addEventListener('click', () => {
            if (!state.currentId) return;
            const entry = entriesById.get(state.currentId);
            if (!entry) return;
            
            // Adicionar efeito visual temporário
            favoriteBtn.style.animation = 'none';
            setTimeout(() => {
                favoriteBtn.style.animation = '';
            }, 10);
            
            const isFav = toggleFavorite(entry);
            const instrumentName = entry.subcategory || 'Instrumento';
            const favCount = catalogManager.getFavorites().length;
            
            if (isFav) {
                notifyChange(`⭐ #${entry.globalIndex} — ${instrumentName} adicionado aos favoritos (${favCount} total${favCount !== 1 ? 'is' : ''})`);
            } else {
                notifyChange(`☆ #${entry.globalIndex} — ${instrumentName} removido dos favoritos${favCount > 0 ? ` (${favCount} restante${favCount !== 1 ? 's' : ''})` : ''}`);
            }
        });
        initializeCatalogList();
        refreshSelectOptions();
        updateFavoriteButtonState();

        if (state.currentId) {
            selectInstrument(state.currentId, { force: true });
        }

        if (typeof window !== 'undefined' && !window.__terraMidiKitListenerRegistered) {
            const handleExternalDrumKitChange = (event) => {
                const detail = event?.detail || {};

                if (!detail.kitId || detail.origin === 'ui') {
                    return;
                }

                state.activeKitId = detail.kitId;
                refreshSelectOptions();
                updateFavoriteButtonState();

                if (detail.anchorInstrumentId && typeof selectInstrument === 'function') {
                    selectInstrument(detail.anchorInstrumentId, {
                        force: true,
                        shouldLoad: false,
                        preserveKit: true
                    });
                }
            };

            window.addEventListener('terra-midi:drum-kit-changed', handleExternalDrumKitChange);
            window.__terraMidiKitListenerRegistered = true;
        }
        
        /**
         * Retorna função pública para seleção programática de instrumento por índice do flatCatalog
         * Usado pelo catalogNavigationManager para sincronizar UI com navegação MIDI
         */
        return {
            selectInstrument,
            selectInstrumentByIndex: function(flatCatalogIndex) {
                if (!Number.isFinite(flatCatalogIndex) || flatCatalogIndex < 1) {
                    console.warn(`⚠️ Índice inválido: ${flatCatalogIndex}`);
                    return null;
                }
                
                // 🔧 CORREÇÃO CRÍTICA: Usar state.allIds ao invés de state.filteredIds
                // O flatCatalogIndex representa o índice absoluto no catálogo completo (1-811),
                // NÃO o índice relativo aos itens filtrados na UI
                const targetIndex = flatCatalogIndex - 1; // Converter para 0-based
                
                console.log(`🔍 selectInstrumentByIndex: flatCatalogIndex=${flatCatalogIndex}`);
                console.log(`   ├─ targetIndex (0-based): ${targetIndex}`);
                console.log(`   ├─ state.allIds.length: ${state.allIds.length}`);
                console.log(`   └─ state.filteredIds.length: ${state.filteredIds.length}`);
                
                if (targetIndex >= state.allIds.length) {
                    console.warn(`⚠️ Índice ${flatCatalogIndex} fora do range (total catálogo: ${state.allIds.length})`);
                    return null;
                }
                
                // Usar state.allIds para garantir mapeamento correto com flatCatalog (811 instrumentos)
                const targetId = state.allIds[targetIndex];
                const entry = entriesById.get(targetId);
                
                if (!entry) {
                    console.warn(`⚠️ Entry não encontrada para índice ${flatCatalogIndex}`);
                    console.warn(`   ├─ targetId: ${targetId}`);
                    console.warn(`   └─ entriesById.size: ${entriesById.size}`);
                    return null;
                }
                
                // Selecionar instrumento e carregar
                selectInstrument(targetId, { 
                    force: true, 
                    shouldLoad: true, 
                    ensureVisible: true 
                });
                
                console.log(`🎵 Instrumento selecionado via MIDI: #${entry.globalIndex} [${flatCatalogIndex}/${state.allIds.length}] ${entry.subcategory} (${entry.variation.soundfont})`);
                
                return entry;
            },
            
            /**
             * Simula clique COMPLETO no botão "spin-up" (▲) para instrumento anterior
             * Dispara todos os eventos visuais e lógicos conectados ao botão
             * Usado para navegação via comandos MIDI Program Change
             * 
             * 🔄 NOVO: Se carregamento em andamento, enfileira comando para execução posterior
             */
            triggerSpinUp: function() {
                if (!upBtn) {
                    console.error('❌ triggerSpinUp: botão spin-up não disponível');
                    return false;
                }
                
                if (state.isLoading) {
                    console.log('📥 triggerSpinUp: enfileirando comando (carregamento em andamento)');
                    navigationQueue.enqueue(-1); // -1 = navegação para cima
                    return 'queued';
                }
                
                console.log('🔼 Simulando clique no botão SPIN-UP (▲) via MIDI');
                
                // 1️⃣ Efeito visual: adicionar classes de feedback
                upBtn.classList.add('active', 'midi-triggered');
                
                // 2️⃣ Simular estado de foco (feedback visual adicional)
                upBtn.focus();
                
                // 3️⃣ Disparar evento click nativo (garante que todos os listeners sejam executados)
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    detail: 1 // Simula clique único
                });
                upBtn.dispatchEvent(clickEvent);
                
                // 4️⃣ Remover classes após animação
                setTimeout(() => {
                    upBtn.classList.remove('active');
                    upBtn.blur(); // Remover foco
                }, 150);
                
                setTimeout(() => {
                    upBtn.classList.remove('midi-triggered');
                }, 800); // Remove após animação do indicador
                
                console.log('   └─ ✅ Evento click disparado, stepInstrument(-1) será executado');
                return true;
            },
            
            /**
             * Simula clique COMPLETO no botão "spin-down" (▼) para próximo instrumento
             * Dispara todos os eventos visuais e lógicos conectados ao botão
             * Usado para navegação via comandos MIDI Program Change
             * 
             * 🔄 NOVO: Se carregamento em andamento, enfileira comando para execução posterior
             */
            triggerSpinDown: function() {
                if (!downBtn) {
                    console.error('❌ triggerSpinDown: botão spin-down não disponível');
                    return false;
                }
                
                if (state.isLoading) {
                    console.log('📥 triggerSpinDown: enfileirando comando (carregamento em andamento)');
                    navigationQueue.enqueue(1); // 1 = navegação para baixo
                    return 'queued';
                }
                
                console.log('🔽 Simulando clique no botão SPIN-DOWN (▼) via MIDI');
                
                // 1️⃣ Efeito visual: adicionar classes de feedback
                downBtn.classList.add('active', 'midi-triggered');
                
                // 2️⃣ Simular estado de foco (feedback visual adicional)
                downBtn.focus();
                
                // 3️⃣ Disparar evento click nativo (garante que todos os listeners sejam executados)
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    detail: 1 // Simula clique único
                });
                downBtn.dispatchEvent(clickEvent);
                
                // 4️⃣ Remover classes após animação
                setTimeout(() => {
                    downBtn.classList.remove('active');
                    downBtn.blur(); // Remover foco
                }, 150);
                
                setTimeout(() => {
                    downBtn.classList.remove('midi-triggered');
                }, 800); // Remove após animação do indicador
                
                console.log('   └─ ✅ Evento click disparado, stepInstrument(1) será executado');
                return true;
            },
            
            /**
             * Navega baseado na direção (-1 para anterior, +1 para próximo)
             * Ativa visualmente o botão correspondente
             */
            navigateByDirection: function(direction) {
                if (direction > 0) {
                    return this.triggerSpinDown();
                } else if (direction < 0) {
                    return this.triggerSpinUp();
                }
                return false;
            },
            
            /**
             * Força sincronização visual do select element
             * Útil quando mudanças via MIDI podem não refletir imediatamente
             */
            forceSyncVisualSelect: forceSyncVisualSelect,
            
            getCurrentId: () => state.currentId,
            getFilteredIds: () => state.filteredIds,
            getTotalInstruments: () => state.filteredIds.length,
            getButtons: () => ({ upBtn, downBtn }) // Para acesso direto se necessário
        };
        
        // 🎯 LISTENER DE SINCRONIZAÇÃO: Soundfont carregado
        // Quando o soundfontManager carregar um instrumento (via MIDI ou outro meio),
        // sincronizar automaticamente o seletor visual para refletir o instrumento ativo
        window.addEventListener('soundfont-loaded', (event) => {
            console.log('🔔 InstrumentSelector recebeu evento "soundfont-loaded"');
            console.log(`   ├─ File: ${event.detail.file}`);
            console.log(`   ├─ Soundfont: ${event.detail.soundfont}`);
            console.log(`   ├─ Variable: ${event.detail.variable}`);

            try {
                const variation = event.detail.variation;

                let matchingEntry = null;
                for (const [id, entry] of entriesById) {
                    if (entry.variation === variation ||
                        (entry.variation.file === variation.file &&
                         entry.variation.soundfont === variation.soundfont)) {
                        matchingEntry = entry;
                        break;
                    }
                }

                if (matchingEntry) {
                    console.log(`   ├─ Entrada encontrada: ${matchingEntry.subcategory}`);
                    console.log(`   ├─ ID: ${matchingEntry.id}`);

                    if (state.currentId === matchingEntry.id) {
                        console.log('   └─ ℹ️ Instrumento já está selecionado, forçando sincronização visual');
                        forceSyncVisualSelect();
                    } else {
                        console.log(`   └─ 🔄 Atualizando seleção para: ${matchingEntry.id}`);
                        state.currentId = matchingEntry.id;

                        refreshSelectOptions();
                        forceSyncVisualSelect();
                        updateFavoriteButtonState();
                        updateInstrumentInfo(matchingEntry);

                        if (catalogList && typeof catalogList.setActive === 'function') {
                            catalogList.setActive(state.currentId, { ensureVisible: true });
                        }

                        console.log('   └─ ✅ Sincronização concluída');
                    }
                } else {
                    console.warn('   └─ ⚠️ Entrada correspondente não encontrada no catálogo');
                    console.warn(`      Tentando buscar por file: ${variation.file}`);

                    for (const [id, entry] of entriesById) {
                        if (entry.variation.file === variation.file) {
                            console.log(`   └─ ✅ Encontrado via fallback: ${entry.subcategory}`);
                            state.currentId = id;
                            refreshSelectOptions();
                            forceSyncVisualSelect();
                            updateFavoriteButtonState();
                            updateInstrumentInfo(entry);

                            if (catalogList && typeof catalogList.setActive === 'function') {
                                catalogList.setActive(id, { ensureVisible: true });
                            }
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao sincronizar seletor após carregamento de soundfont:', error);
            } finally {
                exportGlobalState();
            }
        });
        
        console.log('✅ Listener "soundfont-loaded" registrado');
        
        // Log de confirmação com validação dos métodos retornados
        console.log('✅ setupInstrumentSelection: Objeto de controle criado com sucesso');
        console.log('   ├─ selectInstrumentByIndex:', typeof controlObject.selectInstrumentByIndex === 'function' ? '✅' : '❌');
        console.log('   ├─ navigateByDirection:', typeof controlObject.navigateByDirection === 'function' ? '✅' : '❌');
        console.log('   ├─ triggerSpinUp:', typeof controlObject.triggerSpinUp === 'function' ? '✅' : '❌');
        console.log('   ├─ triggerSpinDown:', typeof controlObject.triggerSpinDown === 'function' ? '✅' : '❌');
        console.log('   ├─ forceSyncVisualSelect:', typeof controlObject.forceSyncVisualSelect === 'function' ? '✅' : '❌');
        console.log('   └─ getTotalInstruments:', controlObject.getTotalInstruments());
        
        return controlObject;
    }

    global.setupInstrumentSelection = setupInstrumentSelection;
    global.instrumentSelector = {
        setupInstrumentSelection,
        buildInstrumentEntries,
        getCategoryIcon
    };
    
    /**
     * 🆕 Função pública global para abrir a lista de instrumentos rápida
     * Chamada pelo Virtual Keyboard ao clicar em teclas
     * Abre o painel de catálogo (catalog-panel) para seleção de instrumento
     */
    global.openInstrumentList = function() {
        const catalogPanel = document.getElementById('instrument-catalog-panel');
        if (!catalogPanel) {
            console.warn('⚠️ openInstrumentList: Painel de catálogo não encontrado');
            console.warn('   Verifique se setupInstrumentSelection foi inicializado');
            return false;
        }
        
        // Verificar se o painel está oculto
        const isHidden = catalogPanel.classList.contains('is-hidden');
        
        if (isHidden) {
            // Abrir painel
            catalogPanel.classList.remove('is-hidden');
            console.log('📂 Lista de instrumentos aberta');
        } else {
            // Se já está aberto, deixa como está (user pode estar navegando)
            console.log('ℹ️ Lista de instrumentos já está aberta');
        }
        
        return true;
    };
    
    /**
     * 🆕 Alias para manter compatibilidade com nomes alternativos
     */
    global.showInstrumentSelector = global.openInstrumentList;
})(window);
