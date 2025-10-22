// MIDI Initialization Flow Manager - Orquestração do fluxo de inicialização MIDI
// Autor: Terra MIDI System
// Data: 22/10/2025
// Descrição: Gerencia fluxo inteligente de inicialização MIDI com gesto do usuário
// Propósito: Coordenar User Gesture Activator, Status Monitor e midiDeviceManager

/**
 * Gerenciador do fluxo de inicialização MIDI
 * 
 * Fluxo esperado:
 * 1. App.js carrega e chama ensureMidiIntegration()
 * 2. MIDIInitializationFlowManager é criado
 * 3. Tenta inicialização automática (sem gesto) - pode falhar
 * 4. Se falhar com SecurityError/user-activation, mostra botão
 * 5. User clica botão → captura gesto → tenta novamente
 * 6. Se sucesso → cacheado → próximas tentativas funcionam sem clique
 * 7. Reconexão automática continua trabalhando
 * 8. Status Monitor exibe estado real-time
 */
class MIDIInitializationFlowManager {
    constructor(options = {}) {
        this.midiManager = null;
        this.gestureActivator = null;
        this.statusMonitor = null;
        this.notifier = null;
        
        this.config = {
            autoInitialize: typeof options.autoInitialize === 'boolean' ? options.autoInitialize : true,
            showGestureUI: typeof options.showGestureUI === 'boolean' ? options.showGestureUI : true,
            autoHideOnSuccess: typeof options.autoHideOnSuccess === 'boolean' ? options.autoHideOnSuccess : true,
            retryDelay: typeof options.retryDelay === 'number' ? options.retryDelay : 2000
        };
        
        this.state = {
            isInitialized: false,
            requiresGesture: false,
            hasTriedAutoInit: false,
            lastError: null,
            initAttempts: 0,
            maxAttempts: 5
        };
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔄 MIDI Initialization Flow Manager criado');
        console.log('═══════════════════════════════════════════════════════════');
        
        this.init();
    }

    /**
     * Inicializa o gerenciador de fluxo
     */
    init() {
        // Aguardar pelo menos um pouco para que os módulos carregem
        setTimeout(() => {
            this.setup();
        }, 100);
    }

    /**
     * Configura os componentes
     */
    setup() {
        // Obter referências globais
        this.midiManager = window.midiManager;
        this.notifier = window.midiNotifier;
        
        if (!this.midiManager) {
            console.warn('⚠️ midiManager não disponível');
            return;
        }
        
        console.log('✅ Referências globais obtidas');
        
        // Criar User Gesture Activator se configurado
        if (this.config.showGestureUI && typeof window.MIDIUserGestureActivator !== 'undefined') {
            this.gestureActivator = new MIDIUserGestureActivator({
                autoHide: this.config.autoHideOnSuccess
            });
            this.gestureActivator.setMidiManager(this.midiManager);
            this.gestureActivator.setNotifier(this.notifier);
            console.log('✅ User Gesture Activator criado');
        }
        
        // Criar Status Monitor se disponível
        if (typeof window.MIDIStatusMonitor !== 'undefined') {
            this.statusMonitor = new MIDIStatusMonitor();
            this.statusMonitor.setMidiManager(this.midiManager);
            this.statusMonitor.setNotifier(this.notifier);
            console.log('✅ Status Monitor criado');
        }
        
        // Tentar inicialização automática
        if (this.config.autoInitialize) {
            this.attemptAutoInitialization();
        }
        
        // Configurar listeners de eventos
        this.bindEvents();
    }

    /**
     * Tenta inicialização automática (sem gesto)
     */
    async attemptAutoInitialization() {
        if (this.state.hasTriedAutoInit) {
            return;
        }
        
        this.state.hasTriedAutoInit = true;
        this.state.initAttempts++;
        
        console.log('🚀 Tentativa de inicialização automática MIDI');
        
        try {
            const success = await this.midiManager.initialize('auto-init');
            
            if (success) {
                console.log('✅ Inicialização automática bem-sucedida');
                this.state.isInitialized = true;
                
                if (this.gestureActivator) {
                    this.gestureActivator.hide();
                }
                
                if (this.statusMonitor) {
                    this.statusMonitor.setStatus('connecting');
                }
                
                return true;
            } else {
                console.log('ℹ️ Inicialização automática retornou falso');
                this.state.requiresGesture = true;
                
                if (this.gestureActivator) {
                    this.gestureActivator.show();
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro na inicialização automática:', error.message);
            this.state.lastError = error;
            
            // Verificar se é erro de segurança (requer gesto)
            const requiresGesture = error?.name === 'SecurityError' || /user activation/i.test(error?.message || '');
            
            if (requiresGesture) {
                console.log('🔐 Detectado: Gesto do usuário necessário');
                this.state.requiresGesture = true;
                
                if (this.gestureActivator) {
                    console.log('📢 Exibindo botão de ativação MIDI');
                    this.gestureActivator.show();
                }
            }
            
            // Log detalhado para debug
            console.error('🔍 Detalhes do erro:', {
                name: error.name,
                message: error.message,
                requiresGesture
            });
        }
    }

    /**
     * Vincula eventos
     */
    bindEvents() {
        // Escutar sucesso de ativação via gesto
        window.addEventListener('terra-midi:midi-gesture-activated', (e) => {
            if (e.detail.success) {
                console.log('✅ MIDI ativado via gesto do usuário');
                this.state.isInitialized = true;
                
                if (this.statusMonitor) {
                    this.statusMonitor.setStatus('connected');
                }
            }
        });
        
        // Escutar erros de gesto
        window.addEventListener('terra-midi:midi-gesture-error', (e) => {
            console.warn('⚠️ Erro ao ativar MIDI via gesto:', e.detail.reason);
            this.state.lastError = e.detail.error;
            
            if (this.statusMonitor) {
                this.statusMonitor.setStatus('error');
            }
        });
        
        // Escutar inicialização do manager
        window.addEventListener('terra-midi:manager-initialized', () => {
            console.log('✅ MIDI Manager foi inicializado');
            this.state.isInitialized = true;
            
            if (this.gestureActivator) {
                this.gestureActivator.hide();
            }
        });
        
        // Escutar reconexão automática bem-sucedida
        window.addEventListener('terra-midi:device-connected', (e) => {
            console.log('🔌 Dispositivo MIDI conectado');
            this.state.isInitialized = true;
            
            if (this.statusMonitor) {
                this.statusMonitor.setStatus('connected');
            }
        });
        
        // Escutar desconexão
        window.addEventListener('terra-midi:device-disconnected', () => {
            console.log('🔌 Dispositivo MIDI desconectado');
            
            if (this.statusMonitor) {
                this.statusMonitor.setStatus('disconnected');
            }
        });
        
        console.log('✅ Event listeners configurados');
    }

    /**
     * Obtém o estado atual
     */
    getState() {
        return {
            ...this.state,
            manager: this.midiManager?.getState?.(),
            gestureActivatorStats: this.gestureActivator?.getStats?.(),
            statusMonitorHistory: this.statusMonitor?.getHistory?.()
        };
    }

    /**
     * Executa diagnóstico completo
     */
    async runDiagnostics() {
        console.log('🔬 Executando diagnóstico do fluxo MIDI');
        
        const diagnostics = {
            timestamp: Date.now(),
            flowState: this.getState(),
            midiAvailability: this.midiManager?.browserCompat?.checkMIDIAvailability?.(),
            permissionStatus: null,
            secureContext: this.midiManager?.validateSecureContext?.()
        };
        
        // Tentar obter status de permissão
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'midi', sysex: false });
                diagnostics.permissionStatus = status.state;
            } catch (err) {
                diagnostics.permissionStatus = `erro: ${err.message}`;
            }
        }
        
        console.log('📊 Diagnóstico completo:', diagnostics);
        return diagnostics;
    }

    /**
     * Exporta relatório em JSON
     */
    exportReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            flowManager: this.getState(),
            manager: this.midiManager?.getState?.(),
            browser: this.midiManager?.browserCompat?.detectBrowser?.(),
            statusHistory: this.statusMonitor?.getHistory?.(),
            deviceHistory: this.midiManager?.connectedDevices
        };
        
        // Converter Map em objeto para JSON
        if (report.deviceHistory instanceof Map) {
            report.deviceHistory = Array.from(report.deviceHistory.entries());
        }
        
        return report;
    }

    /**
     * Destrói o gerenciador
     */
    destroy() {
        if (this.gestureActivator) {
            this.gestureActivator.destroy();
        }
        if (this.statusMonitor) {
            this.statusMonitor.destroy();
        }
        console.log('🗑️ MIDI Initialization Flow Manager destruído');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIInitializationFlowManager = MIDIInitializationFlowManager;
}
