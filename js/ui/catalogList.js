(function (global) {
    'use strict';

    const MIN_QUERY_LENGTH = 2;
    const INPUT_DEBOUNCE_MS = 220;

    const noop = () => {};

    function normalizeId(id) {
        return `catalog-item-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }

    function formatMeta(entry) {
        const parts = [];
        if (entry.category) {
            parts.push(entry.category);
        }

        const midiValue = entry?.variation?.gmNote ?? entry?.variation?.midiNumber;
        if (midiValue !== undefined && midiValue !== null && midiValue !== '') {
            const numeric = Number(midiValue);
            const midiLabel = Number.isFinite(numeric)
                ? `MIDI ${String(numeric).padStart(2, '0')}`
                : `MIDI ${midiValue}`;
            parts.push(midiLabel);
        }

        if (entry?.variation?.soundfont) {
            parts.push(entry.variation.soundfont);
        }

        return parts.join(' • ');
    }

    function createEmptyState({ mode, hasFavorites, queryLength }) {
        if (mode === 'search') {
            if (queryLength < MIN_QUERY_LENGTH) {
                return `
                    <div class="catalog-empty">
                        <span class="catalog-empty-icon">🔍</span>
                        <p>Digite pelo menos ${MIN_QUERY_LENGTH} letras para buscar no catálogo.</p>
                    </div>
                `;
            }

            return `
                <div class="catalog-empty">
                    <span class="catalog-empty-icon">🤔</span>
                    <p>Nenhum instrumento corresponde à busca.</p>
                    <p class="catalog-empty-hint">Tente variar os termos ou limpar o filtro.</p>
                </div>
            `;
        }

        if (!hasFavorites) {
            return `
                <div class="catalog-empty">
                    <span class="catalog-empty-icon">🌟</span>
                    <p>Você ainda não tem instrumentos favoritos.</p>
                    <p class="catalog-empty-hint">Use o botão ☆ para salvar favoritos ou faça uma busca.</p>
                </div>
            `;
        }

        return `
            <div class="catalog-empty">
                <span class="catalog-empty-icon">🎛️</span>
                <p>Nenhum favorito disponível nesta sessão.</p>
                <p class="catalog-empty-hint">Adicione novos favoritos ou realize uma busca.</p>
            </div>
        `;
    }

    function createCatalogList(options = {}) {
        const container = options.container;
        if (!container) {
            throw new Error('catalogList.create requer um container válido.');
        }

        const searchInput = options.searchInput || null;
        const entriesById = options.entriesById || new Map();
        const allIds = Array.isArray(options.allIds) ? options.allIds.slice() : Array.from(entriesById.keys());
        const getFavoriteIds = typeof options.getFavoriteIds === 'function' ? options.getFavoriteIds : () => [];
        const onSelect = typeof options.onSelect === 'function' ? options.onSelect : noop;
        const onToggleFavorite = typeof options.onToggleFavorite === 'function' ? options.onToggleFavorite : () => false;
        const onStep = typeof options.onStep === 'function' ? options.onStep : noop;
        const onVisibleChange = typeof options.onVisibleChange === 'function' ? options.onVisibleChange : noop;
        const getActiveId = typeof options.getActiveId === 'function' ? options.getActiveId : () => null;
        const isFavorite = typeof options.isFavorite === 'function' ? options.isFavorite : () => false;

        const state = {
            queryValue: '',
            visibleIds: [],
            mode: 'favorites',
            itemsById: new Map(),
            debounceToken: null
        };

        container.setAttribute('role', 'listbox');
        container.tabIndex = 0;
        container.setAttribute('aria-live', 'polite');

        function clearDebounce() {
            if (state.debounceToken) {
                clearTimeout(state.debounceToken);
                state.debounceToken = null;
            }
        }

        function updateActiveVisual({ ensureVisible = false } = {}) {
            const activeId = getActiveId();
            let activeElementId = '';

            state.itemsById.forEach((element, id) => {
                const isActive = id === activeId;
                element.classList.toggle('active', isActive);
                element.setAttribute('aria-selected', isActive ? 'true' : 'false');
                if (isActive) {
                    activeElementId = element.id || '';
                    if (ensureVisible) {
                        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                }
            });

            if (activeElementId) {
                container.setAttribute('aria-activedescendant', activeElementId);
            } else {
                container.removeAttribute('aria-activedescendant');
            }
        }

        function renderList(ids) {
            state.itemsById.clear();
            const list = document.createElement('ul');
            list.className = 'catalog-list-items';
            list.setAttribute('role', 'presentation');

            ids.forEach(id => {
                const entry = entriesById.get(id);
                if (!entry) {
                    return;
                }

                const item = document.createElement('li');
                item.dataset.id = id;
                item.id = normalizeId(id);
                item.className = 'catalog-list-item';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', 'false');

                const selectBtn = document.createElement('button');
                selectBtn.type = 'button';
                selectBtn.className = 'catalog-item-select';
                selectBtn.dataset.id = id;
                // ✨ ENUMERAÇÃO SEQUENCIAL: Adicionar número do soundfont
                const numberPrefix = entry.globalIndex ? `${entry.globalIndex}. ` : '';
                selectBtn.innerHTML = `
                    <span class="catalog-item-name">${numberPrefix}${entry.subcategory}</span>
                    <span class="catalog-item-meta">${formatMeta(entry)}</span>
                `;

                const favoriteBtn = document.createElement('button');
                favoriteBtn.type = 'button';
                favoriteBtn.className = 'catalog-item-favorite';
                favoriteBtn.dataset.id = id;
                const favState = isFavorite(id);
                favoriteBtn.classList.toggle('active', favState);
                favoriteBtn.title = favState ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
                favoriteBtn.textContent = favState ? '⭐' : '☆';

                item.append(selectBtn, favoriteBtn);
                list.appendChild(item);
                state.itemsById.set(id, item);
            });

            container.innerHTML = '';
            container.appendChild(list);
        }

        function notifyVisibilityChange() {
            onVisibleChange({
                visibleIds: state.visibleIds.slice(),
                mode: state.mode,
                query: state.queryValue,
                hasFavorites: getFavoriteIds().length > 0
            });
        }

        function refresh({ ensureVisible = false } = {}) {
            const trimmedQuery = state.queryValue.trim();
            const normalizedQuery = trimmedQuery.toLowerCase();
            const meetsSearchThreshold = normalizedQuery.length >= MIN_QUERY_LENGTH;
            const favorites = getFavoriteIds().filter(id => entriesById.has(id));

            state.mode = trimmedQuery.length > 0 ? 'search' : 'favorites';
            container.dataset.mode = state.mode;

            let visibleIds;
            if (meetsSearchThreshold) {
                visibleIds = allIds.filter(id => {
                    const entry = entriesById.get(id);
                    if (!entry) {
                        return false;
                    }
                    return entry.keywords?.includes(normalizedQuery);
                });
            } else {
                visibleIds = favorites;
            }

            state.visibleIds = visibleIds;
            container.setAttribute('aria-busy', 'true');

            if (!visibleIds.length) {
                state.itemsById.clear();
                container.innerHTML = createEmptyState({
                    mode: state.mode,
                    hasFavorites: favorites.length > 0,
                    queryLength: trimmedQuery.length
                });
                container.removeAttribute('aria-activedescendant');
                container.setAttribute('aria-busy', 'false');
                notifyVisibilityChange();
                return;
            }

            renderList(visibleIds);
            container.setAttribute('aria-busy', 'false');
            updateActiveVisual({ ensureVisible });
            notifyVisibilityChange();
        }

        function setActive(id, options = {}) {
            if (!id) {
                state.itemsById.forEach(element => {
                    element.classList.remove('active');
                    element.setAttribute('aria-selected', 'false');
                });
                container.removeAttribute('aria-activedescendant');
                return;
            }

            updateActiveVisual({ ensureVisible: options.ensureVisible });
        }

        function setFavoriteDecor(id, isFav) {
            const item = state.itemsById.get(id);
            if (!item) {
                return;
            }
            const favButton = item.querySelector('.catalog-item-favorite');
            if (!favButton) {
                return;
            }
            favButton.classList.toggle('active', isFav);
            favButton.textContent = isFav ? '⭐' : '☆';
            favButton.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
        }

        function applyQuery(value, { syncInput = true } = {}) {
            state.queryValue = typeof value === 'string' ? value : '';
            if (syncInput && searchInput && searchInput.value !== state.queryValue) {
                searchInput.value = state.queryValue;
            }
            refresh();
        }

        function handleSearchInput(event) {
            clearDebounce();
            const newValue = event.target.value;
            state.debounceToken = setTimeout(() => {
                applyQuery(newValue, { syncInput: false });
            }, INPUT_DEBOUNCE_MS);
        }

        function handleSearchKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                clearDebounce();
                applyQuery('');
                container.focus();
                return;
            }

            if (event.key === 'Enter') {
                if (state.visibleIds.length) {
                    event.preventDefault();
                    onSelect(state.visibleIds[0], { shouldLoad: true });
                }
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                container.focus();
                onStep(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                container.focus();
                onStep(-1);
            }
        }

        function handleContainerClick(event) {
            const favoriteTarget = event.target.closest('.catalog-item-favorite');
            if (favoriteTarget) {
                const id = favoriteTarget.dataset.id;
                if (id) {
                    const newState = onToggleFavorite(id);
                    if (typeof newState === 'boolean') {
                        setFavoriteDecor(id, newState);
                    }
                }
                return;
            }

            const selectTarget = event.target.closest('.catalog-item-select');
            if (selectTarget) {
                const id = selectTarget.dataset.id;
                if (id) {
                    onSelect(id, { shouldLoad: true });
                    container.focus();
                }
            }
        }

        function handleContainerKeyDown(event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                onStep(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                onStep(-1);
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                const activeId = getActiveId();
                if (activeId) {
                    onSelect(activeId, { shouldLoad: true });
                }
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', handleSearchInput);
            searchInput.addEventListener('keydown', handleSearchKeyDown);
        }

        container.addEventListener('click', handleContainerClick);
        container.addEventListener('keydown', handleContainerKeyDown);

        const controller = {
            refresh,
            setActive,
            setQuery(value) {
                clearDebounce();
                applyQuery(value);
            },
            getVisibleIds() {
                return state.visibleIds.slice();
            },
            setFavorite(id, isFav) {
                setFavoriteDecor(id, isFav);
            },
            destroy() {
                clearDebounce();
                if (searchInput) {
                    searchInput.removeEventListener('input', handleSearchInput);
                    searchInput.removeEventListener('keydown', handleSearchKeyDown);
                }
                container.removeEventListener('click', handleContainerClick);
                container.removeEventListener('keydown', handleContainerKeyDown);
                state.itemsById.clear();
            }
        };

        return controller;
    }

    global.catalogList = {
        create: createCatalogList
    };
})(window);
