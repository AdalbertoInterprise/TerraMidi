// Aplicação Principal - Coordena todos os módulos da plataforma
class MusicTherapyApp {
    constructor() {
    this.currentTab = 'player';
        this.currentMelody = null;
        this.isPlaying = false;
        this.savedMelodies = [];
        this.activeNotes = new Map();
        this.practiceState = 'idle';
        this.dom = {};
    this.pendingMidiInitReason = null;

        this.presetMelodies = {
            'relaxing-waves': {
                melody: [
                    { note: 'C', duration: 1.5, pause: 0.3 },
                    { note: 'E', duration: 1, pause: 0.2 },
                    { note: 'G', duration: 1.2, pause: 0.3 },
                    { note: 'A', duration: 0.8, pause: 0.2 },
                    { note: 'G', duration: 1, pause: 0.2 },
                    { note: 'E', duration: 1.2, pause: 0.3 },
                    { note: 'C', duration: 1.5, pause: 0.4 }
                ],
                description: 'Ondas suaves e relaxantes, ideais para acalmar mente e respiração',
                therapeuticIntent: 'Relaxamento profundo',
                tempoBpm: 70,
                source: 'preset'
            },
            'forest-ambience': {
                melody: [
                    { note: 'D', duration: 1.2, pause: 0.3 },
                    { note: 'F', duration: 0.8, pause: 0.2 },
                    { note: 'A', duration: 1, pause: 0.3 },
                    { note: 'C2', duration: 0.8, pause: 0.2 },
                    { note: 'A', duration: 1, pause: 0.2 },
                    { note: 'F', duration: 1.2, pause: 0.3 },
                    { note: 'D', duration: 1.5, pause: 0.4 }
                ],
                description: 'Ambiente de floresta com harmonia leve e espaçada',
                therapeuticIntent: 'Conexão com a natureza',
                tempoBpm: 65,
                source: 'preset'
            },
            'healing-light': {
                melody: [
                    { note: 'E', duration: 1, pause: 0.2 },
                    { note: 'G', duration: 1.2, pause: 0.3 },
                    { note: 'B', duration: 1, pause: 0.2 },
                    { note: 'C2', duration: 0.8, pause: 0.2 },
                    { note: 'B', duration: 1, pause: 0.2 },
                    { note: 'G', duration: 1.2, pause: 0.3 },
                    { note: 'E', duration: 1.4, pause: 0.4 }
                ],
                description: 'Sequência luminosa e revigorante',
                therapeuticIntent: 'Reequilíbrio energético',
                tempoBpm: 78,
                source: 'preset'
            },
            'deep-rest': {
                melody: [
                    { note: 'C', duration: 2, pause: 0.4 },
                    { note: 'G', duration: 1.5, pause: 0.3 },
                    { note: 'F', duration: 1.5, pause: 0.3 },
                    { note: 'D', duration: 1.5, pause: 0.3 },
                    { note: 'C', duration: 2.2, pause: 0.5 }
                ],
                description: 'Notas longas e acolhedoras para induzir o descanso',
                therapeuticIntent: 'Indução ao sono',
                tempoBpm: 55,
                source: 'preset'
            },
            'peaceful-rain': {
                melody: [
                    { note: 'A', duration: 0.8, pause: 0.2 },
                    { note: 'E', duration: 0.8, pause: 0.2 },
                    { note: 'F', duration: 1, pause: 0.2 },
                    { note: 'C', duration: 1.2, pause: 0.3 },
                    { note: 'E', duration: 0.8, pause: 0.2 },
                    { note: 'A', duration: 1.2, pause: 0.3 },
                    { note: 'C2', duration: 1.5, pause: 0.4 }
                ],
                description: 'Gotas suaves que criam sensação de acolhimento',
                therapeuticIntent: 'Organização emocional',
                tempoBpm: 72,
                source: 'preset'
            }
        };

        this.init();
    }

    async init() {
        try {
            this.cacheDomElements();
            this.setupAudioUnlockUI(); // 🎵 Configurar UI de desbloqueio de áudio
            this.setupTabs();
            // this.setupMelodyControls(); // Comentado: aba de gerador de melodias removida (IA mantida para prática interativa)
            this.setupKeyboard();
            this.setupPresetMelodies();
            this.setupPracticeControls();
            // this.setupChordToggle(); // ⚠️ REMOVIDO: Board Bells tem função de acorde integrada no hardware
            this.loadSavedMelodies();
            
            // Define o modo de jogo padrão
            this.setDefaultGameMode();
            
            // Instrumentos sintéticos desabilitados
            // await this.initSyntheticInstruments();
            
            this.updateTabState(this.currentTab);
            this.showWelcomeMessage();
            this.setupAdvancedInstaller(); // 🚀 Inicializar instalador agressivo
            this.ensureMidiIntegration('app-init');
        } catch (error) {
            console.error('❌ Erro durante inicialização da aplicação:', error);
        }
    }

    ensureMidiIntegration(reason = 'manual') {
        if (!window) {
            return;
        }

        if (typeof MIDIDeviceManager === 'undefined') {
            console.log('ℹ️ MIDIDeviceManager não disponível - aguardando carregamento do módulo.');
            return;
        }

        if (!window.midiNotifier && typeof MIDIConnectionNotifier === 'function') {
            window.midiNotifier = new MIDIConnectionNotifier();
        }

        if (!(window.midiManager instanceof MIDIDeviceManager)) {
            window.midiManager = new MIDIDeviceManager();
        }

        const manager = window.midiManager;
        if (!manager) {
            return;
        }
        
        // 🌉 Vincular Service Worker Bridge ao MIDI Manager
        if (window.swBridge && typeof window.swBridge.setMidiManager === 'function') {
            window.swBridge.setMidiManager(manager);
            console.log('✅ Service Worker Bridge vinculado ao MIDI Manager');
        }

        // 🔬 Inicializar sistema de diagnóstico MIDI
        if (typeof MIDIDiagnostics === 'function' && !window.midiDiagnostics) {
            window.midiDiagnostics = new MIDIDiagnostics(manager);
            console.log('✅ Sistema de diagnóstico MIDI inicializado');
            console.log('💡 Use window.midiDiagnostics.runFullDiagnostic() para diagnóstico completo');
        }

        if (typeof manager.setChordPlaybackEnabled === 'function') {
            const pendingPreference = typeof window.__pendingChordPreference === 'boolean'
                ? window.__pendingChordPreference
                : manager.isChordPlaybackEnabled?.();

            if (typeof pendingPreference === 'boolean') {
                manager.setChordPlaybackEnabled(pendingPreference, `${reason}-chord-sync`);
            }
        }

        if (typeof MIDIAutoReconnector === 'function') {
            if (window.midiAutoReconnector instanceof MIDIAutoReconnector) {
                window.midiAutoReconnector.setMidiManager(manager);
                window.midiAutoReconnector.setNotifier(window.midiNotifier);
            } else {
                window.midiAutoReconnector = new MIDIAutoReconnector({
                    midiManager: manager,
                    notifier: window.midiNotifier,
                    terraFilters: manager?.terraDeviceFilters
                });
            }
        }

        const registerCallbacks = () => {
            if (window.__terraMidiCallbacksRegistered) {
                return;
            }

            window.__terraMidiCallbacksRegistered = true;

            manager.onDeviceConnected = (device) => {
                console.log(`🔌 Dispositivo MIDI conectado: ${device.name}`);
                if (window.midiStatusPanel) {
                    window.midiStatusPanel.addDevice(device);
                }
                
                // 🎹 Integrar Board Bells com Virtual Keyboard (soundfonts individuais por tecla)
                if (device.handler && device.handler.constructor.name === 'BoardBellsDevice') {
                    const virtualKeyboard = this.virtualKeyboard || window.musicTherapyApp?.virtualKeyboard;
                    if (virtualKeyboard && typeof device.handler.setVirtualKeyboard === 'function') {
                        device.handler.setVirtualKeyboard(virtualKeyboard);
                        console.log('✅ Board Bells integrado com Virtual Keyboard - soundfonts individuais por tecla habilitados');
                    }
                }
                
                // 🆕 Integrar MidiTerraDevice (Receptor RX) com Virtual Keyboard
                // MidiTerra é um receptor que suporta até 5 instrumentos, incluindo Board Bells no Canal 5
                if (device.handler && device.handler.constructor.name === 'MidiTerraDevice') {
                    const virtualKeyboard = this.virtualKeyboard || window.musicTherapyApp?.virtualKeyboard;
                    if (virtualKeyboard && typeof device.handler.setVirtualKeyboard === 'function') {
                        device.handler.setVirtualKeyboard(virtualKeyboard);
                        console.log('✅ Midi-Terra (Receptor RX) integrado com Virtual Keyboard');
                        console.log('   └─ 🔔 Board Bells (Canal 5) detectará automaticamente mensagens MIDI');
                    }
                }
            };

            manager.onDeviceDisconnected = (deviceId) => {
                console.log(`🔌 Dispositivo MIDI desconectado: ${deviceId}`);
                if (window.midiStatusPanel) {
                    window.midiStatusPanel.removeDevice(deviceId);
                }
            };

            manager.onMIDIMessage = (message) => {
                if (window.debugMode) {
                    console.log('MIDI:', message.type, message);
                }
            };

            manager.onError = (error) => {
                console.error('❌ Erro MIDI:', error);
                window.midiNotifier?.showError?.(error.message || 'Erro desconhecido na camada MIDI');
            };
        };

        const attemptInitialization = (initReason) => {
            const effectiveReason = manager?.sessionInfo?.isReload && !initReason.includes('reload')
                ? `${initReason}|page-reload`
                : initReason;

            return manager.initialize(effectiveReason).then(success => {
                if (success) {
                    console.log(`✅ Sistema MIDI inicializado (${effectiveReason})`);
                    registerCallbacks();
                    this.pendingMidiInitReason = null;
                } else {
                    console.warn(`⚠️ Inicialização MIDI não concluída (${effectiveReason})`);
                }
            }).catch(error => {
                console.warn(`⚠️ Erro ao inicializar sistema MIDI (${effectiveReason}):`, error);
                const requiresActivation = error?.name === 'SecurityError' || /user activation/i.test(error?.message || '');
                if (requiresActivation) {
                    this.pendingMidiInitReason = 'user-activation';
                }
                window.midiNotifier?.showError?.('Falha na inicialização MIDI');
            });
        };

        const attemptReason = this.pendingMidiInitReason ? `${reason}|${this.pendingMidiInitReason}` : reason;
        attemptInitialization(attemptReason);

        if (navigator?.permissions?.query) {
            navigator.permissions.query({ name: 'midi', sysex: false }).then(status => {
                if (status.state === 'granted') {
                    attemptInitialization('permissions-granted');
                }

                status.onchange = () => {
                    if (status.state === 'granted') {
                        attemptInitialization('permissions-change');
                    }
                };
            }).catch(() => {
                // API de permissões indisponível - seguir fluxo padrão
            });
        }
    }
    
    async initSyntheticInstruments() {
        // Funcionalidade de instrumentos sintéticos desabilitada
        console.log('ℹ️ Instrumentos sintéticos não são mais utilizados - inicialização ignorada');
    }
    
    addSyntheticInstrumentControls() {
        // Funcionalidade removida - instrumentos sintéticos não são mais utilizados
        console.log('ℹ️ Instrumentos sintéticos desabilitados');
    }
    
    setupSyntheticInstrumentButtons() {
        // Funcionalidade removida - event listeners não são mais necessários
        console.log('ℹ️ Event listeners de instrumentos sintéticos removidos');
    }

    /**
     * ⚠️ MÉTODO DESABILITADO - Board Bells tem função de acorde integrada no hardware
     * 
     * setupChordToggle() - Configurava toggle para habilitar/desabilitar acordes
     * Removido porque:
     * 1. Board Bells-08 já possui essa funcionalidade integrada fisicamente
     * 2. Evita redundância e confusão na interface
     * 3. O hardware controla essa função de forma mais intuitiva
     * 
     * Mantido comentado para referência histórica.
     */
    /*
    setupChordToggle() {
        const chordToggle = this.dom?.chordToggle || document.getElementById('chord-toggle');

        if (!(chordToggle instanceof HTMLInputElement)) {
            return;
        }

        const applyPreference = (enabled, source = 'ui') => {
            const normalized = Boolean(enabled);
            window.__pendingChordPreference = normalized;

            if (window.midiManager && typeof window.midiManager.setChordPlaybackEnabled === 'function') {
                window.midiManager.setChordPlaybackEnabled(normalized, source);
            }
        };

        chordToggle.addEventListener('change', () => {
            applyPreference(chordToggle.checked, 'ui-toggle');
        });

        const handleGlobalUpdate = (event) => {
            const detail = event?.detail;
            if (!detail || typeof detail.enabled !== 'boolean') {
                return;
            }

            if (chordToggle.checked !== detail.enabled) {
                chordToggle.checked = detail.enabled;
            }
        };

        window.addEventListener('terra-midi:chord-playback-changed', handleGlobalUpdate);

        applyPreference(chordToggle.checked, 'ui-init');
    }
    */

    /**
     * 🎵 Configurar UI de Desbloqueio de Áudio
     * Exibe overlay quando AudioContext precisa ser ativado pelo usuário
     */
    setupAudioUnlockUI() {
        const overlay = document.getElementById('audio-unlock-overlay');
        const button = document.getElementById('audio-unlock-button');
        
        if (!overlay || !button) {
            console.warn('⚠️ Elementos de unlock de áudio não encontrados no DOM');
            return;
        }

        // Verificar se audioEngine existe
        if (!window.audioEngine) {
            console.warn('⚠️ audioEngine não disponível ainda');
            return;
        }

        // Mostrar overlay se áudio não está desbloqueado
        const checkAndShowOverlay = () => {
            if (!window.audioEngine.isUnlocked) {
                overlay.style.display = 'flex';
                console.log('🎵 Mostrando overlay de ativação de áudio');
            }
        };

        // Botão de ativação
        button.addEventListener('click', () => {
            console.log('🔊 Usuário clicou para ativar áudio');
            window.audioEngine.unlockAudioContext();
            overlay.style.display = 'none';
            console.log('✅ Overlay de áudio ocultado');
        });

        // Verificar após carregamento
        setTimeout(checkAndShowOverlay, 1000);

        // Também ocultar overlay automaticamente quando unlock acontecer
        window.audioEngine.onUnlock(() => {
            overlay.style.display = 'none';
            console.log('✅ Áudio desbloqueado, overlay removido automaticamente');
        });
    }

    cacheDomElements() {
        this.dom = {
            // Elementos do gerador de melodias (removidos da UI, mantidos para compatibilidade)
            generateButton: document.getElementById('generate-melody'),
            melodyPrompt: document.getElementById('melody-prompt'),
            tempoSelect: document.getElementById('tempo'),
            moodSelect: document.getElementById('mood'),
            durationSelect: document.getElementById('duration'),
            melodyResult: document.getElementById('melody-result'),
            melodyDescription: document.getElementById('melody-description'),
            playGenerated: document.getElementById('play-generated'),
            saveMelody: document.getElementById('save-melody'),
            useInPractice: document.getElementById('use-in-practice'),
            
            // Elementos da prática interativa (ativos)
            startPractice: document.getElementById('start-practice'),
            pausePractice: document.getElementById('pause-practice'),
            stopPractice: document.getElementById('stop-practice')

            // ⚠️ REMOVIDO: chordToggle - Board Bells tem função integrada no hardware
            // chordToggle: document.getElementById('chord-toggle')
        };
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            if (!(button instanceof HTMLElement)) {
                return;
            }

            button.addEventListener('click', event => {
                const tabId = button.getAttribute('data-tab');
                if (!tabId) {
                    return;
                }

                if (button.tagName.toLowerCase() === 'a') {
                    const hrefValue = button.getAttribute('href');
                    if (!hrefValue || hrefValue.trim() === '' || hrefValue === '#') {
                        event.preventDefault();
                    }
                }

                this.currentTab = tabId;
                this.updateTabState(tabId);
            });
        });
    }

    updateTabState(tabId) {
        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.toggle('active', section.id === tabId);
        });

        document.querySelectorAll('[data-tab]').forEach(trigger => {
            const isActive = trigger.getAttribute('data-tab') === tabId;

            if (trigger.classList.contains('nav-btn')) {
                trigger.classList.toggle('active', isActive);
            }

            if (trigger.hasAttribute('aria-pressed')) {
                trigger.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            }
        });
    }

    // ==================================================================================
    // FUNÇÕES DO GERADOR DE MELODIAS (REMOVIDO)
    // Sistema simplificado - apenas músicas pré-cadastradas
    // ==================================================================================
    
    setupMelodyControls() {
        const { generateButton, playGenerated, saveMelody, useInPractice } = this.dom;

        if (generateButton) {
            generateButton.addEventListener('click', () => this.generateMelody());
        }

        if (playGenerated) {
            playGenerated.addEventListener('click', () => this.playCurrentMelody());
        }

        if (saveMelody) {
            saveMelody.addEventListener('click', () => this.saveCurrentMelody());
        }

        if (useInPractice) {
            useInPractice.addEventListener('click', () => this.useInPractice());
        }
        
        // 💖 Botão de curtir
        const likeButton = document.getElementById('like-melody');
        if (likeButton) {
            likeButton.addEventListener('click', () => this.toggleLikeMelody());
        }
    }
    
    // 💖 Curtir/descurtir melodia
    toggleLikeMelody() {
        if (!this.currentMelody || !this.currentMelody.id) {
            this.showTip('⚠️ Salve a melodia primeiro para curtir!');
            return;
        }
        
        // Sistema de favoritos simplificado - sem IA
        this.showTip('� Música marcada como favorita!');
        
        // Atualizar botão
        this.updateLikeButton(this.currentMelody);
    }

    // Método de geração removido - sistema simplificado usa apenas músicas pré-cadastradas

    toggleGenerateButton(isLoading) {
        const { generateButton } = this.dom;
        if (!generateButton) return;

        const loadingText = generateButton.querySelector('.loading');
        const btnText = generateButton.querySelector('.btn-text');

        generateButton.disabled = isLoading;
        if (loadingText) {
            loadingText.style.display = isLoading ? 'inline' : 'none';
        }
        if (btnText) {
            btnText.style.display = isLoading ? 'none' : 'inline';
        }
    }

    getFallbackMelody({ prompt, mood }) {
        const normalizedPrompt = (prompt || '').toLowerCase();

        if (normalizedPrompt.includes('chuva') || normalizedPrompt.includes('relax')) {
            return this.presetMelodies['peaceful-rain'];
        }
        if (normalizedPrompt.includes('floresta') || normalizedPrompt.includes('natureza')) {
            return this.presetMelodies['forest-ambience'];
        }
        if (normalizedPrompt.includes('sono') || normalizedPrompt.includes('dormir')) {
            return this.presetMelodies['deep-rest'];
        }

        switch (mood) {
            case 'energizing':
                return this.presetMelodies['healing-light'];
            case 'meditative':
                return this.presetMelodies['relaxing-waves'];
            default:
                return this.presetMelodies['peaceful-rain'];
        }
    }

    highlightGenerationSource(melody) {
        switch (melody.source) {
            case 'known-song':
                this.showTip(`🎼 Música conhecida detectada: "${melody.title}"! Reproduzindo melodia original.`);
                break;
            case 'algorithmic-ai':
                this.showTip('🧠 Melodia criada com algoritmo inteligente!');
                break;
            case 'ai':
                this.showTip('🤖 Melodia gerada por IA com sucesso!');
                break;
            default:
                this.showTip('🎵 Melodia gerada com sucesso!');
        }
    }

    displayGeneratedMelody(melody) {
        const { melodyDescription } = this.dom;

        if (melodyDescription) {
            let sourceInfo = '🔄 Algoritmo Local';
            if (melody.source === 'ai') {
                sourceInfo = '🤖 Inteligência Artificial GitHub Models';
            } else if (melody.source === 'algorithmic-ai') {
                sourceInfo = '🧠 Algoritmo Inteligente (Modo Offline Avançado)';
            } else if (melody.source === 'known-song') {
                sourceInfo = '🎼 Música Conhecida (Banco de Dados)';
            } else if (melody.source === 'preset') {
                sourceInfo = '🎵 Biblioteca Terapêutica';
            }

            const complexityInfo = melody.complexity ? `<br><strong>Complexidade:</strong> ${melody.complexity}/5` : '';
            const titleInfo = melody.title && melody.title !== melody.description ? `<strong>Título:</strong> ${melody.title}<br>` : '';

            melodyDescription.innerHTML = `
                ${titleInfo}
                <strong>Descrição:</strong> ${melody.description}<br>
                <strong>Intenção Terapêutica:</strong> ${melody.therapeuticIntent}<br>
                <strong>Tempo:</strong> ${melody.tempoBpm} BPM<br>
                <strong>Notas:</strong> ${melody.melody.length} notas${complexityInfo}<br>
                <strong>Fonte:</strong> ${sourceInfo}
            `;
        }
        
        // 🎸 Exibir instrumento recomendado
        if (melody.recommendedInstrument) {
            const instrumentInfo = document.getElementById('melody-instrument');
            const instrumentName = document.getElementById('instrument-name');
            
            if (instrumentInfo && instrumentName) {
                const instrumentNames = {
                    'tibetan-bowl': 'Tigela Tibetana (Frequências Solfeggio)'
                };
                
                instrumentName.textContent = instrumentNames[melody.recommendedInstrument] || melody.recommendedInstrument;
                instrumentInfo.style.display = 'block';
                
                console.log('🎸 Instrumento recomendado:', melody.recommendedInstrument);
            }
        } else {
            const instrumentInfo = document.getElementById('melody-instrument');
            if (instrumentInfo) {
                instrumentInfo.style.display = 'none';
            }
        }
        
        // 🎨 Visualizar melodia automaticamente
        if (window.melodyGenerator && typeof window.melodyGenerator.visualizeMelody === 'function') {
            try {
                window.melodyGenerator.visualizeMelody(melody);
                console.log('🎨 Melodia visualizada automaticamente');
            } catch (error) {
                console.warn('⚠️ Erro ao visualizar melodia:', error);
            }
        }
        
        // 💖 Atualizar botão de curtir
        this.updateLikeButton(melody);

        console.log('✅ Melodia exibida:', melody.title || melody.description);
    }
    
    // 💖 Atualizar estado do botão curtir
    updateLikeButton(melody) {
        const likeButton = document.getElementById('like-melody');
        if (!likeButton || !melody.id) return;
        
        // Sistema de likes simplificado
        const likeIcon = likeButton.querySelector('.like-icon');
        if (likeIcon) {
            likeIcon.textContent = '🤍';
            likeButton.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        }
    }

    setupKeyboard() {
        const container = document.querySelector('.keyboard-container');
        if (!container) {
            console.error('❌ Container do teclado virtual não encontrado.');
            return;
        }

        const wrapper = container.closest('.virtual-keyboard');
        if (globalThis.virtualKeyboard && typeof globalThis.virtualKeyboard.init === 'function') {
            this.virtualKeyboard = globalThis.virtualKeyboard.init({
                container,
                wrapper,
                app: this,
                soundfontManager: globalThis.soundfontManager,
                audioEngine: globalThis.audioEngine,
                catalogManager: globalThis.catalogManager || null
            });
        } else {
            console.warn('VirtualKeyboard module não disponível - usando fallback simples.');
            const keys = container.querySelectorAll('.key[data-note]');
            keys.forEach(key => {
                const note = key.getAttribute('data-note');
                if (!note) return;
                const start = () => this.startNote(note, key);
                const stop = () => this.stopNote(note, key);
                key.addEventListener('mousedown', start);
                key.addEventListener('mouseup', stop);
                key.addEventListener('mouseleave', stop);
                key.addEventListener('touchstart', (event) => {
                    event.preventDefault();
                    start();
                }, { passive: false });
                key.addEventListener('touchend', stop);
                key.addEventListener('touchcancel', stop);
            });

            document.addEventListener('mouseup', () => {
                this.activeNotes.forEach((data, note) => this.stopNote(note, data.keyElement));
            });
            document.addEventListener('touchend', () => {
                this.activeNotes.forEach((data, note) => this.stopNote(note, data.keyElement));
            });
        }
    }

    setupPresetMelodies() {
        const melodyItems = document.querySelectorAll('.melody-item[data-melody]');
        melodyItems.forEach(item => {
            const melodyId = item.getAttribute('data-melody');
            if (!melodyId) return;

            item.addEventListener('click', () => {
                const melody = this.presetMelodies[melodyId];
                if (melody) {
                    this.currentMelody = melody;
                    this.displayGeneratedMelody(melody);
                    if (this.dom.melodyResult) {
                        this.dom.melodyResult.style.display = 'block';
                    }
                }
            });

            const playButton = item.querySelector('.play-btn');
            if (playButton) {
                playButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.playPresetMelody(melodyId);
                });
            }
        });
    }

    setupPracticeControls() {
        const { startPractice, pausePractice, stopPractice } = this.dom;

        if (startPractice) {
            startPractice.addEventListener('click', () => {
                this.startPractice();
            });
        }

        if (pausePractice) {
            pausePractice.addEventListener('click', () => {
                this.pausePractice();
            });
        }

        if (stopPractice) {
            stopPractice.addEventListener('click', () => {
                this.stopPractice();
            });
        }

        this.updatePracticeButtons();
        
        // 🎵 Configurar controles da biblioteca de músicas
        this.setupSongLibraryControls();
    }
    
    // 🎵 Configurar controles da biblioteca de músicas
    setupSongLibraryControls() {
        const songSelect = document.getElementById('song-select');
        const previewSongBtn = document.getElementById('preview-song-btn');
        const randomSongBtn = document.getElementById('random-song-btn');
        
        // Aguardar biblioteca estar pronta e ter músicas carregadas
        const initLibrary = () => {
            try {
                if (!window.songLibrary || typeof window.songLibrary.getAllSongs !== 'function') {
                    setTimeout(initLibrary, 200);
                    return;
                }
                
                const songs = window.songLibrary.getAllSongs();
                if (!songs || Object.keys(songs).length === 0) {
                    setTimeout(initLibrary, 200);
                    return;
                }
                
                console.log('🎵 Biblioteca de músicas pronta, populando seletor...');
                this.populateSongSelector();
            } catch (error) {
                console.warn('⚠️ Erro ao verificar biblioteca:', error);
                setTimeout(initLibrary, 200);
            }
        };
        initLibrary();
        
        // Seleção de música - carrega automaticamente
        if (songSelect) {
            songSelect.addEventListener('change', (e) => {
                const songId = e.target.value;
                
                // Habilitar/desabilitar botões
                if (previewSongBtn) previewSongBtn.disabled = !songId;
                
                // Carregar música automaticamente ao selecionar
                if (songId) {
                    this.loadSong(songId);
                }
            });
        }
        
        // Ouvir prévia
        if (previewSongBtn) {
            previewSongBtn.addEventListener('click', () => {
                const songId = songSelect.value;
                if (songId && window.gameEngine) {
                    window.gameEngine.playSongDemo();
                }
            });
        }
        
        // Música aleatória
        if (randomSongBtn) {
            randomSongBtn.addEventListener('click', () => {
                this.loadRandomSong();
            });
        }
    }
    
    populateSongSelector() {
        if (!window.songLibrary) {
            console.warn('⚠️ window.songLibrary não disponível');
            return;
        }
        
        const songSelect = document.getElementById('song-select');
        if (!songSelect) {
            console.warn('⚠️ Elemento song-select não encontrado');
            return;
        }
        
        const songs = window.songLibrary.getAllSongs();
        console.log('📊 Músicas obtidas da biblioteca:', Object.keys(songs).length);
        
        if (Object.keys(songs).length === 0) {
            console.warn('⚠️ Nenhuma música encontrada na biblioteca');
            return;
        }
        
        const categories = {};
        
        // Agrupar por categoria
        Object.values(songs).forEach(song => {
            if (!categories[song.category]) {
                categories[song.category] = [];
            }
            categories[song.category].push(song);
        });
        
        // Limpar opções existentes (manter primeira)
        while (songSelect.options.length > 1) {
            songSelect.remove(1);
        }
        
        // Adicionar optgroups
        Object.entries(categories).forEach(([categoryKey, songs]) => {
            const categoryInfo = window.songLibrary.getCategoryInfo(categoryKey);
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoryInfo.name;
            
            songs.forEach(song => {
                const option = document.createElement('option');
                option.value = song.id;
                const diffInfo = window.songLibrary.getDifficultyInfo(song.difficulty);
                option.textContent = `${diffInfo.stars} ${song.title}`;
                optgroup.appendChild(option);
            });
            
            songSelect.appendChild(optgroup);
        });
        
        console.log(`✅ Seletor populado com ${Object.keys(songs).length} músicas`);
    }
    
    loadSong(songId) {
        if (!window.gameEngine || !window.songLibrary) {
            console.error('❌ GameEngine ou SongLibrary não disponível');
            return;
        }
        
        console.log('📥 Carregando música:', songId);
        
        const song = window.songLibrary.getSong(songId);
        if (!song) {
            console.error('❌ Música não encontrada no catálogo:', songId);
            this.showTip('❌ Música não encontrada');
            return;
        }
        
        console.log('✅ Música encontrada:', {
            id: song.id,
            title: song.title,
            notas: song.melody?.length,
            bpm: song.tempoBpm
        });
        
        const success = window.gameEngine.loadSongFromLibrary(songId);
        if (success) {
            window.gameEngine.showSongPreview();
            this.showTip(`🎵 Música selecionada: ${song.title} - Use os botões para ouvir prévia ou iniciar prática`);
            
            // Definir modo de aprendizado como padrão (simplificado)
            if (window.gameEngine) {
                window.gameEngine.setGameMode('learning');
            }
        } else {
            console.error('❌ Falha ao carregar música no GameEngine');
            this.showTip('❌ Erro ao carregar música');
        }
    }
    
    loadRandomSong() {
        if (!window.songLibrary) return;
        
        const song = window.songLibrary.getRandomSong();
        if (song) {
            const songSelect = document.getElementById('song-select');
            if (songSelect) {
                songSelect.value = song.id;
                // Disparar evento change irá carregar automaticamente a música
                songSelect.dispatchEvent(new Event('change'));
            }
        }
    }
    
    // 🚀 Configurar o Advanced Installer (Instalação Agressiva Offline)
    setupAdvancedInstaller() {
        try {
            // Verificar se os módulos estão disponíveis
            if (typeof AdvancedInstallerUI === 'undefined') {
                console.warn('⚠️ AdvancedInstallerUI não carregado ainda, tentando novamente...');
                setTimeout(() => this.setupAdvancedInstaller(), 500);
                return;
            }

            // Criar instância do UI
            window.advancedInstallerUI = new AdvancedInstallerUI();
            window.advancedInstallerUI.init();

            // Conectar ao botão "Instalar App" existente
            const btnInstallPwa = document.getElementById('btn-install-pwa');
            if (btnInstallPwa) {
                btnInstallPwa.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('🚀 Usuário iniciou instalação agressiva');
                    await window.advancedInstallerUI.startInstallation();
                });
                console.log('✅ Advanced Installer conectado ao botão de instalação PWA');
            } else {
                console.warn('⚠️ Botão btn-install-pwa não encontrado');
            }

            // Inicializar listeners de eventos do beforeinstallprompt (Chrome/Edge)
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                console.log('📲 Evento beforeinstallprompt capturado');
                
                // Mostrar botão de instalar
                const btnInstallPwa = document.getElementById('btn-install-pwa');
                if (btnInstallPwa && btnInstallPwa.style.display === 'none') {
                    btnInstallPwa.style.display = 'inline-flex';
                }

                // Armazenar o evento para possível uso futuro
                window.deferredPrompt = e;
            });

            // Se a PWA já está instalada
            window.addEventListener('appinstalled', () => {
                console.log('✅ App já foi instalado como PWA');
                window.deferredPrompt = null;
                
                // Mostrar opção de instalação agressiva mesmo assim
                const btnInstallPwa = document.getElementById('btn-install-pwa');
                if (btnInstallPwa) {
                    btnInstallPwa.textContent = '📲 Cache Offline Completo';
                    console.log('ℹ️ Botão redefinido para instalação offline agressiva');
                }
            });

            // Tentar iniciar instalação agressiva automaticamente na primeira visita
            const hasRunAdvancedInstaller = sessionStorage.getItem('terra-advanced-installer-run');
            if (!hasRunAdvancedInstaller && 'storage' in navigator) {
                // Aguardar um pouco para não interferir com o carregamento inicial
                setTimeout(async () => {
                    console.log('🚀 Iniciando instalação agressiva automática na primeira visita');
                    sessionStorage.setItem('terra-advanced-installer-run', 'true');
                    
                    // Comentado por enquanto - ativar somente se desejado
                    // await window.advancedInstallerUI.startInstallation();
                }, 2000);
            }

            console.log('✅ Advanced Installer configurado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao configurar Advanced Installer:', error);
        }
    }
    
    // Função simplificada - apenas define o modo no GameEngine
    setDefaultGameMode() {
        if (window.gameEngine) {
            window.gameEngine.setGameMode('learning');
        }
    }

    setPracticeState(state) {
        this.practiceState = state;
        this.updatePracticeButtons();
    }

    updatePracticeButtons() {
        const { startPractice, pausePractice, stopPractice } = this.dom;

        if (!startPractice || !pausePractice || !stopPractice) {
            return;
        }

        switch (this.practiceState) {
            case 'playing':
                startPractice.disabled = true;
                pausePractice.disabled = false;
                stopPractice.disabled = false;
                pausePractice.textContent = '⏸️ Pausar';
                break;
            case 'paused':
                startPractice.disabled = true;
                pausePractice.disabled = false;
                stopPractice.disabled = false;
                pausePractice.textContent = '▶️ Retomar';
                break;
            default:
                startPractice.disabled = false;
                pausePractice.disabled = true;
                stopPractice.disabled = true;
                pausePractice.textContent = '⏸️ Pausar';
        }
    }
    
    async playCurrentMelody() {
        if (!this.currentMelody || !window.audioEngine) {
            console.warn('⚠️ Nenhuma melodia para reproduzir');
            return;
        }
        
        try {
            console.log('▶️ Reproduzindo melodia...');
            await window.audioEngine.playMelody(this.currentMelody.melody, this.currentMelody.tempoBpm);
        } catch (error) {
            console.error('❌ Erro ao reproduzir melodia:', error);
        }
    }
    
    saveCurrentMelody() {
        if (!this.currentMelody) {
            // 🔇 Sem alert intrusivo
            SystemLogger.log('warn', 'Nenhuma melodia para salvar');
            console.warn('⚠️ Nenhuma melodia para salvar');
            return;
        }
        
        // Salvamento removido - sistema simplificado
        SystemLogger.log('info', 'Funcionalidade de salvamento removida - use as músicas pré-cadastradas');
        console.log('ℹ️ Funcionalidade de salvamento removida - use as músicas pré-cadastradas');
    }
    
    useInPractice() {
        if (!this.currentMelody) {
            // 🔇 Sem alert intrusivo
            SystemLogger.log('warn', 'Nenhuma melodia para usar na prática');
            console.warn('⚠️ Nenhuma melodia para usar na prática');
            return;
        }
        
        // Mudar para aba de prática
        const practiceTab = document.querySelector('[data-tab=\"practice\"]');
        if (practiceTab) {
            practiceTab.click();
        }
        
        // Iniciar jogo com a melodia atual
        setTimeout(() => {
            this.startPracticeWithMelody(this.currentMelody);
        }, 500);
    }
    
    // ==================================================================================
    // FIM DAS FUNÇÕES DO GERADOR DE MELODIAS
    // ==================================================================================
    
    // INICIAR NOTA SUSTENTADA (como teclado real)
    startNote(note, keyElement, instrumentKey = null) {
        // Prevenir múltiplas ativações da mesma nota
        if (this.activeNotes.has(note)) {
            console.log(`⚠️ Nota ${note} já está ativa, ignorando...`);
            return this.activeNotes.get(note)?.noteId || null;
        }
        
        console.log(`▶️ PRESSIONAR: Nota ${note}`);
        
        // Efeito visual IMEDIATO
        if (keyElement) {
            keyElement.classList.add('active');
        }
        
        // Tocar nota IMEDIATAMENTE com duração longa (sustentada)
        let noteId = null;
        if (window.soundfontManager) {
            if (instrumentKey) {
                noteId = window.soundfontManager.startSustainedNoteWithInstrument(note, instrumentKey, 1.0);
            } else {
                noteId = window.soundfontManager.startSustainedNote(note, 1.0);
            }
        } else if (window.audioEngine) {
            // Fallback para audioEngine
            noteId = window.audioEngine.startSustainedNote(note);
        }
        
        if (noteId) {
            this.activeNotes.set(note, { noteId, keyElement, startTime: Date.now(), instrumentKey });
            console.log(`✅ Nota ${note} ativa com ID: ${noteId}`);
        } else {
            console.error(`❌ Falha ao iniciar nota ${note}`);
        }

        return noteId;
    }
    
    // PARAR NOTA SUSTENTADA
    stopNote(note, keyElement) {
        const noteData = this.activeNotes.get(note);
        if (!noteData) {
            console.log(`⚠️ Tentou parar nota ${note} mas não estava ativa`);
            return;
        }
        
        const duration = Date.now() - noteData.startTime;
        console.log(`⏹️ SOLTAR: Nota ${note} (duração: ${duration}ms)`);
        
        // Remover efeito visual
        if (keyElement) {
            keyElement.classList.remove('active');
        }
        
        // Parar a nota com release suave
        if (window.soundfontManager) {
            window.soundfontManager.stopSustainedNote(noteData.noteId);
        } else if (window.audioEngine) {
            window.audioEngine.stopSustainedNote(noteData.noteId);
        }
        
        this.activeNotes.delete(note);
        console.log(`✅ Nota ${note} removida dos ativos`);
    }
    
    async playNote(note, keyElement) {
        if (!window.audioEngine) return;
        
        // Efeito visual
        if (keyElement) {
            keyElement.classList.add('active');
            setTimeout(() => {
                keyElement.classList.remove('active');
            }, 200);
        }
        
        // Reproduzir nota com instrumento selecionado (SEM AWAIT para evitar delay)
        if (window.audioEngine.playNoteWithInstrument) {
            window.audioEngine.playNoteWithInstrument(note, 0.5);
        } else {
            window.audioEngine.playNote(note, 0.5);
        }
    }
    
    async playPresetMelody(melodyId) {
        const melody = this.presetMelodies[melodyId];
        if (!melody || !window.audioEngine) return;
        
        console.log(`▶️ Reproduzindo melodia preset: ${melodyId}`);
        
        try {
            await window.audioEngine.playMelody(melody.melody, melody.tempoBpm);
        } catch (error) {
            console.error('❌ Erro ao reproduzir melodia preset:', error);
        }
    }
    
    startPractice() {
        if (!window.gameEngine) {
            console.error('❌ Game Engine não disponível');
            return;
        }
        
        // Verificar se há música carregada da biblioteca
        if (window.gameEngine.currentSong) {
            // Iniciar com música da biblioteca
            const mode = window.gameEngine.gameMode;
            
            // Sempre usa modo aprendizado (passo a passo)
            console.log('📚 Iniciando modo aprendizado');
            window.gameEngine.startLearningMode();
            this.setPracticeState('playing');
            this.showTip('📚 Toque as notas destacadas em sequência!');
        } else {
            // Nenhuma música carregada: usar melodia padrão em modo livre
            if (!this.currentMelody) {
                this.currentMelody = this.presetMelodies['relaxing-waves'];
            }
            this.startPracticeWithMelody(this.currentMelody);
        }
    }
    
    startPracticeWithMelody(melody) {
        if (!window.gameEngine) {
            console.error('❌ Game Engine não disponível');
            return;
        }
        
        console.log('🎮 Iniciando prática com melodia:', melody.description || melody.title);
        window.gameEngine.startGame(melody);
        this.setPracticeState('playing');
    }
    
    pausePractice() {
        if (window.gameEngine) {
            window.gameEngine.togglePause();
            const newState = window.gameEngine.gameState === 'paused' ? 'paused' : 'playing';
            this.setPracticeState(newState);
        }
    }
    
    stopPractice() {
        if (window.gameEngine) {
            window.gameEngine.stopGame();
        }
        this.setPracticeState('idle');
    }
    
    loadSavedMelodies() {
        // Sistema simplificado - sem salvamento de melodias customizadas
        this.savedMelodies = [];
        console.log('📚 Sistema simplificado - use as Músicas pré-cadastradas');
    }
    
    updateUI() {
        // Interface simplificada - sem estatísticas de IA
        console.log('🎵 Interface atualizada');
    }
    
    showWelcomeMessage() {
        console.log(`
        🎵 Bem-vindo ao Terra Game! 🎵
        
        Explore melodias terapêuticas pré-definidas.   
        
        📱 Plataforma 100% gratuita e sem cadastros!
        `);
        
        // Mostrar dica visual focada na prática interativa
        setTimeout(() => {
            this.showTip('Experimente a aba "Prática Interativa" para aprender Músicas conhecidas! 🎵🎹');
        }, 2000);
    }
    
    showTip(message) {
        // 🔇 MODO SILENCIOSO - Apenas registra no SystemLogger
        // Ambiente terapêutico: sem notificações visuais intrusivas
        if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
            SystemLogger.log('info', message);
        }
        console.log('💡', message);
    }
    
    // Método para debug e testes
    debug() {
        return {
            currentTab: this.currentTab,
            currentMelody: this.currentMelody,
            savedMelodies: this.savedMelodies.length,
            engines: {
                audio: !!window.audioEngine,
                songs: !!window.songDatabase,
                game: !!window.gameEngine
            }
        };
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    window.musicTherapyApp = new MusicTherapyApp();
    
    // Inicializar Soundfont Manager
    if (window.audioEngine && window.SoundfontManager) {
        console.log('🎼 Inicializando sistema de instrumentos...');
        window.soundfontManager = new SoundfontManager(window.audioEngine);
        window.audioEngine.setSoundfontManager(window.soundfontManager);

        if (typeof window.CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('soundfont-manager-ready', { detail: window.soundfontManager }));
        } else if (window.document && typeof window.document.createEvent === 'function') {
            const legacyEvent = window.document.createEvent('CustomEvent');
            legacyEvent.initCustomEvent('soundfont-manager-ready', false, false, window.soundfontManager);
            window.dispatchEvent(legacyEvent);
        }

        const keyboardInstance = window.musicTherapyApp && window.musicTherapyApp.virtualKeyboard;
        if (keyboardInstance && typeof keyboardInstance.setSoundfontManager === 'function') {
            keyboardInstance.setSoundfontManager(window.soundfontManager);
        }

        window.musicTherapyApp?.ensureMidiIntegration('soundfont-ready');

        window.audioEngine.onUnlock(() => {
            const context = window.audioEngine.audioContext;
            const player = window.soundfontManager?.player;

            if (!window.instrumentLoader && typeof InstrumentLoader === 'function' && context && player) {
                window.instrumentLoader = new InstrumentLoader(context, player);
            }

            if (!window.effectsManager && typeof EffectsManager === 'function' && context) {
                window.effectsManager = new EffectsManager(context);
                try {
                    window.effectsManager.createChannel('main');
                } catch (error) {
                    console.warn('⚠️ Não foi possível criar canal principal:', error);
                }
            }

            if (!window.chordPlayer && typeof ChordPlayer === 'function' && player && context) {
                window.chordPlayer = new ChordPlayer(player, context);
            }

            if (!window.envelopeGenerator && typeof EnvelopeGenerator === 'function') {
                window.envelopeGenerator = new EnvelopeGenerator();
            }

            if (window.soundfontManager && typeof window.soundfontManager.initializeAdvancedSystems === 'function') {
                window.soundfontManager.initializeAdvancedSystems();
            }

            window.musicTherapyApp?.ensureMidiIntegration('audio-unlock');
            
            // Inicializar painel de status MIDI somente se o container existir
            if (window.MIDIStatusPanel) {
                const midiStatusElement = document.getElementById('midi-status-panel');
                if (midiStatusElement) {
                    window.midiStatusPanel = new MIDIStatusPanel('midi-status-panel');
                    console.log('✅ Painel de status MIDI inicializado');
                } else {
                    console.info('ℹ️ Painel de status MIDI desativado (container ausente no DOM).');
                }
            }
            
            // Inicializar osciloscópio de pitch bend somente se o canvas existir
            if (window.MIDIOscilloscope) {
                const oscilloscopeCanvas = document.getElementById('midi-oscilloscope');
                if (oscilloscopeCanvas) {
                    window.midiOscilloscope = new MIDIOscilloscope('midi-oscilloscope');
                    console.log('✅ Osciloscópio MIDI inicializado');
                } else {
                    console.info('ℹ️ Osciloscópio MIDI desativado (canvas ausente no DOM).');
                }
            }
            
            // ========================================================================
            // INICIALIZAÇÃO ROBUSTA COM DEPENDENCYLOADER
            // ========================================================================
            // Usar DependencyLoader para garantir carregamento correto de todas as dependências
            
            // Criar loader global para ser acessível em outros escopos
            window.appDependencyLoader = window.dependencyLoader || new DependencyLoader({ 
                debug: true,
                maxRetries: 20,      // Aumentar tentativas de 10 para 20
                timeout: 30000,      // Aumentar timeout de 10s para 30s
                initialDelay: 150,   // Aumentar delay inicial de 100ms para 150ms
                maxDelay: 5000       // Aumentar max delay de 3s para 5s
            });
            
            (async () => {
                const loader = window.appDependencyLoader;
                
                try {
                    console.log('🔄 Iniciando carregamento de dependências críticas...');
                    
                    // Aguardar todas as dependências necessárias em paralelo
                    const dependencies = await loader.waitForMultiple([
                        {
                            path: 'CatalogNavigationManager',
                            options: { type: 'function' }
                        },
                        {
                            path: 'catalogManager',
                            options: { 
                                type: 'instance',
                                requiredMethods: ['getCategories', 'generateVariations']
                            }
                        },
                        {
                            path: 'soundfontManager',
                            options: { 
                                type: 'object',  // Mudado de 'instance' para 'object' (mais flexível)
                                requiredMethods: ['loadFromCatalog']  // Removido 'setCurrentInstrument' que não existe
                            }
                        }
                    ]);
                    
                    // ✅ Todas as dependências carregadas com sucesso!
                    console.log('✅ Todas as dependências carregadas com sucesso!');
                    
                    // Instanciar CatalogNavigationManager
                    window.catalogNavigationManager = new dependencies.CatalogNavigationManager(
                        dependencies.catalogManager,
                        dependencies.soundfontManager
                    );
                    
                    console.log('✅ Sistema de navegação por catálogo MIDI inicializado');
                    console.log(`   └─ Instância criada: ${!!window.catalogNavigationManager}`);
                    
                } catch (error) {
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('❌ ERRO CRÍTICO: Falha ao carregar dependências');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error(error);
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    window.catalogNavigationManager = null;
                    
                    // Mostrar relatório de carregamento para diagnóstico
                    loader.printReport();
                }
            })();
            
            // Inicializar seletor de instrumentos e armazenar referência às funções de controle
            // CORREÇÃO: Movido para dentro do listener audioContext.resume() para garantir que
            // o DOM esteja pronto e o catalogNavigationManager já esteja instanciado
            console.log('🎛️ Iniciando configuração do InstrumentSelector...');
            console.log('   ├─ window.instrumentSelector:', typeof window.instrumentSelector);
            console.log('   ├─ window.setupInstrumentSelection:', typeof window.setupInstrumentSelection);
            console.log('   └─ #instrument-grid:', document.getElementById('instrument-grid') ? 'encontrado' : 'NÃO encontrado');
            
            const selectorModule = window.instrumentSelector;
            if (selectorModule && typeof selectorModule.setupInstrumentSelection === 'function') {
                console.log('📞 Chamando window.instrumentSelector.setupInstrumentSelection()...');
                window.instrumentSelectorControls = selectorModule.setupInstrumentSelection();
                
                if (window.instrumentSelectorControls) {
                    console.log('✅ InstrumentSelector inicializado via window.instrumentSelector');
                    console.log('   └─ Tipo do retorno:', typeof window.instrumentSelectorControls);
                } else {
                    console.error('❌ setupInstrumentSelection() retornou null/undefined');
                }
            } else if (typeof window.setupInstrumentSelection === 'function') {
                console.log('📞 Chamando window.setupInstrumentSelection()...');
                window.instrumentSelectorControls = window.setupInstrumentSelection();
                
                if (window.instrumentSelectorControls) {
                    console.log('✅ InstrumentSelector inicializado via window.setupInstrumentSelection');
                    console.log('   └─ Tipo do retorno:', typeof window.instrumentSelectorControls);
                } else {
                    console.error('❌ setupInstrumentSelection() retornou null/undefined');
                }
            } else {
                console.error('❌ Módulo de seletor de instrumentos não encontrado.');
                console.error('   Verifique se o arquivo js/ui/instrumentSelector.js está carregado');
            }
            
            // ========================================================================
            // CONECTAR CATALOGNAVIGATIONMANAGER AO INSTRUMENTSELECTOR
            // ========================================================================
            // Sistema robusto com retry automático usando DependencyLoader
            
            (async () => {
                const loader = window.appDependencyLoader;
                
                try {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🔗 INICIANDO CONEXÃO DE COMPONENTES');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // Diagnóstico: verificar disponibilidade imediata
                    console.log('📊 Diagnóstico de disponibilidade:');
                    console.log(`   ├─ window.catalogNavigationManager: ${typeof window.catalogNavigationManager}`);
                    console.log(`   ├─ window.instrumentSelectorControls: ${typeof window.instrumentSelectorControls}`);
                    console.log(`   └─ window.appDependencyLoader: ${typeof loader}`);
                    
                    if (!loader) {
                        throw new Error('DependencyLoader não está disponível');
                    }
                    
                    // ESTRATÉGIA 1: Verificar se já estão disponíveis (conexão rápida)
                    if (window.catalogNavigationManager && 
                        window.instrumentSelectorControls &&
                        typeof window.catalogNavigationManager.setInstrumentSelectorControls === 'function' &&
                        typeof window.instrumentSelectorControls.getTotalInstruments === 'function') {
                        
                        console.log('✅ Componentes já disponíveis! Conectando imediatamente...');
                        
                        window.catalogNavigationManager.setInstrumentSelectorControls(
                            window.instrumentSelectorControls
                        );
                        
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO! (direto)');
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log(`   ├─ Total de instrumentos: ${window.instrumentSelectorControls.getTotalInstruments()}`);
                        console.log(`   └─ Navegação via MIDI: HABILITADA 🎹`);
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        
                        return; // Conexão feita, sair
                    }
                    
                    // ESTRATÉGIA 2: Aguardar via DependencyLoader
                    console.log('🔄 Componentes não estão prontos. Aguardando via DependencyLoader...');
                    console.log(`   ├─ Timeout: 30 segundos`);
                    console.log(`   └─ Tentativas máximas: 20`);
                    
                    // Aguardar ambos os componentes estarem disponíveis
                    const components = await loader.waitForMultiple([
                        {
                            path: 'catalogNavigationManager',
                            options: {
                                type: 'object',  // Mudado de 'instance' para 'object' (mais flexível)
                                requiredMethods: ['setInstrumentSelectorControls']  // Reduzido para método essencial
                            }
                        },
                        {
                            path: 'instrumentSelectorControls',
                            options: {
                                type: 'object',
                                requiredMethods: ['getTotalInstruments']  // Reduzido para método essencial de validação
                            }
                        }
                    ]);
                    
                    console.log('✅ Componentes encontrados! Conectando...');
                    
                    // ✅ Ambos disponíveis - conectar!
                    components.catalogNavigationManager.setInstrumentSelectorControls(
                        components.instrumentSelectorControls
                    );
                    
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO! (via loader)');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(`   ├─ Total de instrumentos: ${components.instrumentSelectorControls.getTotalInstruments()}`);
                    console.log(`   └─ Navegação via MIDI: HABILITADA 🎹`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // Imprimir relatório de carregamento
                    loader.printReport();
                    
                } catch (error) {
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('❌ ERRO: Falha ao conectar componentes');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.error('📋 Detalhes do erro:');
                    console.error(error);
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.warn('⚠️ Sistema continuará SEM navegação por catálogo via MIDI');
                    console.warn('⚠️ Você ainda pode selecionar instrumentos manualmente pela interface');
                    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // Diagnóstico adicional
                    console.log('🔍 Estado atual dos componentes:');
                    console.log(`   ├─ catalogNavigationManager: ${!!window.catalogNavigationManager}`);
                    console.log(`   ├─ catalogNavigationManager.setInstrumentSelectorControls: ${typeof window.catalogNavigationManager?.setInstrumentSelectorControls}`);
                    console.log(`   ├─ instrumentSelectorControls: ${!!window.instrumentSelectorControls}`);
                    console.log(`   └─ instrumentSelectorControls.getTotalInstruments: ${typeof window.instrumentSelectorControls?.getTotalInstruments}`);
                    
                    // Imprimir relatório para diagnóstico
                    if (loader && typeof loader.printReport === 'function') {
                        console.log('\n📊 Relatório do DependencyLoader:');
                        loader.printReport();
                    }
                    
                    // ESTRATÉGIA 3: Tentar conexão manual como último recurso
                    console.log('\n🔄 Tentando conexão manual como último recurso...');
                    if (window.catalogNavigationManager && 
                        window.instrumentSelectorControls &&
                        typeof window.catalogNavigationManager.setInstrumentSelectorControls === 'function') {
                        try {
                            window.catalogNavigationManager.setInstrumentSelectorControls(
                                window.instrumentSelectorControls
                            );
                            console.log('✅ Conexão manual realizada com sucesso!');
                        } catch (manualError) {
                            console.error('❌ Conexão manual também falhou:', manualError);
                        }
                    } else {
                        console.log('❌ Componentes não estão disponíveis para conexão manual');
                    }
                }
            })();
        });
    }
});

// 🔇 MODO SILENCIOSO - Notificações não-intrusivas para ambiente terapêutico
// Todas as notificações agora vão apenas para o SystemLogger

// Mostrar notificação de mudança de instrumento
function showInstrumentChangeNotification(instrumentName) {
    // 🔇 Apenas registrar no log, sem elementos visuais intrusivos
    if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
        SystemLogger.log('info', `🎼 Instrumento alterado para: ${instrumentName}`);
    }
    console.log(`🎼 Instrumento alterado para: ${instrumentName}`);
}

// Mostrar notificação de erro
function showErrorNotification(message) {
    // 🔇 Apenas registrar no log, sem elementos visuais intrusivos
    if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
        SystemLogger.log('error', message);
    }
    console.error('❌', message);
}

// ==================== CACHE MANAGEMENT ====================

/**
 * Atualiza estatísticas do cache na UI
 */
async function updateCacheStats() {
    const loader = window.instrumentLoader;
    
    if (!loader) {
        console.warn('⚠️ InstrumentLoader não disponível');
        return;
    }
    
    // Estatísticas do cache local (IndexedDB)
    const localStats = await loader.getLocalCacheStats();
    
    // Atualizar elementos da UI
    const cacheCount = document.getElementById('cache-count');
    const cacheSize = document.getElementById('cache-size');
    const cacheHitsRam = document.getElementById('cache-hits-ram');
    const cacheHitsLocal = document.getElementById('cache-hits-local');
    const cacheDownloads = document.getElementById('cache-downloads');
    
    if (localStats) {
        if (cacheCount) cacheCount.textContent = localStats.count;
        if (cacheSize) cacheSize.textContent = loader.localCache.formatBytes(localStats.size);
    } else {
        if (cacheCount) cacheCount.textContent = 'N/A';
        if (cacheSize) cacheSize.textContent = 'N/A';
    }
    
    // Estatísticas de hits/misses
    if (cacheHitsRam) cacheHitsRam.textContent = loader.stats.cacheHits;
    if (cacheHitsLocal) cacheHitsLocal.textContent = loader.stats.localCacheHits || 0;
    if (cacheDownloads) cacheDownloads.textContent = loader.stats.totalDownloads;
}

/**
 * Mostra lista de instrumentos em cache
 */
async function showCachedInstruments() {
    const loader = window.instrumentLoader;
    
    if (!loader || !loader.localCache || !loader.localCache.db) {
        // 🔇 Sem alert intrusivo
        SystemLogger.log('error', 'Cache local não está disponível');
        console.error('❌ Cache local não está disponível');
        return;
    }
    
    const stats = await loader.getLocalCacheStats();
    
    if (!stats || stats.count === 0) {
        // 🔇 Sem alert intrusivo
        SystemLogger.log('info', 'Nenhum instrumento em cache local');
        console.log('ℹ️ Nenhum instrumento em cache local');
        return;
    }
    
    // Registrar no log ao invés de mostrar modal
    let message = `Instrumentos em cache (${stats.count})`;
    SystemLogger.log('info', message);
    
    stats.instruments
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 15)
        .forEach((inst, idx) => {
            const lastAccessed = new Date(inst.lastAccessed);
            const timeAgo = getTimeAgo(lastAccessed);
            console.log(`${idx + 1}. ${inst.name} - ${loader.localCache.formatBytes(inst.size)} | ${inst.accessCount} acessos | ${timeAgo}`);
        });
    
    if (stats.count > 15) {
        console.log(`... e mais ${stats.count - 15} instrumentos`);
    }
}

/**
 * Limpa cache local
 */
async function clearLocalCache() {
    const loader = window.instrumentLoader;
    
    if (!loader || !loader.localCache || !loader.localCache.db) {
        // 🔇 Sem alert intrusivo
        SystemLogger.log('error', 'Cache local não está disponível');
        console.error('❌ Cache local não está disponível');
        return;
    }
    
    // 🔇 Confirmação silenciosa - apenas executar
    const success = await loader.clearLocalCache();
    
    if (success) {
        SystemLogger.log('success', 'Cache local limpo com sucesso! Os instrumentos serão baixados novamente quando necessário');
        await updateCacheStats();
    } else {
        SystemLogger.log('error', 'Erro ao limpar cache local');
    }
}

/**
 * Calcula tempo decorrido desde uma data
 */
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
}

// Event listeners para botões de cache
document.getElementById('refresh-cache-stats')?.addEventListener('click', updateCacheStats);
document.getElementById('view-cached-instruments')?.addEventListener('click', showCachedInstruments);
document.getElementById('clear-local-cache')?.addEventListener('click', clearLocalCache);

// Atualizar estatísticas automaticamente a cada 5 segundos
setInterval(() => {
    if (window.instrumentLoader && window.instrumentLoader.localCache) {
        updateCacheStats();
    }
}, 5000);

// 📊 Cache Manager Helper - Comunicação com Service Worker
class CacheManagerHelper {
    constructor() {
        this.registration = null;
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
                if (event.data.success) {
                    resolve(event.data);
                } else {
                    reject(new Error(event.data.error || 'Erro desconhecido'));
                }
            };

            navigator.serviceWorker.controller.postMessage(
                { type, data },
                [messageChannel.port2]
            );
        });
    }

    /**
     * Obtém estatísticas do cache
     */
    async getCacheStats() {
        try {
            const response = await this.sendMessage('GET_CACHE_STATS');
            return response;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }

    /**
     * Solicita limpeza do cache
     */
    async cleanupCache(requiredSpace = 0) {
        try {
            const response = await this.sendMessage('CLEANUP_CACHE', { requiredSpace });
            console.log('✅ Limpeza concluída:', response.message);
            return response;
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
            return null;
        }
    }

    /**
     * Marca instrumento como favorito (protegido de remoção)
     */
    async protectFavorite(instrumentName) {
        try {
            await this.sendMessage('PROTECT_FAVORITE', { instrumentName });
            console.log('⭐ Favorito protegido:', instrumentName);
            return true;
        } catch (error) {
            console.error('❌ Erro ao proteger favorito:', error);
            return false;
        }
    }

    /**
     * Monitora quota de armazenamento e alerta usuário
     * VERSÃO SILENCIOSA - Não cria notificações intrusivas
     */
    async monitorStorage() {
        const stats = await this.getCacheStats();
        
        if (stats && stats.quota) {
            const percentUsed = (stats.quota.usage / stats.quota.quota) * 100;
            
            // Log silencioso no console
            console.log(`💾 Armazenamento: ${this.formatBytes(stats.quota.usage)} / ${this.formatBytes(stats.quota.quota)} (${percentUsed.toFixed(1)}%)`);
            
            // Registrar no sistema de logs (não intrusivo)
            if (percentUsed > 95) {
                SystemLogger.log('critical', `Armazenamento crítico: ${percentUsed.toFixed(1)}%`);
                await this.cleanupCache();
            } else if (percentUsed > 90) {
                SystemLogger.log('warn', `Armazenamento alto: ${percentUsed.toFixed(1)}%`);
            } else if (percentUsed > 80) {
                SystemLogger.log('info', `Armazenamento: ${percentUsed.toFixed(1)}%`);
            }

            // Atualizar indicador de status (discreto)
            this.updateStatusIndicator(percentUsed);
        }
        
        return stats;
    }

    /**
     * Atualiza indicador discreto de status
     */
    updateStatusIndicator(percentUsed) {
        const statusDot = document.getElementById('status-dot');
        if (!statusDot) return;

        if (percentUsed > 95) {
            statusDot.className = 'status-dot error';
        } else if (percentUsed > 90) {
            statusDot.className = 'status-dot warning';
        } else {
            statusDot.className = 'status-dot';
        }
    }

    /**
     * [REMOVIDO] Exibe alerta de armazenamento
     * Substituído por sistema de logs não intrusivo
     */
    showStorageAlert(level, percentUsed) {
        // Apenas log no console - SEM notificações visuais
        const messages = {
            critical: `⚠️ CRÍTICO: Armazenamento em ${percentUsed.toFixed(1)}%! Limpeza automática iniciada.`,
            warning: `⚠️ AVISO: Armazenamento em ${percentUsed.toFixed(1)}%. Considere limpar cache.`,
            info: `ℹ️ INFO: Armazenamento em ${percentUsed.toFixed(1)}%. Monitorando...`
        };

        console.warn(messages[level]);
        SystemLogger.log(level === 'critical' ? 'error' : level === 'warning' ? 'warn' : 'info', messages[level]);
    }

    /**
     * [DESABILITADO] Cria notificação visual de armazenamento
     * Função desabilitada para ambientes terapêuticos
     * Substituída por sistema de logs discreto
     */
    createStorageNotification(message, level) {
        // DESABILITADO: Notificações visuais são intrusivas em ambientes terapêuticos
        // Em vez disso, apenas registra no SystemLogger
        SystemLogger.log(level === 'critical' ? 'error' : level === 'warning' ? 'warn' : 'info', message);
        
        // Atualiza indicador de status (discreto no canto)
        const statusDot = document.getElementById('status-dot');
        if (statusDot) {
            if (level === 'critical') {
                statusDot.className = 'status-dot error';
            } else if (level === 'warning') {
                statusDot.className = 'status-dot warning';
            }
        }
    }

    /**
     * Formata bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

// Instância global do Cache Manager Helper
const cacheManagerHelper = new CacheManagerHelper();

// Registrar Service Worker para funcionalidade offline e cache
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 🔄 NOVO: Iniciar reconexão automática de MIDI após carregamento da página
        console.log('📍 Evento window.load disparado');
        
        // Aguardar um breve período para permitir que todos os módulos estejam carregados
        setTimeout(() => {
            console.log('⏳ Iniciando reconexão automática de MIDI...');
            if (window.midiManager && typeof window.midiManager.autoReconnect === 'function') {
                console.log("🔄 Chamando midiManager.autoReconnect('window-load')");
                window.midiManager.autoReconnect('window-load').catch(error => {
                    console.warn('⚠️ autoReconnect falhou:', error);
                });
            } else {
                console.warn('⚠️ midiManager.autoReconnect não disponível');
            }
        }, 500); // Esperar 500ms para garantir carregamento de módulos
        
        // Detectar caminho correto do Service Worker baseado no contexto (GitHub Pages ou localhost)
        const pathname = window.location.pathname;
        const swPath = pathname.includes('/TerraMidi') ? '/TerraMidi/sw.js' : '/sw.js';
        
        navigator.serviceWorker.register(swPath)
            .then(registration => {
                console.log('✅ Service Worker v4.0 registrado:', registration.scope);
                cacheManagerHelper.registration = registration;

                // Monitorar storage a cada 5 minutos
                setInterval(() => {
                    cacheManagerHelper.monitorStorage();
                }, 5 * 60 * 1000);

                // Monitoramento inicial após 10 segundos
                setTimeout(() => {
                    cacheManagerHelper.monitorStorage();
                }, 10000);

                // Listener para atualizações do SW
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Nova versão do Service Worker detectada');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('✅ Nova versão instalada. Recarregue a página para atualizar.');
                            
                            // Notificar usuário de forma discreta (sem confirm intrusivo)
                            SystemLogger.log('info', 'Nova versão disponível! Recarregue a página quando conveniente.');
                            if (statusDot) {
                                statusDot.className = 'status-dot warning';
                                statusDot.title = 'Nova versão disponível - Recarregue a página';
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.warn('⚠️ Falha ao registrar Service Worker:', error);
                SystemLogger.log('error', 'Falha ao registrar Service Worker: ' + error.message);
            });
    });
}

// ========================================
// 📋 Sistema de Log Silencioso e Discreto
// Para ambientes terapêuticos com autistas
// ========================================

class SystemLogger {
    static logs = [];
    static maxLogs = 100;

    /**
     * Registra mensagem no sistema de logs
     */
    static log(type, message) {
        const timestamp = new Date();
        const entry = {
            type, // 'info', 'warn', 'error', 'success'
            message,
            timestamp,
            timeString: timestamp.toLocaleTimeString('pt-BR')
        };

        this.logs.unshift(entry); // Adiciona no início
        if (this.logs.length > this.maxLogs) {
            this.logs.pop(); // Remove o mais antigo
        }

        // Atualizar UI se painel estiver aberto
        this.updateLogPanel();

        // Console (não intrusivo)
        const emoji = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            success: '✅'
        };
        console.log(`${emoji[type] || '📋'} [${entry.timeString}] ${message}`);
    }

    /**
     * Atualiza painel de logs
     */
    static updateLogPanel() {
        const logContent = document.getElementById('log-panel-content');
        if (!logContent) return;

        // Obter filtros ativos
        const filterInfo = document.getElementById('filter-info')?.checked ?? true;
        const filterWarn = document.getElementById('filter-warn')?.checked ?? true;
        const filterError = document.getElementById('filter-error')?.checked ?? true;

        // Filtrar logs
        const filteredLogs = this.logs.filter(log => {
            if (log.type === 'info' && !filterInfo) return false;
            if (log.type === 'warn' && !filterWarn) return false;
            if (log.type === 'error' && !filterError) return false;
            return true;
        });

        // Renderizar logs
        if (filteredLogs.length === 0) {
            logContent.innerHTML = `
                <div class="log-empty">
                    <span>📋</span>
                    <p>Nenhum log corresponde aos filtros</p>
                </div>
            `;
        } else {
            logContent.innerHTML = filteredLogs.map(log => `
                <div class="log-entry ${log.type}">
                    <div class="log-timestamp">${log.timeString}</div>
                    <div class="log-message">${log.message}</div>
                </div>
            `).join('');
        }
    }

    /**
     * Limpa todos os logs
     */
    static clearLogs() {
        this.logs = [];
        this.updateLogPanel();
    }

    /**
     * Exporta logs como texto
     */
    static exportLogs() {
        const text = this.logs.map(log => 
            `[${log.timeString}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terra-midi-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.log('success', 'Logs exportados com sucesso');
    }
}

// ========================================
// 🔧 Inicialização do Sistema de UI
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    SystemLogger.log('info', 'Sistema Terra MIDI iniciado');

    // 🔄 NOVO: Listener para reconectar MIDI quando a aba fica visível
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('👁️ Aba ficou visível - Verificando conexão MIDI');
            if (window.midiManager && typeof window.midiManager.autoReconnect === 'function') {
                console.log('🔄 Chamando midiManager.autoReconnect("visibilitychange")');
                window.midiManager.autoReconnect('visibilitychange').catch(error => {
                    console.warn('⚠️ autoReconnect falhou:', error);
                });
            }
        }
    });

    // Abrir/Fechar painel de logs
    const statusIndicator = document.getElementById('system-status-indicator');
    const logPanel = document.getElementById('system-log-panel');
    const closeButton = document.getElementById('close-log-panel');

    if (statusIndicator && logPanel) {
        statusIndicator.addEventListener('click', () => {
            const isVisible = logPanel.style.display !== 'none';
            logPanel.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible) {
                SystemLogger.updateLogPanel();
                updateSystemStats();
            }
        });
    }

    if (closeButton && logPanel) {
        closeButton.addEventListener('click', () => {
            logPanel.style.display = 'none';
        });
    }

    // Botões de ação do painel
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const btnExportLogs = document.getElementById('btn-export-logs');
    const btnRefreshStats = document.getElementById('btn-refresh-stats');

    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            // 🔇 Sem confirm intrusivo - limpar diretamente
            SystemLogger.clearLogs();
            SystemLogger.log('info', 'Logs limpos com sucesso');
        });
    }

    if (btnExportLogs) {
        btnExportLogs.addEventListener('click', () => {
            SystemLogger.exportLogs();
        });
    }

    if (btnRefreshStats) {
        btnRefreshStats.addEventListener('click', () => {
            updateSystemStats();
            SystemLogger.log('info', 'Estatísticas atualizadas');
        });
    }

    // Filtros de log
    const filterInfo = document.getElementById('filter-info');
    const filterWarn = document.getElementById('filter-warn');
    const filterError = document.getElementById('filter-error');

    [filterInfo, filterWarn, filterError].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                SystemLogger.updateLogPanel();
            });
        }
    });

    // Atualizar stats inicialmente
    setTimeout(() => {
        updateSystemStats();
    }, 2000);
});

/**
 * Atualiza estatísticas do sistema no painel
 */
async function updateSystemStats() {
    try {
        const stats = await cacheManagerHelper.getCacheStats();
        
        if (stats) {
            document.getElementById('stat-cache-size').textContent = 
                cacheManagerHelper.formatBytes(stats.stats.totalSize);
            
            document.getElementById('stat-soundfont-count').textContent = 
                stats.stats.soundfontCount;
            
            const percentUsed = (stats.quota.usage / stats.quota.quota * 100).toFixed(1);
            document.getElementById('stat-quota-percent').textContent = `${percentUsed}%`;
            
            // Status do sistema
            const statusEl = document.getElementById('stat-system-status');
            if (percentUsed > 95) {
                statusEl.textContent = 'CRÍTICO';
                statusEl.style.color = '#F44336';
            } else if (percentUsed > 90) {
                statusEl.textContent = 'ALERTA';
                statusEl.style.color = '#FFC107';
            } else {
                statusEl.textContent = 'OK';
                statusEl.style.color = '#4CAF50';
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
        SystemLogger.log('error', 'Falha ao atualizar estatísticas');
    }
}

// 🧠 Funções Globais para Console - HybridCache
window.showHybridCacheStats = async function() {
    if (!window.instrumentLoader) {
        console.error('❌ InstrumentLoader não disponível');
        return;
    }
    
    const stats = await window.instrumentLoader.getHybridCacheStats();
    const info = await window.instrumentLoader.getHybridCacheSystemInfo();
    
    if (!stats || !info) {
        console.warn('⚠️ HybridCache não disponível');
        return;
    }
    
    console.log('═══════════════════════════════════════');
    console.log('🧠 ESTATÍSTICAS DO CACHE HÍBRIDO');
    console.log('═══════════════════════════════════════');
    console.log(`📱 Plataforma: ${info.platform}`);
    console.log(`💾 Método: ${info.method}`);
    console.log(`✅ Suporte: ${JSON.stringify(info.supports, null, 2)}`);
    console.log('');
    console.log(`📂 Arquivos salvos: ${stats.filesCount}`);
    console.log(`💿 Tamanho total: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`✅ Cache hits: ${stats.cacheHits}`);
    console.log(`❌ Cache misses: ${stats.cacheMisses}`);
    
    if (stats.quota) {
        const percentUsed = ((stats.quota.usage / stats.quota.quota) * 100).toFixed(1);
        console.log(`📊 Quota: ${(stats.quota.usage / (1024 * 1024)).toFixed(2)} MB / ${(stats.quota.quota / (1024 * 1024)).toFixed(2)} MB (${percentUsed}%)`);
    }
    
    console.log('═══════════════════════════════════════');
    console.log('💡 Use showHybridCacheFiles() para ver arquivos salvos');
};

window.showHybridCacheFiles = async function() {
    if (!window.instrumentLoader || !window.instrumentLoader.hybridCache) {
        console.error('❌ HybridCache não disponível');
        return;
    }
    
    const stats = await window.instrumentLoader.getHybridCacheStats();
    
    if (!stats || !stats.files || stats.files.length === 0) {
        console.log('📂 Nenhum arquivo no cache');
        return;
    }
    
    console.log('═══════════════════════════════════════');
    console.log('📂 ARQUIVOS NO HYBRID CACHE');
    console.log('═══════════════════════════════════════');
    
    stats.files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.filename}`);
        console.log(`   💿 Tamanho: ${(file.size / 1024).toFixed(1)} KB`);
        console.log(`   📅 Salvo em: ${new Date(file.timestamp).toLocaleString('pt-BR')}`);
        console.log('');
    });
    
    console.log('═══════════════════════════════════════');
};