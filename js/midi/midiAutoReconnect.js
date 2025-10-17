// MIDI Auto Reconnector - Reconexão automática de dispositivos Terra
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Monitora eventos USB/MIDI para restabelecer a comunicação sem ações manuais

class MIDIAutoReconnector {
    constructor(options = {}) {
        this.storageKey = 'terraMidiKnownDevices';
        this.minInterval = 1500; // intervalo mínimo entre tentativas consecutivas (ms)
        this.maxRetries = 3;
        this.retryCount = 0;
        this.lastAttempt = 0;
        this.pendingRetry = null;

        this.midiManager = null;
        this.notifier = null;
        this.terraFilters = options.terraFilters || {};
        this.usbSupported = Boolean(typeof navigator !== 'undefined' && navigator?.usb);
        this.deferredReasons = [];

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

    handleWindowLoad() {
        this.checkPreviouslyAuthorizedDevices('window-load');
        this.scheduleReconnect('window-load', 200);
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
        if (!this.midiManager || typeof this.midiManager.autoReconnect !== 'function') {
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

        this.lastAttempt = now;

        try {
            const success = await this.midiManager.autoReconnect(reason);
            if (success) {
                this.retryCount = 0;
                if (this.pendingRetry) {
                    clearTimeout(this.pendingRetry);
                    this.pendingRetry = null;
                }
            } else {
                this.queueRetry(reason);
            }
        } catch (error) {
            console.warn('⚠️ MIDIAutoReconnector: tentativa de reconexão falhou', error);
            this.queueRetry(reason);
        }
    }

    queueRetry(reason) {
        if (this.retryCount >= this.maxRetries) {
            return;
        }

        this.retryCount += 1;

        if (this.pendingRetry) {
            return;
        }

        this.pendingRetry = setTimeout(() => {
            this.pendingRetry = null;
            this.attemptReconnect(reason);
        }, 1000 * this.retryCount);
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
