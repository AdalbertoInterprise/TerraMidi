(function (global) {
    'use strict';

    const noop = () => {};
    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'area[href]',
        'button:not([disabled])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    class TerraGamePatientPanel {
        constructor(options = {}) {
            const {
                root = null,
                patientManager = null,
                onPatientSaved = noop,
                onPatientsImported = noop,
                onPanelClosed = noop
            } = options;

            this.root = root instanceof HTMLElement ? root : document;
            this.patientManager = patientManager || (typeof global !== 'undefined' ? global.patientManager : null);
            this.callbacks = {
                onPatientSaved,
                onPatientsImported,
                onPanelClosed
            };

            this.state = {
                activePanel: null,
                visibility: {
                    create: false,
                    import: false
                },
                lastFocusedTrigger: null
            };

            this.elements = this.cacheDom();
            this.mutationObservers = [];

            this.handleCreatePanelMutation = this.handlePanelMutation.bind(this, 'create');
            this.handleImportPanelMutation = this.handlePanelMutation.bind(this, 'import');

            this.init();
        }

        cacheDom() {
            const scope = this.root instanceof HTMLElement ? this.root : document;
            const query = (selector) => scope.querySelector(selector);

            return {
                createPanel: query('#terra-game-create-panel'),
                importPanel: query('#terra-game-import-panel'),
                createForm: query('#terra-game-create-form'),
                importInput: document.getElementById('terra-game-import-input') || query('#terra-game-import-input'),
                createFeedback: query('#terra-game-create-feedback'),
                importFeedback: query('#terra-game-import-feedback'),
                openCreate: query('#terra-game-open-create'),
                openImport: query('#terra-game-open-import'),
                cancelCreate: query('#terra-game-create-cancel'),
                cancelImport: query('#terra-game-import-cancel')
            };
        }

        init() {
            this.setupAriaAttributes();
            this.observePanelVisibility();
            this.registerEscapeListener();
        }

        setupAriaAttributes() {
            const { createPanel, importPanel, openCreate, openImport } = this.elements;

            if (createPanel && openCreate) {
                openCreate.setAttribute('aria-controls', createPanel.id);
                openCreate.setAttribute('aria-expanded', String(this.isPanelVisible(createPanel)));
            }

            if (importPanel && openImport) {
                openImport.setAttribute('aria-controls', importPanel.id);
                openImport.setAttribute('aria-expanded', String(this.isPanelVisible(importPanel)));
            }
        }

        observePanelVisibility() {
            const { createPanel, importPanel } = this.elements;

            if (createPanel) {
                const observer = new MutationObserver(this.handleCreatePanelMutation);
                observer.observe(createPanel, {
                    attributes: true,
                    attributeFilter: ['hidden', 'aria-hidden', 'class']
                });
                this.mutationObservers.push(observer);
                this.updatePanelState('create', this.isPanelVisible(createPanel));
            }

            if (importPanel) {
                const observer = new MutationObserver(this.handleImportPanelMutation);
                observer.observe(importPanel, {
                    attributes: true,
                    attributeFilter: ['hidden', 'aria-hidden', 'class']
                });
                this.mutationObservers.push(observer);
                this.updatePanelState('import', this.isPanelVisible(importPanel));
            }
        }

        registerEscapeListener() {
            if (!this.root) {
                return;
            }

            this.root.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') {
                    return;
                }

                const activePanel = this.state.activePanel;
                if (!activePanel) {
                    return;
                }

                const element = this.elements[`${activePanel}Panel`];
                if (!element || this.isPanelHidden(element)) {
                    return;
                }

                event.stopPropagation();
                event.preventDefault();

                element.hidden = true;
                element.setAttribute('aria-hidden', 'true');
            });
        }

        handlePanelMutation(panelName) {
            const panelElement = this.elements[`${panelName}Panel`];
            if (!panelElement) {
                return;
            }

            const isVisible = this.isPanelVisible(panelElement);
            this.updatePanelState(panelName, isVisible);
        }

        updatePanelState(panelName, isVisible) {
            const previous = this.state.visibility[panelName];
            if (previous === isVisible) {
                return;
            }

            this.state.visibility[panelName] = isVisible;

            const triggerName = panelName === 'create' ? 'openCreate' : 'openImport';
            const trigger = this.elements[triggerName];
            if (trigger) {
                trigger.setAttribute('aria-expanded', String(isVisible));
                if (isVisible) {
                    trigger.classList.add('is-active');
                    this.state.lastFocusedTrigger = trigger;
                } else {
                    trigger.classList.remove('is-active');
                }
            }

            if (isVisible) {
                this.state.activePanel = panelName;
                this.focusFirstField(panelName);
            } else {
                if (this.state.activePanel === panelName) {
                    this.state.activePanel = null;
                }
                this.notifyPanelClosed(panelName, { reason: 'hide' });
            }
        }

        isPanelVisible(element) {
            if (!element) {
                return false;
            }

            if (this.isPanelHidden(element)) {
                return false;
            }

            return true;
        }

        isPanelHidden(element) {
            return !!(element.hidden || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true');
        }

        focusFirstField(panelName) {
            const panel = this.elements[`${panelName}Panel`];
            if (!panel || this.isPanelHidden(panel)) {
                return;
            }

            const focusable = panel.querySelector(FOCUSABLE_SELECTOR);
            if (focusable && typeof focusable.focus === 'function') {
                try {
                    focusable.focus({ preventScroll: true });
                } catch (error) {
                    /* ignore focus errors */
                }
            }
        }

        notifyPanelClosed(panelName, meta = {}) {
            if (typeof this.callbacks.onPanelClosed === 'function') {
                try {
                    this.callbacks.onPanelClosed({ panel: panelName, ...meta });
                } catch (error) {
                    console.warn('TerraGamePatientPanel: onPanelClosed callback falhou.', error);
                }
            }

            const panelElement = this.elements[`${panelName}Panel`];
            const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
            const shouldRestoreFocus = !activeElement ||
                activeElement === document.body ||
                (panelElement && panelElement.contains(activeElement));

            if (shouldRestoreFocus && this.state.lastFocusedTrigger && typeof this.state.lastFocusedTrigger.focus === 'function') {
                try {
                    this.state.lastFocusedTrigger.focus({ preventScroll: true });
                } catch (error) {
                    /* ignore focus errors */
                }
            }

            this.state.lastFocusedTrigger = null;
        }

        notifyPatientSaved(patient) {
            if (typeof this.callbacks.onPatientSaved === 'function') {
                try {
                    this.callbacks.onPatientSaved(patient || null);
                } catch (error) {
                    console.warn('TerraGamePatientPanel: onPatientSaved callback falhou.', error);
                }
            }
        }

        notifyPatientsImported(summary = {}) {
            if (typeof this.callbacks.onPatientsImported === 'function') {
                try {
                    this.callbacks.onPatientsImported(summary);
                } catch (error) {
                    console.warn('TerraGamePatientPanel: onPatientsImported callback falhou.', error);
                }
            }
        }

        reset() {
            if (this.elements.createForm) {
                this.elements.createForm.reset();
            }

            if (this.elements.importInput) {
                this.elements.importInput.value = '';
            }

            this.clearFeedback('create');
            this.clearFeedback('import');
            this.state.activePanel = null;
            this.state.visibility.create = false;
            this.state.visibility.import = false;

            if (this.elements.openCreate) {
                this.elements.openCreate.setAttribute('aria-expanded', 'false');
                this.elements.openCreate.classList.remove('is-active');
            }

            if (this.elements.openImport) {
                this.elements.openImport.setAttribute('aria-expanded', 'false');
                this.elements.openImport.classList.remove('is-active');
            }
        }

        clearFeedback(panelName) {
            const element = panelName === 'create' ? this.elements.createFeedback : this.elements.importFeedback;
            if (!element) {
                return;
            }

            element.textContent = '';
            element.removeAttribute('data-tone');
        }

        destroy() {
            this.mutationObservers.forEach((observer) => observer.disconnect());
            this.mutationObservers = [];
        }
    }

    global.TerraGamePatientPanel = TerraGamePatientPanel;
})(typeof window !== 'undefined' ? window : globalThis);
