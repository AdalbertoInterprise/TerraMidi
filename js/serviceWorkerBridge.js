// Service Worker Bridge - Comunicação otimizada entre SW e aplicação
// Autor: Terra MIDI System
// Data: 20/10/2025
// Descrição: Gerencia lifecycle do SW e liberação de recursos USB/MIDI

class ServiceWorkerBridge {
    constructor() {
        this.swRegistration = null;
        this.updateAvailable = false;
        this.isUpdating = false;
        this.midiManager = null;
        
        console.log('🌉 ServiceWorkerBridge inicializado');
        
        this.initialize();
    }
    
    /**
     * Inicializa listeners do Service Worker
     */
    async initialize() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker não suportado neste navegador');
            return;
        }
        
        try {
            // Registrar Service Worker com tratamento de erro melhorado
            const swPath = this.getServiceWorkerPath();
            console.log(`📍 Registrando Service Worker em: ${swPath}`);
            
            this.swRegistration = await navigator.serviceWorker.register(swPath, {
                scope: '/'
            });
            console.log('✅ Service Worker registrado com sucesso');
            
            // Listeners de lifecycle
            this.swRegistration.addEventListener('updatefound', () => this.handleUpdateFound());
            
            // Listener para mensagens do SW
            navigator.serviceWorker.addEventListener('message', (event) => this.handleSWMessage(event));
            
            // Verificar updates a cada 30 minutos
            setInterval(() => this.checkForUpdates(), 30 * 60 * 1000);
            
            // Verificar update imediatamente
            await this.checkForUpdates();
            
        } catch (error) {
            console.error('❌ Erro ao registrar Service Worker:', error);
            console.error('   └─ Verifique se sw.js existe e está acessível');
            this.handleRegistrationError(error);
        }
    }
    
    /**
     * Determina o caminho correto do Service Worker
     */
    getServiceWorkerPath() {
        // Obter a URL base da página
        const baseURL = window.location.pathname;
        
        // Se está em GitHub Pages em um subdiretório (ex: /TerraMidi/)
        if (baseURL.includes('/TerraMidi')) {
            return '/TerraMidi/sw.js';
        }
        
        // Caso contrário, usar caminho raiz
        return '/sw.js';
    }
    
    /**
     * Trata erros de registro do Service Worker
     */
    handleRegistrationError(error) {
        if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
            console.error('🔍 Erro 404: Service Worker não encontrado');
            console.error('   Verifique:');
            console.error('   1. Se sw.js existe no repositório');
            console.error('   2. Se o arquivo foi commitado');
            console.error('   3. Se o GitHub Pages está habilitado');
            console.error('   4. Se o repositório é público');
        } else if (error.message.includes('bad-mime-type')) {
            console.error('❌ Erro MIME type: sw.js não foi servido com Content-Type correto');
        }
    }
    
    /**
     * Define referência ao MIDI Manager
     */
    setMidiManager(manager) {
        this.midiManager = manager;
        console.log('🎹 MIDI Manager vinculado ao ServiceWorkerBridge');
    }
    
    /**
     * Verifica se há updates disponíveis
     */
    async checkForUpdates() {
        if (!this.swRegistration) return;
        
        try {
            await this.swRegistration.update();
        } catch (error) {
            console.warn('⚠️ Erro ao verificar updates do SW:', error);
        }
    }
    
    /**
     * Handler para novo SW detectado
     */
    handleUpdateFound() {
        const newWorker = this.swRegistration.installing;
        
        if (!newWorker) return;
        
        console.log('🔄 Novo Service Worker detectado, aguardando instalação...');
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo SW instalado, mas ainda não ativo
                this.updateAvailable = true;
                console.log('✅ Novo Service Worker instalado, pronto para ativar');
                
                // Notificar usuário (opcional)
                this.notifyUpdateAvailable();
            }
        });
    }
    
    /**
     * Handler para mensagens do Service Worker
     */
    handleSWMessage(event) {
        const { type, action, version } = event.data || {};
        
        console.log(`📨 Mensagem do SW: ${type}`, event.data);
        
        switch (type) {
            case 'SW_ACTIVATED':
                this.handleSWActivated(action, version);
                break;
                
            case 'CACHE_UPDATED':
                console.log('📦 Cache atualizado pelo SW');
                break;
                
            default:
                console.log('ℹ️ Mensagem SW não reconhecida:', type);
        }
    }
    
    /**
     * Handler quando SW é ativado
     */
    async handleSWActivated(action, version) {
        console.log(`✅ Service Worker v${version} ativado`);
        
        if (action === 'RELEASE_USB_RESOURCES') {
            // SW solicitando liberação de recursos USB
            await this.releaseUSBResources();
        }
        
        // Reconectar dispositivos MIDI após ativação
        if (this.midiManager && typeof this.midiManager.autoReconnect === 'function') {
            console.log('🔄 Reconectando dispositivos MIDI após ativação do SW...');
            
            setTimeout(() => {
                this.midiManager.autoReconnect('sw-activated');
            }, 500);
        }
    }
    
    /**
     * Libera recursos USB/MIDI antes de reload
     */
    async releaseUSBResources() {
        console.log('🔓 Liberando recursos USB/MIDI para update do SW...');
        
        if (!this.midiManager) {
            console.warn('⚠️ MIDI Manager não disponível');
            return;
        }
        
        try {
            // Desconectar dispositivos
            if (this.midiManager.connectedDevices) {
                const deviceIds = Array.from(this.midiManager.connectedDevices.keys());
                
                for (const deviceId of deviceIds) {
                    const device = this.midiManager.connectedDevices.get(deviceId);
                    
                    if (device?.input) {
                        // Remover listeners
                        device.input.onmidimessage = null;
                        
                        // Fechar porta
                        if (typeof device.input.close === 'function' && device.input.connection === 'open') {
                            try {
                                await device.input.close();
                                console.log(`✅ Porta MIDI fechada: ${device.name}`);
                            } catch (error) {
                                console.warn(`⚠️ Erro ao fechar ${device.name}:`, error);
                            }
                        }
                    }
                }
            }
            
            // Limpar referência ao midiAccess
            if (this.midiManager.midiAccess) {
                this.midiManager.midiAccess.onstatechange = null;
                this.midiManager.midiAccess = null;
                window.__midiAccess = null;
            }
            
            console.log('✅ Recursos USB/MIDI liberados com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao liberar recursos USB/MIDI:', error);
        }
    }
    
    /**
     * Ativa novo Service Worker
     */
    async activateUpdate() {
        if (!this.updateAvailable || this.isUpdating) {
            return;
        }
        
        this.isUpdating = true;
        console.log('🔄 Ativando novo Service Worker...');
        
        // Liberar recursos MIDI antes de atualizar
        await this.releaseUSBResources();
        
        // Notificar SW para assumir controle
        if (this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Recarregar página após breve delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
    
    /**
     * Notifica usuário sobre update disponível
     */
    notifyUpdateAvailable() {
        // Integração com sistema de notificações
        if (typeof window.midiNotifier !== 'undefined' && window.midiNotifier.showInfo) {
            window.midiNotifier.showInfo(
                'Nova versão disponível! A aplicação será atualizada automaticamente em breve.'
            );
        }
        
        // Auto-ativar update após 5 segundos
        setTimeout(() => {
            this.activateUpdate();
        }, 5000);
    }
    
    /**
     * Envia mensagem para o Service Worker
     */
    async sendMessage(type, data = {}) {
        if (!navigator.serviceWorker.controller) {
            console.warn('⚠️ Service Worker não está controlando a página');
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };
            
            navigator.serviceWorker.controller.postMessage(
                { type, ...data },
                [messageChannel.port2]
            );
        });
    }
    
    /**
     * Solicita estatísticas de cache
     */
    async getCacheStats() {
        try {
            return await this.sendMessage('GET_CACHE_STATS');
        } catch (error) {
            console.error('❌ Erro ao obter stats do cache:', error);
            return null;
        }
    }
    
    /**
     * Solicita limpeza de cache
     */
    async cleanupCache() {
        try {
            return await this.sendMessage('CLEANUP_CACHE');
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
            return null;
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ServiceWorkerBridge = ServiceWorkerBridge;
    
    // Instanciar automaticamente
    window.swBridge = new ServiceWorkerBridge();
}
