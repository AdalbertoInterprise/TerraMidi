(function() {
    'use strict';

    const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];

    const MIDI_STATUS = {
        NOTE_OFF: 0x80,
        NOTE_ON: 0x90
    };

    // Mapeamento de notas MIDI (60-72) para notação do jogo
    const MIDI_TO_GAME_NOTE = {
        60: 'C',   // C4
        62: 'D',   // D4
        64: 'E',   // E4
        65: 'F',   // F4
        67: 'G',   // G4
        69: 'A',   // A4
        71: 'B',   // B4
        72: 'C2'   // C5
    };

    // Conversão por classe de altura (pitch class) para notas-alvo
    const MIDI_PITCHCLASS_TO_NOTE = {
        0: 'C',   // C
        2: 'D',   // D
        4: 'E',   // E
        5: 'F',   // F
        7: 'G',   // G
        9: 'A',   // A
        11: 'B'   // B
    };

    const NOTE_TO_PITCHCLASS = {
        'C': 0,
        'C2': 0,
        'D': 2,
        'E': 4,
        'F': 5,
        'G': 7,
        'A': 9,
        'B': 11
    };
    
    const NOTE_COLORS = {
        'C': '#e53935',    // Vermelho vibrante
        'D': '#ff6f00',    // Laranja forte
        'E': '#fdd835',    // Amarelo brilhante
        'F': '#43a047',    // Verde intenso
        'G': '#1e88e5',    // Azul royal
        'A': '#5e35b1',    // Roxo profundo
        'B': '#8e24aa',    // Violeta rico
        'C2': '#e53935'    // Vermelho vibrante (mesma cor do C)
    };

    const DIFFICULTIES = {
        easy: {
            label: 'Fácil',
            bpmRange: [40, 80],
            musicPath: 'src/assets/musics/easy/',
            fallbackDuration: 300,
            fallbackBalloons: 100
        },
        medium: {
            label: 'Médio',
            bpmRange: [80, 110],
            musicPath: 'src/assets/musics/medium/',
            fallbackDuration: 240,
            fallbackBalloons: 100
        },
        hard: {
            label: 'Difícil',
            bpmRange: [110, 160],
            musicPath: 'src/assets/musics/hard/',
            fallbackDuration: 180,
            fallbackBalloons: 100
        }
    };

    class TerraGame {
        constructor() {
            this.elements = {};
            this.state = this.createInitialState();
            this.activeBalloons = new Map();
            this.effects = {
                successInstrument: null,
                errorInstrument: null
            };
            this.patientManager = null;
            this.patientPanel = null;
            this.soundfontManager = null;
            this.spawnTimer = null;
            this.nextBalloonDue = null;
            this.resumeTimeout = null;
            this.overlayGuardInterval = null;
            this.overlayStyleObserver = null;
            this.backdropObserver = null;
            this.musicScheduler = null;
            
            // Novos: Sistema de músicas MIDI
            this.musicSequence = null;
            this.musicIndex = 0;
            this.currentMusicName = '';
            this.selectedInstrument = 'default';
            this.selectedMusicFile = null;
            this.availableMusics = { easy: [], medium: [], hard: [] };
            this.midiInputActive = false;
            this.midiAccess = null;
            this.midiInputs = new Map();
            this.connectedMidiDevices = new Set();
            this.midiNoteCooldowns = new Map();
            this.midiActivityTimeout = null;
            this.stagePulseTimeout = null;
            this.targetPulseTimeout = null;
            
            // Sistema de partículas para explosões
            this.particleCanvas = null;
            this.particleCtx = null;
            this.particles = [];
            this.animationFrameId = null;

            this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
            this.preventUnload = this.preventUnload.bind(this);
            this.animateParticles = this.animateParticles.bind(this);
            this.handleMIDIMessage = this.handleMIDIMessage.bind(this);
        }

        init() {
            this.cacheDom();
            if (!this.elements.launchButton || !this.elements.overlay) {
                return;
            }

            this.updateMIDIStatusUI('disconnected');

            this.patientManager = window.patientManager || null;
            this.initPatientPanel();
            this.refreshPatients();
            this.bindEvents();
            this.bindSoundfontManager();
            this.initParticleSystem();
            this.initMIDIInput();
            this.loadAvailableMusics();
            this.populateInstrumentSelect();
            
            // CRITICAL: Garantir estado inicial correto (apenas setup visível)
            this.updateSetupVisibility({ setup: true });
            
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            window.addEventListener('terra-midi:patients-updated', () => {
                this.refreshPatients();
            });
        }

        cacheDom() {
            this.elements.launchButton = document.getElementById('terra-game-launch');
            this.elements.overlay = document.getElementById('terra-game-overlay');
            this.elements.setup = document.getElementById('terra-game-setup');
            this.elements.session = document.getElementById('terra-game-session');
            this.elements.finish = document.getElementById('terra-game-finish');
            this.elements.midiIndicator = document.getElementById('terra-game-midi-indicator');
            this.elements.patientSelect = document.getElementById('terra-game-patient');
            this.elements.musicSelect = document.getElementById('terra-game-music-select');
            this.elements.instrumentSelect = document.getElementById('terra-game-instrument-select');
            this.elements.setupFeedback = document.getElementById('terra-game-setup-feedback');
            this.elements.startButton = document.getElementById('terra-game-start');
            this.elements.closeButton = document.getElementById('terra-game-exit');
            this.elements.stage = document.getElementById('terra-game-stage');
            this.elements.stats = {
                patient: document.getElementById('terra-game-patient-name'),
                difficulty: document.getElementById('terra-game-difficulty-badge'),
                hits: document.getElementById('terra-game-hits'),
                misses: document.getElementById('terra-game-misses'),
                remaining: document.getElementById('terra-game-remaining'),
                streak: document.getElementById('terra-game-streak'),
                target: document.getElementById('terra-game-target')
            };
            this.elements.controls = {
                container: document.querySelector('.terra-game-controls'),
                pause: document.getElementById('terra-game-pause'),
                resume: document.getElementById('terra-game-resume'),
                difficulty: document.getElementById('terra-game-difficulty')
            };
            this.elements.finishSummary = document.getElementById('terra-game-finish-summary');
            this.elements.finishRestart = document.getElementById('terra-game-restart');
            this.elements.finishExit = document.querySelector('.terra-game-exit-finish');
        }

        refreshPatients({ preserveSelection = true, selectPatientId = null } = {}) {
            if (!this.elements.patientSelect) {
                return;
            }

            const select = this.elements.patientSelect;
            const previousValue = preserveSelection ? select.value : '';

            select.innerHTML = '';

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Selecione um paciente...';
            select.appendChild(placeholder);

            const manager = this.patientManager || window.patientManager;
            const list = manager && typeof manager.getAllPatients === 'function'
                ? manager.getAllPatients()
                : [];

            list.forEach((patient) => {
                if (!patient?.id) {
                    return;
                }
                const option = document.createElement('option');
                option.value = patient.id;
                option.textContent = patient.fullName || 'Paciente sem identificação';
                select.appendChild(option);
            });

            const target = selectPatientId || (preserveSelection ? previousValue : '');
            if (target && list.some((patient) => patient.id === target)) {
                select.value = target;
            } else {
                select.value = '';
            }

            if (!list.length) {
                this.displaySetupFeedback('Cadastre ou importe pacientes para liberar o Terra Game.', 'info');
            }
        }

        bindEvents() {
            if (this.elements.launchButton) {
                this.elements.launchButton.addEventListener('click', () => {
                    this.openOverlay();
                });
            }

            if (this.elements.closeButton) {
                this.elements.closeButton.addEventListener('click', () => {
                    this.closeOverlay();
                });
            }

            if (this.elements.startButton) {
                this.elements.startButton.addEventListener('click', () => {
                    this.startGame();
                });
            }

            if (this.elements.patientSelect) {
                this.elements.patientSelect.addEventListener('change', (event) => {
                    this.handlePatientSelectChange(event.target.value);
                });
            }

            if (this.elements.musicSelect) {
                this.elements.musicSelect.addEventListener('change', (event) => {
                    this.selectedMusicFile = event.target.value || null;
                });
            }

            if (this.elements.instrumentSelect) {
                this.elements.instrumentSelect.addEventListener('change', (event) => {
                    this.selectedInstrument = event.target.value;
                    if (this.selectedInstrument !== 'default') {
                        this.preloadInstrument(this.selectedInstrument);
                    }
                });
            }

            if (this.elements.controls.pause) {
                this.elements.controls.pause.addEventListener('click', () => {
                    this.pauseGame();
                });
            }

            if (this.elements.controls.resume) {
                this.elements.controls.resume.addEventListener('click', () => {
                    this.resumeGame();
                });
            }

            if (this.elements.controls.difficulty) {
                this.elements.controls.difficulty.addEventListener('change', (event) => {
                    this.changeDifficulty(event.target.value);
                });
            }

            if (this.elements.finishRestart) {
                this.elements.finishRestart.addEventListener('click', () => {
                    this.resetToSetup();
                });
            }

            if (this.elements.finishExit) {
                this.elements.finishExit.addEventListener('click', () => {
                    this.closeOverlay();
                });
            }
            
            // CRITICAL: Interceptar eventos do módulo de pacientes
            this.monitorPatientModuleInteractions();
        }

        /**
         * Monitora interações com módulo de pacientes para manter Terra Game visível
         */
        monitorPatientModuleInteractions() {
            // Listener para quando cadastro/importação de paciente completar
            window.addEventListener('terra-midi:patients-updated', () => {
                if (!this.elements.overlay?.hidden) {
                    console.log('✅ TerraGame: Paciente atualizado, reforçando overlay...');
                    this.reinforceOverlayStyle();
                    this.refreshPatients({ preserveSelection: true });
                }
            });
            
            // Listener para quando módulo de pacientes abrir (prevenir conflito de fullscreen)
            document.addEventListener('click', (event) => {
                const patientButton = event.target.closest('#btn-patient-module, #patient-import, #patient-export');
                if (patientButton && !this.elements.overlay?.hidden) {
                    console.log('⚠️ TerraGame: Modal de pacientes detectado, mantendo overlay...');
                    // Agendar reforço após o modal abrir
                    setTimeout(() => {
                        this.reinforceOverlayStyle();
                        this.ensureOverlayAboveBackdrops();
                        this.adjustPatientModuleContext();
                    }, 100);
                }
            });
        }

        /**
         * Ajusta contexto de renderização do módulo de pacientes para dentro do overlay
         */
        adjustPatientModuleContext() {
            if (this.elements.overlay?.hidden) return;

            const patientModule = document.getElementById('patient-module');
            const patientBackdrop = document.getElementById('patient-module-backdrop');

            if (patientModule && !patientModule.hidden) {
                // Forçar modal de pacientes a ficar visível dentro do Terra Game overlay
                patientModule.style.zIndex = '100000'; // Acima do overlay do Terra Game
                console.log('✅ TerraGame: Modal de pacientes ajustado para contexto do jogo');
            }

            if (patientBackdrop && !patientBackdrop.hidden) {
                // Forçar backdrop a ficar entre overlay e modal
                patientBackdrop.style.zIndex = '99998'; // Abaixo do overlay do Terra Game
            }
        }

        bindSoundfontManager() {
            if (window.soundfontManager) {
                this.attachSoundfontManager(window.soundfontManager);
            } else {
                window.addEventListener('soundfont-manager-ready', (event) => {
                    if (event?.detail) {
                        this.attachSoundfontManager(event.detail);
                    }
                }, { once: true });
            }
        }

        attachSoundfontManager(manager) {
            if (!manager || this.soundfontManager === manager) {
                return;
            }

            this.soundfontManager = manager;
            this.prepareEffectInstruments();
        }

        /**
         * Inicializa Web MIDI API para input do board bells
         */
        async initMIDIInput() {
            if (!navigator.requestMIDIAccess) {
                console.warn('TerraGame: Web MIDI API não suportada neste navegador');
                this.updateMIDIStatusUI('unsupported');
                return;
            }

            try {
                this.updateMIDIStatusUI('pending');
                const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
                this.midiAccess = midiAccess;
                console.log('✅ TerraGame: Web MIDI API conectada');

                if (midiAccess.inputs && midiAccess.inputs.size > 0) {
                    midiAccess.inputs.forEach((input) => {
                        this.registerMIDIInput(input);
                    });
                } else {
                    this.updateMIDIStatusUI('ready');
                }

                midiAccess.onstatechange = (event) => {
                    this.handleMIDIPortStateChange(event);
                };

                this.midiInputActive = true;
            } catch (error) {
                console.warn('TerraGame: Erro ao acessar MIDI:', error.message);
                this.updateMIDIStatusUI('error', error?.message || 'Não foi possível acessar o MIDI');
            }
        }

        registerMIDIInput(input) {
            if (!input) {
                return;
            }

            const id = input.id || input.name || `input-${performance.now()}`;
            const name = input.name || `Dispositivo ${this.midiInputs.size + 1}`;

            // Evitar múltiplos registros do mesmo dispositivo
            if (this.midiInputs.has(id)) {
                const entry = this.midiInputs.get(id);
                entry.input.onmidimessage = this.handleMIDIMessage;
                return;
            }

            input.onmidimessage = this.handleMIDIMessage;
            this.midiInputs.set(id, { input, name });
            this.connectedMidiDevices.add(name);
            this.midiInputActive = true;
            console.log(`🎹 MIDI Input ativo: ${name}`);
            this.updateMIDIStatusUI('connected');
        }

        unregisterMIDIInput(port) {
            if (!port) {
                return;
            }

            const id = typeof port === 'string' ? port : port.id;
            const entry = this.midiInputs.get(id);

            if (entry) {
                entry.input.onmidimessage = null;
                this.connectedMidiDevices.delete(entry.name);
                this.midiInputs.delete(id);
                console.log(`🎹 MIDI Input removido: ${entry.name}`);
            }

            this.midiInputActive = this.midiInputs.size > 0;
            this.updateMIDIStatusUI();
        }

        handleMIDIPortStateChange(event) {
            if (!event?.port || event.port.type !== 'input') {
                return;
            }

            const { port } = event;
            if (port.state === 'connected') {
                const input = this.midiAccess?.inputs?.get(port.id) || port;
                this.registerMIDIInput(input);
            } else if (port.state === 'disconnected') {
                this.unregisterMIDIInput(port);
            }
        }

        getConnectedMIDINames() {
            return Array.from(this.connectedMidiDevices.values()).filter(Boolean);
        }

        updateMIDIStatusUI(statusOverride = null, detail = '') {
            const indicator = this.elements.midiIndicator;
            let status = statusOverride;

            if (!status) {
                if (this.connectedMidiDevices.size > 0) {
                    status = 'connected';
                } else if (this.midiAccess) {
                    status = 'ready';
                } else {
                    status = 'disconnected';
                }
            }

            if (indicator) {
                indicator.dataset.status = status;

                switch (status) {
                    case 'connected':
                        {
                            const names = this.getConnectedMIDINames();
                            const label = names.length ? names.join(', ') : 'Dispositivo ativo';
                            indicator.textContent = `MIDI conectado · ${label}`;
                        }
                        break;
                    case 'ready':
                        indicator.textContent = 'MIDI pronto · aguardando notas';
                        break;
                    case 'pending':
                        indicator.textContent = 'Solicitando acesso MIDI…';
                        break;
                    case 'unsupported':
                        indicator.textContent = 'MIDI não suportado no navegador';
                        break;
                    case 'error':
                        indicator.textContent = detail || 'Erro ao inicializar o MIDI';
                        break;
                    default:
                        indicator.textContent = 'MIDI inativo';
                        break;
                }
            }

            if (this.elements.overlay) {
                this.elements.overlay.dataset.midiStatus = status;
            }
        }

        flagMidiActivity(noteLabel, midiNote, { matched = true } = {}) {
            const indicator = this.elements.midiIndicator;
            if (!indicator) {
                return;
            }

            const text = typeof noteLabel === 'string' ? noteLabel : `Nota ${midiNote}`;
            indicator.dataset.status = matched ? 'active' : 'unmatched';
            indicator.textContent = matched
                ? `MIDI · ${text}`
                : `MIDI · ${text} (sem alvo)`;

            if (this.midiActivityTimeout) {
                window.clearTimeout(this.midiActivityTimeout);
            }

            this.midiActivityTimeout = window.setTimeout(() => {
                this.updateMIDIStatusUI();
            }, matched ? 1500 : 2000);

            this.triggerStagePulse(text, { matched });
        }

        triggerStagePulse(noteLabel, { matched = true } = {}) {
            if (!this.elements.stage) {
                return;
            }

            const classHit = 'terra-game-stage-midi-hit';
            const classMiss = 'terra-game-stage-midi-miss';
            this.elements.stage.classList.remove(classHit, classMiss);

            const targetClass = matched ? classHit : classMiss;
            // Forçar reflow para reiniciar animação
            void this.elements.stage.offsetWidth;
            this.elements.stage.classList.add(targetClass);

            if (this.stagePulseTimeout) {
                window.clearTimeout(this.stagePulseTimeout);
            }

            this.stagePulseTimeout = window.setTimeout(() => {
                if (this.elements.stage) {
                    this.elements.stage.classList.remove(classHit, classMiss);
                }
            }, 220);
        }

        resolveGameNoteFromMIDI(midiNote) {
            if (typeof midiNote !== 'number') {
                return null;
            }

            if (MIDI_TO_GAME_NOTE[midiNote]) {
                return MIDI_TO_GAME_NOTE[midiNote];
            }

            const pitchClass = midiNote % 12;
            const note = MIDI_PITCHCLASS_TO_NOTE[pitchClass];

            if (!note) {
                return null;
            }

            if (note === 'C' && midiNote >= 72) {
                return 'C2';
            }

            return note;
        }

        pulseTargetIndicator(note) {
            const targetElement = this.elements.stats?.target;
            if (!targetElement) {
                return;
            }

            targetElement.dataset.hint = note || '';
            targetElement.classList.add('is-hint');

            if (this.targetPulseTimeout) {
                window.clearTimeout(this.targetPulseTimeout);
            }

            this.targetPulseTimeout = window.setTimeout(() => {
                targetElement.classList.remove('is-hint');
                targetElement.removeAttribute('data-hint');
            }, 600);
        }

        /**
         * Handler para mensagens MIDI (NOTE_ON do board bells)
         */
        handleMIDIMessage(event) {
            if (!event?.data || event.data.length < 2) {
                return;
            }

            const [status, midiNote, rawVelocity = 0] = event.data;
            const command = status & 0xf0;
            const velocity = rawVelocity ?? 0;

            if (command === MIDI_STATUS.NOTE_OFF || (command === MIDI_STATUS.NOTE_ON && velocity === 0)) {
                return;
            }

            if (command !== MIDI_STATUS.NOTE_ON) {
                return;
            }

            const now = performance.now();
            const lastTrigger = this.midiNoteCooldowns.get(midiNote) || 0;
            if (now - lastTrigger < 60) {
                return;
            }
            this.midiNoteCooldowns.set(midiNote, now);

            if (event.currentTarget?.name && !this.connectedMidiDevices.has(event.currentTarget.name)) {
                this.connectedMidiDevices.add(event.currentTarget.name);
                this.updateMIDIStatusUI('connected');
            }

            const baseLabel = this.resolveGameNoteFromMIDI(midiNote) || `Nota ${midiNote}`;
            const match = this.state.status === 'running'
                ? this.findBalloonForMIDINote(midiNote)
                : null;

            if (match) {
                console.log(`🎯 Nota MIDI ${midiNote} → ${match.note} (balão ${match.balloon.dataset.balloonId})`);
                this.flagMidiActivity(match.note, midiNote, { matched: true });
                this.handleBalloonHit(match.balloon.dataset.balloonId, match.note, { triggeredBy: 'midi' });
                return;
            }

            console.log(`🎯 Nota MIDI ${midiNote} → ${baseLabel}, porém nenhum balão correspondente estava disponível.`);
            this.flagMidiActivity(baseLabel, midiNote, { matched: false });

            if (this.state.status === 'running') {
                this.penalizeWrongMIDINote({ midiNote, label: baseLabel });
            }
        }

        /**
         * Encontra balão com a nota especificada (prioridade: mais próximo do fundo)
         */
        findMatchingBalloon(note) {
            if (!this.elements.stage) {
                return null;
            }

            const stageRect = this.elements.stage.getBoundingClientRect();
            const candidates = [];

            this.activeBalloons.forEach((balloon) => {
                if (balloon.dataset.note !== note) {
                    return;
                }

                const rect = balloon.getBoundingClientRect();
                const distanceFromFloor = stageRect.bottom - rect.bottom;
                candidates.push({ balloon, distanceFromFloor });
            });

            if (!candidates.length) {
                return null;
            }

            candidates.sort((a, b) => a.distanceFromFloor - b.distanceFromFloor);
            return candidates[0].balloon;
        }

        findBalloonForMIDINote(midiNote) {
            if (!Number.isFinite(midiNote) || !this.elements.stage || !this.elements.stage.isConnected) {
                return null;
            }

            const resolvedNote = this.resolveGameNoteFromMIDI(midiNote);
            const pitchClass = ((midiNote % 12) + 12) % 12;
            const stageRect = this.elements.stage.getBoundingClientRect();
            const candidates = [];

            this.activeBalloons.forEach((balloon) => {
                const note = balloon.dataset.note;
                const notePitch = NOTE_TO_PITCHCLASS[note];

                if (notePitch == null) {
                    return;
                }

                const matchesExact = resolvedNote ? note === resolvedNote : false;
                const matchesPitch = notePitch === pitchClass;

                if (!matchesExact && !matchesPitch) {
                    return;
                }

                const rect = balloon.getBoundingClientRect();
                const distanceFromFloor = stageRect.bottom - rect.bottom;
                const matchesTargetNote = this.state.targetNote ? note === this.state.targetNote : false;
                const matchesTargetPitch = this.state.targetNote
                    ? NOTE_TO_PITCHCLASS[this.state.targetNote] === notePitch
                    : false;

                candidates.push({
                    balloon,
                    note,
                    priority: [
                        matchesExact ? 0 : 1,
                        matchesTargetNote ? 0 : 1,
                        matchesTargetPitch ? 0 : 1,
                        distanceFromFloor
                    ]
                });
            });

            if (!candidates.length) {
                return null;
            }

            candidates.sort((a, b) => {
                for (let i = 0; i < a.priority.length; i++) {
                    const diff = a.priority[i] - b.priority[i];
                    if (diff !== 0) {
                        return diff;
                    }
                }
                return 0;
            });

            return {
                balloon: candidates[0].balloon,
                note: candidates[0].note
            };
        }

        activeBalloonsHasNote(note) {
            if (!note) {
                return false;
            }

            for (const balloon of this.activeBalloons.values()) {
                if (balloon.dataset.note === note) {
                    return true;
                }
            }

            return false;
        }

        ensureTargetAvailability({ highlight = false, forceChange = false, previousNote = null } = {}) {
            const currentTarget = this.state.targetNote;

            if (!forceChange && currentTarget && this.activeBalloonsHasNote(currentTarget)) {
                if (highlight) {
                    this.pulseTargetIndicator(currentTarget);
                }
                return;
            }

            if (!this.elements.stage || !this.elements.stage.isConnected || this.activeBalloons.size === 0) {
                if (this.activeBalloons.size === 0) {
                    this.updateTargetNote(null, { highlight: false });
                }
                return;
            }

            const stageRect = this.elements.stage.getBoundingClientRect();
            const candidates = [];

            this.activeBalloons.forEach((balloon) => {
                const note = balloon.dataset.note;
                if (!note) {
                    return;
                }

                const rect = balloon.getBoundingClientRect();
                const distanceFromFloor = stageRect.bottom - rect.bottom;
                candidates.push({ note, distanceFromFloor });
            });

            if (!candidates.length) {
                this.updateTargetNote(null, { highlight: false });
                return;
            }

            candidates.sort((a, b) => a.distanceFromFloor - b.distanceFromFloor);

            if (forceChange) {
                const differing = candidates.find((candidate) => candidate.note !== (previousNote || currentTarget));
                if (differing) {
                    this.updateTargetNote(differing.note, { highlight, force: true });
                    return;
                }
            }

            this.updateTargetNote(candidates[0].note, { highlight });
        }

        updateTargetNote(note, { highlight = true, force = false } = {}) {
            const normalized = typeof note === 'string' && note.trim() ? note.trim() : null;

            if (!force && this.state.targetNote === normalized) {
                if (normalized && highlight) {
                    this.pulseTargetIndicator(normalized);
                }
                this.updateStats();
                return;
            }

            this.state.targetNote = normalized;
            this.updateStats();

            if (normalized && highlight) {
                this.pulseTargetIndicator(normalized);
            }
        }

        /**
         * Carrega lista de músicas disponíveis
         */
        async loadAvailableMusics() {
            const difficulties = ['easy', 'medium', 'hard'];
            
            for (const diff of difficulties) {
                const path = DIFFICULTIES[diff].musicPath;
                
                try {
                    // Tentar carregar índice de músicas
                    const response = await fetch(`${path}index.json`);
                    if (response.ok) {
                        const index = await response.json();
                        this.availableMusics[diff] = index.files || [];
                    }
                } catch (error) {
                    console.warn(`TerraGame: Não foi possível carregar índice de músicas para ${diff}`);
                    this.availableMusics[diff] = [];
                }
            }

            this.updateMusicSelectOptions();
        }

        /**
         * Atualiza opções do select de músicas baseado na dificuldade
         */
        updateMusicSelectOptions() {
            if (!this.elements.musicSelect) return;

            const difficulty = this.state.difficultyKey;
            const musics = this.availableMusics[difficulty] || [];

            // Limpar e adicionar opção padrão
            this.elements.musicSelect.innerHTML = '<option value="">🎵 Seleção automática por nível</option>';

            musics.forEach(music => {
                const option = document.createElement('option');
                option.value = music.file;
                option.textContent = `${music.name} (${Math.floor(music.duration/60000)}min)`;
                this.elements.musicSelect.appendChild(option);
            });
        }

        /**
         * Popula select de instrumentos com soundfonts disponíveis
         */
        async populateInstrumentSelect() {
            if (!this.elements.instrumentSelect) return;

            try {
                // Carregar manifest de soundfonts
                const response = await fetch('soundfonts-manifest.json');
                if (!response.ok) {
                    console.warn('TerraGame: Não foi possível carregar soundfonts-manifest.json');
                    return;
                }

                const manifest = await response.json();
                const files = manifest.files || [];

                // Agrupar por categoria
                const grouped = {};
                files.forEach(sf => {
                    const category = sf.category || 'Outros';
                    if (!grouped[category]) grouped[category] = [];
                    grouped[category].push(sf);
                });

                // Adicionar opções agrupadas
                this.elements.instrumentSelect.innerHTML = '<option value="default">🎹 Automático (Terapêutico)</option>';

                Object.keys(grouped).sort().forEach(category => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = category;

                    grouped[category].forEach(sf => {
                        const option = document.createElement('option');
                        // Formato: "Category::Soundfont::MIDINumber"
                        option.value = `${sf.category}::${sf.soundfont}::${sf.midiNumber}`;
                        option.textContent = `${sf.subcategory || sf.soundfont} (${sf.soundfont})`;
                        optgroup.appendChild(option);
                    });

                    this.elements.instrumentSelect.appendChild(optgroup);
                });

                console.log(`✅ TerraGame: ${files.length} soundfonts carregados no seletor`);
            } catch (error) {
                console.error('TerraGame: Erro ao popular select de instrumentos:', error);
            }
        }

        /**
         * Pré-carrega instrumento selecionado
         */
        preloadInstrument(instrumentKey) {
            if (!this.soundfontManager || instrumentKey === 'default') return;

            // Extrair informações do instrumentKey (formato: "Category::Soundfont::MIDINumber")
            const parts = instrumentKey.split('::');
            if (parts.length < 3) return;

            const [category, soundfont, midiNumber] = parts;
            const instrumentName = `${midiNumber}_${soundfont}_sf2_file`.toLowerCase();

            console.log(`🎵 Pré-carregando instrumento: ${instrumentName}`);

            // Tentar carregar via soundfontManager
            if (typeof this.soundfontManager.loadInstrument === 'function') {
                this.soundfontManager.loadInstrument(instrumentName, {
                    setCurrent: false,
                    clearKit: false
                }).catch(error => {
                    console.warn(`TerraGame: Erro ao pré-carregar ${instrumentName}:`, error.message);
                });
            }
        }

        /**
         * Carrega sequência de música (JSON ou fallback random)
         */
        async loadMusicSequence(difficultyKey) {
            const difficulty = DIFFICULTIES[difficultyKey];
            const musicPath = difficulty.musicPath;

            // Se música específica foi selecionada
            if (this.selectedMusicFile) {
                try {
                    const response = await fetch(`${musicPath}${this.selectedMusicFile}`);
                    if (response.ok) {
                        const musicData = await response.json();
                        this.currentMusicName = musicData.name;
                        console.log(`🎵 Música carregada: ${this.currentMusicName} (${musicData.noteCount} notas)`);
                        return musicData.notes;
                    }
                } catch (error) {
                    console.warn('TerraGame: Erro ao carregar música selecionada, usando automático');
                }
            }

            // Seleção automática ou fallback
            const availableMusics = this.availableMusics[difficultyKey] || [];
            
            if (availableMusics.length > 0) {
                // Escolher música aleatória
                const randomMusic = availableMusics[Math.floor(Math.random() * availableMusics.length)];
                
                try {
                    const response = await fetch(`${musicPath}${randomMusic.file}`);
                    if (response.ok) {
                        const musicData = await response.json();
                        this.currentMusicName = musicData.name;
                        console.log(`🎵 Música automática: ${this.currentMusicName} (${musicData.noteCount} notas)`);
                        return musicData.notes;
                    }
                } catch (error) {
                    console.warn('TerraGame: Erro ao carregar música automática');
                }
            }

            // Fallback: gerar sequência randômica
            console.log('⚠️ TerraGame: Usando sequência randômica (fallback)');
            this.currentMusicName = 'Sequência Aleatória';
            return this.generateFallbackSequence(difficulty);
        }

        /**
         * Gera sequência randômica quando não há música disponível
         */
        generateFallbackSequence(difficulty) {
            const sequence = [];
            const totalDuration = difficulty.fallbackDuration * 1000;
            const balloonCount = difficulty.fallbackBalloons;
            const interval = totalDuration / balloonCount;

            for (let i = 0; i < balloonCount; i++) {
                sequence.push({
                    note: NOTES[Math.floor(Math.random() * NOTES.length)],
                    time: Math.round(i * interval),
                    duration: Math.round(interval * 0.8)
                });
            }

            return sequence;
        }

        createInitialState() {
            return {
                status: 'idle',
                patientId: null,
                patientName: '',
                difficultyKey: 'easy',
                balloonsLaunched: 0,
                balloonsResolved: 0,
                hits: 0,
                misses: 0,
                streak: 0,
                targetNote: null
            };
        }

        openOverlay() {
            document.body.style.overflow = 'hidden';
            this.elements.overlay.hidden = false;
            this.elements.overlay.setAttribute('aria-hidden', 'false');
            this.elements.overlay.style.display = 'flex';
            this.reinforceOverlayStyle();
            this.resetToSetup();
            this.requestFullscreen();
            this.ensureAudioContext();
            this.refreshPatients();
            
            // Iniciar monitoramento contínuo do overlay
            this.startOverlayGuard();
            
            // Prevenir navegação acidental
            window.addEventListener('beforeunload', this.preventUnload);
            window.history.pushState({ terraGame: true }, '', window.location.href);
        }

        closeOverlay() {
            this.cleanupGame();
            this.stopOverlayGuard();
            document.body.style.overflow = '';
            this.elements.overlay.hidden = true;
            this.elements.overlay.setAttribute('aria-hidden', 'true');
            this.elements.overlay.style.display = 'none';
            this.exitFullscreen();
            
            // Remover proteção de navegação
            window.removeEventListener('beforeunload', this.preventUnload);
        }

        reinforceOverlayStyle() {
            if (!this.elements.overlay) return;
            
            const overlay = this.elements.overlay;
            overlay.style.display = 'flex';
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            overlay.style.background = 'radial-gradient(circle at top, rgba(102, 126, 234, 0.32), rgba(17, 24, 39, 0.92))';
            overlay.style.backgroundColor = 'rgba(17, 24, 39, 0.92)';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.zIndex = '99999'; // CRITICAL: Sempre acima de modais do sistema (patient-module: 1200)
        }

        startOverlayGuard() {
            if (this.overlayGuardInterval) {
                clearInterval(this.overlayGuardInterval);
            }
            
            // Verificar e reforçar overlay a cada 50ms (mais frequente para capturar mudanças rápidas)
            this.overlayGuardInterval = setInterval(() => {
                if (!this.elements.overlay?.hidden) {
                    this.reinforceOverlayStyle();
                    
                    // CRITICAL: Detectar e compensar backdrops de outros modais
                    this.ensureOverlayAboveBackdrops();
                }
            }, 50);
            
            // Adicionar MutationObserver para restauração IMEDIATA de estilos
            if (!this.overlayStyleObserver) {
                this.overlayStyleObserver = new MutationObserver(() => {
                    requestAnimationFrame(() => {
                        this.reinforceOverlayStyle();
                    });
                });
                
                this.overlayStyleObserver.observe(this.elements.overlay, {
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden'],
                    attributeOldValue: true
                });
            }
            
            // Observar mudanças no DOM para detectar backdrops sendo adicionados
            if (!this.backdropObserver) {
                this.backdropObserver = new MutationObserver((mutations) => {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && 
                                (node.classList?.contains('patient-module-backdrop') || 
                                 node.id === 'patient-module-backdrop')) {
                                console.log('⚠️ TerraGame: Backdrop detectado, reforçando overlay...');
                                this.ensureOverlayAboveBackdrops();
                            }
                        });
                    });
                });
                
                this.backdropObserver.observe(document.body, {
                    childList: true,
                    subtree: false
                });
            }
        }

        /**
         * Garante que overlay do Terra Game fique acima de todos os backdrops
         */
        ensureOverlayAboveBackdrops() {
            if (!this.elements.overlay) return;
            
            // Encontrar todos os backdrops que possam estar interferindo
            const backdrops = document.querySelectorAll('.patient-module-backdrop, #patient-module-backdrop');
            
            backdrops.forEach(backdrop => {
                if (!backdrop.hidden && backdrop.classList.contains('is-visible')) {
                    // Forçar overlay a ficar acima do backdrop
                    this.elements.overlay.style.zIndex = '99999';
                    console.log('✅ TerraGame: Overlay reforçado acima de backdrop');
                    
                    // Ajustar contexto do modal de pacientes
                    this.adjustPatientModuleContext();
                }
            });
        }

        stopOverlayGuard() {
            if (this.overlayGuardInterval) {
                clearInterval(this.overlayGuardInterval);
                this.overlayGuardInterval = null;
            }
            
            if (this.overlayStyleObserver) {
                this.overlayStyleObserver.disconnect();
                this.overlayStyleObserver = null;
            }
            
            if (this.backdropObserver) {
                this.backdropObserver.disconnect();
                this.backdropObserver = null;
            }
        }

        preventUnload(event) {
            // Nota: Apenas para debug, não ativar em produção
            // event.preventDefault();
            // event.returnValue = '';
        }

        resetToSetup() {
            this.cleanupGame();
            this.state = this.createInitialState();
            if (this.elements.controls.difficulty) {
                this.elements.controls.difficulty.value = this.state.difficultyKey;
            }
            if (this.patientPanel && typeof this.patientPanel.reset === 'function') {
                this.patientPanel.reset();
            }
            this.updateSetupVisibility({ setup: true });
            this.updateControlStates();
        }

        ensureAudioContext() {
            if (window.audioEngine && typeof window.audioEngine.ensureAudioContext === 'function') {
                window.audioEngine.ensureAudioContext();
            }
        }

        requestFullscreen() {
            const element = this.elements.overlay;
            if (!element) {
                return;
            }

            const canRequest = element.requestFullscreen || element.webkitRequestFullscreen || element.msRequestFullscreen;
            if (canRequest) {
                try {
                    canRequest.call(element);
                } catch (error) {
                    console.warn('TerraGame: não foi possível ativar tela cheia', error);
                }
            }
        }

        exitFullscreen() {
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exit && document.fullscreenElement === this.elements.overlay) {
                exit.call(document).catch(() => {
                    /* ignore */
                });
            }
        }

        handleVisibilityChange() {
            if (document.hidden && this.state.status === 'running') {
                this.pauseGame({ reason: 'visibilitychange' });
            }
        }

        displaySetupFeedback(message, tone = 'info') {
            if (!this.elements.setupFeedback) {
                return;
            }
            this.elements.setupFeedback.textContent = message;
            this.elements.setupFeedback.dataset.tone = tone;
        }

        getCurrentDifficulty() {
            return DIFFICULTIES[this.state.difficultyKey] || DIFFICULTIES.easy;
        }

        getTotalBalloons() {
            // Se tiver sequência de música, usar o tamanho dela
            if (this.musicSequence && this.musicSequence.length > 0) {
                return this.musicSequence.length;
            }
            // Senão, usar fallback da dificuldade
            return this.getCurrentDifficulty().fallbackBalloons || 100;
        }

        changeDifficulty(key) {
            if (!DIFFICULTIES[key]) {
                return;
            }
            if (this.state.status === 'running') {
                if (this.elements.controls?.difficulty) {
                    this.elements.controls.difficulty.value = this.state.difficultyKey;
                }
                return;
            }

            this.state.difficultyKey = key;

            // Atualizar opções de música para nova dificuldade
            this.updateMusicSelectOptions();
            this.updateStats();
        }

        async startGame() {
            if (!this.elements.patientSelect) {
                console.warn('TerraGame: seletor de pacientes indisponível.');
                return;
            }

            const selectedPatient = this.elements.patientSelect.value;
            if (!selectedPatient) {
                this.displaySetupFeedback('Selecione um paciente antes de iniciar o jogo.', 'warning');
                return;
            }

            const manager = this.patientManager || window.patientManager;
            const patient = manager && typeof manager.getPatient === 'function'
                ? manager.getPatient(selectedPatient)
                : null;

            // Carregar sequência de música
            console.log('🎵 Carregando música...');
            this.musicSequence = await this.loadMusicSequence(this.state.difficultyKey);
            this.musicIndex = 0;
            this.stopMusicScheduler();
            this.midiNoteCooldowns.clear();

            this.state = {
                status: 'running',
                patientId: selectedPatient,
                patientName: patient?.fullName || 'Paciente',
                difficultyKey: this.state.difficultyKey,
                balloonsLaunched: 0,
                balloonsResolved: 0,
                hits: 0,
                misses: 0,
                streak: 0,
                targetNote: null
            };

            this.clearStage();
            this.updateStats();
            this.updateSetupVisibility({ session: true });
            this.prepareEffectInstruments();
            this.updateControlStates();

            this.startMusicScheduler();
        }

        updateSetupVisibility({ setup = false, session = false, finish = false }) {
            // CRITICAL UX: Garantir isolamento completo entre estados
            // Apenas um estado pode estar ativo por vez
            if (this.elements.setup) {
                this.elements.setup.hidden = !setup;
                // Forçar display none quando oculto para evitar sobreposições
                if (!setup) {
                    this.elements.setup.style.display = 'none';
                } else {
                    this.elements.setup.style.display = '';
                }
            }
            if (this.elements.session) {
                this.elements.session.hidden = !session;
                if (!session) {
                    this.elements.session.style.display = 'none';
                } else {
                    this.elements.session.style.display = '';
                }
            }
            if (this.elements.finish) {
                this.elements.finish.hidden = !finish;
                if (!finish) {
                    this.elements.finish.style.display = 'none';
                } else {
                    this.elements.finish.style.display = '';
                }
            }
        }

        startMusicScheduler() {
            if (!this.musicSequence || this.musicSequence.length === 0) {
                console.warn('TerraGame: Sequência de música vazia, nenhum balão será criado.');
                return;
            }

            this.stopMusicScheduler();

            const scheduler = {
                startTime: performance.now(),
                pauseOffset: 0,
                pausedAt: null,
                nextIndex: 0,
                rafId: null
            };

            const tick = (timestamp) => {
                if (!this.musicScheduler || this.musicScheduler !== scheduler) {
                    return;
                }

                if (this.state.status !== 'running') {
                    scheduler.rafId = requestAnimationFrame(tick);
                    return;
                }

                if (!this.musicSequence || this.musicSequence.length === 0) {
                    this.stopMusicScheduler();
                    return;
                }

                if (scheduler.pausedAt) {
                    scheduler.rafId = requestAnimationFrame(tick);
                    return;
                }

                const elapsed = timestamp - scheduler.startTime - scheduler.pauseOffset;

                while (scheduler.nextIndex < this.musicSequence.length &&
                       elapsed >= this.musicSequence[scheduler.nextIndex].time) {
                    const noteData = this.musicSequence[scheduler.nextIndex];
                    this.launchMusicBalloon(noteData);
                    scheduler.nextIndex += 1;
                }

                if (scheduler.nextIndex >= this.musicSequence.length) {
                    this.stopMusicScheduler();
                    return;
                }

                scheduler.rafId = requestAnimationFrame(tick);
            };

            scheduler.rafId = requestAnimationFrame(tick);
            this.musicScheduler = scheduler;
            console.log(`🎵 Scheduler iniciado com ${this.musicSequence.length} notas para "${this.currentMusicName}".`);
        }

        stopMusicScheduler() {
            if (this.musicScheduler?.rafId) {
                cancelAnimationFrame(this.musicScheduler.rafId);
            }
            this.musicScheduler = null;
        }

        pauseMusicScheduler() {
            if (!this.musicScheduler || this.musicScheduler.pausedAt) {
                return;
            }
            this.musicScheduler.pausedAt = performance.now();
        }

        resumeMusicScheduler() {
            if (!this.musicScheduler || !this.musicScheduler.pausedAt) {
                return;
            }
            const now = performance.now();
            this.musicScheduler.pauseOffset += now - this.musicScheduler.pausedAt;
            this.musicScheduler.pausedAt = null;
        }

        /**
         * Lança balão de nota de música (com a nota específica da sequência)
         */
        launchMusicBalloon(noteData) {
            if (!this.elements.stage || this.state.status !== 'running') {
                return;
            }

            if (this.state.balloonsLaunched >= this.getTotalBalloons()) {
                return;
            }

            const note = noteData.note;
            const balloonId = `balloon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            
            // Container do balão
            const balloon = document.createElement('button');
            balloon.className = 'terra-game-balloon';
            balloon.dataset.note = note;
            balloon.dataset.balloonId = balloonId;
            balloon.dataset.musicNote = 'true'; // Marcar como nota de música
            balloon.dataset.spawnTime = String(performance.now());
            balloon.dataset.sequenceIndex = String(this.state.balloonsLaunched);
            balloon.style.left = `${Math.random() * 80 + 10}%`;
            
            // Calcular duração baseada na duração da nota (min 6s, max 14s)
            const noteDuration = noteData.duration || 1000;
            const riseDuration = Math.max(6, Math.min(14, noteDuration / 100));
            balloon.style.setProperty('--rise-duration', `${riseDuration}s`);
            balloon.type = 'button';
            balloon.setAttribute('aria-label', `Balão nota ${note}`);
            
            // Criar SVG do balão (código visual existente)
            const color = this.resolveNoteColor(note);
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('viewBox', '0 0 68 88');
            svg.setAttribute('width', '68');
            svg.setAttribute('height', '88');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';
            
            // Definir gradiente
            const defs = document.createElementNS(svgNS, 'defs');
            const gradient = document.createElementNS(svgNS, 'radialGradient');
            gradient.setAttribute('id', `grad-${balloonId}`);
            gradient.setAttribute('cx', '35%');
            gradient.setAttribute('cy', '35%');
            gradient.setAttribute('r', '65%');
            
            const stop1 = document.createElementNS(svgNS, 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('style', `stop-color:${this.lightenColor(color, 30)};stop-opacity:1`);
            
            const stop2 = document.createElementNS(svgNS, 'stop');
            stop2.setAttribute('offset', '70%');
            stop2.setAttribute('style', `stop-color:${color};stop-opacity:1`);
            
            const stop3 = document.createElementNS(svgNS, 'stop');
            stop3.setAttribute('offset', '100%');
            stop3.setAttribute('style', `stop-color:${this.darkenColor(color, 15)};stop-opacity:1`);
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            gradient.appendChild(stop3);
            defs.appendChild(gradient);
            svg.appendChild(defs);
            
            // Corpo do balão
            const balloonPath = document.createElementNS(svgNS, 'path');
            balloonPath.setAttribute('d', `
                M 34,8
                C 48,8 58,20 58,38
                C 58,52 52,64 44,72
                C 40,76 36,78 34,78
                C 32,78 28,76 24,72
                C 16,64 10,52 10,38
                C 10,20 20,8 34,8
                Z
            `);
            balloonPath.setAttribute('fill', `url(#grad-${balloonId})`);
            balloonPath.setAttribute('stroke', this.darkenColor(color, 20));
            balloonPath.setAttribute('stroke-width', '1.5');
            balloonPath.setAttribute('stroke-linejoin', 'round');
            balloonPath.setAttribute('stroke-linecap', 'round');
            balloonPath.setAttribute('filter', 'drop-shadow(0px 6px 12px rgba(0,0,0,0.25))');
            svg.appendChild(balloonPath);
            
            // Nó
            const knot = document.createElementNS(svgNS, 'ellipse');
            knot.setAttribute('cx', '34');
            knot.setAttribute('cy', '78');
            knot.setAttribute('rx', '3');
            knot.setAttribute('ry', '4');
            knot.setAttribute('fill', this.darkenColor(color, 35));
            knot.setAttribute('opacity', '0.8');
            svg.appendChild(knot);
            
            // String
            const string = document.createElementNS(svgNS, 'path');
            string.setAttribute('d', 'M 34,80 Q 33,84 34,86');
            string.setAttribute('stroke', 'rgba(255,255,255,0.6)');
            string.setAttribute('stroke-width', '1');
            string.setAttribute('stroke-linecap', 'round');
            string.setAttribute('fill', 'none');
            string.setAttribute('opacity', '0.7');
            svg.appendChild(string);
            
            // Brilho
            const highlight = document.createElementNS(svgNS, 'ellipse');
            highlight.setAttribute('cx', '26');
            highlight.setAttribute('cy', '30');
            highlight.setAttribute('rx', '10');
            highlight.setAttribute('ry', '14');
            highlight.setAttribute('fill', 'rgba(255,255,255,0.5)');
            highlight.setAttribute('opacity', '0.65');
            highlight.style.animation = 'balloon-shine-pulse 2s ease-in-out infinite';
            svg.appendChild(highlight);
            
            balloon.appendChild(svg);
            
            // Texto da nota
            const noteText = document.createElement('span');
            noteText.className = 'terra-game-balloon-note';
            noteText.textContent = note;
            noteText.style.position = 'absolute';
            noteText.style.top = '50%';
            noteText.style.left = '50%';
            noteText.style.transform = 'translate(-50%, -50%)';
            noteText.style.fontSize = 'clamp(1rem, 3vw, 1.2rem)';
            noteText.style.fontWeight = '900';
            noteText.style.color = '#ffffff';
            noteText.style.textShadow = '0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)';
            noteText.style.pointerEvents = 'none';
            noteText.style.zIndex = '10';
            balloon.appendChild(noteText);

            // Events
            balloon.addEventListener('animationend', () => {
                this.handleBalloonMiss(balloonId);
            });

            balloon.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                this.handleBalloonHit(balloonId, note);
            });

            this.elements.stage.appendChild(balloon);
            this.activeBalloons.set(balloonId, balloon);
            this.state.balloonsLaunched += 1;

            if (!this.state.targetNote || !this.activeBalloonsHasNote(this.state.targetNote)) {
                this.ensureTargetAvailability({ highlight: this.state.targetNote === null });
            }

            this.updateStats();
        }

        launchBalloon() {
            if (!this.elements.stage || this.state.balloonsLaunched >= this.getTotalBalloons()) {
                return;
            }

            const note = NOTES[Math.floor(Math.random() * NOTES.length)];
            const balloonId = `balloon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            
            // Container do balão
            const balloon = document.createElement('button');
            balloon.className = 'terra-game-balloon';
            balloon.dataset.note = note;
            balloon.dataset.balloonId = balloonId;
            balloon.style.left = `${Math.random() * 80 + 10}%`;
            balloon.style.setProperty('--rise-duration', `${9 + Math.random() * 4}s`);
            balloon.type = 'button';
            balloon.setAttribute('aria-label', `Balão nota ${note}`);
            
            // Criar SVG do balão para alta qualidade visual
            const color = this.resolveNoteColor(note);
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('viewBox', '0 0 68 88');
            svg.setAttribute('width', '68');
            svg.setAttribute('height', '88');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.pointerEvents = 'none';
            
            // Definir gradiente para profundidade
            const defs = document.createElementNS(svgNS, 'defs');
            const gradient = document.createElementNS(svgNS, 'radialGradient');
            gradient.setAttribute('id', `grad-${balloonId}`);
            gradient.setAttribute('cx', '35%');
            gradient.setAttribute('cy', '35%');
            gradient.setAttribute('r', '65%');
            
            const stop1 = document.createElementNS(svgNS, 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('style', `stop-color:${this.lightenColor(color, 30)};stop-opacity:1`);
            
            const stop2 = document.createElementNS(svgNS, 'stop');
            stop2.setAttribute('offset', '70%');
            stop2.setAttribute('style', `stop-color:${color};stop-opacity:1`);
            
            const stop3 = document.createElementNS(svgNS, 'stop');
            stop3.setAttribute('offset', '100%');
            stop3.setAttribute('style', `stop-color:${this.darkenColor(color, 15)};stop-opacity:1`);
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            gradient.appendChild(stop3);
            defs.appendChild(gradient);
            svg.appendChild(defs);
            
            // Corpo do balão com forma realista usando curvas Bézier suaves
            // Referência: Path professional balloon shape com controle Bézier
            const balloonPath = document.createElementNS(svgNS, 'path');
            // Path otimizado: forma de balão suave sem pontas
            // Estrutura: topo arredondado (C), laterais expandidas (Q), base estreita com nó
            balloonPath.setAttribute('d', `
                M 34,8
                C 48,8 58,20 58,38
                C 58,52 52,64 44,72
                C 40,76 36,78 34,78
                C 32,78 28,76 24,72
                C 16,64 10,52 10,38
                C 10,20 20,8 34,8
                Z
            `);
            balloonPath.setAttribute('fill', `url(#grad-${balloonId})`);
            balloonPath.setAttribute('stroke', this.darkenColor(color, 20));
            balloonPath.setAttribute('stroke-width', '1.5');
            balloonPath.setAttribute('stroke-linejoin', 'round');
            balloonPath.setAttribute('stroke-linecap', 'round');
            balloonPath.setAttribute('filter', 'drop-shadow(0px 6px 12px rgba(0,0,0,0.25))');
            svg.appendChild(balloonPath);
            
            // Nó do balão (base estreita onde amarra a string)
            const knot = document.createElementNS(svgNS, 'ellipse');
            knot.setAttribute('cx', '34');
            knot.setAttribute('cy', '78');
            knot.setAttribute('rx', '3');
            knot.setAttribute('ry', '4');
            knot.setAttribute('fill', this.darkenColor(color, 35));
            knot.setAttribute('opacity', '0.8');
            svg.appendChild(knot);
            
            // String do balão (linha suave e realista)
            const string = document.createElementNS(svgNS, 'path');
            string.setAttribute('d', 'M 34,80 Q 33,84 34,86');
            string.setAttribute('stroke', 'rgba(255,255,255,0.6)');
            string.setAttribute('stroke-width', '1');
            string.setAttribute('stroke-linecap', 'round');
            string.setAttribute('fill', 'none');
            string.setAttribute('opacity', '0.7');
            svg.appendChild(string);
            
            // Brilho especular para realismo com animação
            const highlight = document.createElementNS(svgNS, 'ellipse');
            highlight.setAttribute('cx', '26');
            highlight.setAttribute('cy', '30');
            highlight.setAttribute('rx', '10');
            highlight.setAttribute('ry', '14');
            highlight.setAttribute('fill', 'rgba(255,255,255,0.5)');
            highlight.setAttribute('opacity', '0.65');
            highlight.style.animation = 'balloon-shine-pulse 2s ease-in-out infinite';
            svg.appendChild(highlight);
            
            balloon.appendChild(svg);
            
            // Texto da nota
            const noteText = document.createElement('span');
            noteText.className = 'terra-game-balloon-note';
            noteText.textContent = note;
            noteText.style.position = 'absolute';
            noteText.style.top = '50%';
            noteText.style.left = '50%';
            noteText.style.transform = 'translate(-50%, -50%)';
            noteText.style.fontSize = 'clamp(1rem, 3vw, 1.2rem)';
            noteText.style.fontWeight = '900';
            noteText.style.color = '#ffffff';
            noteText.style.textShadow = '0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)';
            noteText.style.pointerEvents = 'none';
            noteText.style.zIndex = '10';
            balloon.appendChild(noteText);

            balloon.addEventListener('animationend', () => {
                this.handleBalloonMiss(balloonId);
            });

            balloon.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                this.handleBalloonHit(balloonId, note);
            });

            this.elements.stage.appendChild(balloon);
            this.activeBalloons.set(balloonId, balloon);
            this.state.balloonsLaunched += 1;

            if (!this.state.targetNote || !this.activeBalloonsHasNote(this.state.targetNote)) {
                this.ensureTargetAvailability({ highlight: this.state.targetNote === null });
            }

            this.updateStats();
        }
        
        // Utilitários para manipulação de cores
        lightenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, (num >> 16) + amt);
            const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
            const B = Math.min(255, (num & 0x0000FF) + amt);
            return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
        }
        
        darkenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.max(0, (num >> 16) - amt);
            const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
            const B = Math.max(0, (num & 0x0000FF) - amt);
            return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
        }
        
        // Sistema de partículas para explosões cinematográficas
        initParticleSystem() {
            if (!this.elements.stage) return;
            
            // Criar canvas de partículas sobrepondo o stage
            this.particleCanvas = document.createElement('canvas');
            this.particleCanvas.style.position = 'absolute';
            this.particleCanvas.style.top = '0';
            this.particleCanvas.style.left = '0';
            this.particleCanvas.style.width = '100%';
            this.particleCanvas.style.height = '100%';
            this.particleCanvas.style.pointerEvents = 'none';
            this.particleCanvas.style.zIndex = '150'; // var(--terra-z-particles): sobre balões (100), abaixo de overlays (500)
            this.particleCtx = this.particleCanvas.getContext('2d', { alpha: true });
            
            // Adicionar ao stage apenas durante sessão
            const updateCanvasSize = () => {
                if (!this.elements.stage) return;
                const rect = this.elements.stage.getBoundingClientRect();
                this.particleCanvas.width = rect.width;
                this.particleCanvas.height = rect.height;
            };
            
            window.addEventListener('resize', updateCanvasSize);
            updateCanvasSize();
        }
        
        createExplosion(x, y, color) {
            if (!this.particleCtx) return;
            
            // Adicionar canvas ao stage se ainda não estiver
            if (!this.particleCanvas.parentNode && this.elements.stage) {
                this.elements.stage.appendChild(this.particleCanvas);
            }
            
            const particleCount = 15;
            const baseAngle = Math.random() * Math.PI * 2;
            
            for (let i = 0; i < particleCount; i++) {
                const angle = baseAngle + (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
                const speed = 2 + Math.random() * 3;
                
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 0.015 + Math.random() * 0.015,
                    size: 4 + Math.random() * 4,
                    color: color,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.3
                });
            }
            
            // Iniciar animação se não estiver rodando
            if (!this.animationFrameId) {
                this.animateParticles();
            }
        }
        
        animateParticles() {
            if (!this.particleCtx || !this.particleCanvas) return;
            
            // Limpar canvas
            this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
            
            // Atualizar e desenhar partículas
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                
                // Física da partícula
                p.vy += 0.15; // Gravidade
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                p.rotation += p.rotationSpeed;
                
                // Remover partículas mortas
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                
                // Desenhar partícula com alpha
                this.particleCtx.save();
                this.particleCtx.globalAlpha = p.life;
                this.particleCtx.translate(p.x, p.y);
                this.particleCtx.rotate(p.rotation);
                
                // Cor com gradiente
                const gradient = this.particleCtx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, p.color);
                gradient.addColorStop(0.5, p.color + 'cc');
                gradient.addColorStop(1, p.color + '00');
                
                this.particleCtx.fillStyle = gradient;
                this.particleCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                this.particleCtx.restore();
            }
            
            // Continuar animação se houver partículas
            if (this.particles.length > 0) {
                this.animationFrameId = requestAnimationFrame(this.animateParticles);
            } else {
                this.animationFrameId = null;
                // Remover canvas quando não houver partículas
                if (this.particleCanvas.parentNode) {
                    this.particleCanvas.parentNode.removeChild(this.particleCanvas);
                }
            }
        }

        handleBalloonHit(balloonId, note, meta = {}) {
            if (this.state.status !== 'running' || !this.activeBalloons.has(balloonId)) {
                return;
            }

            const { triggeredBy = 'manual' } = meta || {};
            const balloon = this.activeBalloons.get(balloonId);
            const rect = balloon.getBoundingClientRect();
            const stageRect = this.elements.stage.getBoundingClientRect();

            const wasTarget = note === this.state.targetNote;
            this.triggerStagePulse(note, { matched: wasTarget });
            
            // Coordenadas relativas ao stage para partículas
            const explosionX = rect.left + rect.width / 2 - stageRect.left;
            const explosionY = rect.top + rect.height / 2 - stageRect.top;
            const color = this.resolveNoteColor(note);
            
            // Criar explosão de partículas
            this.createExplosion(explosionX, explosionY, color);
            
            // Adicionar animação de pop antes de remover
            balloon.classList.add('popping');
            
            this.activeBalloons.delete(balloonId);

            // Aguardar animação terminar antes de remover do DOM
            setTimeout(() => {
                balloon.remove();
            }, 300); // Duração da animação balloon-pop

            const isCorrect = wasTarget;
            if (isCorrect) {
                this.state.hits += 1;
                this.state.streak += 1;
                this.playEffect('success', note);
                this.showComboFeedback(this.state.streak, explosionX, explosionY);
            } else {
                this.state.misses += 1;
                this.state.streak = 0;
                this.playEffect('error', note);
            }

            const highlightTarget = triggeredBy === 'midi' || isCorrect || !this.state.targetNote;
            this.ensureTargetAvailability({
                highlight: highlightTarget,
                forceChange: isCorrect,
                previousNote: note
            });

            this.state.balloonsResolved = Math.min(this.state.hits + this.state.misses, this.state.balloonsLaunched);
            this.updateStats();
            this.checkGameCompletion();
        }

        penalizeWrongMIDINote({ midiNote = null, label = '' } = {}) {
            if (this.state.status !== 'running') {
                return;
            }

            const feedbackLabel = label || (Number.isFinite(midiNote) ? `Nota ${midiNote}` : 'Nota desconhecida');
            this.triggerStagePulse(feedbackLabel, { matched: false });
            this.state.streak = 0;

            const referenceNote = this.state.targetNote || 'C';
            this.playEffect('error', referenceNote);

            if (this.state.targetNote) {
                this.pulseTargetIndicator(this.state.targetNote);
            }

            this.updateStats();
        }
        
        showComboFeedback(streak, x, y) {
            if (streak < 3) return; // Só mostrar a partir de 3 acertos seguidos
            
            const combo = document.createElement('div');
            combo.className = 'terra-game-combo-feedback';
            combo.textContent = `${streak}× COMBO!`;
            combo.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                transform: translate(-50%, -50%);
                font-size: clamp(1.5rem, 4vw, 2rem);
                font-weight: 900;
                color: #ffd700;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.5);
                pointer-events: none;
                z-index: 100;
                animation: combo-pop-up 1s ease-out forwards;
            `;
            
            this.elements.stage.appendChild(combo);
            
            setTimeout(() => {
                if (combo.parentNode) {
                    combo.parentNode.removeChild(combo);
                }
            }, 1000);
        }

        handleBalloonMiss(balloonId) {
            const balloon = this.activeBalloons.get(balloonId);
            if (!balloon) {
                return;
            }

            this.activeBalloons.delete(balloonId);
            balloon.remove();
            if (this.state.status === 'running') {
                this.triggerStagePulse('Miss', { matched: false });
                this.state.misses += 1;
                this.state.streak = 0;
                this.state.balloonsResolved = Math.min(this.state.hits + this.state.misses, this.state.balloonsLaunched);
                this.ensureTargetAvailability({ highlight: true });
                this.updateStats();
                this.checkGameCompletion();
            }
        }

        pauseGame({ reason = 'manual' } = {}) {
            if (this.state.status !== 'running') {
                return;
            }

            this.state.status = 'paused';
            this.pauseMusicScheduler();

            this.activeBalloons.forEach((balloon) => {
                balloon.classList.add('is-paused');
            });

            console.log(`TerraGame: jogo pausado (${reason}).`);
            this.updateControlStates();
        }

        resumeGame() {
            if (this.state.status !== 'paused') {
                return;
            }

            this.state.status = 'running';
            this.activeBalloons.forEach((balloon) => {
                balloon.classList.remove('is-paused');
            });

            this.resumeMusicScheduler();
            this.updateControlStates();
        }

        checkGameCompletion() {
            const total = this.getTotalBalloons();
            if (this.state.balloonsResolved >= total) {
                this.finishGame();
            }
        }

        finishGame() {
            this.state.status = 'finished';
            this.stopMusicScheduler();
            this.clearStage();
            
            // Armazenar sessão no prontuário do paciente
            this.saveSessionToPatient();
            
            this.renderFinishSummary();
            this.updateSetupVisibility({ finish: true });
            this.updateControlStates();
        }

        /**
         * Salva dados da sessão no prontuário do paciente
         */
        saveSessionToPatient() {
            if (!this.state.patientId || !this.patientManager) {
                console.warn('TerraGame: Não foi possível salvar sessão (paciente ou manager indisponível)');
                return;
            }

            const totalBalloons = this.getTotalBalloons();
            const accuracy = totalBalloons > 0 
                ? Math.round((this.state.hits / totalBalloons) * 100) 
                : 0;

            const sessionData = {
                type: 'terra-game',
                date: new Date().toISOString(),
                difficulty: this.state.difficultyKey,
                difficultyLabel: this.getCurrentDifficulty().label,
                musicName: this.currentMusicName || 'Sequência Aleatória',
                totalBalloons: totalBalloons,
                hits: this.state.hits,
                misses: this.state.misses,
                accuracy: accuracy,
                maxStreak: this.state.streak,
                instrument: this.selectedInstrument !== 'default' ? this.selectedInstrument : 'Automático'
            };

            try {
                // Tentar usar o método saveSession se existir
                if (typeof this.patientManager.saveSession === 'function') {
                    this.patientManager.saveSession(this.state.patientId, sessionData);
                    console.log('✅ Sessão salva no prontuário do paciente');
                } else {
                    // Fallback: adicionar sessão manualmente
                    const patient = this.patientManager.getPatient(this.state.patientId);
                    if (patient) {
                        if (!patient.sessions) {
                            patient.sessions = [];
                        }
                        patient.sessions.push(sessionData);
                        this.patientManager.updatePatient(this.state.patientId, patient);
                        console.log('✅ Sessão adicionada ao prontuário (fallback)');
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao salvar sessão:', error);
            }
        }

        renderFinishSummary() {
            if (!this.elements.finishSummary) {
                return;
            }

            const totalBalloons = this.getTotalBalloons();
            const accuracy = totalBalloons > 0 
                ? Math.round((this.state.hits / totalBalloons) * 100) 
                : 0;
            
            const summary = [
                `Paciente: ${this.state.patientName || 'Paciente'}`,
                `Música: ${this.currentMusicName || 'Sequência Aleatória'}`,
                `Dificuldade: ${this.getCurrentDifficulty().label}`,
                `Acertos: ${this.state.hits}`,
                `Erros / Perdidos: ${this.state.misses}`,
                `Precisão: ${Number.isFinite(accuracy) ? `${accuracy}%` : '--'}`
            ];

            this.elements.finishSummary.innerHTML = summary
                .map((line) => `<p>${line}</p>`)
                .join('');
        }

        playEffect(type, note) {
            if (!this.soundfontManager) {
                return;
            }

            let instrumentKey;
            
            if (type === 'success' && this.selectedInstrument !== 'default') {
                // Usar instrumento selecionado para acertos
                const parts = this.selectedInstrument.split('::');
                if (parts.length >= 3) {
                    const [category, soundfont, midiNumber] = parts;
                    instrumentKey = `${midiNumber}_${soundfont}_sf2_file`.toLowerCase();
                } else {
                    instrumentKey = this.effects.successInstrument;
                }
            } else {
                instrumentKey = type === 'success'
                    ? this.effects.successInstrument
                    : this.effects.errorInstrument;
            }

            if (!instrumentKey) {
                return;
            }

            try {
                this.soundfontManager.playNoteWithInstrument(note, instrumentKey, 0.6, type === 'success' ? 0.85 : 0.5);
            } catch (error) {
                console.warn('TerraGame: não foi possível reproduzir o efeito sonoro.', error);
            }
        }

        prepareEffectInstruments() {
            if (!this.soundfontManager) {
                return;
            }

            const entries = Object.entries(this.soundfontManager.availableInstruments || {});
            const lowercaseMatch = (text, keywords) => {
                if (!text) {
                    return false;
                }
                const base = text.toLowerCase();
                return keywords.some((keyword) => base.includes(keyword));
            };

            const pickInstrument = (keywords, fallback) => {
                const found = entries.find(([, info]) => lowercaseMatch(info.therapeutic, keywords));
                return found ? found[0] : fallback;
            };

            const successKey = pickInstrument(['alegr', 'positivo', 'energia', 'estimul'], 'glockenspiel');
            const errorKey = pickInstrument(['calma', 'seren', 'relax', 'tranquil', 'acolh'], 'harp');

            this.effects.successInstrument = successKey in (this.soundfontManager.availableInstruments || {})
                ? successKey
                : this.effects.successInstrument;
            if (!this.effects.successInstrument) {
                this.effects.successInstrument = 'glockenspiel';
            }

            this.effects.errorInstrument = errorKey in (this.soundfontManager.availableInstruments || {})
                ? errorKey
                : this.effects.errorInstrument;
            if (!this.effects.errorInstrument) {
                this.effects.errorInstrument = 'harp';
            }

            ['successInstrument', 'errorInstrument'].forEach((key) => {
                const instrument = this.effects[key];
                if (instrument) {
                    this.soundfontManager.loadInstrument(instrument, {
                        setCurrent: false,
                        clearKit: false
                    }).catch((error) => {
                        console.warn(`TerraGame: falha ao pré-carregar ${instrument}`, error);
                    });
                }
            });
        }

        updateStats() {
            const total = this.getTotalBalloons();
            if (this.elements.stats.patient) {
                this.elements.stats.patient.textContent = this.state.patientName || '--';
            }
            if (this.elements.stats.difficulty) {
                const difficulty = this.getCurrentDifficulty();
                // Calcular duração da música ou usar fallback
                let durationDisplay;
                if (this.musicSequence && this.musicSequence.length > 0) {
                    const lastNote = this.musicSequence[this.musicSequence.length - 1];
                    const totalMs = lastNote.time + lastNote.duration;
                    const minutes = Math.round(totalMs / 60000);
                    durationDisplay = `${difficulty.label} · ${minutes} min`;
                } else {
                    const minutes = Math.round((difficulty.fallbackDuration || 300) / 60);
                    durationDisplay = `${difficulty.label} · ${minutes} min`;
                }
                this.elements.stats.difficulty.textContent = durationDisplay;
            }
            if (this.elements.stats.hits) {
                this.elements.stats.hits.textContent = String(this.state.hits).padStart(2, '0');
            }
            if (this.elements.stats.misses) {
                this.elements.stats.misses.textContent = String(this.state.misses).padStart(2, '0');
            }
            if (this.elements.stats.remaining) {
                const remaining = Math.max(total - this.state.balloonsResolved, 0);
                this.elements.stats.remaining.textContent = String(remaining).padStart(2, '0');
            }
            if (this.elements.stats.streak) {
                this.elements.stats.streak.textContent = String(this.state.streak).padStart(2, '0');
            }
            if (this.elements.stats.target) {
                const targetNote = this.state.targetNote;
                this.elements.stats.target.textContent = targetNote || '--';
                const targetColor = targetNote ? this.resolveNoteColor(targetNote) : '#e5e7eb';
                this.elements.stats.target.style.setProperty('color', targetColor);
            }
        }

        clearStage() {
            if (!this.elements.stage) {
                return;
            }
            this.activeBalloons.forEach((balloon) => balloon.remove());
            this.activeBalloons.clear();

            // Remover apenas elementos dinâmicos (balões e partículas), preservando o cenário
            const dynamicNodes = this.elements.stage.querySelectorAll('.terra-game-balloon, canvas, .terra-game-combo-feedback');
            dynamicNodes.forEach((node) => node.remove());
        }

        cleanupGame() {
            this.stopMusicScheduler();
            this.midiNoteCooldowns.clear();
            if (this.midiActivityTimeout) {
                window.clearTimeout(this.midiActivityTimeout);
                this.midiActivityTimeout = null;
            }
            if (this.stagePulseTimeout) {
                window.clearTimeout(this.stagePulseTimeout);
                this.stagePulseTimeout = null;
            }
            if (this.targetPulseTimeout) {
                window.clearTimeout(this.targetPulseTimeout);
                this.targetPulseTimeout = null;
            }
            this.clearStage();
            if (this.elements.stage) {
                this.elements.stage.classList.remove('terra-game-stage-midi-hit', 'terra-game-stage-midi-miss');
            }
            this.state.status = 'idle';
            this.updateControlStates();
            this.updateMIDIStatusUI();
        }

        updateControlStates() {
            const controls = this.elements.controls;
            if (!controls) {
                return;
            }

            const { container, pause, resume, difficulty } = controls;
            const status = this.state.status;
            const isRunning = status === 'running';
            const isPaused = status === 'paused';

            if (container) {
                container.hidden = status === 'idle' || status === 'finished';
                container.dataset.state = status;
            }

            if (this.elements.overlay) {
                this.elements.overlay.dataset.state = status;
            }

            if (pause) {
                pause.hidden = !isRunning;
                pause.disabled = !isRunning;
            }

            if (resume) {
                resume.hidden = !isPaused;
                resume.disabled = !isPaused;
            }

            if (difficulty) {
                const disableDifficulty = status === 'running';
                difficulty.disabled = disableDifficulty;
                if (disableDifficulty) {
                    difficulty.setAttribute('aria-disabled', 'true');
                } else {
                    difficulty.removeAttribute('aria-disabled');
                }
            }
        }

        resolveNoteColor(note) {
            if (!note) {
                return '#f0f4f8';
            }

            if (window.audioEngine && typeof window.audioEngine.getNoteColor === 'function') {
                const resolved = window.audioEngine.getNoteColor(note);
                if (resolved) {
                    return resolved;
                }
            }
            return NOTE_COLORS[note] || '#fbc02d';
        }

        handlePatientSelectChange(value) {
            if (!this.elements.setupFeedback) {
                return;
            }

            if (!value) {
                this.displaySetupFeedback('Selecione ou cadastre um paciente para liberar o Terra Game.', 'info');
                return;
            }

            const manager = this.patientManager || window.patientManager;
            const patient = manager && typeof manager.getPatient === 'function'
                ? manager.getPatient(value)
                : null;

            const name = patient?.fullName?.trim();
            const message = name
                ? `${name} pronto para iniciar. Ajuste o nível e toque em "Iniciar jogo".`
                : 'Paciente selecionado. Ajuste o nível e toque em "Iniciar jogo".';

            this.displaySetupFeedback(message, 'info');
        }

        initPatientPanel() {
            if (!this.elements.setup) {
                return;
            }

            const Panel = window.TerraGamePatientPanel;
            if (typeof Panel !== 'function') {
                console.warn('TerraGame: componente TerraGamePatientPanel indisponível.');
                return;
            }

            this.patientPanel = new Panel({
                root: this.elements.setup,
                patientManager: this.patientManager,
                onPatientSaved: (patient) => {
                    const targetId = patient?.id || null;
                    this.refreshPatients({ preserveSelection: false, selectPatientId: targetId });
                    if (targetId) {
                        this.handlePatientSelectChange(targetId);
                    }
                },
                onPatientsImported: () => {
                    this.refreshPatients({ preserveSelection: false });
                    const current = this.elements.patientSelect?.value;
                    if (current) {
                        this.handlePatientSelectChange(current);
                    }
                },
                onPanelClosed: () => {
                    if (this.elements.patientSelect) {
                        this.elements.patientSelect.focus({ preventScroll: true });
                    }
                }
            });
        }
    }

    function bootstrapTerraGame() {
        const instance = new TerraGame();
        instance.init();
        window.terraGame = instance;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapTerraGame);
    } else {
        bootstrapTerraGame();
    }
})();
