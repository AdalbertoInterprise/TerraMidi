/**
 * 🔄 UpdateNotifier - Sistema de Atualização Automática Terra MIDI
 * 
 * Monitora atualizações do Service Worker e notifica o usuário
 * com um banner interativo para forçar reload com nova versão
 * 
 * Funcionalidades:
 * - Detecção automática de atualizações a cada 1 minuto
 * - Banner visual com countdown animado (5 segundos)
 * - Notificação nativa do navegador
 * - Reload forçado com limpeza de cache
 * - Integração com Web Notification API
 * 
 * @version 1.0.0.0.0.1
 * @author Terra Eletronica
 */

class UpdateNotifier {
    constructor() {
        this.updateCheckInterval = 60000;        // 1 minuto
        this.bannerDuration = 5000;              // 5 segundos
        this.checkInterval = null;
        this.swRegistration = null;
        this.updateDetected = false;
        this.bannerShown = false;
        this.countdownTimer = null;
        
        this.init();
    }

    /**
     * Inicializar o sistema de notificações
     */
    async init() {
        console.log('🔄 UpdateNotifier inicializando...');
        
        try {
            // Registrar listener para mensagens do Service Worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
                // Obter registro do Service Worker
                this.swRegistration = await navigator.serviceWorker.getRegistration();
                console.log('✅ Service Worker registration obtido');
                
                // Iniciar verificação periódica de atualizações
                this.startUpdateCheck();
                console.log('✅ UpdateNotifier ativo');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar UpdateNotifier:', error);
        }
    }

    /**
     * Iniciar verificação periódica de atualizações
     */
    startUpdateCheck() {
        console.log('🔍 Iniciando verificação de atualizações a cada 1 minuto...');
        
        // Verificar imediatamente
        this.checkForUpdates();
        
        // Depois verificar a cada 1 minuto
        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.updateCheckInterval);
    }

    /**
     * Verificar se há atualização do Service Worker disponível
     */
    async checkForUpdates() {
        try {
            if (!this.swRegistration) {
                this.swRegistration = await navigator.serviceWorker.getRegistration();
            }
            
            if (!this.swRegistration) {
                console.warn('⚠️ Sem Service Worker registration');
                return;
            }

            // Tentar atualizar o registro do Service Worker
            const updated = await this.swRegistration.update();
            console.log('🔄 Verificação de atualização concluída');

            // Verificar se há um novo Service Worker em espera
            if (this.swRegistration.waiting) {
                console.log('⚠️ Nova versão do Service Worker disponível!');
                if (!this.updateDetected) {
                    this.updateDetected = true;
                    this.handleUpdateAvailable();
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar atualizações:', error);
        }
    }

    /**
     * Lidar com mensagens do Service Worker
     */
    handleServiceWorkerMessage(data) {
        const { type, action, version, previousVersion } = data;
        
        console.log('📨 Mensagem do Service Worker recebida:', type, action);
        
        // Mensagem de atualização
        if (type === 'SW_UPDATED' && action === 'FORCE_RELOAD') {
            console.log(`🔄 Atualização detectada: ${previousVersion} → ${version}`);
            this.handleUpdateAvailable();
        }
        
        // Mensagem de ativação (sem atualização)
        else if (type === 'SW_ACTIVATED') {
            console.log('✅ Service Worker ativado (sem atualização)');
        }
        
        // Mensagem de liberação de recursos USB
        else if (type === 'RELEASE_USB_RESOURCES') {
            console.log('🔓 Recursos USB/MIDI liberados pelo SW');
        }
    }

    /**
     * Lidar com atualização disponível
     */
    handleUpdateAvailable() {
        console.log('🔔 Atualização disponível! Mostrando banner...');
        
        if (!this.bannerShown) {
            this.bannerShown = true;
            this.showUpdateBanner();
            this.showNotification();
        }
    }

    /**
     * Mostrar banner de atualização com countdown
     */
    showUpdateBanner() {
        // Remover banner anterior se existir
        const existingBanner = document.getElementById('update-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        // Criar banner
        const banner = document.createElement('div');
        banner.id = 'update-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%);
                color: white;
                padding: 16px;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideDown 0.3s ease-out;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            ">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <span style="font-size: 24px; animation: spin 2s linear infinite;">🔄</span>
                    <div style="text-align: left;">
                        <strong style="font-size: 16px; display: block;">🎵 Terra MIDI Atualizado!</strong>
                        <span style="font-size: 14px; opacity: 0.95;">Recarregando em <span id="countdown">5</span> segundos...</span>
                    </div>
                    <button id="update-now-btn" style="
                        margin-left: auto;
                        padding: 8px 16px;
                        background: rgba(255, 255, 255, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">Recarregar Agora</button>
                </div>
            </div>
            <style>
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                #update-now-btn:hover {
                    background: rgba(255, 255, 255, 0.4);
                    border-color: rgba(255, 255, 255, 0.8);
                    transform: scale(1.05);
                }
            </style>
        `;

        document.body.insertBefore(banner, document.body.firstChild);

        // Botão de reload imediato
        const reloadBtn = document.getElementById('update-now-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                this.reloadWithNewVersion();
            });
        }

        // Countdown automático
        let countdown = 5;
        const countdownElement = document.getElementById('countdown');
        
        this.countdownTimer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(this.countdownTimer);
                this.reloadWithNewVersion();
            }
        }, 1000);
    }

    /**
     * Mostrar notificação nativa do navegador
     */
    async showNotification() {
        try {
            // Verificar se o navegador suporta Notification API
            if ('Notification' in window) {
                let permission = Notification.permission;
                
                // Solicitar permissão se necessário
                if (permission === 'default') {
                    permission = await Notification.requestPermission();
                }
                
                // Mostrar notificação se permitido
                if (permission === 'granted') {
                    const notification = new Notification('🎵 Terra MIDI Atualizado!', {
                        icon: '/Logos/icon-1024x1024.png',
                        badge: '/favicon.svg',
                        tag: 'terra-midi-update',
                        requireInteraction: true,
                        body: 'Uma nova versão está disponível. Clique para recarregar.',
                        actions: [
                            {
                                action: 'reload',
                                title: '↻ Recarregar Agora',
                                icon: '/favicon.svg'
                            },
                            {
                                action: 'dismiss',
                                title: 'Depois',
                                icon: '/favicon.svg'
                            }
                        ]
                    });

                    // Lidar com cliques na notificação
                    notification.onclick = (event) => {
                        event.preventDefault();
                        this.reloadWithNewVersion();
                        notification.close();
                    };

                    // Lidar com ações
                    notification.onaction = (event) => {
                        if (event.action === 'reload') {
                            this.reloadWithNewVersion();
                        }
                        notification.close();
                    };
                }
            }
        } catch (error) {
            console.error('⚠️ Erro ao mostrar notificação:', error);
        }
    }

    /**
     * Recarregar com nova versão
     */
    async reloadWithNewVersion() {
        try {
            console.log('🔄 Recarregando com nova versão...');
            
            // Parar verificações
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
            if (this.countdownTimer) {
                clearInterval(this.countdownTimer);
            }

            // Se há um novo Service Worker esperando, ativá-lo
            if (this.swRegistration && this.swRegistration.waiting) {
                console.log('✅ Ativando novo Service Worker...');
                this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // Aguardar controlChange
                await new Promise((resolve) => {
                    const onControllerChange = () => {
                        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
                        resolve();
                    };
                    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
                    
                    // Timeout de 2 segundos
                    setTimeout(() => {
                        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
                        resolve();
                    }, 2000);
                });
            }

            // Recarregar a página com hard refresh
            window.location.reload(true);
        } catch (error) {
            console.error('❌ Erro ao recarregar:', error);
            // Fallback: recarregar normalmente
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }

    /**
     * Destruir o notificador (limpeza)
     */
    destroy() {
        console.log('🧹 Destruindo UpdateNotifier...');
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.remove();
        }
    }
}

// Instanciar globalmente quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.updateNotifier = new UpdateNotifier();
    });
} else {
    window.updateNotifier = new UpdateNotifier();
}

console.log('✅ UpdateNotifier module carregado');
