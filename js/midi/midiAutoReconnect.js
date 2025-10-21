// MIDI Auto Reconnector - Reconexão automática de dispositivos Terra
// Autor: Terra MIDI System
// Data: 20/10/2025
// Descrição: Monitora eventos USB/MIDI para restabelecer a comunicação sem ações manuais
// 🔧 v2.0 - Melhorias para Chrome com liberação adequada de recursos

class MIDIAutoReconnector {
    constructor(options = {}) {
        this.storageKey = 'terraMidiKnownDevices';
        this.minInterval = 1500; // intervalo mínimo entre tentativas consecutivas (ms)
        this.maxRetries = 5; // Aumentado de 3 para 5
        this.retryCount = 0;
        this.lastAttempt = 0;
        this.pendingRetry = null;
        this.reconnectInProgress = false; // 🆕 Flag para evitar tentativas simultâneas

        this.midiManager = null;
        this.notifier = null;
        this.terraFilters = options.terraFilters || {};
        this.usbSupported = Boolean(typeof navigator !== 'undefined' && navigator?.usb);
        this.deferredReasons = [];
        
        // 🆕 Sistema de recuperação progressiva
        this.recoveryStrategy = {
            attempts: 0,
            lastSuccess: null,
            backoffMultiplier: 1.5,
            maxBackoff: 10000 // 10 segundos máximo
        };

        if (options.midiManager) {
            this.setMidiManager(options.midiManager);
        }

        if (options.notifier) {
            this.setNotifier(options.notifier);
        } else if (typeof window !== 'undefined' && window.midiNotifier) {
            this.notifier = window.midiNotifier;
        }

        this.knownDevices = this.loadKnownDevices();

        this.bindGlobalEvents();
        
        // 🆕 Listener para mensagens do Service Worker
        this.bindServiceWorkerMessages();

        if (this.knownDevices.length > 0) {
            this.scheduleReconnect('stored-devices', 500);
        }
    }

    setMidiManager(manager) {
        if (manager && manager !== this.midiManager) {
            this.midiManager = manager;
        }

        if (manager?.terraDeviceFilters) {
            this.terraFilters = manager.terraDeviceFilters;
        }

        if (this.midiManager) {
            if (this.deferredReasons.length > 0) {
                this.deferredReasons.splice(0).forEach(({ reason, delay }) => {
                    this.scheduleReconnect(reason, delay);
                });
            } else {
                this.scheduleReconnect('manager-registered', 150);
            }
        }
    }

    setNotifier(notifier) {
        if (notifier) {
            this.notifier = notifier;
        }
    }

    bindGlobalEvents() {
        if (typeof window === 'undefined') {
            return;
        }

        window.addEventListener('load', () => this.handleWindowLoad());
        window.addEventListener('focus', () => this.scheduleReconnect('window-focus', 300));
        window.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.scheduleReconnect('visibilitychange', 300);
            }
        });
        
        // 🆕 Listener para beforeunload - liberar recursos MIDI antes de sair
        window.addEventListener('beforeunload', () => this.handleBeforeUnload());

        window.addEventListener('terra-midi:initialized', (event) => this.handleManagerInitialized(event?.detail));
        window.addEventListener('terra-midi:device-connected', (event) => this.handleDeviceConnected(event?.detail));
        window.addEventListener('terra-midi:device-disconnected', (event) => this.handleDeviceDisconnected(event?.detail));
        window.addEventListener('terra-midi:auto-reconnect-failed', (event) => this.handleAutoReconnectFailed(event?.detail));

        if (this.usbSupported) {
            const usb = navigator.usb;
            const connectHandler = (event) => this.handleUSBConnect(event);
            const disconnectHandler = (event) => this.handleUSBDisconnect(event);

            if (typeof usb.addEventListener === 'function') {
                usb.addEventListener('connect', connectHandler);
                usb.addEventListener('disconnect', disconnectHandler);
            } else {
                usb.onconnect = connectHandler;
                usb.ondisconnect = disconnectHandler;
            }
        }
    }
    
    /**
     * 🆕 Listener para mensagens do Service Worker
     */
    bindServiceWorkerMessages() {
        if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
            return;
        }
        
        navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, action, version } = event.data || {};
            
            if (type === 'SW_ACTIVATED') {
                console.log(`🔄 Service Worker v${version} ativado, preparando reconexão...`);
                
                if (action === 'RELEASE_USB_RESOURCES') {
                    // Service Worker solicitando liberação de recursos
                    this.releaseUSBResources();
                }
                
                // Agendar reconexão após breve delay
                this.scheduleReconnect('sw-activated', 500);
            }
        });
    }
    
    /**
     * 🆕 Libera recursos USB/MIDI antes de reload ou update
     */
    async releaseUSBResources() {
        console.log('🔓 Liberando recursos USB/MIDI...');
        
        try {
            // Desconectar dispositivos MIDI atuais
            if (this.midiManager && this.midiManager.connectedDevices) {
                const deviceIds = Array.from(this.midiManager.connectedDevices.keys());
                
                for (const deviceId of deviceIds) {
                    const device = this.midiManager.connectedDevices.get(deviceId);
                    
                    if (device?.input) {
                        // Remover listener
                        device.input.onmidimessage = null;
                        
                        // Fechar porta MIDI
                        if (typeof device.input.close === 'function' && device.input.connection === 'open') {
                            try {
                                await device.input.close();
                                console.log(`✅ Porta MIDI fechada: ${device.name}`);
                            } catch (error) {
                                console.warn(`⚠️ Erro ao fechar porta MIDI ${device.name}:`, error);
                            }
                        }
                    }
                }
            }
            
            // Forçar garbage collection (se disponível)
            if (typeof window.gc === 'function') {
                window.gc();
            }
            
            console.log('✅ Recursos USB/MIDI liberados');
        } catch (error) {
            console.error('❌ Erro ao liberar recursos USB/MIDI:', error);
        }
    }
    
    /**
     * 🆕 Handler para beforeunload
     */
    handleBeforeUnload() {
        this.releaseUSBResources();
    }

    handleWindowLoad() {
        // 🔄 CORREÇÃO: Detectar se é um reload e dar prioridade à reconexão rápida
        const isReload = this.isPageReload();
        
        if (isReload) {
            console.log('🔄 RELOAD DETECTADO: Priorizando reconexão rápida de dispositivos conhecidos');
            // Em reload, tentar imediatamente sem delay
            this.checkPreviouslyAuthorizedDevices('window-load-reload');
            this.scheduleReconnect('window-load-reload', 50);
        } else {
            console.log('🆕 PRIMEIRA CARGA: Reconexão normal');
            this.checkPreviouslyAuthorizedDevices('window-load');
            this.scheduleReconnect('window-load', 200);
        }
    }
    
    /**
     * 🆕 Detecta se a página foi recarregada
     */
    isPageReload() {
        if (typeof performance !== 'undefined') {
            if (typeof performance.getEntriesByType === 'function') {
                const entries = performance.getEntriesByType('navigation');
                if (entries && entries.length > 0) {
                    return entries[0].type === 'reload';
                }
            }
            
            if (performance.navigation && typeof performance.navigation.type === 'number') {
                return performance.navigation.type === 1; // TYPE_RELOAD
            }
        }
        
        return false;
    }

    handleManagerInitialized() {
        this.scheduleReconnect('midi-initialized', 150);
    }

    handleAutoReconnectFailed(detail) {
        if (detail?.code === 'no-devices') {
            // Dispositivo não detectado, aguardar breve intervalo e tentar novamente
            this.queueRetry(detail.reason || 'retry-after-failure');
        }
    }

    handleDeviceConnected(detail = {}) {
        if (!detail?.id) {
            return;
        }

        const entry = {
            id: detail.id,
            name: detail.name,
            manufacturer: detail.manufacturer,
            lastSeenAt: Date.now()
        };

        this.persistDevice(entry);
    }

    handleDeviceDisconnected(detail = {}) {
        if (!detail?.id) {
            return;
        }

        this.markDeviceOffline(detail.id);
    }

    handleUSBConnect(event) {
        if (this.isTerraUSBDevice(event?.device)) {
            this.storeKnownUSBDevice(event.device);
            this.scheduleReconnect('usb-connect', 120);
        }
    }

    handleUSBDisconnect(event) {
        if (this.isTerraUSBDevice(event?.device)) {
            this.removeKnownDevice(event.device.productId, event.device.vendorId);
        }
    }

    scheduleReconnect(reason, delay = 0) {
        if (!this.midiManager || typeof this.midiManager.autoReconnect !== 'function') {
            const alreadyQueued = this.deferredReasons.some(entry => entry.reason === reason);
            if (!alreadyQueued) {
                this.deferredReasons.push({ reason, delay });
                console.log(`ℹ️ MIDIAutoReconnector: adiando tentativa '${reason}' até manager ficar disponível.`);
            }
            return;
        }

        const now = Date.now();
        if (now - this.lastAttempt < this.minInterval && delay === 0) {
            delay = this.minInterval;
        }

        setTimeout(() => this.attemptReconnect(reason), delay);
    }

    async attemptReconnect(reason) {
        // 🆕 Prevenir tentativas simultâneas
        if (this.reconnectInProgress) {
            console.log('⏳ Reconexão já em andamento, aguardando...');
            return;
        }
        
        if (!this.midiManager || typeof this.midiManager.autoReconnect !== 'function') {
            return;
        }

        // 🔄 CORREÇÃO: Se o manager já está inicializado e tem dispositivos, não fazer nada
        if (this.midiManager.isInitialized && this.midiManager.connectedDevices?.size > 0) {
            console.log('✅ MIDI já inicializado com dispositivos conectados, reconexão não necessária');
            this.retryCount = 0;
            this.recoveryStrategy.attempts = 0;
            
            if (this.pendingRetry) {
                clearTimeout(this.pendingRetry);
                this.pendingRetry = null;
            }
            
            return;
        }

        if (this.midiManager.permissionPending) {
            this.queueRetry(reason);
            return;
        }

        const now = Date.now();
        if (now - this.lastAttempt < this.minInterval) {
            this.queueRetry(reason);
            return;
        }
        
        this.reconnectInProgress = true;
        this.lastAttempt = now;

        try {
            console.log(`🔄 Tentando reconectar (tentativa ${this.retryCount + 1}/${this.maxRetries})...`);
            
            const success = await this.midiManager.autoReconnect(reason);
            
            if (success) {
                this.retryCount = 0;
                this.recoveryStrategy.attempts = 0;
                this.recoveryStrategy.lastSuccess = Date.now();
                
                if (this.pendingRetry) {
                    clearTimeout(this.pendingRetry);
                    this.pendingRetry = null;
                }
                
                console.log('✅ Reconexão bem-sucedida!');
            } else {
                this.recoveryStrategy.attempts++;
                this.queueRetry(reason);
            }
        } catch (error) {
            console.warn('⚠️ MIDIAutoReconnector: tentativa de reconexão falhou', error);
            this.recoveryStrategy.attempts++;
            this.queueRetry(reason);
        } finally {
            this.reconnectInProgress = false;
        }
    }

    queueRetry(reason) {
        if (this.retryCount >= this.maxRetries) {
            console.warn(`⚠️ Limite de tentativas atingido (${this.maxRetries}). Aguardando evento USB...`);
            
            // 🆕 Resetar contador após período de espera
            setTimeout(() => {
                this.retryCount = 0;
                console.log('🔄 Contador de retry resetado, pronto para nova tentativa');
            }, 30000); // 30 segundos
            
            return;
        }

        this.retryCount += 1;

        if (this.pendingRetry) {
            return;
        }
        
        // 🆕 Backoff progressivo baseado no número de tentativas
        const baseDelay = 1000;
        const backoffDelay = Math.min(
            baseDelay * Math.pow(this.recoveryStrategy.backoffMultiplier, this.recoveryStrategy.attempts),
            this.recoveryStrategy.maxBackoff
        );
        
        console.log(`⏱️ Agendando nova tentativa em ${Math.round(backoffDelay / 1000)}s...`);

        this.pendingRetry = setTimeout(() => {
            this.pendingRetry = null;
            this.attemptReconnect(reason);
        }, backoffDelay);
    }

    async checkPreviouslyAuthorizedDevices(reason) {
        if (!this.usbSupported || typeof navigator.usb.getDevices !== 'function') {
            return;
        }

        try {
            const devices = await navigator.usb.getDevices();
            const terraDevice = devices.find(device => this.isTerraUSBDevice(device));

            if (terraDevice) {
                this.storeKnownUSBDevice(terraDevice);
                this.scheduleReconnect(reason, 100);
            }
        } catch (error) {
            console.warn('⚠️ MIDIAutoReconnector: não foi possível recuperar dispositivos USB autorizados', error);
        }
    }

    isTerraUSBDevice(device) {
        if (!device) {
            return false;
        }

        const vendorMatch = Array.isArray(this.terraFilters.vendorIds) && this.terraFilters.vendorIds.includes(device.vendorId);
        const productMatch = Array.isArray(this.terraFilters.productIds) && this.terraFilters.productIds.includes(device.productId);
        const nameMatch = (device.productName || '').toLowerCase().includes('terra');

        return Boolean(vendorMatch || productMatch || nameMatch);
    }

    loadKnownDevices() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = window.localStorage.getItem(this.storageKey);
                if (raw) {
                    return JSON.parse(raw) || [];
                }
            }
        } catch (error) {
            console.warn('⚠️ MIDIAutoReconnector: falha ao carregar dispositivos salvos', error);
        }
        return [];
    }

    persistDevice(device) {
        if (!device?.id) {
            return;
        }

        this.knownDevices = this.knownDevices.filter(entry => entry.id !== device.id);
        this.knownDevices.unshift(device);
        this.knownDevices = this.knownDevices.slice(0, 10);

        this.saveKnownDevices();
    }

    markDeviceOffline(deviceId) {
        const device = this.knownDevices.find(entry => entry.id === deviceId);
        if (device) {
            device.lastSeenAt = Date.now();
        }
        this.saveKnownDevices();
    }

    storeKnownUSBDevice(device) {
        if (!device) {
            return;
        }

        const entry = {
            id: `usb-${device.productId}-${device.vendorId}`,
            name: device.productName || 'Dispositivo Terra',
            manufacturer: device.manufacturerName,
            productId: device.productId,
            vendorId: device.vendorId,
            lastSeenAt: Date.now()
        };

        this.persistDevice(entry);
    }

    removeKnownDevice(productId, vendorId) {
        this.knownDevices = this.knownDevices.filter(entry => {
            if (entry.productId && entry.vendorId) {
                return !(entry.productId === productId && entry.vendorId === vendorId);
            }
            return true;
        });

        this.saveKnownDevices();
    }

    saveKnownDevices() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(this.storageKey, JSON.stringify(this.knownDevices));
            }
        } catch (error) {
            console.warn('⚠️ MIDIAutoReconnector: falha ao salvar dispositivos conhecidos', error);
        }
    }
}

if (typeof window !== 'undefined') {
    window.MIDIAutoReconnector = MIDIAutoReconnector;
}
