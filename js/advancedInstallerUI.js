// 🎯 Advanced Installer UI Integration
// Integração da UI para o instalador agressivo v1.1 com automação pós-seleção de pasta
// Versão: 1.1.0

class AdvancedInstallerUI {
    constructor() {
        this.installer = null;
        this.progressModal = null;
        this.isVisible = false;
        this.installationRunning = false;
        this.autoMode = false;
        this.autoReason = null;
        this.currentDirectoryName = null;
        this.pendingAutoStart = null;
        this.selectedDirectoryHandle = null;
        this.installationCompleted = false;
        this.externalButton = null;

        this.startButtonIdleLabel = 'Iniciar Instalação';
        this.startButtonCompletedLabel = 'Instalação concluída';
        this.startButtonPendingDirectoryLabel = 'Selecione a pasta para continuar';

        this.autoSyncIntervalMs = (typeof AdvancedInstaller !== 'undefined' && AdvancedInstaller.AUTO_SYNC_INTERVAL_MS)
            ? AdvancedInstaller.AUTO_SYNC_INTERVAL_MS
            : 1000 * 60 * 60 * 6;

        // Element references
        this.phaseElement = null;
        this.progressElement = null;
        this.progressTextElement = null;
        this.filesElement = null;
        this.timeElement = null;
        this.sizeElement = null;
        this.folderElement = null;
        this.autoIndicatorElement = null;
        this.errorsWrapper = null;
        this.errorsListElement = null;
        this.startButton = null;
        this.cancelButton = null;

        console.log('🎨 AdvancedInstallerUI 1.1 inicializado');
    }

    /**
     * Inicializa interface do instalador
     */
    init() {
    this.createProgressModal();
    this.bindInstallationEvents();
    this.bindDirectoryListeners();
    this.showInstallPrompt();

    this.externalButton = document.getElementById('btn-install-pwa');
    this.updateExternalInstallButton('awaiting-directory');
    this.syncInitialState();

        const pendingSelection = this.pendingAutoStart || (typeof window !== 'undefined' ? window.terraMidiPendingDirectorySelection : null);
        if (pendingSelection && pendingSelection.handle) {
            const handle = pendingSelection.handle;
            const autoStart = typeof pendingSelection.autoStart === 'boolean' ? pendingSelection.autoStart : true;
            const source = pendingSelection.source || 'pwa-installer';
            const autoStartMode = pendingSelection.autoStartMode;
            this.pendingAutoStart = null;
            if (typeof window !== 'undefined') {
                window.terraMidiPendingDirectorySelection = null;
            }
            this.prepareWithDirectory(handle, { autoStart, source, autoStartMode });
        }
    }

    /**
     * Cria modal de progresso
     */
    createProgressModal() {
        const modal = document.createElement('div');
        modal.id = 'terra-advanced-installer-modal';
        modal.className = 'terra-installer-modal';
        modal.innerHTML = `
            <div class="terra-installer-content">
                <div class="terra-installer-header">
                    <h2>🚀 Instalação Avançada do TerraMidi</h2>
                    <button class="terra-installer-close" aria-label="Fechar">&times;</button>
                </div>

                <div class="terra-installer-body">
                    <div id="terra-installer-auto-indicator" class="terra-installer-auto" style="display:none;">
                        🔁 Instalação automática em andamento após seleção de pasta.
                    </div>

                    <div class="terra-installer-phase">
                        <h3>📋 Fase de Instalação</h3>
                        <p id="terra-installer-phase-text">Aguardando...</p>
                    </div>

                    <div class="terra-installer-folder">
                        <span class="terra-installer-folder-label">📂 Pasta selecionada:</span>
                        <span id="terra-installer-folder-name" class="terra-installer-folder-value">Nenhuma</span>
                    </div>

                    <div class="terra-installer-progress">
                        <div class="terra-progress-bar">
                            <div id="terra-installer-progress" class="terra-progress-fill"></div>
                        </div>
                        <p id="terra-installer-progress-text">0%</p>
                    </div>

                    <div class="terra-installer-stats">
                        <div class="terra-stat">
                            <span class="terra-stat-label">Arquivos:</span>
                            <span id="terra-installer-files" class="terra-stat-value">0/0</span>
                        </div>
                        <div class="terra-stat">
                            <span class="terra-stat-label">Tempo estimado:</span>
                            <span id="terra-installer-time" class="terra-stat-value">-</span>
                        </div>
                        <div class="terra-stat">
                            <span class="terra-stat-label">Baixado:</span>
                            <span id="terra-installer-size" class="terra-stat-value">0 MB</span>
                        </div>
                    </div>

                    <div id="terra-installer-benefits" class="terra-installer-benefits">
                        <h4>✨ Benefícios da Instalação:</h4>
                        <ul>
                            <li>📱 Funciona totalmente offline</li>
                            <li>⚡ Carregamento instantâneo</li>
                            <li>🎵 Todos os soundfonts disponíveis</li>
                            <li>💾 Cache persistente em múltiplas camadas</li>
                            <li>🔄 Sincronização automática ao abrir o app</li>
                        </ul>
                    </div>

                    <div id="terra-installer-errors" class="terra-installer-errors" style="display:none;">
                        <h4>⚠️ Erros encontrados:</h4>
                        <ul id="terra-installer-errors-list"></ul>
                    </div>
                </div>

                <div class="terra-installer-footer">
                    <button id="terra-installer-select-folder" class="terra-btn terra-btn-outline">Selecionar pasta</button>
                    <button id="terra-installer-start" class="terra-btn terra-btn-primary">Iniciar Instalação</button>
                    <button id="terra-installer-cancel" class="terra-btn terra-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.progressModal = modal;

        // Cache elements for quick updates
        this.phaseElement = modal.querySelector('#terra-installer-phase-text');
        this.progressElement = modal.querySelector('#terra-installer-progress');
        this.progressTextElement = modal.querySelector('#terra-installer-progress-text');
        this.filesElement = modal.querySelector('#terra-installer-files');
        this.timeElement = modal.querySelector('#terra-installer-time');
        this.sizeElement = modal.querySelector('#terra-installer-size');
        this.folderElement = modal.querySelector('#terra-installer-folder-name');
        this.autoIndicatorElement = modal.querySelector('#terra-installer-auto-indicator');
        this.errorsWrapper = modal.querySelector('#terra-installer-errors');
        this.errorsListElement = modal.querySelector('#terra-installer-errors-list');
        this.selectFolderButton = modal.querySelector('#terra-installer-select-folder');
        this.startButton = modal.querySelector('#terra-installer-start');
        this.cancelButton = modal.querySelector('#terra-installer-cancel');

        // Bindings
        modal.querySelector('.terra-installer-close').addEventListener('click', () => this.close());
        this.cancelButton.addEventListener('click', () => this.close());
        this.startButton.addEventListener('click', () => this.startInstallation({ auto: false }));
        if (this.selectFolderButton) {
            this.selectFolderButton.addEventListener('click', () => this.handleSelectFolderClick());
        }

        this.setStartButtonState();
    }
    /**
     * Vincula eventos globais
     */
    bindInstallationEvents() {
        window.addEventListener('terra-installation-progress', (event) => {
            if (!event || !event.detail) return;
            this.updateProgress(event.detail);
        });
    }

    bindDirectoryListeners() {
        window.addEventListener('terra-installation-directory', (event) => {
            const directoryName = event && event.detail ? event.detail.name : null;
            if (directoryName) {
                this.currentDirectoryName = directoryName;
                this.updateDirectoryDisplay();
            }
        });

        window.addEventListener('terra-midi-directory-selected', async (event) => {
            if (!event || !event.detail) return;
            const detail = event.detail;
            if (detail.directHandled) {
                return;
            }
            const handle = detail.handle;
            if (!handle) return;
            const options = {
                autoStart: typeof detail.autoStart === 'boolean' ? detail.autoStart : true,
                source: detail.source || 'pwa-installer',
                autoStartMode: detail.autoStartMode,
                minIntervalMs: detail.minIntervalMs
            };
            await this.prepareWithDirectory(handle, options);
        });
    }

    /**
     * Permite integração externa para registrar diretório e iniciar instalação
     */
    async prepareWithDirectory(directoryHandle, options = {}) {
        if (!directoryHandle) return;

        if (!this.progressModal) {
            // init ainda não executado
            const autoStart = typeof options.autoStart === 'boolean' ? options.autoStart : true;
            const source = options.source || 'pwa-installer';
            this.pendingAutoStart = { handle: directoryHandle, autoStart, source, autoStartMode: options.autoStartMode };
            this.selectedDirectoryHandle = directoryHandle;
            this.installationCompleted = false;
            return;
        }

        if (!this.installer) {
            this.installer = new AdvancedInstaller();
        }

        try {
            await this.installer.applyUserDirectory(directoryHandle, { persist: true });
            this.currentDirectoryName = directoryHandle.name;
            this.selectedDirectoryHandle = directoryHandle;
            this.installationCompleted = false;
            this.updateDirectoryDisplay();
        } catch (error) {
            console.warn('⚠️ Não foi possível aplicar diretório selecionado:', error);
        }

        this.updateExternalInstallButton('ready');
        this.setStartButtonState();

        const shouldStart = this.shouldAutoStart(options);

        if (shouldStart) {
            await this.startInstallation({
                auto: true,
                reason: options.source || 'external-directory',
                directoryHandle,
                minIntervalMs: options.minIntervalMs,
                autoStartMode: options.autoStartMode || (options.autoStart ? 'immediate' : 'smart')
            });
        }
    }

    /**
     * Mostra prompt/modal de instalação
     */
    showInstallPrompt() {
        const existing = document.querySelector('#terra-advanced-installer-modal');
        if (existing) {
            this.progressModal = existing;
        }
    }

    /**
     * Inicia instalação
     */
    async startInstallation(options = {}) {
        if (!this.installer) {
            this.installer = new AdvancedInstaller();
        }

        if (this.installationRunning) {
            console.log('ℹ️ Instalação já está em andamento');
            this.show();
            return;
        }

        if (this.installationCompleted && !options.force) {
            if (window.pwaInstaller && typeof window.pwaInstaller.showToast === 'function') {
                window.pwaInstaller.showToast('✅ A instalação completa já foi realizada.', 'success');
            }
            this.updateExternalInstallButton('completed');
            this.show();
            return;
        }

        const directoryHandle = options.directoryHandle || this.selectedDirectoryHandle || this.installer.userDirectoryRoot;

        if (!directoryHandle) {
            this.setStartButtonState();
            if (window.pwaInstaller && typeof window.pwaInstaller.showToast === 'function') {
                window.pwaInstaller.showToast('📂 Escolha primeiro a pasta onde deseja instalar os arquivos.', 'warning');
            } else {
                alert('Selecione a pasta de instalação antes de continuar.');
            }
            await this.handleSelectFolderClick();
            return;
        }

        this.selectedDirectoryHandle = directoryHandle;

        if (options.directoryHandle) {
            try {
                await this.installer.applyUserDirectory(options.directoryHandle, { persist: true });
            } catch (error) {
                console.warn('⚠️ Falha ao aplicar diretório antes da instalação:', error);
            }
        }

        this.autoMode = Boolean(options.auto);
        this.autoReason = options.reason || null;
        this.installationRunning = true;
        this.installationCompleted = false;
        this.clearErrors();
        this.updateDirectoryDisplay();
        this.configureControlsForRun();
        this.show();

        this.updateExternalInstallButton('installing');

        const result = await this.installer.startAggressiveInstallation({
            directoryHandle,
            persistDirectory: true,
            requireDirectorySelection: false
        });

        if (result) {
            this.handleInstallationSuccess();
        } else {
            this.handleInstallationFailure();
        }

        this.installationRunning = false;
        this.setAutoIndicator(false);
        this.autoMode = false;
        this.autoReason = null;
        this.setStartButtonState({ preserveLabel: true });
    }

    configureControlsForRun() {
        if (!this.startButton || !this.cancelButton) return;
        if (this.autoMode) {
            this.startButton.disabled = true;
            this.startButton.textContent = '⏳ Instalando automaticamente...';
            this.cancelButton.textContent = 'Fechar';
            this.setAutoIndicator(true);
        } else {
            this.startButton.disabled = true;
            this.startButton.textContent = '⏳ Instalando...';
            this.cancelButton.textContent = 'Cancelar';
            this.setAutoIndicator(false);
        }
    }

    resetControls() {
        if (!this.startButton || !this.cancelButton) return;
        this.cancelButton.textContent = 'Cancelar';
        this.setAutoIndicator(false);
        this.setStartButtonState();
    }

    setAutoIndicator(enabled) {
        if (!this.autoIndicatorElement) return;
        this.autoIndicatorElement.style.display = enabled ? 'block' : 'none';
    }

    shouldAutoStart(options = {}) {
        if (options.force) return true;
        if (options.autoStart === true) return true;

        const mode = options.autoStartMode || options.source;
        if (mode !== 'smart' && options.source !== 'restored' && options.source !== 'pwa-installer-smart') {
            return false;
        }

        const meta = this.getInstallerMeta();
        const targetVersion = (typeof ADVANCED_INSTALLER_VERSION !== 'undefined') ? ADVANCED_INSTALLER_VERSION : null;
        const lastRun = typeof meta.lastSuccessfulRunAt === 'string' ? parseInt(meta.lastSuccessfulRunAt, 10) : meta.lastSuccessfulRunAt;
        const lastVersion = meta.lastSuccessfulVersion || meta.lastKnownVersion || null;
        const minInterval = typeof options.minIntervalMs === 'number' ? options.minIntervalMs : this.autoSyncIntervalMs;
        const now = Date.now();

        if (!lastRun || Number.isNaN(lastRun)) {
            return true;
        }

        if (targetVersion && lastVersion && targetVersion !== lastVersion) {
            return true;
        }

        if ((now - lastRun) >= minInterval) {
            return true;
        }

        return false;
    }

    getInstallerMeta() {
        if (this.installer && typeof this.installer.getInstallationMetadata === 'function') {
            return this.installer.getInstallationMetadata();
        }

        const key = (typeof AdvancedInstaller !== 'undefined' && AdvancedInstaller.META_STORAGE_KEY)
            ? AdvancedInstaller.META_STORAGE_KEY
            : 'terra-advanced-installer-meta';

        if (typeof localStorage === 'undefined') {
            return {};
        }

        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('⚠️ Não foi possível ler metadados do instalador:', (error && error.message) || error);
            return {};
        }
    }

    /**
     * Atualiza progresso na UI
     */
    updateProgress(state) {
        if (!state) return;

        if (this.phaseElement) {
            if (state.phaseDescription) {
                this.phaseElement.textContent = state.phaseDescription;
            } else if (state.phase) {
                this.phaseElement.textContent = state.phase;
            }
        }

        if (state.directoryName) {
            this.currentDirectoryName = state.directoryName;
            this.updateDirectoryDisplay();
        }

        const progressValue = Number.isFinite(state.progress) ? Math.max(0, Math.min(100, state.progress)) : 0;
        if (this.progressElement) {
            this.progressElement.style.width = `${progressValue}%`;
        }

        if (this.progressTextElement) {
            this.progressTextElement.textContent = `${progressValue}%`;
        }

        if (this.filesElement) {
            const downloaded = Number.isFinite(state.downloadedFiles) ? state.downloadedFiles : 0;
            const total = Number.isFinite(state.totalFiles) ? state.totalFiles : 0;
            this.filesElement.textContent = `${downloaded}/${total}`;
        }

        if (this.timeElement) {
            this.timeElement.textContent = this.formatETA(state.estimatedTime);
        }

        if (this.sizeElement) {
            this.sizeElement.textContent = this.formatBytes(state.downloadedSize);
        }
    }

    clearErrors() {
        if (this.errorsWrapper) {
            this.errorsWrapper.style.display = 'none';
        }
        if (this.errorsListElement) {
            this.errorsListElement.innerHTML = '';
        }
    }

    showErrors(errors) {
        if (!errors || errors.length === 0) return;
        if (!this.errorsWrapper || !this.errorsListElement) return;

        this.errorsListElement.innerHTML = '';
        errors.forEach((message) => {
            const li = document.createElement('li');
            li.textContent = message;
            this.errorsListElement.appendChild(li);
        });

        this.errorsWrapper.style.display = 'block';
    }

    updateDirectoryDisplay() {
        if (!this.folderElement) return;
        this.folderElement.textContent = this.currentDirectoryName || 'Nenhuma';
        this.setStartButtonState();
    }

    async handleSelectFolderClick() {
        if (this.installationRunning) {
            return;
        }

        if (window.pwaInstaller && typeof window.pwaInstaller.selectInstallDirectory === 'function') {
            const handle = await window.pwaInstaller.selectInstallDirectory();
            if (handle) {
                await this.prepareWithDirectory(handle, { autoStart: false, source: 'manual-selection', autoStartMode: 'manual' });
            }
            return;
        }

        if (!('showDirectoryPicker' in window)) {
            alert('Seu navegador não suporta seleção de pastas. Utilize um navegador compatível (Chrome ou Edge) para configurar o diretório.');
            return;
        }

        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents',
                id: 'terra-midi-offline-manual'
            });
            if (handle) {
                await this.prepareWithDirectory(handle, { autoStart: false, source: 'manual-picker', autoStartMode: 'manual' });
            }
        } catch (error) {
            if (!(error && error.name === 'AbortError')) {
                console.warn('⚠️ Erro ao selecionar pasta manualmente:', (error && error.message) || error);
            }
        }
    }

    setStartButtonState({ preserveLabel = false } = {}) {
        if (!this.startButton) return;

        if (this.installationRunning) {
            this.startButton.disabled = true;
            if (this.selectFolderButton) {
                this.selectFolderButton.disabled = true;
            }
            return;
        }

        if (this.installationCompleted) {
            this.startButton.disabled = true;
            if (!preserveLabel) {
                this.startButton.textContent = this.startButtonCompletedLabel;
            }
            if (this.selectFolderButton) {
                this.selectFolderButton.disabled = false;
                this.selectFolderButton.textContent = 'Selecionar nova pasta';
            }
            return;
        }

        const hasDirectory = Boolean(this.selectedDirectoryHandle);

        if (!hasDirectory) {
            this.startButton.disabled = true;
            if (!preserveLabel) {
                this.startButton.textContent = this.startButtonPendingDirectoryLabel;
            }
            if (this.selectFolderButton) {
                this.selectFolderButton.disabled = false;
                this.selectFolderButton.textContent = 'Selecionar pasta';
            }
            return;
        }

        this.startButton.disabled = false;
        if (!preserveLabel) {
            this.startButton.textContent = this.startButtonIdleLabel;
        }
        if (this.selectFolderButton) {
            this.selectFolderButton.disabled = false;
            this.selectFolderButton.textContent = 'Alterar pasta';
        }
    }

    handleInstallationSuccess() {
        this.installationCompleted = true;
        if (this.startButton) {
            this.startButton.textContent = `✅ ${this.startButtonCompletedLabel}`;
        }
        if (this.cancelButton) {
            this.cancelButton.textContent = 'Fechar';
        }

        this.updateExternalInstallButton('completed');

        setTimeout(() => {
            if (this.autoMode) {
                this.close();
            }
        }, 2500);
    }

    handleInstallationFailure() {
        this.installationCompleted = false;
        if (this.startButton) {
            this.startButton.disabled = false;
            this.startButton.textContent = 'Tentar novamente';
        }
        if (this.cancelButton) {
            this.cancelButton.textContent = 'Fechar';
        }

        this.updateExternalInstallButton('failed');
        if (this.installer && this.installer.installationState) {
            this.showErrors(this.installer.installationState.errors);
        }
    }

    updateExternalInstallButton(status) {
        if (!this.externalButton) {
            this.externalButton = document.getElementById('btn-install-pwa');
            if (!this.externalButton) {
                return;
            }
        }

        switch (status) {
            case 'installing':
                this.externalButton.disabled = true;
                this.externalButton.textContent = 'Instalando Terra MIDI...';
                break;
            case 'completed':
                this.externalButton.disabled = true;
                this.externalButton.textContent = 'Instalação concluída';
                break;
            case 'failed':
                this.externalButton.disabled = false;
                this.externalButton.textContent = 'Tentar instalação novamente';
                break;
            case 'ready':
                this.externalButton.disabled = false;
                this.externalButton.textContent = 'Iniciar instalação completa';
                break;
            case 'awaiting-directory':
            default:
                this.externalButton.disabled = false;
                this.externalButton.textContent = 'Instalação offline do Terra MIDI';
                break;
        }
    }

    syncInitialState() {
        const meta = this.getInstallerMeta();
        if (!meta) {
            this.setStartButtonState();
            return;
        }

        if (meta.directoryName) {
            this.currentDirectoryName = meta.directoryName;
            this.updateDirectoryDisplay();
        }

        if (meta.lastSuccessfulRunAt) {
            this.installationCompleted = true;
            this.updateExternalInstallButton('completed');
        }

        this.setStartButtonState();
    }

    /**
     * Mostra modal
     */
    show() {
        if (this.progressModal) {
            this.progressModal.style.display = 'flex';
            this.isVisible = true;
            this.setStartButtonState();
        }
    }

    /**
     * Fecha modal
     */
    close() {
        if (this.progressModal) {
            this.progressModal.style.display = 'none';
            this.isVisible = false;
        }
        this.resetControls();
        this.autoMode = false;
        this.autoReason = null;
    }

    formatETA(seconds) {
        if (!seconds && seconds !== 0) return '-';
        if (seconds < 60) return `${Math.max(0, Math.ceil(seconds))}s`;
        const minutes = Math.floor(seconds / 60);
        const remaining = Math.ceil(seconds % 60);
        return `${minutes}m ${remaining}s`;
    }

    formatBytes(bytes) {
        if (!bytes) return '0 MB';
        const mb = bytes / (1024 * 1024);
        if (mb < 1024) {
            return `${mb.toFixed(1)} MB`;
        }
        const gb = mb / 1024;
        return `${gb.toFixed(2)} GB`;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AdvancedInstallerUI = AdvancedInstallerUI;
}
