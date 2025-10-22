// 🎯 Advanced Installer UI Integration
// Integração da UI para o novo instalador agressivo
// Versão: 1.0.0.0.0

class AdvancedInstallerUI {
    constructor() {
        this.installer = null;
        this.progressModal = null;
        this.isVisible = false;
        
        console.log('🎨 AdvancedInstallerUI inicializado');
    }
    
    /**
     * Inicializa interface do instalador
     */
    init() {
        this.createProgressModal();
        this.bindInstallationEvents();
        this.showInstallPrompt();
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
                    <div class="terra-installer-phase">
                        <h3>📋 Fase de Instalação</h3>
                        <p id="terra-installer-phase-text">Aguardando...</p>
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
                            <span class="terra-stat-label">Tamanho:</span>
                            <span id="terra-installer-size" class="terra-stat-value">0 MB</span>
                        </div>
                    </div>
                    
                    <div id="terra-installer-benefits" class="terra-installer-benefits">
                        <h4>✨ Benefícios da Instalação:</h4>
                        <ul>
                            <li>📱 Funciona offline completo</li>
                            <li>⚡ Carregamento instantâneo</li>
                            <li>🎵 Todos os soundfonts baixados</li>
                            <li>💾 Até 2GB de cache persistente</li>
                            <li>🔄 Sincronização automática</li>
                        </ul>
                    </div>
                    
                    <div id="terra-installer-errors" class="terra-installer-errors" style="display:none;">
                        <h4>⚠️ Erros encontrados:</h4>
                        <ul id="terra-installer-errors-list"></ul>
                    </div>
                </div>
                
                <div class="terra-installer-footer">
                    <button id="terra-installer-start" class="terra-btn terra-btn-primary">Iniciar Instalação</button>
                    <button id="terra-installer-cancel" class="terra-btn terra-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.progressModal = modal;
        
        // Bindings
        modal.querySelector('.terra-installer-close').addEventListener('click', () => this.close());
        modal.querySelector('#terra-installer-cancel').addEventListener('click', () => this.close());
        modal.querySelector('#terra-installer-start').addEventListener('click', () => this.startInstallation());
    }
    
    /**
     * Mostra prompt de instalação
     */
    showInstallPrompt() {
        const existing = document.querySelector('#terra-advanced-installer-modal');
        if (existing) {
            this.progressModal = existing;
            this.show();
        }
    }
    
    /**
     * Inicia instalação
     */
    async startInstallation() {
        if (!this.installer) {
            this.installer = new AdvancedInstaller();
        }
        
        // Desabilitar botão
        const btn = this.progressModal.querySelector('#terra-installer-start');
        btn.disabled = true;
        btn.textContent = '⏳ Instalando...';
        
        // Iniciar instalação
        const result = await this.installer.startAggressiveInstallation();
        
        if (result) {
            btn.textContent = '✅ Instalação Concluída!';
            setTimeout(() => this.close(), 2000);
        } else {
            btn.disabled = false;
            btn.textContent = 'Iniciar Instalação';
            this.showErrors(this.installer.installationState.errors);
        }
    }
    
    /**
     * Bind de eventos de progresso
     */
    bindInstallationEvents() {
        window.addEventListener('terra-installation-progress', (e) => {
            this.updateProgress(e.detail);
        });
    }
    
    /**
     * Atualiza progresso na UI
     */
    updateProgress(state) {
        if (!this.isVisible) return;
        
        const modal = this.progressModal;
        
        // Progresso
        const progressBar = modal.querySelector('#terra-installer-progress');
        progressBar.style.width = state.progress + '%';
        
        // Texto de progresso
        modal.querySelector('#terra-installer-progress-text').textContent = state.progress + '%';
        
        // Arquivos
        modal.querySelector('#terra-installer-files').textContent = 
            `${state.downloadedFiles}/${state.totalFiles}`;
        
        // Tempo estimado
        const timeText = state.estimatedTime 
            ? `${Math.ceil(state.estimatedTime)}s` 
            : '-';
        modal.querySelector('#terra-installer-time').textContent = timeText;
        
        // Tamanho
        const sizeMB = (state.downloadedSize / (1024 * 1024)).toFixed(1);
        modal.querySelector('#terra-installer-size').textContent = sizeMB + ' MB';
    }
    
    /**
     * Mostra erros
     */
    showErrors(errors) {
        if (!errors || errors.length === 0) return;
        
        const modal = this.progressModal;
        const errorsDiv = modal.querySelector('#terra-installer-errors');
        const errorsList = modal.querySelector('#terra-installer-errors-list');
        
        errorsList.innerHTML = '';
        errors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = error;
            errorsList.appendChild(li);
        });
        
        errorsDiv.style.display = 'block';
    }
    
    /**
     * Mostra modal
     */
    show() {
        if (this.progressModal) {
            this.progressModal.style.display = 'flex';
            this.isVisible = true;
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
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AdvancedInstallerUI = AdvancedInstallerUI;
}
