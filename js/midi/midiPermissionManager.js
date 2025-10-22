// MIDI Permission Manager - Gerenciamento robusto de permissões Web MIDI
// Autor: Terra MIDI System
// Data: 22/10/2025
// Descrição: Detecta, monitora e gerencia o estado de permissões MIDI
// ===================================================================
// Utiliza navigator.permissions.query() para consultar estado de permissão
// Observa mudanças de estado e notifica aplicação em tempo real
// Implementa cache e fallback para navegadores sem suporte à Permissions API

/**
 * Gerenciador de permissões para Web MIDI API
 * Detecta estado (granted/denied/prompt) e monitora mudanças
 */
class MIDIPermissionManager {
    constructor(options = {}) {
        this.status = null; // Estado atual: null, 'granted', 'denied', 'prompt'
        this.permissionObserver = null; // Listener para mudanças de estado
        this.lastChecked = null;
        this.checkInterval = null;
        this.permissionCache = this.loadPermissionCache();
        
        // Callbacks para notificação de mudanças
        this.onStatusChange = typeof options.onStatusChange === 'function' ? options.onStatusChange : null;
        this.onDenied = typeof options.onDenied === 'function' ? options.onDenied : null;
        this.onGranted = typeof options.onGranted === 'function' ? options.onGranted : null;
        this.onPrompt = typeof options.onPrompt === 'function' ? options.onPrompt : null;
        
        // Configurações
        this.cacheExpiry = options.cacheExpiry || 3600000; // 1 hora
        this.recheckInterval = options.recheckInterval || 30000; // 30 segundos
        this.enablePolling = Boolean(options.enablePolling);
        
        console.log('🔐 MIDIPermissionManager inicializado');
        this.initialize();
    }

    /**
     * Inicializa o gerenciador de permissões
     */
    async initialize() {
        try {
            // Tentar usar Permissions API
            const result = await this.queryPermissionStatus();
            
            if (result) {
                this.status = result.state;
                this.lastChecked = Date.now();
                this.setupPermissionObserver(result);
                
                console.log(`✅ Estado de permissão MIDI detectado: ${this.status}`);
                this.triggerCallback(this.status);
                
                // Se negado, sugerir ação do usuário
                if (this.status === 'denied') {
                    console.warn('⛔ Permissão MIDI foi negada. Use as instruções fornecidas para liberar o acesso.');
                }
            } else {
                console.log('ℹ️ Permissions API não disponível. Usando fallback de detecção');
                this.startPolling();
            }
        } catch (error) {
            console.warn('⚠️ Erro ao inicializar MIDIPermissionManager:', error);
            this.startPolling();
        }
    }

    /**
     * Consulta o estado de permissão usando navigator.permissions.query()
     * @returns {Promise<PermissionStatus|null>}
     */
    async queryPermissionStatus() {
        if (!navigator.permissions || !navigator.permissions.query) {
            console.log('ℹ️ navigator.permissions.query() não disponível neste navegador');
            return null;
        }

        try {
            const result = await navigator.permissions.query({ name: 'midi' });
            
            console.log(`ℹ️ Permissions API retornou estado: ${result.state}`);
            console.log('   ├─ granted: Permissão já concedida');
            console.log('   ├─ denied: Permissão foi explicitamente negada');
            console.log('   └─ prompt: Será mostrado prompt ao usuário');
            
            return result;
        } catch (error) {
            // Alguns navegadores podem não suportar query para 'midi'
            console.warn('⚠️ Permissions API não suporta consulta "midi":', error.message);
            return null;
        }
    }

    /**
     * Configura observer para mudanças de estado de permissão
     * @param {PermissionStatus} status - Objeto de status de permissão
     */
    setupPermissionObserver(status) {
        if (!status) {
            return;
        }

        // Suportar ambos addEventListener (moderno) e onchange (legado)
        const setupListener = () => {
            status.onchange = (event) => {
                const newState = event?.target?.state || status.state;
                console.log(`ℹ️ Estado de permissão MIDI mudou para: ${newState}`);
                
                this.status = newState;
                this.lastChecked = Date.now();
                this.cachePermissionStatus(newState);
                this.triggerCallback(newState);
            };
        };

        if (typeof status.addEventListener === 'function') {
            status.addEventListener('change', (event) => {
                const newState = event?.target?.state || status.state;
                console.log(`ℹ️ Estado de permissão MIDI mudou para: ${newState}`);
                
                this.status = newState;
                this.lastChecked = Date.now();
                this.cachePermissionStatus(newState);
                this.triggerCallback(newState);
            });
        } else {
            setupListener();
        }

        this.permissionObserver = status;
        console.log('✅ Observer de permissão configurado com sucesso');
    }

    /**
     * Inicia polling periódico para detectar mudanças (fallback)
     */
    startPolling() {
        if (this.enablePolling) {
            console.log(`🔄 Iniciando polling de permissões a cada ${this.recheckInterval}ms`);
            
            this.checkInterval = setInterval(async () => {
                const result = await this.queryPermissionStatus();
                if (result && result.state !== this.status) {
                    console.log(`🔄 Mudança de estado detectada via polling: ${this.status} → ${result.state}`);
                    this.status = result.state;
                    this.lastChecked = Date.now();
                    this.cachePermissionStatus(result.state);
                    this.triggerCallback(result.state);
                }
            }, this.recheckInterval);
        }
    }

    /**
     * Executa callback apropriado para o novo estado
     * @param {string} state - Estado: 'granted', 'denied', 'prompt'
     */
    triggerCallback(state) {
        if (this.onStatusChange && typeof this.onStatusChange === 'function') {
            this.onStatusChange(state);
        }

        switch (state) {
            case 'granted':
                if (this.onGranted && typeof this.onGranted === 'function') {
                    this.onGranted();
                }
                break;
                
            case 'denied':
                if (this.onDenied && typeof this.onDenied === 'function') {
                    this.onDenied();
                }
                break;
                
            case 'prompt':
                if (this.onPrompt && typeof this.onPrompt === 'function') {
                    this.onPrompt();
                }
                break;
        }
    }

    /**
     * Obtém o estado atual de permissão
     * @returns {string|null} 'granted', 'denied', 'prompt' ou null
     */
    getStatus() {
        return this.status;
    }

    /**
     * Verifica se a permissão foi concedida
     * @returns {boolean}
     */
    isGranted() {
        return this.status === 'granted';
    }

    /**
     * Verifica se a permissão foi negada
     * @returns {boolean}
     */
    isDenied() {
        return this.status === 'denied';
    }

    /**
     * Verifica se ainda é necessário exibir prompt
     * @returns {boolean}
     */
    needsPrompt() {
        return this.status === 'prompt' || this.status === null;
    }

    /**
     * Armazena estado de permissão em cache local
     * @param {string} state - Estado de permissão
     */
    cachePermissionStatus(state) {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        try {
            const cacheData = {
                state,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            };
            
            window.localStorage.setItem('terraMidi:permissionCache', JSON.stringify(cacheData));
            this.permissionCache = cacheData;
            console.log(`💾 Estado de permissão MIDI armazenado em cache: ${state}`);
        } catch (error) {
            console.warn('⚠️ Falha ao armazenar permissão em cache:', error);
        }
    }

    /**
     * Carrega estado de permissão do cache local
     * @returns {Object|null}
     */
    loadPermissionCache() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null;
        }

        try {
            const cached = window.localStorage.getItem('terraMidi:permissionCache');
            if (!cached) {
                return null;
            }

            const data = JSON.parse(cached);
            
            // Verificar se cache ainda é válido
            if (data.timestamp && Date.now() - data.timestamp > this.cacheExpiry) {
                console.log('ℹ️ Cache de permissão expirado');
                window.localStorage.removeItem('terraMidi:permissionCache');
                return null;
            }

            console.log(`✅ Estado de permissão MIDI carregado do cache: ${data.state}`);
            return data;
        } catch (error) {
            console.warn('⚠️ Falha ao carregar permissão do cache:', error);
            return null;
        }
    }

    /**
     * Limpa o cache de permissão
     */
    clearCache() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        try {
            window.localStorage.removeItem('terraMidi:permissionCache');
            this.permissionCache = null;
            console.log('🗑️ Cache de permissão MIDI limpo');
        } catch (error) {
            console.warn('⚠️ Falha ao limpar cache de permissão:', error);
        }
    }

    /**
     * Limpa recursos e para polling
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (this.permissionObserver) {
            this.permissionObserver.onchange = null;
            this.permissionObserver = null;
        }

        console.log('🧹 MIDIPermissionManager destruído');
    }

    /**
     * Obtém descrição legível do estado atual
     * @returns {string}
     */
    getStatusDescription() {
        const descriptions = {
            'granted': '✅ Permissão concedida - MIDI está disponível',
            'denied': '⛔ Permissão negada - Acesso bloqueado pelo navegador',
            'prompt': '🔔 Permissão não concedida - Prompt será exibido ao usuário',
            'null': '❓ Estado desconhecido - Verificando permissão...'
        };

        return descriptions[this.status] || descriptions['null'];
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIPermissionManager = MIDIPermissionManager;
}
