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
            this.setupTabs();
            // this.setupMelodyControls(); // Comentado: aba de gerador de melodias removida (IA mantida para prática interativa)
            this.setupKeyboard();
            this.setupPresetMelodies();
            this.setupPracticeControls();
            this.setupChordToggle();
            this.loadSavedMelodies();
            
            // Define o modo de jogo padrão
            this.setDefaultGameMode();
            
            // Instrumentos sintéticos desabilitados
            // await this.initSyntheticInstruments();
            
            this.updateTabState(this.currentTab);
            this.showWelcomeMessage();
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
            stopPractice: document.getElementById('stop-practice'),

            // Controles MIDI em tempo real
            chordToggle: document.getElementById('chord-toggle')
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
                audioEngine: globalThis.audioEngine
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
            alert('Nenhuma melodia para salvar.');
            return;
        }
        
        const name = prompt('Digite um nome para a melodia:', `Melodia ${new Date().toLocaleString()}`);
        if (!name) return;
        
        // Salvamento removido - sistema simplificado
        alert('Funcionalidade de salvamento removida - use as músicas pré-cadastradas!');
    }
    
    useInPractice() {
        if (!this.currentMelody) {
            alert('Nenhuma melodia para usar na prática.');
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
        // Criar tooltip temporário
        const tip = document.createElement('div');
        tip.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
            animation: slideIn 0.5s ease-out;
        `;
        
        tip.innerHTML = `💡 ${message}`;
        document.body.appendChild(tip);
        
        // Remover após 5 segundos
        setTimeout(() => {
            tip.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => tip.remove(), 500);
        }, 5000);
        
        // Adicionar estilos de animação se não existirem
        if (!document.querySelector('#tip-animations')) {
            const style = document.createElement('style');
            style.id = 'tip-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
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
            
            // Inicializar painel de status MIDI
            if (window.MIDIStatusPanel) {
                window.midiStatusPanel = new MIDIStatusPanel('midi-status-panel');
                console.log('✅ Painel de status MIDI inicializado');
            }
            
            // Inicializar osciloscópio de pitch bend
            if (window.MIDIOscilloscope) {
                window.midiOscilloscope = new MIDIOscilloscope('midi-oscilloscope');
                console.log('✅ Osciloscópio MIDI inicializado');
            }
        });

        const selectorModule = window.instrumentSelector;
        if (selectorModule && typeof selectorModule.setupInstrumentSelection === 'function') {
            selectorModule.setupInstrumentSelection();
        } else if (typeof window.setupInstrumentSelection === 'function') {
            window.setupInstrumentSelection();
        } else {
            console.warn('⚠️ Módulo de seletor de instrumentos não encontrado.');
        }
    }
});


// Mostrar notificação de mudança de instrumento
function showInstrumentChangeNotification(instrumentName) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'instrument-notification';
    notification.innerHTML = `
        <div class="notification-content">
            🎼 Instrumento alterado para: <strong>${instrumentName}</strong>
        </div>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-size: 0.9em;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Mostrar notificação de erro
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <div class="notification-content">
            ❌ ${message}
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-size: 0.9em;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
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
        alert('❌ Cache local não está disponível.');
        return;
    }
    
    const stats = await loader.getLocalCacheStats();
    
    if (!stats || stats.count === 0) {
        alert('ℹ️ Nenhum instrumento em cache local.');
        return;
    }
    
    // Criar modal com lista de instrumentos
    let message = `📋 Instrumentos em cache (${stats.count}):\n\n`;
    
    stats.instruments
        .sort((a, b) => b.accessCount - a.accessCount) // Ordenar por mais acessados
        .slice(0, 15) // Limitar a 15 instrumentos
        .forEach((inst, idx) => {
            const lastAccessed = new Date(inst.lastAccessed);
            const timeAgo = getTimeAgo(lastAccessed);
            message += `${idx + 1}. ${inst.name}\n`;
            message += `   💾 ${loader.localCache.formatBytes(inst.size)} | 🔄 ${inst.accessCount} acessos | ⏱️ ${timeAgo}\n\n`;
        });
    
    if (stats.count > 15) {
        message += `\n... e mais ${stats.count - 15} instrumentos`;
    }
    
    alert(message);
}

/**
 * Limpa cache local
 */
async function clearLocalCache() {
    const loader = window.instrumentLoader;
    
    if (!loader || !loader.localCache || !loader.localCache.db) {
        alert('❌ Cache local não está disponível.');
        return;
    }
    
    const confirmed = confirm('⚠️ Tem certeza que deseja limpar todo o cache local?\n\nIsso irá remover todos os instrumentos baixados do armazenamento local.');
    
    if (!confirmed) return;
    
    const success = await loader.clearLocalCache();
    
    if (success) {
        alert('✅ Cache local limpo com sucesso!\n\nOs instrumentos serão baixados novamente quando necessário.');
        await updateCacheStats();
    } else {
        alert('❌ Erro ao limpar cache local.');
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

// Registrar Service Worker para funcionalidade offline e cache
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registrado:', registration.scope);
            })
            .catch(error => {
                console.warn('⚠️ Falha ao registrar Service Worker:', error);
            });
    });
}