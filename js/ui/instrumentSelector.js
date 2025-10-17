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
        return entries;
    }

    function setupInstrumentSelection() {
        const instrumentGrid = document.getElementById('instrument-grid');

        if (!instrumentGrid) {
            console.error('❌ Elemento instrument-grid não encontrado');
            return;
        }

        const catalogManager = ensureCatalogManager();
        const entries = buildInstrumentEntries(catalogManager);

        if (!entries.length) {
            instrumentGrid.innerHTML = `
                <div class="catalog-empty">
                    <span class="catalog-empty-icon">📭</span>
                    <p>Nenhum instrumento encontrado no catálogo.</p>
                </div>
            `;
            return;
        }

        const entriesById = new Map(entries.map(entry => [entry.id, entry]));
        const allIds = entries.map(entry => entry.id);

        const state = {
            allIds,
            filteredIds: [],
            currentId: allIds[0] || null,
            isLoading: false,
            activeKitId: null
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
            const favoritesSet = getFavoritesKeySet();
            selectEl.innerHTML = '';

            let hasInstrumentOptions = false;
            let pendingKitGroup = null;

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

                const prefix = isFavorite ? '⭐ ' : '';
                const categoryIcon = getCategoryIcon(entry.category);

                if (entry.category === 'Baterias GM') {
                    const midiNumber = parseInt(entry.variation?.gmNote ?? entry.variation?.midiNumber, 10);
                    const gmDisplay = Number.isFinite(midiNumber) ? `GM ${String(midiNumber).padStart(2, '0')}` : entry.subcategory;
                    option.textContent = `${prefix}${categoryIcon} ${gmDisplay} • ${entry.subcategory} — ${entry.variation.soundfont}`;
                } else {
                    option.textContent = `${prefix}${categoryIcon} ${entry.subcategory} — ${entry.variation.soundfont}`;
                }

                if (!state.activeKitId && entry.id === state.currentId) {
                    option.selected = true;
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
                        ? `⭐ ${instrumentName} adicionado aos favoritos (${favCount} total${favCount !== 1 ? 'is' : ''})`
                        : `☆ ${instrumentName} removido dos favoritos${favCount > 0 ? ` (${favCount} restante${favCount !== 1 ? 's' : ''})` : ''}`
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

                    await global.soundfontManager.applyDrumKit(mappingPayload);

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
        }

        function updateInstrumentInfo(entry) {
            // Card removed - function kept for compatibility but does nothing
        }

        async function selectInstrument(id, options = {}) {
            const entry = entriesById.get(id);
            if (!entry) return;

            const shouldLoad = options.shouldLoad !== false;
            const force = options.force === true;
            const preserveKit = options.preserveKit === true;

            if (!preserveKit) {
                state.activeKitId = null;
            }

            if (id === state.currentId && !force) {
                if (options.ensureVisible && catalogList && typeof catalogList.setActive === 'function') {
                    catalogList.setActive(state.currentId, { ensureVisible: true });
                }
                return;
            }

            state.currentId = id;
            refreshSelectOptions();
            updateFavoriteButtonState();
            updateInstrumentInfo(entry);
            if (catalogList && typeof catalogList.setActive === 'function') {
                catalogList.setActive(state.currentId, {
                    ensureVisible: options.ensureVisible === true
                });
            }

            if (!shouldLoad || !global.soundfontManager) {
                return;
            }

            const token = ++loadToken;
            setLoadingState(true);

            try {
                await global.soundfontManager.loadFromCatalog(entry.variation);
                if (token === loadToken) {
                    notifyChange(`${entry.subcategory} (${entry.variation.soundfont})`);
                }
            } catch (error) {
                console.error('Erro ao carregar instrumento:', error);
                if (token === loadToken) {
                    notifyError('Erro ao carregar instrumento');
                }
            } finally {
                if (token === loadToken) {
                    setLoadingState(false);
                }
            }
        }

        function stepInstrument(direction) {
            if (!state.filteredIds.length) {
                return;
            }

            const currentIndex = state.filteredIds.indexOf(state.currentId);
            const nextIndex = currentIndex === -1
                ? 0
                : (currentIndex + direction + state.filteredIds.length) % state.filteredIds.length;
            const nextId = state.filteredIds[nextIndex];
            selectInstrument(nextId, { force: true });
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
                notifyChange(`⭐ ${instrumentName} adicionado aos favoritos (${favCount} total${favCount !== 1 ? 'is' : ''})`);
            } else {
                notifyChange(`☆ ${instrumentName} removido dos favoritos${favCount > 0 ? ` (${favCount} restante${favCount !== 1 ? 's' : ''})` : ''}`);
            }
        });
        initializeCatalogList();
        refreshSelectOptions();
        updateFavoriteButtonState();

        if (state.currentId) {
            selectInstrument(state.currentId, { force: true });
        }
    }

    global.setupInstrumentSelection = setupInstrumentSelection;
    global.instrumentSelector = {
        setupInstrumentSelection,
        buildInstrumentEntries,
        getCategoryIcon
    };
})(window);
