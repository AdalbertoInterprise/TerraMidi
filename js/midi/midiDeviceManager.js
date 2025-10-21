// MIDI Device Manager - Sistema de gerenciamento de dispositivos MIDI USB
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Gerenciador central para dispositivos MIDI USB da linha Terra Eletrônica

const MIDI_PERMISSION_TIMEOUT_MS = 15000;  // Reduzido de 30s para 15s (mais responsivo)
const MIDI_SECURE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'adalbertobi.github.io']);

/**
 * Gerenciador central de dispositivos MIDI USB
 * Detecta, conecta e gerencia comunicação com dispositivos Terra Eletrônica
 */
class MIDIDeviceManager {
    constructor() {
        // ============================================================
        // COMPATIBILIDADE ENTRE NAVEGADORES (Chrome, Edge, Opera)
        // ============================================================
        // Inicializar módulo de compatibilidade para detectar e adaptar
        // comportamentos específicos de cada navegador
        this.browserCompat = new BrowserCompatibility();
        
        // Log de compatibilidade para debugging
        this.browserCompat.logCompatibilityReport();
        
        // Inicializar guia de troubleshooting
        this.troubleshootingGuide = null;
        if (typeof window !== 'undefined' && typeof MIDITroubleshootingGuide !== 'undefined') {
            this.troubleshootingGuide = new MIDITroubleshootingGuide(this.browserCompat);
            console.log('✅ Guia de troubleshooting MIDI inicializado');
        }
        
        // ============================================================
        // GERENCIAMENTO DE ESTADO ROBUSTO (baseado em testes validados)
        // ============================================================
        // Usar 'this.midiAccess' garante persistência de estado no objeto
        // Validado com sucesso em Edge - Midi-Terra detectado corretamente
        // Testando compatibilidade com Chrome
        this.midiAccess = null;
        
        // Também manter referência global como fallback (sincronização)
        window.__midiAccess = null;
        
    this.connectedDevices = new Map();
    this.deviceHandlers = new Map();
    this.handlerRegistry = [];
    this.handlerRegistryIndex = new Map();
    this.handlerUsageStats = new Map();
        this.listeners = new Map();
        this.isInitialized = false;
        this.initializing = false;
        this.initializingPromise = null;
        this.initializingReason = null;
        this.autoReconnectInProgress = false;
        this.autoReconnectContext = null;
        this.eventNamespace = 'terra-midi';
        this.pendingScanTimeout = null;
        this.autoScanRetries = 0;
        this.maxAutoScanRetries = 3;
        this.lastScanSource = 'constructor';
        this.lastKnownSnapshot = this.loadLastKnownSnapshot();
        this.sessionInfo = this.createSessionInfo();
        this.persistedInitState = this.loadInitializationState();
        
        // ============================================================
        // CONTROLE DE SOLICITAÇÃO DE PERMISSÃO (ANTI-DUPLICAÇÃO)
        // ============================================================
        // Prevenir múltiplas chamadas simultâneas de requestMIDIAccess()
        // que podem confundir o navegador e causar timeouts
        this.permissionPending = false; // Flag de permissão em andamento
        this.lastPermissionRequest = null; // Timestamp da última solicitação
    this.sessionMIDIAccessPromise = null; // Singleton por sessão
    this.lastPermissionStatus = null; // Cache da Permissions API
        
        // Callbacks para eventos
        this.onDeviceConnected = null;
        this.onDeviceDisconnected = null;
        this.onMIDIMessage = null;
        this.onError = null;
        
        // Status de disponibilidade da Web MIDI API
        this.midiSupported = false;
        
        // ========================================
        // FILTROS TERRA ELETRÔNICA
        // Aceitar APENAS dispositivos Terra
        // ========================================
        this.terraDeviceFilters = {
            // Nomes que identificam dispositivos Terra (case-insensitive)
            names: [
                'midi-terra'
            ],
            // VendorID da Terra Eletrônica
            // Baseado em Arduino Leonardo (0x2341)
            vendorIds: [
                0x2341  // Arduino LLC - usado pelo Midi-Terra
            ],
            // ProductIDs específicos
            // Arduino Leonardo com interface MIDI (0x8036)
            productIds: [
                0x8036  // Arduino Leonardo - Midi-Terra detectado
            ],
            // Manufacturer strings
            manufacturers: []
        };
        
        // Estatísticas de detecção
        this.stats = {
            totalDevicesScanned: 0,
            terraDevicesDetected: 0,
            rejectedDevices: [],
            lastScanTime: null,
            autoDetectionEnabled: true
        };

        this.debugInstructionsLogged = false;

        this.chordPlaybackEnabled = true;
        if (typeof window !== 'undefined' && typeof window.__pendingChordPreference === 'boolean') {
            this.chordPlaybackEnabled = window.__pendingChordPreference;
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🎹 MIDIDeviceManager CONSTRUÍDO');
        console.log('📋 Filtros Terra Eletrônica ativos:');
        console.log('  ├─ Nomes:', this.terraDeviceFilters.names.join(', '));
        console.log('  ├─ Fabricantes:', this.terraDeviceFilters.manufacturers.join(', '));
        console.log('  ├─ VendorIDs:', this.terraDeviceFilters.vendorIds.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
        console.log('  └─ ProductIDs:', this.terraDeviceFilters.productIds.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧭 Navegação atual:', this.sessionInfo.navigationType);
        console.log('🗄️ Snapshot de dispositivos salvo:', this.lastKnownSnapshot ? 'Sim' : 'Não');
        console.log('🔁 Estado persistido de inicialização:', this.persistedInitState ? 'Recuperado' : 'Inexistente');

        // Garantir que o notificador visual esteja pronto antes das primeiras chamadas
        this.ensureNotifierReady();
        this.emitGlobalEvent('manager-created', {
            navigationType: this.sessionInfo.navigationType,
            hasSnapshot: Boolean(this.lastKnownSnapshot)
        });

        if (typeof window !== 'undefined' && typeof window.__pendingChordPreference !== 'boolean') {
            window.__pendingChordPreference = this.chordPlaybackEnabled;
        }

        this.bootstrapHandlerRegistry();
    }

    /**
     * Emite eventos globais para integração entre módulos
     * @param {string} eventName - Nome do evento (sem namespace)
     * @param {Object} detail - Dados adicionais do evento
     */
    emitGlobalEvent(eventName, detail = {}) {
        if (typeof window === 'undefined') {
            return;
        }

        const eventId = `${this.eventNamespace}:${eventName}`;
        const payload = {
            timestamp: Date.now(),
            ...detail
        };

        try {
            if (typeof window.CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent(eventId, { detail: payload }));
            } else if (window.document && typeof window.document.createEvent === 'function') {
                const legacyEvent = window.document.createEvent('CustomEvent');
                legacyEvent.initCustomEvent(eventId, false, false, payload);
                window.dispatchEvent(legacyEvent);
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível emitir evento MIDI global:', eventId, error);
        }
    }

    /**
     * 🆕 Sincroniza assignments do Virtual Keyboard com todos os dispositivos Board Bells conectados
     * @param {Object} assignments - Mapa de assignments (nota -> instrumentKey)
     */
    syncBoardBellsAssignments(assignments) {
        if (!assignments) return;
        
        // 🔍 DEBUG: Log dos assignments recebidos
        const assignmentsCount = Object.keys(assignments).length;
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`🔄 midiDeviceManager.syncBoardBellsAssignments() chamado`);
        console.log(`   Assignments recebidos: ${assignmentsCount}`);
        console.log(`   Detalhes:`, { ...assignments });
        
        let syncCount = 0;
        
        this.deviceHandlers.forEach((handler, deviceId) => {
            // Verificar se é um Board Bells handler
            if (handler && handler.constructor && handler.constructor.name === 'BoardBellsDevice') {
                console.log(`\n   📡 Sincronizando com Board Bells (${deviceId}):`);
                
                try {
                    // 🔥 CORREÇÃO: NÃO sobrescrever keyAssignments diretamente!
                    // Atualizar a referência do Virtual Keyboard e chamar sincronização
                    if (handler.virtualKeyboard && handler.virtualKeyboard.assignments) {
                        console.log(`      ✓ Usando referência do Virtual Keyboard`);
                        console.log(`      ✓ VK assignments:`, { ...handler.virtualKeyboard.assignments });
                        
                        // Virtual Keyboard já tem os assignments corretos
                        handler.syncKeyAssignments();
                    } else {
                        console.log(`      ⚠️ Sem referência ao VK, usando fallback`);
                        // Fallback: se não houver referência ao VK, copiar diretamente
                        handler.keyAssignments = { ...assignments };
                        console.log(`      ✓ keyAssignments copiados diretamente:`, { ...handler.keyAssignments });
                    }
                    
                    syncCount++;
                    
                    const count = Object.keys(handler.keyAssignments || {}).length;
                    console.log(`      ✅ Resultado: ${count} assignment(s) no handler`);
                } catch (error) {
                    console.warn(`      ❌ Erro ao sincronizar:`, error);
                }
            }
        });
        
        console.log(`\n   📊 Total: ${syncCount} dispositivo(s) Board Bells sincronizado(s)`);
        console.log(`═══════════════════════════════════════════════════════════\n`);
    }

    /**
     * Garante que window.midiNotifier exista com todos os métodos esperados.
     * Inclui stubs de fallback para evitar que a inicialização falhe caso o
     * script ainda não tenha carregado.
     */
    ensureNotifierReady() {
        if (typeof window === 'undefined') {
            return null;
        }

        if (!window.midiNotifier && typeof window.MIDIConnectionNotifier === 'function') {
            window.midiNotifier = new MIDIConnectionNotifier();
            console.log('ℹ️ Notificador MIDI criado automaticamente pelo MIDIDeviceManager');
        }

        if (!window.midiNotifier) {
            window.midiNotifier = this.createNotifierFallback();
            console.warn('⚠️ Notificador MIDI não encontrado. Fallback mínimo ativado.');
        }

        const expectedMethods = [
            'showDeviceConnected',
            'showDeviceDisconnected',
            'showConnected',
            'showDisconnected',
            'showUnsupported',
            'showNoDevices',
            'showWaitingPermission',
            'updatePermissionCountdown',
            'hidePermissionNotification',
            'showPermissionGranted',
            'showPermissionTimeout',
            'showError',
            'showRejected',
            'showAutoReconnectAttempt',
            'showAutoReconnected',
            'showAutoReconnectFailed',
            'showInsecureContext',
            'showPermissionInstructions',
            'showExclusiveUseWarning',
            'showChromeUpdateWarning',
            'showDebugChecklist'
        ];

        if (typeof window.midiNotifier?.ensureLegacyAPICompatibility === 'function') {
            window.midiNotifier.ensureLegacyAPICompatibility();
        } else if (typeof window.midiNotifier?.ensureLegacyAPI === 'function') {
            // Compatibilidade com versões anteriores do helper
            window.midiNotifier.ensureLegacyAPI();
        }

        const missingMethods = expectedMethods.filter(method => typeof window.midiNotifier?.[method] !== 'function');

        if (missingMethods.length > 0) {
            missingMethods.forEach(method => {
                if (typeof window.midiNotifier[method] !== 'function') {
                    window.midiNotifier[method] = (...args) => {
                        console.warn(`⚠️ midiNotifier.${method} ainda não disponível. Chamada ignorada.`, args);
                    };
                }
            });

            console.warn('⚠️ Alguns métodos do midiNotifier foram criados como stubs para evitar falhas:', missingMethods);
        }

        return window.midiNotifier;
    }

    /**
     * Cria implementação mínima para evitar falhas quando o notificador não carregar.
     */
    createNotifierFallback() {
        return {
            showDeviceConnected: (deviceNames) => console.log('🎹 [Fallback] Dispositivo conectado:', deviceNames),
            showConnected: (device) => console.log('🎹 [Fallback] Dispositivo conectado:', device),
            showDeviceDisconnected: (deviceId, deviceName) => console.log('🔌 [Fallback] Dispositivo desconectado:', deviceId, deviceName),
            showDisconnected: (deviceId, deviceName) => console.log('🔌 [Fallback] Dispositivo desconectado:', deviceId, deviceName),
            showUnsupported: () => console.warn('⚠️ [Fallback] Web MIDI não suportado'),
            showNoDevices: () => console.warn('🔍 [Fallback] Nenhum dispositivo MIDI detectado'),
            showWaitingPermission: () => 'fallback-permission',
            updatePermissionCountdown: () => {},
            hidePermissionNotification: () => {},
            showPermissionGranted: () => console.log('✅ [Fallback] Permissão MIDI concedida'),
            showPermissionTimeout: () => console.warn('⏱️ [Fallback] Tempo de permissão esgotado'),
            showError: (message) => console.error('❌ [Fallback] Erro MIDI:', message),
            showWarning: (message) => console.warn('⚠️ [Fallback] Aviso MIDI:', message),
            showRejected: (deviceName) => console.warn('⛔ [Fallback] Dispositivo rejeitado:', deviceName),
            showAutoReconnectAttempt: (detail) => console.log('🔄 [Fallback] Tentativa de reconexão automática:', detail),
            showAutoReconnected: (detail) => console.log('🔄 [Fallback] Dispositivo reconectado automaticamente:', detail),
            showAutoReconnectFailed: (detail) => console.warn('⚠️ [Fallback] Reconexão automática não concluída:', detail)
        };
    }

    isSecureMIDISource() {
        if (typeof window === 'undefined') {
            return true;
        }
        if (window.isSecureContext) {
            return true;
        }
        return location.protocol === 'https:' || MIDI_SECURE_HOSTS.has(location.hostname);
    }

    async queryMIDIPermission(options = {}) {
        if (!navigator.permissions?.query) {
            console.log('ℹ️ Permissions API indisponível; seguindo sem pré-checagem de permissão.');
            return null;
        }

        try {
            const status = await navigator.permissions.query({
                name: 'midi',
                sysex: Boolean(options.sysex)
            });
            this.lastPermissionStatus = status;
            this.observePermissionStatus(status);
            console.log(`ℹ️ Permissions API retornou estado: ${status.state}`);
            return status;
        } catch (error) {
            console.warn('⚠️ Falha ao consultar Permissions API para MIDI:', error);
            return null;
        }
    }

    observePermissionStatus(status) {
        if (!status) {
            return;
        }
        status.onchange = (event) => {
            const nextState = event?.target?.state || status.state;
            console.log(`ℹ️ Estado da permissão MIDI mudou para: ${nextState}`);
            if (nextState === 'denied') {
                this.ensureNotifierReady()?.showError?.(
                    'A permissão MIDI foi negada. Acesse chrome://settings/content/midiDevices para liberar o acesso.'
                );
            }
        };
    }

    async requestMIDIAccessWithUX(midiOptions, notifier, { skipPrompt = false } = {}) {
        if (this.sessionMIDIAccessPromise) {
            console.log('♻️ Reutilizando promise de requestMIDIAccess já criada nesta sessão.');
            try {
                return await this.sessionMIDIAccessPromise;
            } catch (error) {
                console.warn('⚠️ Promise de requestMIDIAccess previamente criada falhou. Limpando cache para nova tentativa.');
                this.sessionMIDIAccessPromise = null;
                throw error;
            }
        }

        this.sessionMIDIAccessPromise = (async () => {
            console.log('📞 Chamando navigator.requestMIDIAccess()...');
            console.log('⚙️ Opções otimizadas para', this.browserCompat.browser.name + ':');
            console.log('   ├─ sysex:', midiOptions.sysex);
            console.log('   ├─ software:', midiOptions.software);
            console.log('   ├─ Timeout recomendado:', midiOptions.recommendedTimeout + 'ms');
            console.log('   ├─ Requer gesto usuário:', midiOptions.needsUserGesture ? 'Sim ⚠️' : 'Não ✅');
            console.log('   └─ Pode auto-requisitar:', midiOptions.canAutoRequest ? 'Sim ✅' : 'Não ⚠️');

            if (!skipPrompt) {
                console.log('💡 Dica: clique rapidamente em "Permitir" quando o prompt MIDI aparecer para evitar a expiração.');
            }

            let permissionNotificationId = null;
            let countdownInterval = null;
            let reminderTimeoutId = null;

            const promptTimeoutMs = Math.min(
                Math.max(midiOptions.recommendedTimeout || MIDI_PERMISSION_TIMEOUT_MS, 1000),
                MIDI_PERMISSION_TIMEOUT_MS
            );

            if (!skipPrompt && notifier?.showWaitingPermission) {
                const timeoutSeconds = Math.ceil(promptTimeoutMs / 1000);
                permissionNotificationId = notifier.showWaitingPermission(
                    this.browserCompat.browser.name,
                    timeoutSeconds
                );

                let secondsElapsed = 0;
                countdownInterval = setInterval(() => {
                    secondsElapsed++;
                    const secondsRemaining = timeoutSeconds - secondsElapsed;
                    if (secondsRemaining >= 0) {
                        const activeNotifier = this.ensureNotifierReady();
                        activeNotifier?.updatePermissionCountdown?.(permissionNotificationId, secondsRemaining);
                    }
                }, 1000);

                reminderTimeoutId = setTimeout(() => {
                    const reminderNotifier = this.ensureNotifierReady();
                    reminderNotifier?.showWarning?.(
                        'Ainda aguardando a resposta do prompt MIDI. Clique em "Permitir" para continuar.'
                    );
                }, MIDI_PERMISSION_TIMEOUT_MS);
            }

            const accessPromise = navigator.requestMIDIAccess({
                sysex: midiOptions.sysex,
                software: midiOptions.software
            });

            // ⏱️ Timeout adaptativo: reduzido para resposta mais rápida
            // GitHub Pages pode ser mais lento, então permitir retry sem timeout longo
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    const timeoutMessage = this.browserCompat.getContextualErrorMessage('timeout');
                    reject(new Error(timeoutMessage));
                }, promptTimeoutMs);
            });

            try {
                const accessResponse = await Promise.race([accessPromise, timeoutPromise]);

                if (countdownInterval) clearInterval(countdownInterval);
                if (reminderTimeoutId) clearTimeout(reminderTimeoutId);
                if (permissionNotificationId) {
                    const successNotifier = this.ensureNotifierReady();
                    successNotifier?.hidePermissionNotification?.(permissionNotificationId);
                    successNotifier?.showPermissionGranted?.();
                }

                console.log('✅ Permissão MIDI concedida pelo usuário ou restaurada do cache');
                return accessResponse;
            } catch (error) {
                if (countdownInterval) clearInterval(countdownInterval);
                if (reminderTimeoutId) clearTimeout(reminderTimeoutId);
                if (permissionNotificationId) {
                    const timeoutNotifier = this.ensureNotifierReady();
                    timeoutNotifier?.hidePermissionNotification?.(permissionNotificationId);
                    timeoutNotifier?.showPermissionTimeout?.(this.browserCompat.browser.name);
                }

                console.warn('⚠️ Permissão MIDI não concedida ou timeout');
                console.warn('   └─ Você pode não ter dispositivos MIDI, ou o navegador bloqueou a permissão');
                
                // 🔄 Fallback: tentar retornar um objeto vazio (sem dispositivos)
                // Isso permite que a aplicação continue funcionando
                console.log('📦 Retornando objeto MIDIAccess vazio para fallback');
                return {
                    inputs: new Map(),
                    outputs: new Map(),
                    sysexEnabled: false,
                    onstatechange: null,
                    addEventListener: () => {},
                    removeEventListener: () => {},
                    dispatchEvent: () => false
                };
            }
        })();

        try {
            const response = await this.sessionMIDIAccessPromise;
            return response;
        } catch (error) {
            this.sessionMIDIAccessPromise = null;
            throw error;
        }
    }

    loadLastKnownSnapshot() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null;
        }

        try {
            const raw = window.localStorage.getItem('terraMidi:lastKnownDevices');
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('⚠️ loadLastKnownSnapshot(): falha ao carregar snapshot local', error);
            return null;
        }
    }

    persistDeviceSnapshot() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }

        const snapshot = {
            timestamp: Date.now(),
            devices: Array.from(this.connectedDevices.values()).map(device => ({
                id: device.id,
                name: device.name,
                manufacturer: device.manufacturer,
                connectedAt: device.connectedAt
            }))
        };

        try {
            window.localStorage.setItem('terraMidi:lastKnownDevices', JSON.stringify(snapshot));
            this.lastKnownSnapshot = snapshot;
        } catch (error) {
            console.warn('⚠️ persistDeviceSnapshot(): não foi possível salvar snapshot local', error);
        }
    }

    loadInitializationState() {
        if (typeof window === 'undefined' || !window.sessionStorage) {
            return null;
        }

        try {
            const raw = window.sessionStorage.getItem('terraMidi:initState');
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('⚠️ loadInitializationState(): falha ao recuperar estado', error);
            return null;
        }
    }

    persistInitializationState(state) {
        if (typeof window === 'undefined' || !window.sessionStorage) {
            return;
        }

        try {
            window.sessionStorage.setItem('terraMidi:initState', JSON.stringify(state));
            this.persistedInitState = state;
        } catch (error) {
            console.warn('⚠️ persistInitializationState(): não foi possível salvar estado', error);
        }
    }

    createSessionInfo() {
        const navigationType = this.getNavigationType();
        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const isReload = navigationType === 'reload' || navigationType === 'back_forward';
        const session = {
            id: sessionId,
            navigationType,
            isReload,
            startedAt: Date.now()
        };

        if (typeof window !== 'undefined' && window.sessionStorage) {
            try {
                window.sessionStorage.setItem('terraMidi:sessionInfo', JSON.stringify(session));
            } catch (error) {
                console.warn('⚠️ createSessionInfo(): não foi possível armazenar sessão', error);
            }
        }

        return session;
    }

    getNavigationType() {
        if (typeof performance !== 'undefined') {
            if (typeof performance.getEntriesByType === 'function') {
                const entries = performance.getEntriesByType('navigation');
                if (entries && entries.length > 0 && entries[0].type) {
                    return entries[0].type;
                }
            }

            if (performance.navigation && typeof performance.navigation.type === 'number') {
                const navTypeMap = {
                    0: 'navigate',
                    1: 'reload',
                    2: 'back_forward',
                    255: 'prerender'
                };
                return navTypeMap[performance.navigation.type] || 'navigate';
            }
        }

        return 'navigate';
    }

    scheduleDeferredScan(reason, delay = 500) {
        if (this.pendingScanTimeout) {
            clearTimeout(this.pendingScanTimeout);
            this.pendingScanTimeout = null;
        }

        if (this.autoScanRetries >= this.maxAutoScanRetries) {
            console.warn(`⚠️ scheduleDeferredScan(): limite de tentativas atingido (${this.maxAutoScanRetries})`);
            return;
        }

        this.autoScanRetries += 1;
        const attempt = this.autoScanRetries;

        this.pendingScanTimeout = setTimeout(() => {
            this.pendingScanTimeout = null;
            console.log(`🔁 Reexecutando scanForDevices() | motivo: ${reason} | tentativa ${attempt}/${this.maxAutoScanRetries}`);
            this.scanForDevices(`deferred:${reason}`);
        }, delay);
    }
    
    /**
     * Valida e retorna o objeto midiAccess
     * Tenta recuperar de múltiplas fontes se necessário
     * @returns {MIDIAccess|null}
     */
    getMIDIAccess() {
        // Tentar this.midiAccess primeiro
        if (this.midiAccess && typeof this.midiAccess === 'object') {
            return this.midiAccess;
        }
        
        // Tentar window.__midiAccess como fallback
        if (window.__midiAccess && typeof window.__midiAccess === 'object') {
            console.log('⚠️ getMIDIAccess(): Sincronizando de window.__midiAccess');
            this.midiAccess = window.__midiAccess;
            return this.midiAccess;
        }
        
        // Não encontrado
        console.error('❌ getMIDIAccess(): midiAccess não está disponível');
        return null;
    }
    
    /**
     * Define o objeto midiAccess com dupla atribuição
     * @param {MIDIAccess} access - Objeto MIDIAccess do navegador
     * @returns {boolean} Sucesso
     */
    setMIDIAccess(access) {
        if (!access || typeof access !== 'object') {
            console.error('❌ setMIDIAccess(): Tentativa de definir midiAccess inválido:', access);
            return false;
        }
        
        console.log('✅ setMIDIAccess(): Definindo midiAccess globalmente');
        this.midiAccess = access;
        window.__midiAccess = access;
        
        console.log('  ├─ this.midiAccess:', this.midiAccess);
        console.log('  ├─ window.__midiAccess:', window.__midiAccess);
        console.log('  └─ Sincronizado:', this.midiAccess === window.__midiAccess);
        
        return true;
    }

    attachMIDIAccessListeners(access) {
        if (!access) {
            return;
        }

        try {
            access.onstatechange = (event) => this.handleStateChange(event);
            console.log('✅ Listener onstatechange configurado');
        } catch (error) {
            console.warn('⚠️ Não foi possível configurar onstatechange:', error);
        }
    }

    /**
     * Inicializa o sistema MIDI
     * @returns {Promise<boolean>} Sucesso da inicialização
     */
    async initialize(reason = 'manual') {
        if (this.isInitialized) {
            console.log(`ℹ️ initialize("${reason}") ignorado: sistema já inicializado`);
            return true;
        }

        if (this.initializingPromise) {
            console.log(`⏳ initialize("${reason}") aguardando inicialização atual (${this.initializingReason})`);
            return this.initializingPromise;
        }

        this.initializing = true;
        this.initializingReason = reason;

        this.initializingPromise = this._initializeInternal(reason).finally(() => {
            this.initializing = false;
            this.initializingPromise = null;
            this.initializingReason = null;
        });

        return this.initializingPromise;
    }

    async _initializeInternal(reason) {
        const notifier = this.ensureNotifierReady();
        const startTimestamp = Date.now();
        console.log(`🚀 _initializeInternal iniciado | reason: ${reason}`);

        try {
            // 🔄 CORREÇÃO: No reload, verificar se já temos acesso MIDI válido antes de solicitar novamente
            const cachedMidiAccess = this.midiAccess || window.__midiAccess;
            const isReloadContext = this.sessionInfo.isReload || reason.includes('reload') || reason.includes('window-load');
            
            if (isReloadContext && cachedMidiAccess && typeof cachedMidiAccess === 'object' && cachedMidiAccess.inputs) {
                console.log('🔄 RELOAD DETECTADO: Reutilizando midiAccess existente sem nova solicitação de permissão');
                this.midiAccess = cachedMidiAccess;
                window.__midiAccess = cachedMidiAccess;
                this.attachMIDIAccessListeners(cachedMidiAccess);
                this.autoScanRetries = 0;
                this.scanForDevices(`reload-reuse:${reason}`);
                this.isInitialized = true;
                this.persistInitializationState({
                    timestamp: Date.now(),
                    reason: `${reason}:reload-reuse`,
                    navigationType: this.sessionInfo.navigationType,
                    inputs: cachedMidiAccess.inputs.size,
                    outputs: cachedMidiAccess.outputs.size
                });
                this.emitGlobalEvent('initialized', {
                    timestamp: Date.now(),
                    reason: `${reason}:reload-reuse`,
                    navigationType: this.sessionInfo.navigationType,
                    inputs: cachedMidiAccess.inputs.size,
                    outputs: cachedMidiAccess.outputs.size
                });
                return true;
            }
            
            if (this.permissionPending) {
                const waitTime = Date.now() - (this.lastPermissionRequest || 0);
                console.warn(`⚠️ initialize(${reason}): solicitação de permissão já em andamento há ${Math.round(waitTime / 1000)}s`);
                return false;
            }

            this.permissionPending = true;
            this.lastPermissionRequest = startTimestamp;

            const availabilityCheck = this.browserCompat.checkMIDIAvailability();

            console.log('═══════════════════════════════════════════════════════════');
            console.log(`🔍 VERIFICANDO DISPONIBILIDADE WEB MIDI | motivo: ${reason}`);
            console.log('📍 Navegador:', this.browserCompat.browser.name, this.browserCompat.browser.version);
            console.log('✓ Disponível:', availabilityCheck.available);
            console.log('✓ Pode prosseguir:', availabilityCheck.canProceed);
            console.log('📝 Razão:', availabilityCheck.reason);
            console.log('═══════════════════════════════════════════════════════════');

            if (!navigator.requestMIDIAccess || !availabilityCheck.available) {
                const errorMessage = this.browserCompat.getContextualErrorMessage('unsupported');
                console.error('❌', errorMessage);
                this.midiSupported = false;
                notifier?.showUnsupported?.();
                if (this.onError) {
                    this.onError({
                        type: 'unsupported',
                        message: errorMessage,
                        browserInfo: this.browserCompat.browser,
                        recommendations: availabilityCheck.recommendations
                    });
                }
                return false;
            }

            if (!availabilityCheck.canProceed) {
                const errorMessage = this.browserCompat.getContextualErrorMessage('secureContext');
                console.error('❌', errorMessage);
                this.midiSupported = false;
                notifier?.showInsecureContext?.({
                    browser: this.browserCompat.browser.name,
                    secureContext: this.browserCompat.features.secureContext,
                    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
                });
                
                // Mostrar guia de troubleshooting para contexto inseguro
                if (this.troubleshootingGuide) {
                    setTimeout(() => {
                        this.troubleshootingGuide.show('insecure-context');
                    }, 1000);
                }
                
                if (this.onError) {
                    this.onError({
                        type: 'secureContext',
                        message: errorMessage,
                        warnings: availabilityCheck.warnings,
                        recommendations: availabilityCheck.recommendations
                    });
                }
                this.logChromeDebugInstructions('secure-context');
                return false;
            }

            this.midiSupported = true;

            if (availabilityCheck.warnings.length > 0) {
                console.log('⚠️ Avisos de compatibilidade:');
                availabilityCheck.warnings.forEach(w => console.log(`   - ${w}`));
            }

            if (availabilityCheck.versionStatus?.outdated && this.browserCompat.browser.isChrome) {
                notifier?.showChromeUpdateWarning?.(
                    availabilityCheck.versionStatus.current,
                    availabilityCheck.versionStatus.minimum
                );
            }

            const existingAccess = this.midiAccess || window.__midiAccess;
            if (existingAccess && typeof existingAccess === 'object' && existingAccess.inputs) {
                console.log('♻️ Reutilizando instancia midiAccess existente (sem nova solicitação)');
                this.midiAccess = existingAccess;
                window.__midiAccess = existingAccess;
                this.attachMIDIAccessListeners(existingAccess);
                this.autoScanRetries = 0;
                this.scanForDevices(`reuse:${reason}`);
                this.isInitialized = true;
                this.persistInitializationState({
                    timestamp: Date.now(),
                    reason: `${reason}:reuse`,
                    navigationType: this.sessionInfo.navigationType,
                    inputs: existingAccess.inputs.size,
                    outputs: existingAccess.outputs.size
                });
                this.emitGlobalEvent('initialized', {
                    timestamp: Date.now(),
                    reason: `${reason}:reuse`,
                    navigationType: this.sessionInfo.navigationType,
                    inputs: existingAccess.inputs.size,
                    outputs: existingAccess.outputs.size
                });
                return true;
            }

            console.log('═══════════════════════════════════════════════════════════');
            console.log(`🎹 INICIALIZANDO WEB MIDI API | reason: ${reason}`);
            console.log('📍 Timestamp:', new Date().toISOString());
            console.log('🔍 Estado atual de midiAccess:', this.midiAccess);
            console.log('═══════════════════════════════════════════════════════════');

            const midiOptions = this.browserCompat.getOptimizedMIDIOptions();

            if (!this.isSecureMIDISource()) {
                const secureMessage = 'A Web MIDI API requer conexão segura (HTTPS) ou localhost. Ajuste o ambiente antes de continuar.';
                console.error('❌', secureMessage);
                this.ensureNotifierReady()?.showError?.(secureMessage);
                if (this.onError) {
                    this.onError({
                        type: 'secure-context',
                        message: secureMessage
                    });
                }
                return false;
            }

            const permissionStatus = await this.queryMIDIPermission({ sysex: midiOptions.sysex });
            if (permissionStatus?.state === 'denied') {
                const deniedMessage = 'Permissão MIDI negada. Abra chrome://settings/content/midiDevices e permita o acesso para este site.';
                console.error('⛔', deniedMessage);
                const deniedNotifier = this.ensureNotifierReady();
                deniedNotifier?.showError?.(deniedMessage);
                deniedNotifier?.showPermissionInstructions?.('denied');
                
                // Mostrar guia de troubleshooting para permissão negada
                if (this.troubleshootingGuide) {
                    setTimeout(() => {
                        this.troubleshootingGuide.show('permission-denied');
                    }, 1000);
                }
                
                if (this.onError) {
                    this.onError({
                        type: 'permission-denied',
                        message: deniedMessage
                    });
                }
                this.logChromeDebugInstructions('permission-denied');
                return false;
            }

            if (permissionStatus?.state === 'granted') {
                console.log('✅ Permissão MIDI já concedida anteriormente. Preparando conexão sem exibir novo prompt.');
                
                // 🔄 CORREÇÃO: Quando a permissão já está concedida, chamar requestMIDIAccess diretamente sem timeout
                try {
                    const quickAccess = await navigator.requestMIDIAccess({
                        sysex: midiOptions.sysex,
                        software: midiOptions.software
                    });
                    
                    console.log('✅ MIDI Access obtido rapidamente (permissão pré-concedida)');
                    
                    if (!quickAccess) {
                        throw new Error('navigator.requestMIDIAccess() retornou null/undefined');
                    }
                    
                    const setSuccess = this.setMIDIAccess(quickAccess);
                    if (!setSuccess) {
                        throw new Error('ERRO CRÍTICO: setMIDIAccess() falhou');
                    }
                    
                    const validatedAccess = this.getMIDIAccess();
                    if (!validatedAccess) {
                        throw new Error('ERRO CRÍTICO: getMIDIAccess() retornou null após setMIDIAccess()!');
                    }
                    
                    this.attachMIDIAccessListeners(this.midiAccess);
                    this.autoScanRetries = 0;
                    this.scanForDevices(`initialize:${reason}`);
                    this.isInitialized = true;
                    
                    const initState = {
                        timestamp: Date.now(),
                        reason,
                        navigationType: this.sessionInfo.navigationType,
                        inputs: validatedAccess.inputs.size,
                        outputs: validatedAccess.outputs.size
                    };
                    this.persistInitializationState(initState);
                    this.emitGlobalEvent('initialized', initState);
                    
                    console.log(`✅ MIDIDeviceManager inicialização completa | reason: ${reason}`);
                    this.logChromeDebugInstructions('initialize-success');
                    return true;
                } catch (error) {
                    console.warn('⚠️ Acesso rápido falhou, tentando com UI completa:', error);
                    // Continuar com o fluxo normal caso o acesso rápido falhe
                }
            } else if (permissionStatus?.state === 'prompt') {
                console.log('🔔 Permissão MIDI ainda não concedida. Um prompt será exibido ao usuário.');
                notifier?.showPermissionInstructions?.('prompt');
            }

            if (midiOptions.needsUserGesture && this.sessionInfo.isReload) {
                console.log('ℹ️ Navegação via reload detectada: reutilizando contexto autorizado sem gesto do usuário.');
            }

            const accessResponse = await this.requestMIDIAccessWithUX(
                midiOptions,
                notifier,
                { skipPrompt: permissionStatus?.state === 'granted' }
            );

            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ navigator.requestMIDIAccess() concluído');
            console.log('📦 accessResponse recebido:', accessResponse);
            console.log('📊 Tipo:', typeof accessResponse);
            console.log('📊 inputs.size:', accessResponse?.inputs?.size);
            console.log('📊 outputs.size:', accessResponse?.outputs?.size);
            console.log('═══════════════════════════════════════════════════════════');

            if (!accessResponse) {
                throw new Error('navigator.requestMIDIAccess() retornou null/undefined');
            }

            if (typeof accessResponse !== 'object') {
                throw new Error(`Tipo inválido: esperado "object", recebido "${typeof accessResponse}"`);
            }

            if (!accessResponse.inputs || !accessResponse.outputs) {
                throw new Error('accessResponse não possui propriedades .inputs ou .outputs');
            }

            console.log('✅ VALIDAÇÃO PASSOU - accessResponse é válido');

            const setSuccess = this.setMIDIAccess(accessResponse);
            if (!setSuccess) {
                throw new Error('ERRO CRÍTICO: setMIDIAccess() falhou');
            }

            const validatedAccess = this.getMIDIAccess();
            if (!validatedAccess) {
                throw new Error('ERRO CRÍTICO: getMIDIAccess() retornou null após setMIDIAccess()!');
            }

            console.log('✅ VALIDAÇÃO FINAL: midiAccess definido e recuperável');
            console.log('  ├─ validatedAccess === accessResponse:', validatedAccess === accessResponse);
            console.log('  └─ Inputs disponíveis:', validatedAccess.inputs.size);

            this.attachMIDIAccessListeners(this.midiAccess);

            this.autoScanRetries = 0;
            this.scanForDevices(`initialize:${reason}`);

            this.isInitialized = true;
            const initState = {
                timestamp: Date.now(),
                reason,
                navigationType: this.sessionInfo.navigationType,
                inputs: validatedAccess.inputs.size,
                outputs: validatedAccess.outputs.size
            };
            this.persistInitializationState(initState);
            this.emitGlobalEvent('initialized', initState);

            console.log(`✅ MIDIDeviceManager inicialização completa | reason: ${reason}`);
            this.logChromeDebugInstructions('initialize-success');
            return true;
        } catch (error) {
            console.error(`❌ Erro ao inicializar MIDI (${reason}):`, error);
            
            // 🔄 Fallback gracioso: mesmo com erro, continuar funcionando
            // Isso permite que a aplicação funcione sem dispositivos MIDI conectados
            const notifier = this.ensureNotifierReady();
            notifier?.showWarning?.(`MIDI indisponível: ${error.message}`);
            
            if (this.onError) {
                this.onError({
                    type: 'initialization',
                    message: error.message,
                    error
                });
            }
            
            this.logChromeDebugInstructions('initialize-error');
            
            // ✅ Permitir continuar mesmo sem MIDI (fallback gracioso)
            console.log('⚠️ Continuando sem MIDI - aplicação funcionará em modo fallback');
            this.midiSupported = false;
            this.isInitialized = true;  // Marcar como "inicializado" mesmo sem MIDI
            return true;  // Retornar true para não bloquear a aplicação
        } finally {
            this.permissionPending = false;
            console.log('🔓 Flag de permissão liberada (finally block)');
        }
    }

    /**
     * Escaneia e detecta dispositivos MIDI conectados
     * MÉTODO VALIDADO - testado com sucesso no Edge (Midi-Terra detectado)
     */
    scanForDevices(reason = 'manual') {
        this.lastScanSource = reason;
        if (!String(reason).startsWith('deferred')) {
            this.autoScanRetries = 0;
        }
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🔍 scanForDevices() INICIADO | motivo: ${reason}`);
        console.log('📍 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════');
        const notifier = this.ensureNotifierReady();
        
        // ETAPA 1: Validação rigorosa de midiAccess
        console.log('🔍 DIAGNÓSTICO DE midiAccess:');
        console.log('  ├─ this.midiAccess:', this.midiAccess);
        console.log('  ├─ window.__midiAccess:', window.__midiAccess);
        console.log('  ├─ typeof this.midiAccess:', typeof this.midiAccess);
        console.log('  ├─ this.midiAccess === null:', this.midiAccess === null);
        console.log('  └─ Boolean(this.midiAccess):', Boolean(this.midiAccess));
        
        // Tentar recuperar de backup se necessário
        if (!this.midiAccess && window.__midiAccess) {
            console.log('⚠️ this.midiAccess é null, mas window.__midiAccess existe!');
            console.log('🔄 Sincronizando this.midiAccess = window.__midiAccess');
            this.midiAccess = window.__midiAccess;
        }
        
        // Verificação final
        if (!this.midiAccess) {
            console.error('❌ ERRO CRÍTICO: midiAccess não está disponível');
            console.error('  ├─ this.midiAccess:', this.midiAccess);
            console.error('  └─ window.__midiAccess:', window.__midiAccess);
            console.warn('⚠️ MIDI não inicializado - execute initialize() primeiro');
            return;
        }
        
        console.log('✅ VALIDAÇÃO PASSOU - midiAccess disponível');
        console.log('═══════════════════════════════════════════════════════════');

        console.log('🔍 Escaneando dispositivos MIDI USB conectados...');
        this.stats.lastScanTime = Date.now();
        
        // ETAPA 2: Escanear entradas e saídas MIDI
        console.log('📊 Coletando inputs e outputs...');
        console.log('  ├─ this.midiAccess.inputs:', this.midiAccess.inputs);
        console.log('  ├─ this.midiAccess.inputs.size:', this.midiAccess.inputs.size);
        console.log('  ├─ this.midiAccess.outputs:', this.midiAccess.outputs);
        console.log('  └─ this.midiAccess.outputs.size:', this.midiAccess.outputs.size);
        
        const inputs = Array.from(this.midiAccess.inputs.values());
        const outputs = Array.from(this.midiAccess.outputs.values());
        
        this.stats.totalDevicesScanned = inputs.length;
        
        console.log(`📥 ${inputs.length} entrada(s) MIDI USB detectada(s)`);
        console.log(`📤 ${outputs.length} saída(s) MIDI USB detectada(s)`);
        
        // Listar todos os dispositivos encontrados
        if (inputs.length > 0) {
            console.log('📋 LISTA DE DISPOSITIVOS ENCONTRADOS:');
            inputs.forEach((input, index) => {
                console.log(`  ${index + 1}. ${input.name}`);
                console.log(`     ├─ ID: ${input.id}`);
                console.log(`     ├─ Manufacturer: ${input.manufacturer || 'N/A'}`);
                console.log(`     ├─ State: ${input.state}`);
                console.log(`     └─ Type: ${input.type}`);
            });
        }
        
        // ETAPA 3: Filtrar e conectar apenas dispositivos Terra
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 FILTRANDO DISPOSITIVOS TERRA ELETRÔNICA');
        console.log('═══════════════════════════════════════════════════════════');
        
        let terraDevicesFound = 0;
        
        inputs.forEach((input, index) => {
            console.log(`\n🔍 Analisando dispositivo [${index + 1}]: ${input.name}`);
            
            const isTerraDevice = this.isTerraDevice(input);
            
            if (isTerraDevice) {
                console.log(`✅ ★★★ DISPOSITIVO TERRA CONFIRMADO ★★★`);
                console.log(`   Nome: ${input.name}`);
                console.log(`   Manufacturer: ${input.manufacturer || 'N/A'}`);
                console.log(`   ID: ${input.id}`);
                
                this.connectDevice(input);
                terraDevicesFound++;
            } else {
                console.log(`⚠️ Dispositivo rejeitado (não-Terra): ${input.name}`);
                console.log(`   Motivo: Nome/Manufacturer não correspondem aos filtros Terra`);
                
                this.stats.rejectedDevices.push({
                    name: input.name,
                    id: input.id,
                    manufacturer: input.manufacturer,
                    timestamp: Date.now()
                });
            }
        });
        
        this.stats.terraDevicesDetected = terraDevicesFound;
        
        // ETAPA 4: Resultado final
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESULTADO DO ESCANEAMENTO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📊 Total escaneado: ${this.stats.totalDevicesScanned}`);
        console.log(`✅ Terra detectados: ${this.stats.terraDevicesDetected}`);
        console.log(`⚠️ Rejeitados: ${this.stats.rejectedDevices.length}`);
        
        if (terraDevicesFound === 0) {
            if (this.autoReconnectContext) {
                notifier?.showAutoReconnectFailed?.({
                    reason: this.autoReconnectContext.reason,
                    code: 'no-devices'
                });
                this.emitGlobalEvent('auto-reconnect-failed', {
                    reason: this.autoReconnectContext.reason,
                    code: 'no-devices'
                });
                this.autoReconnectContext = null;
            }

            console.warn('⚠️ NENHUM DISPOSITIVO TERRA ELETRÔNICA DETECTADO');
            console.log('💡 Dispositivos esperados:', this.terraDeviceFilters.names.join(', '));
            console.log('💡 Fabricantes aceitos:', this.terraDeviceFilters.manufacturers.join(', '));
            console.log('💡 VendorIDs aceitos:', this.terraDeviceFilters.vendorIds.map(id => `0x${id.toString(16).toUpperCase()}`).join(', '));
            
            this.showConnectionInstructions();
            
            // Notificação visual
            notifier?.showNoDevices?.();

            if (this.browserCompat.browser.isChrome) {
                notifier?.showExclusiveUseWarning?.();
                
                // Mostrar guia de troubleshooting para Chrome
                if (this.troubleshootingGuide) {
                    console.log('💡 Exibindo guia de troubleshooting para Chrome...');
                    setTimeout(() => {
                        this.troubleshootingGuide.show('no-device');
                    }, 2000); // Aguardar 2 segundos para o usuário ver as notificações
                }
            }

            const expectedDevices = this.lastKnownSnapshot?.devices?.length || 0;
            if (expectedDevices > 0 || this.sessionInfo.isReload) {
                console.log('ℹ️ Snapshot anterior detectado. Agendando nova varredura automática.');
                this.scheduleDeferredScan(`expected-devices:${reason}`, 900);
            }
        } else {
            console.log(`✅ ✅ ✅ ${terraDevicesFound} DISPOSITIVO(S) TERRA CONECTADO(S) COM SUCESSO ✅ ✅ ✅`);
            this.autoScanRetries = 0;
            
            // Mostrar feedback visual de sucesso
            if (notifier) {
                const deviceNames = Array.from(this.connectedDevices.values())
                    .map(d => d.name)
                    .join(', ');
                notifier.showDeviceConnected?.(deviceNames);

                if (this.autoReconnectContext && !this.autoReconnectContext.notified) {
                    notifier.showAutoReconnected?.({
                        name: deviceNames || 'Midi-Terra',
                        reason: this.autoReconnectContext.reason,
                        devices: Array.from(this.connectedDevices.values())
                    });
                    this.emitGlobalEvent('auto-reconnect-success', {
                        reason: this.autoReconnectContext.reason,
                        devices: Array.from(this.connectedDevices.values())
                    });
                    this.autoReconnectContext.notified = true;
                    this.autoReconnectContext = null;
                }
            }
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        this.logChromeDebugInstructions(`scan:${reason}`);
    }

    /**
     * Executa tentativa de reconexão automática dos dispositivos MIDI Terra
     * @param {string} reason - Origem da tentativa (ex: 'window-load', 'usb-connect')
     * @returns {Promise<boolean>} Resultado da tentativa
     */
    async autoReconnect(reason = 'auto-reconnect') {
        console.log(`🔄 autoReconnect() acionado | reason: ${reason}`);

        const notifier = this.ensureNotifierReady();
        notifier?.showAutoReconnectAttempt?.({ reason });

        if (this.permissionPending) {
            console.warn('⚠️ autoReconnect(): solicitação de permissão em andamento. Aguardando antes de tentar novamente.');
            return false;
        }

        this.autoReconnectContext = {
            reason,
            startedAt: Date.now(),
            notified: false
        };
        this.autoScanRetries = 0;

        this.emitGlobalEvent('auto-reconnect-attempt', { reason });

        try {
            if (!this.isInitialized) {
                const initialized = await this.initialize(`auto-reconnect:${reason}`);
                if (!initialized) {
                    notifier?.showAutoReconnectFailed?.({ reason, code: 'initialization-failed' });
                    this.emitGlobalEvent('auto-reconnect-failed', { reason, code: 'initialization-failed' });
                    this.autoReconnectContext = null;
                    return false;
                }
                return true;
            }

            this.scanForDevices(`auto-reconnect:${reason}`);
            if (this.connectedDevices.size === 0) {
                this.scheduleDeferredScan(`auto-reconnect:${reason}`, 1200);
            }
            return true;
        } catch (error) {
            console.error('❌ autoReconnect() falhou:', error);
            notifier?.showAutoReconnectFailed?.({ reason, code: 'exception', error });
            this.emitGlobalEvent('auto-reconnect-failed', { reason, code: 'exception', error: error?.message });
            this.autoReconnectContext = null;
            return false;
        }
    }

    /**
     * 🔒 Verifica se um dispositivo MIDI é da Terra Eletrônica (PROTEÇÃO ANTI-PIRATARIA)
     * ============================================================
     * ⚠️ SEGURANÇA: Este sistema SOMENTE funciona com dispositivos
     * "Midi-Terra" originais da Terra Eletrônica.
     * 
     * DISPOSITIVOS PERMITIDOS:
     * - Nome USB: "Midi-Terra"
     * - Fabricante: "Arduino SA" ou "Terra Eletrônica"
     * - Hardware: Arduino Leonardo (VendorID 0x2341, ProductID 0x8036)
     * 
     * DISPOSITIVOS BLOQUEADOS:
     * - Qualquer controlador MIDI genérico
     * - Clones ou dispositivos não homologados
     * - Tentativas de bypass ou modificação do nome USB
     * 
     * ADAPTAÇÃO CHROME vs EDGE:
     * - Chrome pode reportar nomes genéricos para dispositivos USB
     * - Edge geralmente fornece nomes mais detalhados
     * - Ambos não expõem vendorId/productId via Web MIDI API
     * 
     * SOLUÇÃO: Usar módulo de compatibilidade para normalizar nomes
     * e aplicar detecção robusta entre navegadores
     * ============================================================
     * 
     * @param {MIDIInput} input - Porta MIDI de entrada
     * @returns {boolean} True se for dispositivo Terra LEGÍTIMO
     */
    isTerraDevice(input) {
        if (!input) {
            return false;
        }

        if (!input.name && !input.id) {
            console.log('⚠️ Dispositivo inválido (sem nome e ID)');
            return false;
        }
        
        console.log('🔍 Verificando dispositivo:');
        console.log(`   ├─ Nome: "${input.name || 'N/A'}"`);
        console.log(`   ├─ Fabricante: "${input.manufacturer || 'N/A'}"`);
        console.log(`   ├─ Navegador: ${this.browserCompat.browser.name}`);
        console.log(`   └─ ID: ${input.id}`);
        
        const compatDetection = this.browserCompat.isTerraDevice(input);
        const normalizedName = this.browserCompat.normalizeDeviceName(input.name || '');
        const normalizedId = this.browserCompat.normalizeDeviceName(input.id || '');

        const matchedByCompat = compatDetection && (
            this.matchesMidiTerraFingerprint(normalizedName) ||
            this.matchesMidiTerraFingerprint(normalizedId)
        );

        if (matchedByCompat) {
            console.log('✅ Dispositivo Midi-Terra confirmado via módulo de compatibilidade');
            return true;
        }

        const nameLower = (input.name || '').toLowerCase();
        const idLower = (input.id || '').toLowerCase();

        const matchedByName = this.matchesMidiTerraFingerprint(nameLower);
        const matchedById = this.matchesMidiTerraFingerprint(idLower);

        const isAccepted = matchedByName || matchedById;

        if (isAccepted) {
            console.log('✅ Dispositivo Midi-Terra aprovado por filtro restrito (nome/ID)');
            console.log(`   ├─ Correspondência no nome: ${matchedByName}`);
            console.log(`   └─ Correspondência no ID: ${matchedById}`);
        } else {
            console.log('❌ Dispositivo rejeitado: exige identificação explícita "Midi-Terra"');
            if (this.browserCompat.browser.isChrome) {
                console.log('   • O Chrome às vezes reporta nomes genéricos; confira se o dispositivo realmente expõe "Midi-Terra" no nome ou ID.');
                console.log('   • Caso contrário, o dispositivo será ignorado por segurança.');
            }
        }

        return isAccepted;
    }

    /**
     * Normaliza e verifica se um valor contém a assinatura Midi-Terra.
     * Aceita variações com/sem hífen, espaços ou caracteres especiais.
     * @param {string} value
     * @returns {boolean}
     */
    matchesMidiTerraFingerprint(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }

        const lower = value.toLowerCase();
        if (!lower) {
            return false;
        }

        if (lower.includes('midi-terra')) {
            return true;
        }

        const compact = lower.replace(/[^a-z0-9]/gi, '');
        return compact.includes('miditerra');
    }

    debugMidi() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧪 DEBUG MIDI-TERRA | STATUS ATUAL');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📍 Navegador:', `${this.browserCompat.browser.name} ${this.browserCompat.browser.version || ''}`.trim());
        console.log('🔒 Contexto seguro:', this.browserCompat.features.secureContext ? 'Sim' : 'Não');
        console.log('🌐 URL atual:', typeof window !== 'undefined' ? window.location.href : 'N/A');
        console.log('🎛️ midiAccess disponível:', Boolean(this.midiAccess));
        console.log('🎹 Dispositivos conectados:', this.connectedDevices.size);
        this.connectedDevices.forEach((device, deviceId) => {
            console.log(`   • ${device.name} (${deviceId}) | fabricante: ${device.manufacturer || 'N/A'}`);
        });
        if (this.connectedDevices.size === 0) {
            console.log('   • Nenhum dispositivo conectado. Verifique se outro app (Edge, DAW) está usando o Midi-Terra.');
        }
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💡 Próximos passos:');
        console.log('   1) Abra chrome://settings/content/midiDevices e garanta que o site não esteja bloqueado.');
        console.log('   2) Clique no ícone de cadeado → Configurações do site → Permitir "Dispositivos MIDI".');
        console.log('   3) Feche Edge/DAWs que possam monopolizar o Midi-Terra e reconecte o cabo USB.');
        console.log('   4) No Console, pressione uma tecla no Midi-Terra e verifique se eventos "noteon" aparecem.');
        console.log('═══════════════════════════════════════════════════════════');
    }

    logChromeDebugInstructions(context = 'init') {
        if (this.debugInstructionsLogged) {
            return;
        }

        this.debugInstructionsLogged = true;

        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧭 GUIA RÁPIDO: DEPURAÇÃO DO MIDI NO CHROME');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📌 Contexto: ${context}`);
        console.log('1) Garanta que o site esteja em HTTPS ou https://127.0.0.1:5500.');
        console.log('2) Abra chrome://settings/content/midiDevices e deixe "Sites podem perguntar".');
        console.log('3) Clique no ícone de cadeado e confirme que "Dispositivos MIDI" está como "Permitir".');
        console.log('4) Feche Edge/DAWs que estejam usando o Midi-Terra e reconecte o cabo.');
        console.log('5) Abra o DevTools (F12) → aba Console → pressione uma tecla no Midi-Terra e verifique eventos.');
        console.log('   • Opcional: execute window.midiManager?.debugMidi?.() para imprimir o status atual.');
        console.log('═══════════════════════════════════════════════════════════');

        this.ensureNotifierReady()?.showDebugChecklist?.();
    }

    /**
     * Exibe instruções de conexão quando nenhum dispositivo é detectado
     */
    showConnectionInstructions() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📌 COMO CONECTAR O DISPOSITIVO MIDI-TERRA:');
        console.log('═══════════════════════════════════════════════════════');
        console.log('1. Conecte o dispositivo USB "Midi-Terra" ao computador');
        console.log('2. Aguarde o sistema operacional reconhecer o dispositivo');
        console.log('3. Atualize esta página (F5) ou aguarde detecção automática');
        console.log('');
        console.log('💡 TROUBLESHOOTING:');
        console.log('   • Verifique se o cabo USB está bem conectado');
        console.log('   • Teste em outra porta USB');
        console.log('   • Verifique se o driver MIDI está instalado');
        console.log('   • Use Chrome, Edge ou Opera (navegadores compatíveis)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    }

    /**
     * Conecta a um dispositivo MIDI específico
     * @param {MIDIInput} input - Porta MIDI de entrada
     */
    connectDevice(input) {
        if (this.connectedDevices.has(input.id)) {
            console.log(`ℹ️ Dispositivo ${input.name} já conectado`);
            return;
        }

        console.log(`🔌 Conectando a ${input.name} (ID: ${input.id})`);
        const notifier = this.ensureNotifierReady();
        
        if (typeof input.open === 'function' && input.connection !== 'open') {
            try {
                input.open().catch(error => {
                    console.warn('⚠️ Não foi possível abrir porta MIDI imediatamente:', error);
                    if (this.browserCompat.browser.isChrome) {
                        this.ensureNotifierReady()?.showExclusiveUseWarning?.();
                    }
                });
            } catch (error) {
                console.warn('⚠️ Erro ao acionar open() na porta MIDI:', error);
                if (this.browserCompat.browser.isChrome) {
                    this.ensureNotifierReady()?.showExclusiveUseWarning?.();
                }
            }
        }

        // Adicionar listener para mensagens MIDI
        input.onmidimessage = (event) => this.handleMIDIMessage(event, input);
        
        const deviceInfo = {
            input,
            name: input.name,
            manufacturer: input.manufacturer,
            id: input.id,
            state: input.state,
            type: input.type,
            connectedAt: new Date()
        };

        // Registrar dispositivo
        this.connectedDevices.set(input.id, deviceInfo);

        // Tentar identificar e criar handler específico
        this.createDeviceHandler(input);

        // Notificar conexão
        if (this.onDeviceConnected) {
            this.onDeviceConnected({
                id: input.id,
                name: input.name,
                manufacturer: input.manufacturer
            });
        }

        this.emitGlobalEvent('device-connected', {
            id: input.id,
            name: input.name,
            manufacturer: input.manufacturer,
            reconnect: Boolean(this.autoReconnectContext)
        });

        // Notificação visual
        notifier?.showConnected?.({
            name: input.name,
            id: input.id,
            manufacturer: input.manufacturer || 'Terra Eletrônica'
        });

        if (this.autoReconnectContext && !this.autoReconnectContext.notified) {
            notifier?.showAutoReconnected?.({
                name: input.name,
                id: input.id,
                reason: this.autoReconnectContext.reason,
                devices: [deviceInfo]
            });
            this.emitGlobalEvent('auto-reconnect-success', {
                reason: this.autoReconnectContext.reason,
                devices: [deviceInfo],
                source: 'statechange'
            });
            this.autoReconnectContext.notified = true;
            this.autoReconnectContext = null;
        }

        console.log(`✅ Dispositivo ${input.name} conectado com sucesso`);
        this.persistDeviceSnapshot();
    }

    /**
     * Desconecta um dispositivo MIDI
     * @param {string} deviceId - ID do dispositivo
     */
    disconnectDevice(deviceId) {
        const device = this.connectedDevices.get(deviceId);
        if (!device) {
            return;
        }

        console.log(`🔌 Desconectando ${device.name}...`);
        const notifier = this.ensureNotifierReady();

        // Remover handler específico
        if (this.deviceHandlers.has(deviceId)) {
            const handler = this.deviceHandlers.get(deviceId);
            if (typeof handler.disconnect === 'function') {
                handler.disconnect();
            }
            this.deviceHandlers.delete(deviceId);
        }

        // Remover dispositivo
        this.connectedDevices.delete(deviceId);

        const port = device.input;
        if (port && typeof port.close === 'function' && port.connection === 'open') {
            try {
                const closeResult = port.close();
                if (closeResult?.catch) {
                    closeResult.catch(error => {
                        console.warn('⚠️ Falha ao fechar porta MIDI após desconexão:', error);
                    });
                }
            } catch (error) {
                console.warn('⚠️ Erro ao acionar close() na porta MIDI:', error);
            }
        }

        // Notificar desconexão
        if (this.onDeviceDisconnected) {
            this.onDeviceDisconnected({
                id: deviceId,
                name: device.name,
                manufacturer: device.manufacturer
            });
        }

        // Notificação visual
        notifier?.showDisconnected?.(deviceId, device.name);

        this.emitGlobalEvent('device-disconnected', {
            id: deviceId,
            name: device.name,
            disconnectedAt: Date.now()
        });

        console.log(`✅ Dispositivo ${device.name} desconectado`);
        this.persistDeviceSnapshot();
    }

    /**
     * Inicializa registro de handlers, incluindo padrões e pendências
     */
    bootstrapHandlerRegistry() {
        try {
            this.registerBuiltInHandlers();

            if (Array.isArray(MIDIDeviceManager._pendingHandlerProfiles) && MIDIDeviceManager._pendingHandlerProfiles.length > 0) {
                const pendingProfiles = [...MIDIDeviceManager._pendingHandlerProfiles];
                MIDIDeviceManager._pendingHandlerProfiles.length = 0;

                pendingProfiles.forEach(profile => {
                    this.registerDeviceHandler(profile, {
                        source: profile?.source || 'pending-queue',
                        skipPendingQueue: true,
                        allowOverride: true,
                        silentDuplicate: true
                    });
                });
            }

            this.logHandlerRegistrySummary();
        } catch (error) {
            console.error('❌ bootstrapHandlerRegistry(): falha ao preparar registry de handlers', error);
        }
    }

    /**
     * Registra handlers padrão suportados nativamente
     */
    registerBuiltInHandlers() {
        const ensureFactory = (globalName) => (input, manager, profile) => {
            const Constructor = typeof window !== 'undefined' ? window[globalName] : undefined;

            if (typeof Constructor !== 'function') {
                console.warn(`⚠️ Handler '${profile?.id || globalName}' não pôde ser instanciado: classe global ${globalName} indisponível.`);
                return null;
            }

            return new Constructor(input, manager);
        };

        const matchByKeywords = (keywords = []) => {
            const normalized = this.normalizeMatcherList(keywords);
            return (descriptor) => normalized.some(keyword => descriptor.nameLower.includes(keyword));
        };

        const builtIns = [
            {
                id: 'midi-terra',
                label: 'Controlador Midi-Terra',
                priority: 100,
                match: (descriptor) => {
                    if (!descriptor || !descriptor.nameLower) {
                        return false;
                    }

                    const isBoardFamily = ['board bells', 'boardbells', 'board bella', 'boardbella', 'board som', 'boardsom']
                        .some(keyword => descriptor.nameLower.includes(keyword));

                    if (isBoardFamily) {
                        return false;
                    }

                    if (this.matchesMidiTerraFingerprint(descriptor.nameLower)) {
                        return true;
                    }

                    if (descriptor.idLower && this.matchesMidiTerraFingerprint(descriptor.idLower)) {
                        return true;
                    }

                    if (descriptor.manufacturerLower && this.matchesMidiTerraFingerprint(descriptor.manufacturerLower)) {
                        return true;
                    }

                    return false;
                },
                factory: ensureFactory('MidiTerraDevice'),
                metadata: {
                    category: 'controller',
                    manufacturer: 'Terra Eletrônica'
                },
                source: 'built-in'
            },
            {
                id: 'board-bella',
                label: 'Board Bella',
                priority: 140,
                match: matchByKeywords(['board bella', 'boardbella']),
                factory: ensureFactory('BoardBellaDevice'),
                metadata: {
                    category: 'controller',
                    hidSupport: true
                },
                source: 'built-in'
            },
            {
                id: 'board-bells',
                label: 'Board Bells',
                priority: 130,
                match: matchByKeywords(['board bells', 'boardbells']),
                factory: ensureFactory('BoardBellsDevice'),
                metadata: {
                    category: 'percussion'
                },
                source: 'built-in'
            },
            {
                id: 'giro-som',
                label: 'Giro Som',
                priority: 70,
                match: matchByKeywords(['giro som', 'girosom']),
                factory: ensureFactory('GiroSomDevice'),
                metadata: {
                    category: 'motion'
                },
                source: 'built-in'
            },
            {
                id: 'board-som',
                label: 'Board Som',
                priority: 60,
                match: matchByKeywords(['board som', 'boardsom']),
                factory: ensureFactory('BoardSomDevice'),
                metadata: {
                    category: 'sensors'
                },
                source: 'built-in'
            },
            {
                id: 'big-key-board',
                label: 'Big Key Board',
                priority: 50,
                match: matchByKeywords(['big key', 'big keyboard', 'bigkey']),
                factory: ensureFactory('BigKeyBoardDevice'),
                metadata: {
                    category: 'keyboard'
                },
                source: 'built-in'
            },
            {
                id: 'musical-beam',
                label: 'Musical Beam',
                priority: 40,
                match: matchByKeywords(['musical beam', 'musicalbeam']),
                factory: ensureFactory('MusicalBeamDevice'),
                metadata: {
                    category: 'infrared'
                },
                source: 'built-in'
            }
        ];

        builtIns.forEach(profile => {
            this.registerDeviceHandler(profile, {
                source: profile.source,
                skipPendingQueue: true,
                silentDuplicate: true
            });
        });
    }

    /**
     * Registra um handler no registry interno e opcionalmente no pendente global
     * @param {Object} profile - Configuração do handler
     * @param {Object} options - Opções de registro
     * @returns {Object|null}
     */
    registerDeviceHandler(profile, options = {}) {
        if (!profile || typeof profile !== 'object') {
            console.warn('⚠️ registerDeviceHandler(): perfil inválido', profile);
            return null;
        }

        const normalizedIdSource = profile.id || profile.identifier || profile.deviceId || profile.name || profile.label;
        const normalizedId = typeof normalizedIdSource === 'string'
            ? normalizedIdSource.trim().toLowerCase()
            : '';

        if (!normalizedId) {
            console.warn('⚠️ registerDeviceHandler(): perfil sem ID válido', profile);
            return null;
        }

        const allowOverride = Boolean(options.allowOverride || profile.allowOverride);

        if (this.handlerRegistryIndex.has(normalizedId) && !allowOverride) {
            if (!options.silentDuplicate) {
                console.log(`ℹ️ Handler '${normalizedId}' já registrado. Ignorando duplicata (source: ${options.source || profile.source || 'desconhecida'})`);
            }
            return this.handlerRegistryIndex.get(normalizedId);
        }

        const priority = typeof profile.priority === 'number' ? profile.priority : 0;
        const matchFn = typeof profile.match === 'function'
            ? profile.match
            : this.createMatcherFromProfile(profile);
        const factoryFn = typeof profile.factory === 'function' ? profile.factory : null;

        const normalizedProfile = {
            id: normalizedId,
            label: profile.label || profile.name || normalizedId,
            priority,
            match: matchFn,
            factory: factoryFn,
            metadata: profile.metadata ? { ...profile.metadata } : {},
            source: options.source || profile.source || 'runtime',
            registeredAt: Date.now()
        };

        if (!normalizedProfile.match) {
            console.warn(`⚠️ Handler '${normalizedProfile.id}' não possui função de match válida. Registro ignorado.`);
            return null;
        }

        if (!normalizedProfile.factory) {
            console.warn(`⚠️ Handler '${normalizedProfile.id}' não possui factory válida. Registro ignorado.`);
            return null;
        }

        if (allowOverride && this.handlerRegistryIndex.has(normalizedId)) {
            const previousIndex = this.handlerRegistry.findIndex(item => item.id === normalizedId);
            if (previousIndex !== -1) {
                this.handlerRegistry.splice(previousIndex, 1);
            }
        }

        this.handlerRegistry.push(normalizedProfile);
        this.handlerRegistry.sort((a, b) => b.priority - a.priority);
        this.handlerRegistryIndex.set(normalizedId, normalizedProfile);

        if (!options.skipPendingQueue) {
            MIDIDeviceManager.enqueueHandlerProfile(normalizedProfile);
        }

        console.log(`🧩 Handler registrado: ${normalizedProfile.label} (${normalizedProfile.id}) | source: ${normalizedProfile.source} | prioridade: ${normalizedProfile.priority}`);
        return normalizedProfile;
    }

    /**
     * Normaliza listas de critérios de correspondência
     * @param {Array|string} value
     * @returns {Array<string>}
     */
    normalizeMatcherList(value) {
        if (!value) {
            return [];
        }

        const list = Array.isArray(value) ? value : [value];
        return list
            .map(item => (item ?? '').toString().toLowerCase().trim())
            .filter(Boolean);
    }

    /**
     * Constrói matcher a partir de alias/nomes/IDs declarados no perfil
     * @param {Object} profile
     * @returns {Function}
     */
    createMatcherFromProfile(profile) {
        const nameKeywords = this.normalizeMatcherList(profile.matchNames || profile.names || profile.aliases);
        const manufacturerKeywords = this.normalizeMatcherList(profile.matchManufacturers || profile.manufacturers);
        const idKeywords = this.normalizeMatcherList(profile.matchIds || profile.deviceIds);
        const customMatcher = typeof profile.matchCustom === 'function' ? profile.matchCustom : null;

        if (!nameKeywords.length && !manufacturerKeywords.length && !idKeywords.length && !customMatcher) {
            return null;
        }

        return (descriptor) => {
            if (!descriptor) {
                return false;
            }

            if (idKeywords.length && descriptor.idLower) {
                const idMatched = idKeywords.some(keyword => descriptor.idLower.includes(keyword));
                if (idMatched) {
                    return true;
                }
            }

            if (nameKeywords.length && descriptor.nameLower) {
                const nameMatched = nameKeywords.some(keyword => descriptor.nameLower.includes(keyword));
                if (nameMatched) {
                    return true;
                }
            }

            if (manufacturerKeywords.length && descriptor.manufacturerLower) {
                const manufacturerMatched = manufacturerKeywords.some(keyword => descriptor.manufacturerLower.includes(keyword));
                if (manufacturerMatched) {
                    return true;
                }
            }

            if (customMatcher) {
                try {
                    return Boolean(customMatcher(descriptor));
                } catch (error) {
                    console.warn(`⚠️ matchCustom falhou para handler ${profile.id}:`, error);
                }
            }

            return false;
        };
    }

    /**
     * Constrói um descriptor normalizado para o dispositivo
     * @param {MIDIInput} input
     * @returns {Object}
     */
    describeInputDevice(input) {
        return {
            id: input?.id || '',
            idLower: (input?.id || '').toLowerCase(),
            name: input?.name || '',
            nameLower: (input?.name || '').toLowerCase(),
            manufacturer: input?.manufacturer || '',
            manufacturerLower: (input?.manufacturer || '').toLowerCase(),
            type: input?.type || '',
            state: input?.state || '',
            connection: input?.connection || '',
            port: input
        };
    }

    /**
     * Verifica se descriptor corresponde a um dispositivo Terra Eletrônica
     * @param {Object} descriptor
     * @returns {boolean}
     */
    isTerraDeviceDescriptor(descriptor) {
        if (!descriptor) {
            return false;
        }

        const nameMatch = this.matchesMidiTerraFingerprint(descriptor.nameLower);
        const idMatch = this.matchesMidiTerraFingerprint(descriptor.idLower);
        const manufacturerMatch = this.matchesMidiTerraFingerprint(descriptor.manufacturerLower);

        return nameMatch || idMatch || manufacturerMatch;
    }

    /**
     * Localiza perfil de handler correspondente ao dispositivo
     * @param {Object} descriptor
     * @returns {Object|null}
     */
    findHandlerProfile(descriptor) {
        if (!descriptor) {
            return null;
        }

        for (const profile of this.handlerRegistry) {
            try {
                if (profile.match && profile.match(descriptor)) {
                    return profile;
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao executar matcher do handler ${profile.id}:`, error);
            }
        }

        return null;
    }

    /**
     * Instancia handler a partir do perfil localizado
     * @param {Object} profile
     * @param {MIDIInput} input
     * @returns {Object|null}
     */
    instantiateDeviceHandler(profile, input) {
        if (!profile || typeof profile.factory !== 'function') {
            console.warn(`⚠️ Handler ${profile?.id || 'desconhecido'} não possui factory válida`);
            return null;
        }

        try {
            const handlerInstance = profile.factory(input, this, profile);

            if (!handlerInstance) {
                console.warn(`⚠️ Factory do handler ${profile.id} não retornou instância para ${input.name}`);
                return null;
            }

            handlerInstance.__terraHandlerProfile = profile;
            return handlerInstance;
        } catch (error) {
            console.error(`❌ Erro ao instanciar handler ${profile.id} para ${input.name}:`, error);
            return null;
        }
    }

    /**
     * Loga sumário do registry de handlers
     */
    logHandlerRegistrySummary() {
        const total = this.handlerRegistry.length;
        console.log(`📚 Handlers registrados: ${total}`);

        if (total === 0) {
            return;
        }

        this.handlerRegistry.forEach((profile, index) => {
            console.log(`   ${index + 1}. ${profile.label} (${profile.id}) | prioridade: ${profile.priority} | source: ${profile.source}`);
        });
    }

    /**
     * Cria handler específico para dispositivo identificado
     * @param {MIDIInput} input - Porta MIDI de entrada
     */
    createDeviceHandler(input) {
        const descriptor = this.describeInputDevice(input);
        const isTerraDevice = this.isTerraDeviceDescriptor(descriptor);

        if (!isTerraDevice) {
            console.log(`ℹ️ Dispositivo ${input.name} não corresponde aos filtros Terra Eletrônica (handler genérico não atribuído)`);
            return;
        }

        console.log(`🎵 Dispositivo Terra detectado: ${input.name}`);
        const profile = this.findHandlerProfile(descriptor);

        if (!profile) {
            console.warn(`⚠️ Handler específico não encontrado para ${input.name}`);

            this.handlerUsageStats.set(input.id, {
                profileId: null,
                handlerFound: false,
                firstActivationLogged: false,
                missingHandlerWarned: true,
                missingLoggedAt: Date.now()
            });

            this.emitGlobalEvent('handler-missing', {
                deviceId: input.id,
                deviceName: input.name,
                manufacturer: descriptor.manufacturer,
                registeredHandlers: this.handlerRegistry.map(item => item.id)
            });
            return;
        }

        const handlerInstance = this.instantiateDeviceHandler(profile, input);

        if (!handlerInstance) {
            this.handlerUsageStats.set(input.id, {
                profileId: profile.id,
                handlerFound: false,
                instantiationFailed: true,
                missingHandlerWarned: true,
                missingLoggedAt: Date.now()
            });

            this.emitGlobalEvent('handler-instantiation-failed', {
                deviceId: input.id,
                deviceName: input.name,
                handlerId: profile.id,
                handlerLabel: profile.label
            });
            return;
        }

        this.deviceHandlers.set(input.id, handlerInstance);
        this.handlerUsageStats.set(input.id, {
            profileId: profile.id,
            handlerFound: true,
            firstActivationLogged: false,
            messagesRouted: 0,
            lastMessageAt: null
        });

        const audioEngine = typeof window !== 'undefined' ? window.audioEngine : null;
        const soundfontManager = typeof window !== 'undefined' ? window.soundfontManager : null;
        const virtualKeyboard = typeof window !== 'undefined' ? window.virtualKeyboard : null;

        if (typeof handlerInstance.setAudioIntegration === 'function' && (audioEngine || soundfontManager)) {
            try {
                handlerInstance.setAudioIntegration(audioEngine, soundfontManager);
                console.log(`🔗 Integração de áudio aplicada ao handler ${profile.label}`);
            } catch (error) {
                console.warn(`⚠️ Falha ao aplicar integração de áudio para handler ${profile.label}:`, error);
            }
        }

        // 🆕 Integração com Virtual Keyboard para soundfonts individuais por tecla
        if (typeof handlerInstance.setVirtualKeyboardIntegration === 'function' && virtualKeyboard) {
            try {
                handlerInstance.setVirtualKeyboardIntegration(virtualKeyboard);
                console.log(`🎹 Integração com Virtual Keyboard aplicada ao handler ${profile.label}`);
            } catch (error) {
                console.warn(`⚠️ Falha ao aplicar integração com Virtual Keyboard para handler ${profile.label}:`, error);
            }
        }

        if (typeof handlerInstance.setChordPlaybackEnabled === 'function') {
            try {
                handlerInstance.setChordPlaybackEnabled(this.chordPlaybackEnabled);
            } catch (error) {
                console.warn(`⚠️ Falha ao aplicar preferência de acordes ao handler ${profile.label}:`, error);
            }
        }

        console.log(`🎯 Handler '${profile.label}' atribuído ao dispositivo ${input.name}`);
        this.emitGlobalEvent('handler-attached', {
            deviceId: input.id,
            deviceName: input.name,
            handlerId: profile.id,
            handlerLabel: profile.label
        });
    }

    setChordPlaybackEnabled(enabled, source = 'runtime') {
        const normalized = Boolean(enabled);

        if (this.chordPlaybackEnabled === normalized) {
            if (typeof window !== 'undefined') {
                window.__pendingChordPreference = normalized;
            }
            return this.chordPlaybackEnabled;
        }

        this.chordPlaybackEnabled = normalized;

        if (typeof window !== 'undefined') {
            window.__pendingChordPreference = normalized;
        }

        console.log(normalized
            ? '🎼 Reprodução de acordes completa habilitada'
            : '🎼 Reprodução limitada à nota raiz (acordes desabilitados)');

        this.deviceHandlers.forEach((handler, deviceId) => {
            if (typeof handler?.setChordPlaybackEnabled === 'function') {
                try {
                    handler.setChordPlaybackEnabled(normalized);
                } catch (error) {
                    console.warn(`⚠️ Handler ${deviceId} não pôde aplicar a preferência de acordes:`, error);
                }
            }
        });

        this.emitGlobalEvent('chord-playback-changed', {
            enabled: normalized,
            source,
            appliedAt: Date.now()
        });

        return this.chordPlaybackEnabled;
    }

    isChordPlaybackEnabled() {
        return Boolean(this.chordPlaybackEnabled);
    }

    /**
     * Manipula mudanças de estado (conexão/desconexão)
     * @param {MIDIConnectionEvent} event - Evento de mudança de estado
     */
    handleStateChange(event) {
        const port = event.port;
        
        console.log(`🔄 Mudança de estado MIDI: ${port.name} - ${port.state}`);

        if (port.type === 'input') {
            if (port.state === 'connected') {
                this.connectDevice(port);
            } else if (port.state === 'disconnected') {
                this.disconnectDevice(port.id);
                this.scheduleDeferredScan('statechange-disconnected', 800);
            }
        }
    }

    /**
     * Manipula mensagens MIDI recebidas
     * @param {MIDIMessageEvent} event - Evento MIDI
     * @param {MIDIInput} input - Porta de origem
     */
    handleMIDIMessage(event, input) {
        const [status, data1, data2] = event.data;
        
        // Decodificar mensagem MIDI
        const messageType = status & 0xF0;
        const channel = status & 0x0F;

        const message = {
            type: this.getMIDIMessageType(messageType),
            channel: channel + 1, // Canais MIDI são 1-16 (internamente 0-15)
            status,
            data1,
            data2,
            timestamp: event.timeStamp,
            deviceId: input.id,
            deviceName: input.name,
            rawData: Array.from(event.data)
        };

        // Adicionar informações específicas por tipo
        switch (messageType) {
            case 0x90: // Note On
                message.note = data1;
                message.velocity = data2;
                message.noteName = this.midiNoteToName(data1);
                break;
            case 0x80: // Note Off
                message.note = data1;
                message.velocity = data2;
                message.noteName = this.midiNoteToName(data1);
                break;
            case 0xC0: // Program Change
                message.program = data1;
                break;
            case 0xE0: // Pitch Bend
                message.pitchBend = (data2 << 7) | data1;
                message.pitchBendValue = ((message.pitchBend - 8192) / 8192) * 100; // -100 a +100
                break;
            case 0xB0: // Control Change
                message.controller = data1;
                message.value = data2;
                break;
        }

        if (message.type === 'noteOn' && message.velocity === 0) {
            message.wasConvertedFromNoteOn = true;
            message.originalType = 'noteOn';
            message.type = 'noteOff';
        }

        // Log para debug (pode ser desabilitado em produção)
        if (message.type !== 'unknown') {
            console.log(`🎵 MIDI: ${message.type} | Canal: ${message.channel} | Dispositivo: ${input.name}`, message);
        }

        // Encaminhar para handler específico do dispositivo
        const handler = this.deviceHandlers.get(input.id);
        const usageStats = this.handlerUsageStats.get(input.id) || {
            profileId: handler?.__terraHandlerProfile?.id || null,
            handlerFound: Boolean(handler),
            firstActivationLogged: false,
            messagesRouted: 0,
            missingHandlerWarned: false,
            lastMessageAt: null,
            lastMissingLog: null
        };

        if (handler && typeof handler.handleMessage === 'function') {
            if (!usageStats.firstActivationLogged) {
                const profileLabel = handler.__terraHandlerProfile?.label || handler.constructor?.name || 'Handler desconhecido';
                console.log(`🚦 Handler '${profileLabel}' ativo para ${input.name}`);
                usageStats.firstActivationLogged = true;
            }

            usageStats.handlerFound = true;
            usageStats.messagesRouted = (usageStats.messagesRouted || 0) + 1;
            usageStats.lastMessageAt = Date.now();
            this.handlerUsageStats.set(input.id, usageStats);

            handler.handleMessage(message);
        } else {
            const now = Date.now();
            const shouldLog = !usageStats.missingHandlerWarned || !usageStats.lastMissingLog || (now - usageStats.lastMissingLog) > 5000;

            if (shouldLog) {
                console.warn(`⚠️ Nenhum handler específico ativo para ${input.name}. Mensagem roteada apenas para callbacks genéricos.`, {
                    deviceId: input.id,
                    availableHandlers: this.handlerRegistry.map(profile => profile.id)
                });
                usageStats.missingHandlerWarned = true;
                usageStats.lastMissingLog = now;
            }

            this.handlerUsageStats.set(input.id, usageStats);
        }

        // Callback global
        if (this.onMIDIMessage) {
            this.onMIDIMessage(message);
        }

        // Notificar listeners específicos
        const listeners = this.listeners.get(message.type) || [];
        listeners.forEach(callback => callback(message));
    }

    /**
     * Converte tipo de mensagem MIDI em nome legível
     * @param {number} messageType - Tipo de mensagem (4 bits superiores do status)
     * @returns {string} Nome do tipo de mensagem
     */
    getMIDIMessageType(messageType) {
        const types = {
            0x80: 'noteOff',
            0x90: 'noteOn',
            0xA0: 'aftertouch',
            0xB0: 'controlChange',
            0xC0: 'programChange',
            0xD0: 'channelPressure',
            0xE0: 'pitchBend',
            0xF0: 'systemMessage'
        };
        return types[messageType] || 'unknown';
    }

    /**
     * Converte número MIDI em nome de nota
     * @param {number} midiNote - Número da nota MIDI (0-127)
     * @returns {string} Nome da nota (ex: "C4", "A#5")
     */
    midiNoteToName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }

    /**
     * Registra listener para tipo específico de mensagem MIDI
     * @param {string} messageType - Tipo de mensagem (noteOn, noteOff, etc)
     * @param {Function} callback - Função callback
     */
    on(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, []);
        }
        this.listeners.get(messageType).push(callback);
    }

    /**
     * Remove listener
     * @param {string} messageType - Tipo de mensagem
     * @param {Function} callback - Função callback a remover
     */
    off(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            return;
        }
        const listeners = this.listeners.get(messageType);
        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Obtém lista de dispositivos conectados
     * @returns {Array} Lista de dispositivos
     */
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }

    /**
     * Obtém handler de dispositivo específico
     * @param {string} deviceId - ID do dispositivo
     * @returns {Object|null} Handler do dispositivo
     */
    getDeviceHandler(deviceId) {
        return this.deviceHandlers.get(deviceId) || null;
    }

    /**
     * Verifica se MIDI está disponível e inicializado
     * @returns {boolean} Status de disponibilidade
     */
    isAvailable() {
        return this.midiSupported && this.isInitialized;
    }

    /**
     * Obtém estatísticas do sistema MIDI
     * @returns {Object} Estatísticas
     */
    getStats() {
        return {
            midiSupported: this.midiSupported,
            isInitialized: this.isInitialized,
            connectedDevices: this.connectedDevices.size,
            deviceHandlers: this.deviceHandlers.size,
            chordPlaybackEnabled: this.isChordPlaybackEnabled(),
            registeredHandlers: this.handlerRegistry.map(profile => ({
                id: profile.id,
                label: profile.label,
                priority: profile.priority,
                source: profile.source
            })),
            devices: this.getConnectedDevices().map(d => ({
                name: d.name,
                manufacturer: d.manufacturer,
                id: d.id,
                state: d.state,
                connectedAt: d.connectedAt
            }))
        };
    }

    /**
     * Desconecta todos os dispositivos e limpa recursos
     */
    destroy() {
        console.log('🔌 Desconectando todos os dispositivos MIDI...');
        
        // Desconectar todos os dispositivos
        const deviceIds = Array.from(this.connectedDevices.keys());
        deviceIds.forEach(id => this.disconnectDevice(id));
        
        // Limpar listeners
        this.listeners.clear();
        
        // Limpar callbacks
        this.onDeviceConnected = null;
        this.onDeviceDisconnected = null;
        this.onMIDIMessage = null;
        this.onError = null;
        
        this.isInitialized = false;
        console.log('✅ Sistema MIDI finalizado');
    }
}

// Registro global de handlers pendentes (para uso antes da instância do manager)
MIDIDeviceManager._pendingHandlerProfiles = Array.isArray(MIDIDeviceManager._pendingHandlerProfiles)
    ? MIDIDeviceManager._pendingHandlerProfiles
    : [];

MIDIDeviceManager.enqueueHandlerProfile = function enqueueHandlerProfile(profile) {
    if (!profile || typeof profile !== 'object') {
        return;
    }

    if (!Array.isArray(MIDIDeviceManager._pendingHandlerProfiles)) {
        MIDIDeviceManager._pendingHandlerProfiles = [];
    }

    const normalizedIdSource = profile.id || profile.identifier || profile.deviceId || profile.label || profile.name;
    const normalizedId = typeof normalizedIdSource === 'string'
        ? normalizedIdSource.trim().toLowerCase()
        : '';

    if (!normalizedId) {
        return;
    }

    const alreadyQueued = MIDIDeviceManager._pendingHandlerProfiles.some(item => {
        const existingIdSource = item.id || item.identifier || item.deviceId || item.label || item.name;
        const existingId = typeof existingIdSource === 'string'
            ? existingIdSource.trim().toLowerCase()
            : '';
        return existingId === normalizedId;
    });

    if (alreadyQueued) {
        return;
    }

    MIDIDeviceManager._pendingHandlerProfiles.push(profile);
};

MIDIDeviceManager.registerCustomHandler = function registerCustomHandler(profile) {
    if (!profile || typeof profile !== 'object') {
        console.warn('⚠️ registerCustomHandler(): perfil inválido', profile);
        return false;
    }

    const effectiveProfile = {
        ...profile,
        source: profile.source || 'custom'
    };

    if (typeof window !== 'undefined' && window.midiManager instanceof MIDIDeviceManager) {
        window.midiManager.registerDeviceHandler(effectiveProfile, {
            source: effectiveProfile.source,
            allowOverride: Boolean(profile.allowOverride)
        });
        return true;
    }

    MIDIDeviceManager.enqueueHandlerProfile(effectiveProfile);
    console.log(`🧩 Handler personalizado '${effectiveProfile.id || effectiveProfile.label || 'sem-id'}' enfileirado. Será registrado quando o MIDIDeviceManager for instanciado.`);
    return true;
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIDeviceManager = MIDIDeviceManager;
    if (typeof window.registerTerraMidiHandler !== 'function') {
        window.registerTerraMidiHandler = (profile) => MIDIDeviceManager.registerCustomHandler(profile);
    }
}
