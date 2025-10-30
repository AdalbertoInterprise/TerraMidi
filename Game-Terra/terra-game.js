(function() {
    'use strict';

    const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];

    const MIDI_STATUS = {
        NOTE_OFF: 0x80,
        NOTE_ON: 0x90
    };

    // Mapeamento prioritário para hardware Terra (Board Bells e revisões)
    const BOARD_BELLS_MIDI_TO_GAME_NOTE = Object.freeze({
        // Firmware atual (C2-C3)
        48: 'C',   // C2
        50: 'D',   // D2
        52: 'E',   // E2
        53: 'F',   // F2
        55: 'G',   // G2
        57: 'A',   // A2
        59: 'B',   // B2
        60: 'C2',  // C3 (rotulado C2 no keyboard)

        // Revisão antiga (grave C1-C2)
        36: 'C',   // C1
        38: 'D',   // D1
        40: 'E',   // E1
        41: 'F',   // F1
        43: 'G',   // G1
        45: 'A',   // A1
        47: 'B',   // B1

        // Revisão aguda (C4-C5)
        72: 'C',   // C4
        74: 'D',   // D4
        76: 'E',   // E4
        77: 'F',   // F4
        79: 'G',   // G4
        81: 'A',   // A4
        83: 'B',   // B4
        84: 'C2'   // C5
    });

    // Mapeamento base (controladores MIDI padrão)
    const MIDI_TO_GAME_NOTE = Object.freeze({
        60: 'C',   // C4
        62: 'D',   // D4
        64: 'E',   // E4
        65: 'F',   // F4
        67: 'G',   // G4
        69: 'A',   // A4
        71: 'B',   // B4
        72: 'C2'   // C5
    });

    // Conversão por classe de altura (pitch class) para notas-alvo
    const MIDI_PITCHCLASS_TO_NOTE = {
        0: 'C',    // C / B#
        1: 'C',    // C# / Db → aproximação para C
        2: 'D',    // D
        3: 'D',    // D# / Eb → aproximação para D
        4: 'E',    // E
        5: 'F',    // F
        6: 'F',    // F# / Gb → aproximação para F
        7: 'G',    // G
        8: 'G',    // G# / Ab → aproximação para G
        9: 'A',    // A
        10: 'A',   // A# / Bb → aproximação para A
        11: 'B'    // B / Cb
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

    const BALLOON_DIRECTION_CLASSES = Object.freeze([
        'terra-game-balloon--top-down',
        'terra-game-balloon--bottom-up',
        'terra-game-balloon--left-right',
        'terra-game-balloon--right-left'
    ]);

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

    const FALLBACK_NOTE_MODELS = Object.freeze({
        easy: [
            [
                { note: 'C', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'D', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'E', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'D', durationRatio: 0.95, timeOffsetRatio: 0 }
            ],
            [
                { note: 'C', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'E', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'G', durationRatio: 0.95, timeOffsetRatio: 0 },
                { note: 'E', durationRatio: 0.95, timeOffsetRatio: 0 }
            ]
        ],
        medium: [
            [
                { note: 'C', durationRatio: 0.85, timeOffsetRatio: 0 },
                { note: 'E', durationRatio: 0.75, timeOffsetRatio: -0.05 },
                { note: 'G', durationRatio: 0.75, timeOffsetRatio: 0.05 },
                { note: 'A', durationRatio: 0.85, timeOffsetRatio: 0 },
                { note: 'F', durationRatio: 0.75, timeOffsetRatio: -0.05 },
                { note: 'D', durationRatio: 0.85, timeOffsetRatio: 0 }
            ],
            [
                { note: 'E', durationRatio: 0.85, timeOffsetRatio: 0 },
                { note: 'G', durationRatio: 0.7, timeOffsetRatio: 0.05 },
                { note: 'A', durationRatio: 0.7, timeOffsetRatio: -0.05 },
                { note: 'F', durationRatio: 0.85, timeOffsetRatio: 0 },
                { note: 'C', durationRatio: 0.85, timeOffsetRatio: 0 },
                { note: 'D', durationRatio: 0.7, timeOffsetRatio: 0.05 }
            ]
        ],
        hard: [
            [
                { note: 'C', durationRatio: 0.6, timeOffsetRatio: -0.15 },
                { note: 'E', durationRatio: 0.6, timeOffsetRatio: 0.05 },
                { note: 'G', durationRatio: 0.5, timeOffsetRatio: 0.15 },
                { note: 'B', durationRatio: 0.5, timeOffsetRatio: -0.1 },
                { note: 'C2', durationRatio: 0.4, timeOffsetRatio: 0.05 },
                { note: 'A', durationRatio: 0.5, timeOffsetRatio: -0.05 },
                { note: 'F', durationRatio: 0.5, timeOffsetRatio: 0.12 },
                { note: 'D', durationRatio: 0.4, timeOffsetRatio: -0.08 }
            ],
            [
                { note: 'G', durationRatio: 0.55, timeOffsetRatio: -0.12 },
                { note: 'A', durationRatio: 0.45, timeOffsetRatio: 0.08 },
                { note: 'B', durationRatio: 0.45, timeOffsetRatio: -0.05 },
                { note: 'C2', durationRatio: 0.4, timeOffsetRatio: 0.12 },
                { note: 'A', durationRatio: 0.5, timeOffsetRatio: -0.08 },
                { note: 'G', durationRatio: 0.45, timeOffsetRatio: 0.05 },
                { note: 'E', durationRatio: 0.45, timeOffsetRatio: -0.12 },
                { note: 'C', durationRatio: 0.5, timeOffsetRatio: 0.08 }
            ]
        ]
    });

    const FALLBACK_MODEL_SETTINGS = Object.freeze({
        easy: { swing: 0.04, durationVariance: 0.08 },
        medium: { swing: 0.1, durationVariance: 0.12 },
        hard: { swing: 0.18, durationVariance: 0.18 }
    });

    const DIFFICULTY_INSTRUMENT_MAP = Object.freeze({
        easy: 'music_box',
        medium: 'piano_acoustic',
        hard: 'piano_bright'
    });

    const FALLBACK_INSTRUMENT_CATALOG = Object.freeze({
        music_box: { name: 'Caixa de Música', category: 'Percussão Melódica', icon: '🎁' },
        glockenspiel: { name: 'Glockenspiel', category: 'Percussão Melódica', icon: '🔔' },
        marimba: { name: 'Marimba', category: 'Percussão Melódica', icon: '🪵' },
        xylophone: { name: 'Xilofone', category: 'Percussão Melódica', icon: '🎼' },
        harp: { name: 'Harpa', category: 'Cordas Orquestrais', icon: '🪕' },
        piano_acoustic: { name: 'Piano Acústico', category: 'Pianos', icon: '🎹' },
        piano_bright: { name: 'Piano Brilhante', category: 'Pianos', icon: '✨' },
        piano_grand: { name: 'Piano de Cauda', category: 'Pianos', icon: '🎹' },
        guitar_nylon: { name: 'Violão Nylon', category: 'Cordas Dedilhadas', icon: '🎸' },
        pad_warm: { name: 'Pad Quente', category: 'Pads Sintéticos', icon: '☀️' },
        flute: { name: 'Flauta', category: 'Flautas', icon: '🪈' }
    });

    const MUSIC_TAG_INSTRUMENT_RULES = Object.freeze([
        { key: 'music_box', tags: ['ninar', 'lullaby', 'acalent', 'calma', 'suave'] },
        { key: 'marimba', tags: ['percussivo', 'batuc', 'samba', 'ritmo'] },
        { key: 'glockenspiel', tags: ['ciranda', 'roda', 'brincadeira', 'rodinha'] },
        { key: 'guitar_nylon', tags: ['folclore', 'folclorica', 'folklore', 'tradicao'] },
        { key: 'piano_acoustic', tags: ['cantiga', 'infantil', 'tradicional', 'melodia'] }
    ]);

    const RANGE_INSTRUMENT_RULES = Object.freeze([
        {
            key: 'piano_grand',
            test: (range) => Array.isArray(range) && range.some((note) =>
                typeof note === 'string' && note.trim().toUpperCase().endsWith('2'))
        }
    ]);

    const INSTRUMENT_ALIAS_MAP = Object.freeze({
        piano: 'piano_acoustic',
        pianoacustico: 'piano_acoustic',
        pianoacustic: 'piano_acoustic',
        pianoclasico: 'piano_grand',
        pianocauda: 'piano_grand',
        pianobrilhante: 'piano_bright',
        pianobright: 'piano_bright',
        pianogrande: 'piano_grand',
        caixademusica: 'music_box',
        musicbox: 'music_box',
        glockenspiel: 'glockenspiel',
        marimba: 'marimba',
        xilofone: 'xylophone',
        xylophone: 'xylophone',
        violao: 'guitar_nylon',
        violaonylon: 'guitar_nylon',
        guitar: 'guitar_nylon',
        flauta: 'flute',
        flute: 'flute',
        pad: 'pad_warm',
        relax: 'pad_warm'
    });

    class TerraGame {
        constructor() {
            this.elements = {};
            this.state = this.createInitialState();
            this.activeBalloons = new Map();
            this.effects = {
                successInstrument: null,
                errorInstrument: null,
                defaultSuccessInstrument: null,
                defaultErrorInstrument: null
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
            this.selectedMusicId = null;
            this.selectedMusicMeta = null;
            this.activeMusic = null;
            this.availableMusics = [];
            this.availableMusicsByDifficulty = { easy: [], medium: [], hard: [] };
            this.musicCatalog = new Map();
            this.currentMusicInstrument = null;
            this.sessionInstrument = null;
            this.pendingSessionInstrument = null;
            this.selectedInstrument = 'default';
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
            this.setBalloonSpawnDirection(this.state.spawnDirection);
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
            this.elements.directionSelect = document.getElementById('terra-game-direction');
            this.elements.controls = {
                container: document.querySelector('.terra-game-controls'),
                pause: document.getElementById('terra-game-pause'),
                resume: document.getElementById('terra-game-resume'),
                difficulty: document.getElementById('terra-game-difficulty')
            };
            this.elements.finishSummary = document.getElementById('terra-game-finish-summary');
            this.elements.finishRestart = document.getElementById('terra-game-restart');
            this.elements.finishExit = document.querySelector('.terra-game-exit-finish');

            this.elements.patientShortcuts = {
                openCreate: document.getElementById('terra-game-open-create'),
                openImport: document.getElementById('terra-game-open-import'),
                createPanel: document.getElementById('terra-game-create-panel'),
                importPanel: document.getElementById('terra-game-import-panel'),
                createForm: document.getElementById('terra-game-create-form'),
                createCancel: document.getElementById('terra-game-create-cancel'),
                createFeedback: document.getElementById('terra-game-create-feedback'),
                importTrigger: document.getElementById('terra-game-import-trigger'),
                importCancel: document.getElementById('terra-game-import-cancel'),
                importFeedback: document.getElementById('terra-game-import-feedback'),
                importInput: document.getElementById('terra-game-import-input')
            };
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
                    this.handleMusicSelectChange(event.target.value || null);
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

            if (this.elements.directionSelect) {
                this.elements.directionSelect.addEventListener('change', (event) => {
                    this.setBalloonSpawnDirection(event.target.value);
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
            
            this.bindPatientShortcutEvents();

            // CRITICAL: Interceptar eventos do módulo de pacientes
            this.monitorPatientModuleInteractions();
        }

        bindPatientShortcutEvents() {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            const {
                openCreate,
                openImport,
                createForm,
                createCancel,
                importTrigger,
                importCancel,
                importInput
            } = shortcuts;

            if (openCreate) {
                openCreate.addEventListener('click', () => {
                    this.openCreatePanel();
                });
            }

            if (openImport) {
                openImport.addEventListener('click', () => {
                    this.openImportPanel();
                });
            }

            if (createCancel) {
                createCancel.addEventListener('click', () => {
                    this.closeCreatePanel({ focusSelect: true });
                });
            }

            if (importCancel) {
                importCancel.addEventListener('click', () => {
                    this.closeImportPanel({ focusSelect: true });
                });
            }

            if (createForm) {
                createForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.handleCreateFormSubmit(event.currentTarget);
                });
            }

            if (importTrigger) {
                importTrigger.addEventListener('click', () => {
                    if (importInput) {
                        importInput.click();
                    }
                });
            }

            if (importInput) {
                importInput.addEventListener('change', (event) => {
                    const input = event.currentTarget;
                    const [file] = input.files || [];
                    if (file) {
                        this.handleImportFile(file);
                    }
                    input.value = '';
                });
            }
        }

        openCreatePanel() {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            this.togglePatientPanels({ showCreate: true });
            this.resetImportPanel();

            if (shortcuts.createFeedback) {
                this.setPanelFeedback(shortcuts.createFeedback, 'Preencha os dados essenciais do paciente.', 'info');
            }

            if (!this.elements.patientSelect?.value) {
                this.displaySetupFeedback('Cadastre um paciente para liberar o Terra Game.', 'info');
            }

            const fullNameField = shortcuts.createForm?.querySelector('[name="fullName"]');
            if (fullNameField) {
                fullNameField.focus({ preventScroll: true });
            }
        }

        closeCreatePanel({ focusSelect = false } = {}) {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            this.togglePatientPanels({ showCreate: false });
            this.resetCreatePanel();

            if (focusSelect && this.elements.patientSelect) {
                this.elements.patientSelect.focus({ preventScroll: true });
            }

            if (!this.elements.patientSelect?.value) {
                this.displaySetupFeedback('Selecione ou cadastre um paciente para liberar o Terra Game.', 'info');
            }
        }

        openImportPanel() {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            this.togglePatientPanels({ showImport: true });
            this.resetCreatePanel();

            if (shortcuts.importFeedback) {
                this.setPanelFeedback(shortcuts.importFeedback, 'Selecione um arquivo JSON exportado anteriormente.', 'info');
            }

            if (!this.elements.patientSelect?.value) {
                this.displaySetupFeedback('Importe um arquivo JSON para restaurar seus pacientes.', 'info');
            }

            shortcuts.importTrigger?.focus({ preventScroll: true });
        }

        closeImportPanel({ focusSelect = false } = {}) {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            this.togglePatientPanels({ showImport: false });
            this.resetImportPanel();

            if (focusSelect && this.elements.patientSelect) {
                this.elements.patientSelect.focus({ preventScroll: true });
            }

            if (!this.elements.patientSelect?.value) {
                this.displaySetupFeedback('Selecione ou cadastre um paciente para liberar o Terra Game.', 'info');
            }
        }

        togglePatientPanels({ showCreate = false, showImport = false } = {}) {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            if (shortcuts.createPanel) {
                shortcuts.createPanel.hidden = !showCreate;
                shortcuts.createPanel.setAttribute('aria-hidden', showCreate ? 'false' : 'true');
            }

            if (shortcuts.importPanel) {
                shortcuts.importPanel.hidden = !showImport;
                shortcuts.importPanel.setAttribute('aria-hidden', showImport ? 'false' : 'true');
            }
        }

        resetCreatePanel({ keepFeedback = false } = {}) {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            shortcuts.createForm?.reset();

            if (!keepFeedback && shortcuts.createFeedback) {
                this.setPanelFeedback(shortcuts.createFeedback, '');
            }
        }

        resetImportPanel({ keepFeedback = false } = {}) {
            const shortcuts = this.elements.patientShortcuts;
            if (!shortcuts) {
                return;
            }

            if (shortcuts.importInput) {
                shortcuts.importInput.value = '';
            }

            if (!keepFeedback && shortcuts.importFeedback) {
                this.setPanelFeedback(shortcuts.importFeedback, '');
            }
        }

        setPanelFeedback(element, message, tone = 'info') {
            if (!element) {
                return;
            }
            element.textContent = message || '';
            if (message) {
                element.dataset.tone = tone;
            } else {
                delete element.dataset.tone;
            }
        }

        handleCreateFormSubmit(formElement) {
            const shortcuts = this.elements.patientShortcuts;
            const manager = this.getPatientManager();

            if (!formElement || !shortcuts || !manager || typeof manager.savePatient !== 'function') {
                this.setPanelFeedback(shortcuts?.createFeedback, 'Cadastro de pacientes indisponível no momento.', 'error');
                return;
            }

            const form = formElement;
            const formData = new FormData(form);
            const fullName = String(formData.get('fullName') || '').trim();
            const birthDateValue = formData.get('birthDate');
            const birthDate = birthDateValue ? String(birthDateValue) : '';
            const notes = String(formData.get('notes') || '').trim();

            if (!fullName) {
                this.setPanelFeedback(shortcuts.createFeedback, 'Informe o nome completo do paciente.', 'warning');
                const field = form.querySelector('[name="fullName"]');
                field?.focus({ preventScroll: true });
                return;
            }

            try {
                const saved = manager.savePatient({
                    fullName,
                    birthDate: birthDate || null,
                    notes
                });

                this.setPanelFeedback(shortcuts.createFeedback, `Paciente "${saved.fullName || 'Sem nome'}" cadastrado com sucesso.`, 'success');

                this.refreshPatients({ preserveSelection: false, selectPatientId: saved.id });

                if (saved.id && this.elements.patientSelect) {
                    this.elements.patientSelect.value = saved.id;
                    this.handlePatientSelectChange(saved.id);
                }

                this.displaySetupFeedback('Paciente cadastrado com sucesso. Ajuste o nível do jogo e inicie quando estiver pronto.', 'success');

                if (this.patientPanel && typeof this.patientPanel.notifyPatientSaved === 'function') {
                    this.patientPanel.notifyPatientSaved(saved);
                }

                form.reset();
                this.closeCreatePanel({ focusSelect: true });
                this.notifyPatientsUpdated();
            } catch (error) {
                console.error('TerraGame: falha ao salvar paciente.', error);
                this.setPanelFeedback(shortcuts.createFeedback, 'Não foi possível salvar o paciente. Tente novamente.', 'error');
                this.displaySetupFeedback('Não foi possível salvar o paciente. Verifique os dados e tente novamente.', 'error');
            }
        }

        async handleImportFile(file) {
            const shortcuts = this.elements.patientShortcuts;
            const manager = this.getPatientManager();
            if (!shortcuts || !manager || typeof manager.importData !== 'function' || typeof manager.getAllPatients !== 'function') {
                this.setPanelFeedback(shortcuts?.importFeedback, 'Importação indisponível neste momento.', 'error');
                return;
            }

            this.setPanelFeedback(shortcuts.importFeedback, 'Processando arquivo...', 'info');

            try {
                const previousPatients = manager.getAllPatients();
                const previousIds = new Set(previousPatients.map((patient) => patient.id));

                const text = await file.text();
                const payload = this.parseImportPayload(text);

                manager.importData(payload, { merge: true });

                const updatedPatients = manager.getAllPatients();
                const fileName = file && typeof file.name === 'string' ? file.name : null;
                const addedCount = updatedPatients.reduce((count, patient) => {
                    if (!patient || !patient.id) {
                        return count;
                    }
                    return previousIds.has(patient.id) ? count : count + 1;
                }, 0);
                const hasPatients = updatedPatients.length > 0;
                const firstNewPatient = updatedPatients.find((patient) => patient && !previousIds.has(patient.id));
                const currentSelection = this.elements.patientSelect?.value || '';
                const selectPatientId = currentSelection || firstNewPatient?.id || (hasPatients ? updatedPatients[0].id : null);

                this.refreshPatients({ preserveSelection: true, selectPatientId });

                if (selectPatientId) {
                    this.handlePatientSelectChange(selectPatientId);
                } else if (hasPatients) {
                    this.displaySetupFeedback('Cadastros importados. Escolha um paciente para iniciar o Terra Game.', 'info');
                } else {
                    this.displaySetupFeedback('Arquivo importado, mas nenhum paciente foi encontrado.', 'warning');
                }

                this.notifyPatientsUpdated();

                const total = updatedPatients.length;
                if (addedCount > 0) {
                    this.setPanelFeedback(shortcuts.importFeedback, `Importação concluída com sucesso. ${addedCount} novo(s) paciente(s) adicionado(s). Total disponível: ${total}.`, 'success');
                } else {
                    this.setPanelFeedback(shortcuts.importFeedback, `Importação concluída com sucesso. ${total} paciente(s) disponível(is).`, 'success');
                }
                this.displaySetupFeedback('Importação concluída com sucesso! Selecione um paciente para iniciar a sessão.', 'success');
                this.closeImportPanel({ focusSelect: true });

                if (this.patientPanel && typeof this.patientPanel.notifyPatientsImported === 'function') {
                    this.patientPanel.notifyPatientsImported({
                        total,
                        addedCount,
                        fileName,
                        previousTotal: previousPatients.length
                    });
                }
            } catch (error) {
                console.error('TerraGame: falha ao importar pacientes.', error);
                this.setPanelFeedback(shortcuts.importFeedback, 'Arquivo inválido ou corrompido. Verifique e tente novamente.', 'error');
                this.displaySetupFeedback('Não foi possível importar pacientes. Verifique o arquivo JSON e tente novamente.', 'error');
                shortcuts.importTrigger?.focus({ preventScroll: true });
            }
        }

        parseImportPayload(rawText) {
            if (!rawText) {
                throw new Error('Conteúdo de importação vazio');
            }

            let payload;
            try {
                payload = JSON.parse(rawText);
            } catch (error) {
                throw new Error('JSON inválido');
            }

            if (!payload || typeof payload !== 'object') {
                throw new Error('Estrutura de importação inválida');
            }

            if (!Array.isArray(payload.patients) && !payload.sessions) {
                throw new Error('Dados de pacientes não encontrados no arquivo');
            }

            return payload;
        }

        notifyPatientsUpdated() {
            try {
                const manager = this.getPatientManager();
                const total = manager && typeof manager.getAllPatients === 'function'
                    ? manager.getAllPatients().length
                    : undefined;

                const eventDetail = typeof CustomEvent === 'function'
                    ? new CustomEvent('terra-midi:patients-updated', { detail: { total } })
                    : null;

                if (eventDetail) {
                    window.dispatchEvent(eventDetail);
                }
            } catch (error) {
                console.warn('TerraGame: não foi possível emitir evento de atualização de pacientes.', error);
            }
        }

        getPatientManager() {
            return this.patientManager || window.patientManager || null;
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
            const pending = this.sessionInstrument || this.pendingSessionInstrument || null;
            this.applySessionInstrument(pending);
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

            if (BOARD_BELLS_MIDI_TO_GAME_NOTE[midiNote]) {
                return BOARD_BELLS_MIDI_TO_GAME_NOTE[midiNote];
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

                const { progress } = this.getBalloonProgress(balloon, stageRect);
                candidates.push({ balloon, progress });
            });

            if (!candidates.length) {
                return null;
            }

            candidates.sort((a, b) => b.progress - a.progress);
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

                const { progress } = this.getBalloonProgress(balloon, stageRect);
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
                        1 - progress
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

                const { progress } = this.getBalloonProgress(balloon, stageRect);
                candidates.push({ note, progress });
            });

            if (!candidates.length) {
                this.updateTargetNote(null, { highlight: false });
                return;
            }

            candidates.sort((a, b) => b.progress - a.progress);

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
            const difficulties = Object.keys(DIFFICULTIES);
            const aggregated = [];
            const byDifficulty = Object.fromEntries(difficulties.map((key) => [key, []]));
            const catalog = new Map();

            for (const diff of difficulties) {
                const difficultyConfig = DIFFICULTIES[diff];
                const basePath = difficultyConfig.musicPath;

                try {
                    const response = await fetch(`${basePath}index.json`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const index = await response.json();
                    const files = Array.isArray(index.files) ? index.files : [];

                    files.forEach((entry) => {
                        const id = `${diff}:${entry.file}`;
                        const musicMeta = {
                            id,
                            name: entry.name,
                            file: entry.file,
                            difficulty: diff,
                            difficultyLabel: difficultyConfig.label,
                            path: `${basePath}${entry.file}`,
                            duration: entry.duration,
                            noteCount: entry.noteCount,
                            bpm: entry.bpm,
                            measures: entry.measures,
                            tags: entry.tags || [],
                            summary: entry.summary || '',
                            previewRange: entry.previewRange || null,
                            license: entry.license || null,
                            source: entry.source || null,
                            instrument: entry.instrument || null
                        };

                        aggregated.push(musicMeta);
                        byDifficulty[diff].push(musicMeta);
                        catalog.set(id, musicMeta);
                    });
                } catch (error) {
                    console.warn(`TerraGame: Não foi possível carregar índice de músicas para ${diff}:`, error.message);
                    byDifficulty[diff] = [];
                }
            }

            aggregated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

            this.availableMusics = aggregated;
            this.availableMusicsByDifficulty = byDifficulty;
            this.musicCatalog = catalog;

            this.updateMusicSelectOptions();
        }

        updateMusicSelectOptions() {
            if (!this.elements.musicSelect) {
                return;
            }

            const select = this.elements.musicSelect;
            const previousValue = select.value;
            select.innerHTML = '';

            if (!this.availableMusics.length) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma música disponível';
                option.disabled = true;
                option.selected = true;
                select.appendChild(option);
                this.applyMusicSelection(null, { silent: true });
                this.updateStats();
                return;
            }

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Selecione uma música para a sessão';
            placeholder.disabled = true;
            select.appendChild(placeholder);

            Object.keys(DIFFICULTIES).forEach((key) => {
                const entries = this.availableMusicsByDifficulty[key] || [];
                if (!entries.length) {
                    return;
                }

                const optgroup = document.createElement('optgroup');
                optgroup.label = `${DIFFICULTIES[key].label} (${entries.length})`;

                entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                entries.forEach((entry) => {
                    const option = document.createElement('option');
                    option.value = entry.id;
                    option.textContent = this.formatMusicOptionLabel(entry);
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            });

            const hasPrevious = previousValue && this.musicCatalog.has(previousValue);
            const defaultEntry = hasPrevious
                ? this.musicCatalog.get(previousValue)
                : this.availableMusics[0];

            if (defaultEntry) {
                select.value = defaultEntry.id;
            }

            this.applyMusicSelection(select.value || null, { silent: true });
            this.updateStats();
        }

        formatMusicOptionLabel(entry) {
            const durationLabel = typeof entry.duration === 'number'
                ? this.formatDurationLabel(entry.duration)
                : 'duração desconhecida';
            const noteCountLabel = typeof entry.noteCount === 'number'
                ? `${entry.noteCount} notas`
                : 'notas --';

            return `${entry.name} · ${durationLabel} · ${noteCountLabel}`;
        }

        formatDurationLabel(durationMs) {
            if (!Number.isFinite(durationMs) || durationMs <= 0) {
                return '0:00';
            }
            const totalSeconds = Math.round(durationMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        }

        applyMusicSelection(id, { silent = false } = {}) {
            let resolvedMeta = null;
            if (id && this.musicCatalog.has(id)) {
                resolvedMeta = this.musicCatalog.get(id);
                this.selectedMusicId = id;
                this.selectedMusicMeta = resolvedMeta;
                if (this.state?.status === 'idle' && resolvedMeta?.difficulty) {
                    this.state.difficultyKey = resolvedMeta.difficulty;
                }
            } else {
                this.selectedMusicId = null;
                this.selectedMusicMeta = null;
            }

            if (!silent) {
                this.updateStats();
            }

            return resolvedMeta;
        }

        handleMusicSelectChange(selectedId) {
            if (this.state.status !== 'idle') {
                // Não permitir troca durante sessão ativa
                if (this.elements.musicSelect) {
                    this.elements.musicSelect.value = this.selectedMusicId || '';
                }
                this.displaySetupFeedback('Finalize ou reinicie a sessão para trocar a música.', 'info');
                return;
            }

            const musicMeta = this.applyMusicSelection(selectedId);
            if (!musicMeta) {
                this.displaySetupFeedback('Selecione uma música válida para iniciar o Terra Game.', 'warning');
            } else {
                this.displaySetupFeedback('', 'info');
            }
        }

        async loadMusicSequence() {
            const selection = this.resolveSessionMusicMeta();
            const fallbackKey = selection?.difficulty || this.state.difficultyKey || 'easy';
            const difficultyConfig = DIFFICULTIES[fallbackKey] || DIFFICULTIES.easy;

            if (selection) {
                try {
                    const response = await fetch(selection.path);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const musicData = await response.json();
                    const sequence = Array.isArray(musicData.notes) ? musicData.notes : [];
                    const instrument = this.resolveInstrumentForMusic(selection, musicData);

                    return {
                        sequence,
                        difficultyKey: selection.difficulty,
                        meta: selection,
                        data: musicData,
                        name: musicData.name || selection.name,
                        instrument
                    };
                } catch (error) {
                    console.warn(`TerraGame: falha ao carregar música "${selection.name}" (${selection.path}). Fallback automático será usado.`, error.message);
                }
            }

            const sequence = this.generateFallbackSequence(fallbackKey, difficultyConfig);
            const instrument = this.resolveFallbackInstrument(fallbackKey);

            return {
                sequence,
                difficultyKey: fallbackKey,
                meta: null,
                data: null,
                name: 'Sequência Aleatória',
                instrument
            };
        }

        resolveSessionMusicMeta() {
            if (this.selectedMusicMeta) {
                return this.selectedMusicMeta;
            }

            const difficultyKey = this.state?.difficultyKey || 'easy';
            const pool = this.availableMusicsByDifficulty[difficultyKey] && this.availableMusicsByDifficulty[difficultyKey].length
                ? this.availableMusicsByDifficulty[difficultyKey]
                : this.availableMusics;

            if (!pool || !pool.length) {
                return null;
            }

            return pool[Math.floor(Math.random() * pool.length)];
        }

        resolveInstrumentForMusic(selection, musicData) {
            const fallbackKey = selection?.difficulty || this.state.difficultyKey || 'easy';
            const fallbackInstrument = this.resolveFallbackInstrument(fallbackKey);

            if (!selection && !musicData) {
                return fallbackInstrument;
            }

            const instrumentHints = [];
            if (musicData?.instrument) {
                instrumentHints.push(musicData.instrument);
            }
            if (selection?.instrument) {
                instrumentHints.push(selection.instrument);
            }

            for (const hint of instrumentHints) {
                const normalizedHint = this.normalizeInstrumentKey(hint);
                if (normalizedHint && this.instrumentExists(normalizedHint)) {
                    return this.inflateInstrumentInfo(normalizedHint, 'metadata', { original: hint });
                }
            }

            const tagSet = new Set();
            const collectTags = (list) => {
                if (!Array.isArray(list)) {
                    return;
                }
                list.forEach((tag) => {
                    const normalized = this.normalizeTagValue(tag);
                    if (normalized) {
                        tagSet.add(normalized);
                    }
                });
            };

            collectTags(selection?.tags);
            collectTags(musicData?.tags);

            if (tagSet.size > 0) {
                const tagMatch = this.resolveInstrumentFromTags(tagSet);
                if (tagMatch && this.instrumentExists(tagMatch)) {
                    return this.inflateInstrumentInfo(tagMatch, 'tags', { tags: Array.from(tagSet) });
                }
            }

            const summaryPieces = [];
            if (selection?.summary) {
                summaryPieces.push(selection.summary);
            }
            if (musicData?.summary) {
                summaryPieces.push(musicData.summary);
            }
            const summaryNormalized = this.normalizeText(summaryPieces.join(' '));

            if (summaryNormalized.includes('relax') || summaryNormalized.includes('respira')) {
                if (this.instrumentExists('pad_warm')) {
                    return this.inflateInstrumentInfo('pad_warm', 'summary', {
                        summary: summaryPieces.join(' ').trim()
                    });
                }
            }

            const previewRange = Array.isArray(musicData?.previewRange) && musicData.previewRange.length
                ? musicData.previewRange
                : selection?.previewRange;

            const rangeMatch = this.resolveInstrumentFromRange(previewRange);
            if (rangeMatch && this.instrumentExists(rangeMatch)) {
                return this.inflateInstrumentInfo(rangeMatch, 'range', {
                    previewRange: Array.isArray(previewRange) ? [...previewRange] : []
                });
            }

            const bpm = Number(musicData?.bpm || selection?.bpm);
            if (Number.isFinite(bpm)) {
                if (bpm >= 110 && this.instrumentExists('piano_bright')) {
                    return this.inflateInstrumentInfo('piano_bright', 'tempo', { bpm });
                }
                if (bpm <= 68 && this.instrumentExists('music_box')) {
                    return this.inflateInstrumentInfo('music_box', 'tempo', { bpm });
                }
            }

            return fallbackInstrument;
        }

        resolveFallbackInstrument(difficultyKey) {
            const normalized = this.normalizeTagValue(difficultyKey || 'easy');
            const difficultyAliases = {
                facil: 'easy',
                facilidades: 'easy',
                medio: 'medium',
                mediano: 'medium',
                dificil: 'hard',
                dificilimo: 'hard'
            };
            const resolvedDifficulty = difficultyAliases[normalized] || normalized || 'easy';
            let instrumentKey = DIFFICULTY_INSTRUMENT_MAP[resolvedDifficulty] || DIFFICULTY_INSTRUMENT_MAP.easy;
            if (!this.instrumentExists(instrumentKey)) {
                instrumentKey = this.instrumentExists('piano_acoustic')
                    ? 'piano_acoustic'
                    : Object.keys(this.getInstrumentCatalog())[0] || null;
            }
            return this.inflateInstrumentInfo(instrumentKey, 'difficulty-fallback', { difficulty: resolvedDifficulty });
        }

        applySessionInstrument(instrumentInfo = null) {
            if (instrumentInfo && typeof instrumentInfo === 'object') {
                this.sessionInstrument = instrumentInfo;
            }

            const sessionInstrument = this.sessionInstrument || null;
            this.pendingSessionInstrument = sessionInstrument;

            this.prepareEffectInstruments({ sessionInstrument });

            if (sessionInstrument?.key && this.instrumentExists(sessionInstrument.key)) {
                this.preloadInstrumentKey(sessionInstrument.key);
            }
        }

        preloadInstrumentKey(instrumentKey) {
            if (!this.soundfontManager || !instrumentKey) {
                return;
            }
            const available = this.soundfontManager.availableInstruments || {};
            if (!available[instrumentKey]) {
                return;
            }
            this.soundfontManager.loadInstrument(instrumentKey, {
                setCurrent: false,
                clearKit: false
            }).catch((error) => {
                console.warn(`TerraGame: falha ao pré-carregar ${instrumentKey}`, error?.message || error);
            });
        }

        getInstrumentCatalog() {
            if (this.soundfontManager?.availableInstruments) {
                return this.soundfontManager.availableInstruments;
            }
            return FALLBACK_INSTRUMENT_CATALOG;
        }

        instrumentExists(instrumentKey) {
            if (!instrumentKey) {
                return false;
            }
            const catalog = this.getInstrumentCatalog();
            return Boolean(catalog && Object.prototype.hasOwnProperty.call(catalog, instrumentKey));
        }

        normalizeInstrumentKey(value) {
            if (value === undefined || value === null) {
                return null;
            }
            const base = this.normalizeText(String(value));
            const compact = base.replace(/[^a-z0-9]/g, '');
            if (INSTRUMENT_ALIAS_MAP[compact]) {
                const aliasKey = INSTRUMENT_ALIAS_MAP[compact];
                if (this.instrumentExists(aliasKey)) {
                    return aliasKey;
                }
            }

            const sanitized = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            if (this.instrumentExists(sanitized)) {
                return sanitized;
            }

            return null;
        }

        normalizeText(value) {
            if (value === undefined || value === null) {
                return '';
            }
            return value
                .toString()
                .normalize('NFD')
                .replace(/[\u0000-\u001F\u007F]/g, '')
                .replace(/[\u0300-\u036F]/g, '')
                .toLowerCase();
        }

        normalizeTagValue(value) {
            const normalized = this.normalizeText(value);
            if (!normalized) {
                return '';
            }
            return normalized.replace(/[^a-z0-9]/g, '');
        }

        formatInstrumentName(key) {
            if (!key) {
                return 'Instrumento Automático';
            }
            return key.split('_').map((segment) => {
                if (!segment) {
                    return segment;
                }
                return segment.charAt(0).toUpperCase() + segment.slice(1);
            }).join(' ');
        }

        inflateInstrumentInfo(key, source, meta = {}) {
            if (!key) {
                return null;
            }
            const catalog = this.getInstrumentCatalog();
            const entry = catalog?.[key] || null;
            return {
                key,
                name: entry?.name || this.formatInstrumentName(key),
                category: entry?.category || null,
                icon: entry?.icon || null,
                source,
                meta
            };
        }

        resolveInstrumentFromTags(tagSet) {
            if (!tagSet || tagSet.size === 0) {
                return null;
            }
            for (const rule of MUSIC_TAG_INSTRUMENT_RULES) {
                if (!rule?.key || !Array.isArray(rule.tags)) {
                    continue;
                }
                const match = rule.tags.some((tag) => tagSet.has(tag));
                if (match) {
                    return rule.key;
                }
            }
            return null;
        }

        resolveInstrumentFromRange(range) {
            if (!Array.isArray(range) || !range.length) {
                return null;
            }

            const normalizedRange = range
                .map((note) => (typeof note === 'string' ? note.trim().toUpperCase() : ''))
                .filter(Boolean);

            for (const rule of RANGE_INSTRUMENT_RULES) {
                try {
                    if (typeof rule.test === 'function' && rule.test(normalizedRange)) {
                        return rule.key;
                    }
                } catch (error) {
                    console.warn('TerraGame: falha ao avaliar regra de alcance musical:', error?.message || error);
                }
            }

            return null;
        }

        /**
         * Gera sequência condicionada por dificuldade quando não há música disponível
         */
        generateFallbackSequence(difficultyKey, difficultyConfig = {}) {
            const key = typeof difficultyKey === 'string' ? difficultyKey.toLowerCase() : 'easy';
            const difficulty = difficultyConfig || {};
            const totalDuration = Math.max(60, Number(difficulty.fallbackDuration) || 300) * 1000;
            const targetCount = Math.max(8, Number(difficulty.fallbackBalloons) || Math.round(totalDuration / 1500));
            const interval = totalDuration / targetCount;
            const patterns = FALLBACK_NOTE_MODELS[key] || FALLBACK_NOTE_MODELS.easy;
            const patternPool = [];

            patterns.forEach((pattern) => {
                if (Array.isArray(pattern)) {
                    pattern.forEach((step) => {
                        if (step && typeof step === 'object') {
                            patternPool.push(step);
                        }
                    });
                }
            });

            if (!patternPool.length && Array.isArray(FALLBACK_NOTE_MODELS.easy?.[0])) {
                FALLBACK_NOTE_MODELS.easy[0].forEach((step) => patternPool.push(step));
            }

            if (!patternPool.length) {
                patternPool.push({ note: 'C', durationRatio: 0.85, timeOffsetRatio: 0 });
            }

            const settings = FALLBACK_MODEL_SETTINGS[key] || FALLBACK_MODEL_SETTINGS.easy;
            const swingRange = Number(settings?.swing) || 0;
            const durationVariance = Number(settings?.durationVariance) || 0;
            const startOffset = Math.floor(Math.random() * patternPool.length);
            const sequence = [];
            let lastTime = 0;

            for (let i = 0; i < targetCount; i += 1) {
                const baseTime = i * interval;
                const step = patternPool[(startOffset + i) % patternPool.length] || patternPool[0];
                const baseDurationRatio = Number(step.durationRatio) > 0 ? Number(step.durationRatio) : 0.8;
                const baseOffsetRatio = Number(step.timeOffsetRatio) || 0;
                const randomSwing = swingRange ? (Math.random() * 2 - 1) * swingRange : 0;
                const offsetRatio = baseOffsetRatio + randomSwing;
                let time = Math.round(baseTime + offsetRatio * interval);
                let duration = Math.max(120, Math.round(interval * baseDurationRatio));

                if (durationVariance) {
                    const varianceFactor = 1 + ((Math.random() * 2 - 1) * durationVariance);
                    duration = Math.max(100, Math.round(duration * varianceFactor));
                }

                let note = step.note && NOTES.includes(step.note) ? step.note : NOTES[(startOffset + i) % NOTES.length];
                if (Array.isArray(step.alternate) && step.alternate.length) {
                    const alt = step.alternate[(startOffset + i) % step.alternate.length];
                    if (alt && NOTES.includes(alt)) {
                        note = alt;
                    }
                }

                const latestTime = Math.max(0, totalDuration - (interval * 0.6));
                time = Math.max(0, Math.min(time, latestTime));
                if (time <= lastTime) {
                    const minGap = Math.max(45, Math.round(interval * 0.2));
                    time = Math.min(latestTime, lastTime + minGap);
                }

                const maxDuration = Math.round(Math.max(interval * 0.5, totalDuration - time));
                sequence.push({
                    note,
                    time: Math.round(time),
                    duration: Math.max(90, Math.min(duration, maxDuration))
                });

                lastTime = time;
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
                targetNote: null,
                spawnDirection: 'top-down'
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
            this.togglePatientPanels({ showCreate: false, showImport: false });
            this.resetCreatePanel();
            this.resetImportPanel();
            
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
            this.setBalloonSpawnDirection(this.state.spawnDirection);
            if (this.elements.controls.difficulty) {
                this.elements.controls.difficulty.value = this.state.difficultyKey;
            }
            if (this.patientPanel && typeof this.patientPanel.reset === 'function') {
                this.patientPanel.reset();
            }
            this.togglePatientPanels({ showCreate: false, showImport: false });
            this.resetCreatePanel();
            this.resetImportPanel();
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

        setBalloonSpawnDirection(direction) {
            const allowed = new Set(['top-down', 'bottom-up', 'left-right', 'right-left']);
            const nextDirection = allowed.has(direction) ? direction : 'top-down';

            this.state.spawnDirection = nextDirection;

            if (this.elements.directionSelect && this.elements.directionSelect.value !== nextDirection) {
                this.elements.directionSelect.value = nextDirection;
            }

            if (this.elements.stage) {
                this.elements.stage.dataset.spawnDirection = nextDirection;
            }
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

            console.log('🎵 Carregando música...');
            const musicPayload = await this.loadMusicSequence();
            this.musicSequence = Array.isArray(musicPayload.sequence) ? musicPayload.sequence : [];
            this.musicIndex = 0;
            this.activeMusic = musicPayload;
            this.currentMusicName = musicPayload.name || 'Sequência Aleatória';
            this.currentMusicInstrument = musicPayload.instrument || null;
            this.applySessionInstrument(this.currentMusicInstrument);
            this.stopMusicScheduler();
            this.midiNoteCooldowns.clear();

            const spawnDirection = this.state.spawnDirection || 'top-down';

            this.state = {
                status: 'running',
                patientId: selectedPatient,
                patientName: patient?.fullName || 'Paciente',
                difficultyKey: musicPayload.difficultyKey || this.state.difficultyKey || 'easy',
                balloonsLaunched: 0,
                balloonsResolved: 0,
                hits: 0,
                misses: 0,
                streak: 0,
                targetNote: null,
                spawnDirection
            };

            this.setBalloonSpawnDirection(spawnDirection);

            this.clearStage();
            this.updateStats();
            this.updateSetupVisibility({ session: true });
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

        resolveBalloonSpawnPosition() {
            const mode = this.state.spawnDirection || 'top-down';
            const jitter = (min, max) => min + Math.random() * (max - min);

            switch (mode) {
                case 'bottom-up':
                    return { mode: 'bottom-up', axis: jitter(8, 92) };
                case 'left-right':
                    return { mode: 'left-right', axis: jitter(8, 82) };
                case 'right-left':
                    return { mode: 'right-left', axis: jitter(8, 82) };
                case 'top-down':
                default:
                    return { mode: 'top-down', axis: jitter(8, 92) };
            }
        }

        configureBalloonTrajectory(balloon, spawnConfig) {
            if (!balloon || !spawnConfig) {
                return;
            }

            BALLOON_DIRECTION_CLASSES.forEach((className) => {
                balloon.classList.remove(className);
            });

            const mode = spawnConfig.mode || 'top-down';
            const directionClass = `terra-game-balloon--${mode}`;
            balloon.classList.add(directionClass);
            balloon.dataset.spawnDirection = mode;

            balloon.style.removeProperty('left');
            balloon.style.removeProperty('right');
            balloon.style.removeProperty('top');
            balloon.style.removeProperty('bottom');

            const axisValue = Number.isFinite(spawnConfig.axis) ? spawnConfig.axis : 50;

            switch (mode) {
                case 'bottom-up':
                    balloon.style.left = `${axisValue}%`;
                    balloon.style.bottom = '-120px';
                    break;
                case 'top-down':
                    balloon.style.left = `${axisValue}%`;
                    balloon.style.top = '-120px';
                    break;
                case 'left-right':
                    balloon.style.top = `${axisValue}%`;
                    balloon.style.left = '-90px';
                    break;
                case 'right-left':
                    balloon.style.top = `${axisValue}%`;
                    balloon.style.right = '-90px';
                    break;
                default:
                    balloon.style.left = `${axisValue}%`;
                    balloon.style.top = '-120px';
                    break;
            }
        }

        getBalloonProgress(balloon, stageRect = null) {
            if (!balloon || !balloon.isConnected) {
                return { progress: 0, rect: null };
            }

            const stageBounds = stageRect || this.elements.stage?.getBoundingClientRect();
            if (!stageBounds) {
                return { progress: 0, rect: null };
            }

            const rect = balloon.getBoundingClientRect();
            const direction = balloon.dataset.spawnDirection || this.state.spawnDirection || 'top-down';
            const clamp01 = (value) => Math.min(1, Math.max(0, value));
            const height = stageBounds.height || 1;
            const width = stageBounds.width || 1;
            let progress = 0;

            switch (direction) {
                case 'bottom-up':
                    progress = (stageBounds.bottom - rect.bottom) / height;
                    break;
                case 'left-right':
                    progress = (rect.left - stageBounds.left) / width;
                    break;
                case 'right-left':
                    progress = (stageBounds.right - rect.right) / width;
                    break;
                case 'top-down':
                default:
                    progress = (rect.top - stageBounds.top) / height;
                    break;
            }

            return {
                progress: clamp01(progress),
                rect
            };
        }

        createBalloonPayload(color) {
            const payload = document.createElement('div');
            payload.className = 'terra-game-balloon-payload';
            payload.style.setProperty('--payload-accent', color);

            const accent = document.createElement('span');
            accent.className = 'terra-game-balloon-payload-accent';
            payload.appendChild(accent);

            return payload;
        }

        animatePayloadDrop(balloon) {
            if (!balloon || !this.elements.stage) {
                return;
            }

            const payload = balloon.querySelector('.terra-game-balloon-payload');
            if (!payload) {
                return;
            }

            const stageRect = this.elements.stage.getBoundingClientRect();
            const payloadRect = payload.getBoundingClientRect();

            const ghost = payload.cloneNode(true);
            ghost.classList.add('terra-game-balloon-payload-ghost');
            ghost.style.width = `${payloadRect.width}px`;
            ghost.style.height = `${payloadRect.height}px`;
            ghost.style.setProperty('left', `${payloadRect.left - stageRect.left}px`, 'important');
            ghost.style.setProperty('top', `${payloadRect.top - stageRect.top}px`, 'important');
            ghost.style.setProperty('transform', 'none', 'important');

            this.elements.stage.appendChild(ghost);

            payload.style.visibility = 'hidden';

            ghost.addEventListener('animationend', () => {
                ghost.remove();
            }, { once: true });
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
            const musicSpawn = this.resolveBalloonSpawnPosition();
            this.configureBalloonTrajectory(balloon, musicSpawn);
            
            // Calcular duração baseada na duração da nota (min 6s, max 14s)
            const noteDuration = noteData.duration || 1000;
            const riseDuration = Math.max(6, Math.min(14, noteDuration / 100));
            balloon.style.setProperty('--travel-duration', `${riseDuration}s`);
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

            const musicPayload = this.createBalloonPayload(color);
            balloon.appendChild(musicPayload);

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
            const spawn = this.resolveBalloonSpawnPosition();
            this.configureBalloonTrajectory(balloon, spawn);
            balloon.style.setProperty('--travel-duration', `${9 + Math.random() * 4}s`);
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

            const payload = this.createBalloonPayload(color);
            balloon.appendChild(payload);

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

            // Largar objeto amarrado antes do balão desaparecer
            this.animatePayloadDrop(balloon);
            
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

        prepareEffectInstruments({ sessionInstrument = null } = {}) {
            if (sessionInstrument && typeof sessionInstrument === 'object') {
                this.pendingSessionInstrument = sessionInstrument;
            }

            if (!this.soundfontManager) {
                return;
            }

            const available = this.soundfontManager.availableInstruments || {};
            const entries = Object.entries(available);
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

            if (!this.effects.defaultSuccessInstrument || !available[this.effects.defaultSuccessInstrument]) {
                const fallbackSuccess = pickInstrument(['alegr', 'positivo', 'energia', 'estimul'], 'glockenspiel');
                this.effects.defaultSuccessInstrument = available[fallbackSuccess] ? fallbackSuccess : 'glockenspiel';
            }

            if (!this.effects.defaultErrorInstrument || !available[this.effects.defaultErrorInstrument]) {
                const fallbackError = pickInstrument(['calma', 'seren', 'relax', 'tranquil', 'acolh'], 'harp');
                this.effects.defaultErrorInstrument = available[fallbackError] ? fallbackError : 'harp';
            }

            const sessionKey = sessionInstrument?.key && available[sessionInstrument.key]
                ? sessionInstrument.key
                : null;

            const successKey = sessionKey || this.effects.defaultSuccessInstrument || 'glockenspiel';
            const errorKey = this.effects.defaultErrorInstrument || 'harp';

            this.effects.successInstrument = successKey;
            this.effects.errorInstrument = errorKey;

            [successKey, errorKey].forEach((instrument) => {
                if (!instrument) {
                    return;
                }
                this.soundfontManager.loadInstrument(instrument, {
                    setCurrent: false,
                    clearKit: false
                }).catch((error) => {
                    console.warn(`TerraGame: falha ao pré-carregar ${instrument}`, error);
                });
            });
        }

        updateStats() {
            const total = this.getTotalBalloons();
            const status = this.state.status;
            const activeData = (status === 'running' || status === 'paused') ? (this.activeMusic?.data || null) : null;
            const referenceMeta = (status === 'running' || status === 'paused')
                ? (this.activeMusic?.meta || this.selectedMusicMeta)
                : this.selectedMusicMeta;

            const difficultyKey = referenceMeta?.difficulty || this.state.difficultyKey || 'easy';
            const difficulty = DIFFICULTIES[difficultyKey] || DIFFICULTIES.easy;

            let durationMs = null;
            let noteCount = null;

            if (Array.isArray(this.musicSequence) && this.musicSequence.length > 0) {
                const lastNote = this.musicSequence[this.musicSequence.length - 1] || { time: 0, duration: 0 };
                durationMs = (Number(lastNote.time) || 0) + (Number(lastNote.duration) || 0);
                noteCount = this.musicSequence.length;
            }

            if (!Number.isFinite(durationMs) || durationMs <= 0) {
                durationMs = Number(activeData?.duration)
                    || Number(referenceMeta?.duration)
                    || (difficulty.fallbackDuration || 300) * 1000;
            }

            if (!Number.isFinite(noteCount) || noteCount <= 0) {
                noteCount = Number(activeData?.noteCount)
                    || Number(referenceMeta?.noteCount)
                    || total
                    || 0;
            }

            const durationLabel = this.formatDurationLabel(durationMs);
            const noteLabel = Number.isFinite(noteCount) && noteCount > 0
                ? `${noteCount} notas`
                : '-- notas';

            if (this.elements.stats.patient) {
                this.elements.stats.patient.textContent = this.state.patientName || '--';
            }
            if (this.elements.stats.difficulty) {
                this.elements.stats.difficulty.textContent = `${difficulty.label} · ${durationLabel} · ${noteLabel}`;
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
            if (this.elements.directionSelect && this.elements.directionSelect.value !== this.state.spawnDirection) {
                this.elements.directionSelect.value = this.state.spawnDirection;
            }
            if (this.elements.stage) {
                this.elements.stage.dataset.spawnDirection = this.state.spawnDirection;
            }
        }

        clearStage() {
            if (!this.elements.stage) {
                return;
            }
            this.activeBalloons.forEach((balloon) => balloon.remove());
            this.activeBalloons.clear();

            // Remover apenas elementos dinâmicos (balões e partículas), preservando o cenário
            const dynamicNodes = this.elements.stage.querySelectorAll('.terra-game-balloon, canvas, .terra-game-combo-feedback, .terra-game-balloon-payload-ghost');
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
            this.musicSequence = null;
            this.musicIndex = 0;
            this.activeMusic = null;
            this.currentMusicName = '';
            this.currentMusicInstrument = null;
            this.sessionInstrument = null;
            this.pendingSessionInstrument = null;
            this.state.status = 'idle';
            this.updateControlStates();
            this.updateMIDIStatusUI();
            this.updateStats();
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

            if (this.elements.musicSelect) {
                const disableMusicSelect = status !== 'idle' && status !== 'finished';
                this.elements.musicSelect.disabled = disableMusicSelect;
                if (disableMusicSelect) {
                    this.elements.musicSelect.setAttribute('aria-disabled', 'true');
                } else {
                    this.elements.musicSelect.removeAttribute('aria-disabled');
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
