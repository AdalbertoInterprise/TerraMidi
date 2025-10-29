// Board Bella Device - Integração completa com hardware Board Bella
// Autor: Terra MIDI System
// Data: 17/10/2025
// Descrição: Interpretador de comandos físicos do Board Bella, incluindo teclas, knob rotativo e funções especiais.

const BOARD_BELLA_MAX_GROUPS = 4;
const BOARD_BELLA_SLOTS_PER_GROUP = 5;
const BOARD_BELLA_CHANNEL = 1;
const BOARD_BELLA_DEFAULT_VELOCITY = 100;
const BOARD_BELLA_KNOB_STEPS = 1;
const BOARD_BELLA_KNOB_BLOCK_STEPS = 8;
const BOARD_BELLA_CHORD_WINDOW_MS = 45;

const BOARD_BELLA_KEY_LAYOUT = Object.freeze([
    { id: 'C_LOW', baseMidi: 48, label: 'C', uiLabel: 'C' },
    { id: 'D', baseMidi: 50, label: 'D', uiLabel: 'D' },
    { id: 'E', baseMidi: 52, label: 'E', uiLabel: 'E' },
    { id: 'F', baseMidi: 53, label: 'F', uiLabel: 'F' },
    { id: 'G', baseMidi: 55, label: 'G', uiLabel: 'G' },
    { id: 'A', baseMidi: 57, label: 'A', uiLabel: 'A' },
    { id: 'B', baseMidi: 59, label: 'B', uiLabel: 'B' },
    { id: 'C_HIGH', baseMidi: 60, label: 'C', uiLabel: 'C2' }
]);

const BOARD_BELLA_SPECIAL_KEY_ASSIGNMENTS = new Map([
    ['C_LOW', 'OITV'],
    ['D', '8_INSTR'],
    ['E', '1_INSTR'],
    ['F', 'FAVOR'],
    ['G', 'ACORDE'],
    ['A', 'MODO_BAT'],
    ['B', 'MIDI_HID'],
    ['C_HIGH', 'REINIT'] // Direção negativa permanece CLEAR_NOTES
]);

const BOARD_BELLA_HID_KEY_MAP = new Map([
    ['C_LOW', 'Digit1'],
    ['D', 'Digit2'],
    ['E', 'Digit3'],
    ['F', 'Digit4'],
    ['G', 'Digit5'],
    ['A', 'Digit6'],
    ['B', 'Digit7'],
    ['C_HIGH', 'Digit8']
]);

const BoardBellaSpecialModes = Object.freeze({
    OITAVA: 'OITV',
    STEP_8: '8_INSTR',
    STEP_1: '1_INSTR',
    FAVORITE: 'FAVOR',
    CHORD: 'ACORDE',
    BATTERY_MODE: 'MODO_BAT',
    MIDI_HID: 'MIDI_HID',
    REINIT: 'REINIT',
    CLEAR_NOTES: 'CLEAR_NOTES'
});

// Ordem documentada: 0 = Instrumento sem bateria, 1 = Instrumento + bateria, 2 = Somente bateria
const BatteryModes = Object.freeze({
    INSTRUMENT_ONLY: 0,
    HYBRID: 1,
    DRUM_ONLY: 2
});

const BATTERY_MODE_LABELS = Object.freeze({
    [BatteryModes.INSTRUMENT_ONLY]: 'Instrumento sem bateria',
    [BatteryModes.HYBRID]: 'Instrumento + bateria',
    [BatteryModes.DRUM_ONLY]: 'Somente bateria'
});

const BATTERY_MODE_ORDER = Object.freeze([
    BatteryModes.INSTRUMENT_ONLY,
    BatteryModes.HYBRID,
    BatteryModes.DRUM_ONLY
]);

class BoardBellaDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'BoardBella');

        this.config = {
            defaultChannel: BOARD_BELLA_CHANNEL,
            chordWindowMs: BOARD_BELLA_CHORD_WINDOW_MS,
            defaultVelocity: BOARD_BELLA_DEFAULT_VELOCITY,
            knobStep: BOARD_BELLA_KNOB_STEPS,
            knobBlockStep: BOARD_BELLA_KNOB_BLOCK_STEPS,
            maxGroups: BOARD_BELLA_MAX_GROUPS,
            slotsPerGroup: BOARD_BELLA_SLOTS_PER_GROUP
        };

        this.state = {
            ...this.state,
            activeNotes: new Map(),
            suppressedNotes: new Set(),
            chordPlaybackEnabled: this.manager?.isChordPlaybackEnabled?.() ?? true,
            currentChordRoot: null,
            lastChordStartTime: 0,
            currentProgram: 0,
            currentSoundfont: null,
            currentCatalogEntry: null,
            octaveShift: 0,
            batteryMode: BatteryModes.HYBRID,
            midiMode: 'midi',
            favoriteIndex: 0,
            groupIndex: 0,
            slotIndex: 0,
            notesPlayed: 0,
            knobAccum: 0,
            lastKnobValue: 0,
            ledState: {
                midi: false,
                hid: false
            }
        };

        this.catalog = null;
        this.hidClient = null;
        this.audioEngine = null;
        this.soundfontManager = null;
        this.specialKeyAssignments = new Map(BOARD_BELLA_SPECIAL_KEY_ASSIGNMENTS);
        this.hidKeyAssignments = new Map(BOARD_BELLA_HID_KEY_MAP);

        this.ensureCatalog();
        this.autoDetectAudioIntegrations();
        this.ensureHIDClient();

    console.log(`✅ BoardBellaDevice inicializado: ${this.deviceName}`);
    console.log('🥁 Modos de bateria (CC 0x50): 0=Instrumento sem bateria, 1=Instrumento + bateria, 2=Somente bateria');

        this.broadcastBatteryMode({
            source: 'init',
            sendControlChange: false
        });
    }

    ensureCatalog() {
        if (typeof BoardBellaCatalog === 'function') {
            this.catalog = new BoardBellaCatalog({
                soundfontManager: typeof window !== 'undefined' ? window.soundfontManager : null,
                catalogManager: typeof window !== 'undefined' ? window.catalogManager : null
            });
            this.catalog.ensureReady().catch(error => {
                console.warn('⚠️ BoardBellaDevice: catálogo não inicializado completamente', error);
            });
        } else {
            console.warn('⚠️ BoardBellaDevice: BoardBellaCatalog indisponível. Recurso parcial.');
        }
    }

    ensureHIDClient() {
        if (typeof window !== 'undefined' && window.boardBellaHIDClient) {
            this.hidClient = window.boardBellaHIDClient;
        }
    }

    autoDetectAudioIntegrations() {
        const audioEngine = typeof window !== 'undefined' ? window.audioEngine : null;
        const soundfontManager = typeof window !== 'undefined' ? window.soundfontManager : null;
        this.setAudioIntegration(audioEngine, soundfontManager);
    }

    setAudioIntegration(audioEngine, soundfontManager) {
        super.setAudioIntegration(audioEngine, soundfontManager);
        if (audioEngine || soundfontManager) {
            console.log('🔗 BoardBellaDevice integrado ao motor de áudio/soundfonts');
        }
    }

    setChordPlaybackEnabled(enabled) {
        const normalized = Boolean(enabled);
        if (this.state.chordPlaybackEnabled === normalized) {
            return;
        }
        this.state.chordPlaybackEnabled = normalized;
        this.resetChordGrouping();
        console.log(normalized
            ? '🎼 Board Bella: reprodução completa de acordes habilitada'
            : '🎼 Board Bella: acordes desabilitados (apenas nota raiz)');
    }

    isChordPlaybackEnabled() {
        if (typeof this.state.chordPlaybackEnabled === 'boolean') {
            return this.state.chordPlaybackEnabled;
        }
        return this.manager?.isChordPlaybackEnabled?.() ?? true;
    }

    resetChordGrouping() {
        this.state.currentChordRoot = null;
        this.state.lastChordStartTime = 0;
        this.state.suppressedNotes.clear();
    }

    enqueueActiveNote(originalMidi, entry) {
        let stack = this.state.activeNotes.get(originalMidi);
        if (!stack) {
            stack = [];
            this.state.activeNotes.set(originalMidi, stack);
        }
        stack.push(entry);
    }

    dequeueActiveNote(originalMidi) {
        const stack = this.state.activeNotes.get(originalMidi);
        if (!stack || stack.length === 0) {
            return null;
        }

        const entry = stack.shift();
        if (stack.length === 0) {
            this.state.activeNotes.delete(originalMidi);
        }
        return entry;
    }

    getActiveStackSize(originalMidi) {
        const stack = this.state.activeNotes.get(originalMidi);
        return stack ? stack.length : 0;
    }

    getActiveCountForEffective(effectiveMidi) {
        let count = 0;
        this.state.activeNotes.forEach(stack => {
            stack.forEach(entry => {
                if (entry.effectiveMidi === effectiveMidi) {
                    count += 1;
                }
            });
        });
        return count;
    }

    updateStatusPanelForEffectiveNote(effectiveMidi) {
        if (!window?.midiStatusPanel) {
            return;
        }
        const isActive = this.getActiveCountForEffective(effectiveMidi) > 0;
        window.midiStatusPanel.updateNote(this.deviceId, effectiveMidi, isActive);
    }

    getMessageTimestamp(message) {
        if (message && typeof message.timestamp === 'number' && Number.isFinite(message.timestamp)) {
            return message.timestamp;
        }
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    resolvePhysicalSlot(midiNote) {
        if (!Number.isFinite(midiNote)) {
            return null;
        }

        for (const slot of BOARD_BELLA_KEY_LAYOUT) {
            const diff = midiNote - slot.baseMidi;
            const remainder = ((diff % 12) + 12) % 12;
            if (remainder === 0) {
                const octaveOffset = Math.round(diff / 12);
                return {
                    id: slot.id,
                    baseMidi: slot.baseMidi,
                    label: slot.label,
                    uiLabel: slot.uiLabel,
                    octaveOffset
                };
            }
        }

        return null;
    }

    handleMessage(message) {
        super.handleMessage(message);

        switch (message.type) {
            case 'noteOn':
                if (message.velocity > 0) {
                    this.handlePhysicalKeyOn(message);
                } else {
                    this.handlePhysicalKeyOff(message);
                }
                break;
            case 'noteOff':
                this.handlePhysicalKeyOff(message);
                break;
            case 'programChange':
                this.handleProgramChange(message.program, { source: 'device' });
                break;
            case 'controlChange':
                this.handleControlMessage(message);
                break;
            case 'pitchBend':
                this.handleKnobRotation(message);
                break;
            default:
                console.log(`ℹ️ Board Bella: mensagem não mapeada (${message.type})`, message);
        }
    }

    handlePhysicalKeyOn(message) {
        const timestamp = this.getMessageTimestamp(message);
        const chordEnabled = this.isChordPlaybackEnabled();
        const lastStart = this.state.lastChordStartTime || 0;
        const isNewChord = !Number.isFinite(lastStart) || Math.abs(timestamp - lastStart) > this.config.chordWindowMs;

        if (isNewChord) {
            this.state.lastChordStartTime = timestamp;
            this.state.currentChordRoot = message.note;
            this.state.suppressedNotes.clear();
        } else if (this.state.currentChordRoot === null) {
            this.state.currentChordRoot = message.note;
        }

        if (!chordEnabled && this.state.currentChordRoot !== message.note) {
            this.state.suppressedNotes.add(message.note);
            return;
        }

    const slotInfo = this.resolvePhysicalSlot(message.note);
    const noteNumber = this.applyOctaveShift(message.note);
        const velocity = message.velocity || this.config.defaultVelocity;
        const stackSizeBefore = this.getActiveStackSize(message.note);

        const entry = {
            id: `bbella_${message.note}_${Math.floor(timestamp)}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp,
            originalMidi: message.note,
            effectiveMidi: noteNumber,
            velocity
        };

        if (this.state.midiMode === 'midi') {
            entry.instrumentNoteId = this.triggerSound(noteNumber, velocity, {
                origin: 'board-bella:physical-key',
                message
            });
            this.sendMIDIMessage(0x90, noteNumber, velocity);
        }

        if (slotInfo) {
            entry.physicalKeyId = slotInfo.id;
            entry.baseMidi = slotInfo.baseMidi;
            entry.slotOctaveOffset = slotInfo.octaveOffset;
        }

        this.enqueueActiveNote(message.note, entry);
        this.state.notesPlayed += 1;

        if (stackSizeBefore === 0) {
            this.emitHIDKey(message.note, true);
        }

        this.updateStatusPanelForEffectiveNote(noteNumber);
    }

    handlePhysicalKeyOff(message) {
        if (this.state.suppressedNotes.has(message.note)) {
            this.state.suppressedNotes.delete(message.note);
            return;
        }

        const entry = this.dequeueActiveNote(message.note);
        if (!entry) {
            return;
        }

        if (this.state.midiMode === 'midi') {
            this.stopSound(entry);
            this.sendMIDIMessage(0x80, entry.effectiveMidi, entry.velocity);
        }

        if (this.getActiveStackSize(message.note) === 0) {
            this.emitHIDKey(message.note, false);
        }

        this.updateStatusPanelForEffectiveNote(entry.effectiveMidi);
    }

    applyOctaveShift(noteNumber) {
        const shift = this.state.octaveShift * 12;
        const base = Number.isFinite(noteNumber) ? noteNumber : 0;
        let shifted = Math.round(base + shift);

        if (shifted < 0) {
            shifted = 0;
        } else if (shifted > 127) {
            shifted = 127;
        }

        return shifted;
    }

    triggerSound(midiNote, velocity, context = {}) {
        if (!this.soundfontManager) {
            return null;
        }

        const normalizedVelocity = Number.isFinite(velocity)
            ? Math.max(0, Math.min(1, velocity / 127))
            : 0.8;

        if (typeof this.soundfontManager.playBoardBellaNote === 'function') {
            try {
                return this.soundfontManager.playBoardBellaNote(midiNote, normalizedVelocity, {
                    ...context,
                    program: this.state.currentProgram,
                    batteryMode: this.state.batteryMode
                });
            } catch (error) {
                console.warn('⚠️ Board Bella: playBoardBellaNote falhou', error);
            }
        }

        const noteName = this.manager?.midiNoteToName?.(midiNote) || midiNote;
        try {
            return this.soundfontManager.startSustainedNote(noteName, normalizedVelocity);
        } catch (error) {
            console.warn('⚠️ Board Bella: falha ao iniciar nota', noteName, error);
            return null;
        }
    }

    stopSound(reference) {
        if (!this.soundfontManager) {
            return;
        }

        if (typeof this.soundfontManager.stopBoardBellaNote === 'function') {
            try {
                this.soundfontManager.stopBoardBellaNote(reference);
                return;
            } catch (error) {
                console.warn('⚠️ Board Bella: stopBoardBellaNote falhou', error);
            }
        }

        const midiNote = typeof reference === 'object' && reference !== null
            ? reference.effectiveMidi
            : reference;
        const noteName = this.manager?.midiNoteToName?.(midiNote) || midiNote;

        try {
            this.soundfontManager.stopSustainedNote(noteName);
        } catch (error) {
            console.warn('⚠️ Board Bella: falha ao interromper nota', noteName, error);
        }
    }

    handleProgramChange(program, options = {}) {
        const normalizedProgram = this.normalizedProgram(program);
        const entry = this.resolveCatalogEntry({ program: normalizedProgram });
        this.applyCatalogEntry(entry, { source: options.source || 'program-change' });
    }

    normalizedProgram(program) {
        if (!Number.isFinite(program)) {
            return 0;
        }
        if (program < 0) {
            return 0;
        }
        if (program > 127) {
            return 127;
        }
        return Math.trunc(program);
    }

    resolveCatalogEntry(spec) {
        if (!spec || !this.catalog) {
            return null;
        }
        if (typeof spec === 'number') {
            return this.catalog.getInstrumentByIndex(spec);
        }
        return this.catalog.resolveEntry(spec);
    }

    applyCatalogEntry(entry, context = {}) {
        if (!entry) {
            console.warn('⚠️ Board Bella: catálogo sem entrada correspondente', context);
            return;
        }

        this.state.currentProgram = entry.program;
        this.state.currentSoundfont = entry.soundfont;
        this.state.currentCatalogEntry = entry;

        console.log(`🎼 Board Bella: instrumento ativo -> Programa ${entry.program} (${entry.name})`);

        if (this.soundfontManager) {
            if (typeof this.soundfontManager.loadInstrumentFromCatalog === 'function') {
                this.soundfontManager.loadInstrumentFromCatalog(entry.key).catch(error => {
                    console.warn('⚠️ Board Bella: falha ao carregar instrumento do catálogo', error);
                });
            } else if (typeof this.soundfontManager.loadInstrument === 'function') {
                this.soundfontManager.loadInstrument(entry.key, {
                    setCurrent: true,
                    clearKit: false
                }).catch(error => {
                    console.warn('⚠️ Board Bella: loadInstrument falhou', error);
                });
            }
        }

        this.broadcastProgramChange(entry.program);
        this.updateStatusProgram(entry);
    }

    broadcastProgramChange(programNumber) {
        if (this.state.midiMode !== 'midi') {
            return;
        }
        this.sendMIDIMessage(0xC0, programNumber & 0x7F, 0);
    }

    handleKnobRotation(message) {
        const percent = typeof message.pitchBendValue === 'number'
            ? message.pitchBendValue
            : (typeof message.value === 'number' ? message.value : 0);
        if (!Number.isFinite(percent)) {
            return;
        }

        const deltaValue = percent - (this.state.lastKnobValue || 0);
        this.state.lastKnobValue = percent;

        if (!Number.isFinite(deltaValue) || deltaValue === 0) {
            return;
        }

        const clampedDelta = Math.max(-200, Math.min(200, deltaValue));
        this.state.knobAccum += clampedDelta;
        const threshold = 15;
        while (Math.abs(this.state.knobAccum) >= threshold) {
            const direction = this.state.knobAccum > 0 ? 1 : -1;
            this.state.knobAccum -= threshold * direction;
            this.processKnobStep(direction);
        }
    }

    processKnobStep(delta) {
        if (!delta) {
            return;
        }
        const pressedNotes = this.getPressedNotes();
        if (pressedNotes.length > 0) {
            this.handleKnobWithModifier(delta, pressedNotes);
        } else {
            this.shiftProgram(delta);
        }
    }

    handleKnobWithModifier(delta, pressedNotes) {
        const specialReference = this.identifySpecialMode(pressedNotes);
        if (!specialReference) {
            this.shiftProgram(delta);
            return;
        }

        const { mode } = specialReference;

        switch (mode) {
            case BoardBellaSpecialModes.OITAVA:
                this.adjustOctave(delta);
                break;
            case BoardBellaSpecialModes.STEP_8:
                this.shiftProgram(delta * this.config.knobBlockStep);
                break;
            case BoardBellaSpecialModes.STEP_1:
                this.shiftProgram(delta * this.config.knobStep);
                break;
            case BoardBellaSpecialModes.FAVORITE:
                this.shiftFavorite(delta);
                break;
            case BoardBellaSpecialModes.CHORD:
                this.toggleChordPlayback(delta);
                break;
            case BoardBellaSpecialModes.BATTERY_MODE:
                this.shiftBatteryMode(delta);
                break;
            case BoardBellaSpecialModes.MIDI_HID:
                this.toggleMIDIMode(delta);
                break;
            case BoardBellaSpecialModes.REINIT:
                if (delta > 0) {
                    this.reinitializeBoard();
                } else {
                    this.clearAllNotes();
                }
                break;
            case BoardBellaSpecialModes.CLEAR_NOTES:
                this.clearAllNotes();
                break;
            default:
                this.shiftProgram(delta);
        }
    }

    identifySpecialMode(pressedNotes) {
        if (!Array.isArray(pressedNotes) || pressedNotes.length === 0) {
            return null;
        }
        for (const note of pressedNotes) {
            const slotInfo = this.resolvePhysicalSlot(note);
            if (!slotInfo) {
                continue;
            }
            const mode = this.specialKeyAssignments.get(slotInfo.id);
            if (mode) {
                return { mode, note, slotId: slotInfo.id };
            }
        }
        return null;
    }

    getPressedNotes() {
        return Array.from(this.state.activeNotes.keys());
    }

    shiftProgram(delta) {
        const currentEntry = this.state.currentCatalogEntry;
        if (!currentEntry) {
            return;
        }
        const target = this.catalog ? this.catalog.shiftIndex(currentEntry.index, delta) : null;
        if (target) {
            this.applyCatalogEntry(target, { source: 'knob' });
        }
    }

    adjustOctave(delta) {
        const next = Math.max(-2, Math.min(2, this.state.octaveShift + delta));
        if (next === this.state.octaveShift) {
            return;
        }
        this.state.octaveShift = next;
        console.log(`🎚️ Board Bella: oitava ajustada para ${this.state.octaveShift}`);
    }

    shiftFavorite(delta) {
        if (!this.catalog) {
            return;
        }
        const favorites = this.catalog.getAllFavorites();
        if (!favorites.length) {
            return;
        }
        const nextIndex = (this.state.favoriteIndex + delta + favorites.length) % favorites.length;
        const entry = favorites[nextIndex];
        if (!entry) {
            return;
        }
        this.state.favoriteIndex = nextIndex;
        this.applyCatalogEntry(entry, { source: 'favorite' });
    }

    toggleChordPlayback(delta) {
        if (delta === 0) {
            return;
        }
        const enabled = delta > 0;
        console.log(`🎚️ Board Bella: knob + tecla G → ${enabled ? 'acordes completos' : 'modo monofônico'}`);
        this.setChordPlaybackEnabled(enabled);
        if (typeof this.manager?.setChordPlaybackEnabled === 'function') {
            this.manager.setChordPlaybackEnabled(enabled, 'board-bella');
        }
    }

    shiftBatteryMode(delta) {
        if (!delta) {
            return;
        }

        const direction = Math.sign(delta);
    const previous = this.state.batteryMode;
    const minMode = BATTERY_MODE_ORDER[0];
    const maxMode = BATTERY_MODE_ORDER[BATTERY_MODE_ORDER.length - 1];
    const next = Math.max(minMode, Math.min(maxMode, previous + direction));

        if (next === previous) {
            const boundaryLabel = BATTERY_MODE_LABELS[previous] || `modo ${previous}`;
            console.log(`🥁 Board Bella: limite do modo bateria atingido (${boundaryLabel})`);
            return;
        }

        this.state.batteryMode = next;
        const label = BATTERY_MODE_LABELS[next] || `modo ${next}`;
        const directionLabel = direction > 0 ? 'sentido horário' : 'sentido anti-horário';
        console.log(`🥁 Board Bella: modo bateria -> ${label} (${directionLabel})`);
        this.broadcastBatteryMode({
            previous,
            direction,
            source: 'board-bella:knob+A'
        });
    }

    broadcastBatteryMode(context = {}) {
        const mode = this.state.batteryMode;
        const label = BATTERY_MODE_LABELS[mode] || `modo ${mode}`;

        if (context.sendControlChange !== false) {
            this.sendControlChange(0x50, mode);
        }

        const detail = {
            mode,
            label,
            source: context.source || 'board-bella',
            deviceId: this.deviceId,
            previous: context.previous ?? null,
            direction: context.direction ?? null,
            timestamp: Date.now()
        };

        if (typeof this.soundfontManager?.setBatteryMode === 'function') {
            try {
                this.soundfontManager.setBatteryMode(mode, detail);
            } catch (error) {
                console.warn('⚠️ Board Bella: falha ao repassar modo bateria para soundfontManager', error);
            }
        }

        if (typeof this.manager?.notifyBatteryModeChange === 'function') {
            try {
                this.manager.notifyBatteryModeChange(mode, detail);
            } catch (error) {
                console.warn('⚠️ Board Bella: notifyBatteryModeChange falhou', error);
            }
        }

        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            try {
                window.dispatchEvent(new CustomEvent('terra-midi:battery-mode-changed', { detail }));
            } catch (error) {
                console.warn('⚠️ Board Bella: falha ao emitir evento global de modo bateria', error);
            }
        }
    }

    toggleMIDIMode(delta) {
        if (delta === 0) {
            return;
        }
        const nextMode = this.state.midiMode === 'midi' ? 'hid' : 'midi';
        this.state.midiMode = nextMode;
        this.state.knobAccum = 0;
        this.state.lastKnobValue = 0;
        this.updateLEDState(nextMode);
        console.log(`🔀 Board Bella: modo ${nextMode.toUpperCase()} ativo`);
        if (nextMode === 'hid') {
            this.clearAllNotes({ forceMidi: true });
        }
        this.notifyHIDModeChange(nextMode);
    }

    updateLEDState(mode) {
        this.state.ledState.midi = mode === 'midi';
        this.state.ledState.hid = mode === 'hid';
        this.sendControlChange(0x51, this.state.ledState.midi ? 127 : 0);
        this.sendControlChange(0x52, this.state.ledState.hid ? 127 : 0);
    }

    reinitializeBoard() {
        console.log('♻️ Board Bella: reinicialização solicitada');
        this.state.octaveShift = 0;
        this.state.favoriteIndex = 0;
    this.state.batteryMode = BatteryModes.HYBRID;
        this.state.midiMode = 'midi';
        this.state.knobAccum = 0;
        this.state.lastKnobValue = 0;
        this.clearAllNotes({ forceMidi: true });
        this.broadcastBatteryMode({ source: 'reinit' });
        this.updateLEDState(this.state.midiMode);
        const entry = this.catalog ? this.catalog.getInstrumentByIndex(0) : null;
        if (entry) {
            this.applyCatalogEntry(entry, { source: 'reinit' });
        }
    }

    clearAllNotes(options = {}) {
        const { forceMidi = false } = options;
        console.log('🧹 Board Bella: limpando notas ativas');
        const activeEntries = Array.from(this.state.activeNotes.entries());
        const affectedEffectiveNotes = new Set();

        activeEntries.forEach(([originalMidi, entries]) => {
            entries.forEach(entry => {
                affectedEffectiveNotes.add(entry.effectiveMidi);
                if (forceMidi || this.state.midiMode === 'midi') {
                    this.stopSound(entry);
                    this.sendMIDIMessage(0x80, entry.effectiveMidi, 0);
                }
            });

            if (entries.length > 0) {
                this.emitHIDKey(originalMidi, false);
            }
        });

        this.state.activeNotes.clear();
        this.state.suppressedNotes.clear();
        this.resetChordGrouping();

        affectedEffectiveNotes.forEach(midiNote => this.updateStatusPanelForEffectiveNote(midiNote));
    }

    handleControlMessage(message) {
        const control = message.controller;
        const value = message.value;

        switch (control) {
            case 0x10: // Configuração de grupo
                this.state.groupIndex = value % this.config.maxGroups;
                this.updateActiveSetup();
                break;
            case 0x11: // Seleção de instrumento dentro do grupo
                this.state.slotIndex = value % this.config.slotsPerGroup;
                this.updateActiveSetup();
                break;
            case 0x12: // Seleção direta de favorito
                this.state.favoriteIndex = value % (this.catalog ? this.catalog.maxFavorites : 1);
                this.activateFavorite(this.state.favoriteIndex);
                break;
            case 0x7B: // All Notes Off
                this.clearAllNotes({ forceMidi: true });
                break;
            default:
                console.log('ℹ️ Board Bella: Control change não mapeado', control, value);
        }
    }

    updateActiveSetup() {
        if (!this.catalog) {
            return;
        }
        const entry = this.catalog.getGroupInstrument(this.state.groupIndex, this.state.slotIndex);
        if (entry) {
            this.applyCatalogEntry(entry, { source: 'group-selector' });
            this.broadcastGroupSelection();
        }
    }

    activateFavorite(index) {
        if (!this.catalog) {
            return;
        }
        const entry = this.catalog.getFavorite(index);
        if (entry) {
            this.applyCatalogEntry(entry, { source: 'favorite-selector' });
        }
    }

    broadcastGroupSelection() {
        this.sendControlChange(0x53, this.state.groupIndex & 0x7F);
        this.sendControlChange(0x54, this.state.slotIndex & 0x7F);
    }

    sendMIDIMessage(status, data1, data2) {
        const outputMessage = [status | ((BOARD_BELLA_CHANNEL - 1) & 0x0F), data1 & 0x7F];
        if (typeof data2 === 'number') {
            outputMessage.push(data2 & 0x7F);
        }
        this.broadcastToOutputs(outputMessage);
    }

    sendControlChange(controller, value) {
        this.sendMIDIMessage(0xB0, controller & 0x7F, value & 0x7F);
    }

    broadcastToOutputs(message) {
        if (!Array.isArray(message)) {
            return;
        }
        if (!this.manager || !this.manager.midiAccess || !this.manager.midiAccess.outputs) {
            return;
        }
        try {
            for (const output of this.manager.midiAccess.outputs.values()) {
                if (!output || typeof output.send !== 'function') {
                    continue;
                }
                output.send(message);
            }
        } catch (error) {
            console.warn('⚠️ Board Bella: falha ao enviar MIDI externo', error);
        }
    }

    updateStatusPanel(entry, isActive) {
        if (!window.midiStatusPanel) {
            return;
        }
        const noteNumber = typeof entry === 'number' ? entry : entry?.effectiveMidi;
        if (typeof noteNumber !== 'number') {
            return;
        }
        const status = typeof isActive === 'boolean'
            ? Boolean(isActive)
            : this.getActiveCountForEffective(noteNumber) > 0;
        window.midiStatusPanel.updateNote(this.deviceId, noteNumber, status);
    }

    updateStatusProgram(entry) {
        if (!window.midiStatusPanel || !entry) {
            return;
        }
        window.midiStatusPanel.updateProgram(this.deviceId, entry.program, entry.name);
    }

    emitHIDKey(noteNumber, isPressed) {
        if (this.state.midiMode !== 'hid') {
            return;
        }
        const slotInfo = this.resolvePhysicalSlot(noteNumber);
        const hidCode = slotInfo ? this.hidKeyAssignments.get(slotInfo.id) || null : null;
        const payload = {
            type: 'key',
            note: noteNumber,
            action: isPressed ? 'down' : 'up',
            code: hidCode,
            slotId: slotInfo ? slotInfo.id : null,
            deviceId: this.deviceId,
            timestamp: Date.now()
        };
        this.sendToHID(payload);
    }

    notifyHIDModeChange(mode) {
        if (!this.hidClient) {
            return;
        }
        this.sendToHID({
            type: 'mode',
            mode,
            deviceId: this.deviceId,
            timestamp: Date.now()
        });
    }

    sendToHID(keyEvent) {
        if (!this.hidClient || typeof this.hidClient.send !== 'function') {
            return;
        }
        try {
            this.hidClient.send(keyEvent);
        } catch (error) {
            console.warn('⚠️ Board Bella: falha ao enviar evento HID', error);
        }
    }

    stopAllNotes() {
        this.clearAllNotes({ forceMidi: true });
    }

    disconnect() {
        super.disconnect();
        this.stopAllNotes();
    }

    getState() {
        return {
            ...super.getState(),
            currentProgram: this.state.currentProgram,
            currentSoundfont: this.state.currentSoundfont,
            octaveShift: this.state.octaveShift,
            batteryMode: this.state.batteryMode,
            midiMode: this.state.midiMode,
            groupIndex: this.state.groupIndex,
            slotIndex: this.state.slotIndex,
            favoriteIndex: this.state.favoriteIndex,
            notesPlayed: this.state.notesPlayed
        };
    }
}

if (typeof window !== 'undefined') {
    window.BoardBellaDevice = BoardBellaDevice;
}
