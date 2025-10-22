// MIDIPerformanceEngine - Camada de execução e estado MIDI 1.0
// Responsável por manter o estado de todos os canais, aplicar controles
// contínuos, interpretar mensagens de sistema e acionar reprodução baseada
// em soundfonts quando nenhum handler específico do dispositivo o fizer.

class MIDIPerformanceEngine {
    constructor(options = {}) {
        const {
            midiManager = null,
            audioEngine = null,
            soundfontManager = null,
            logger = console
        } = options;

        this.logger = logger || console;
        this.channelStates = new Map();
        this.listeners = new Map();
        this.stats = {
            noteOn: 0,
            noteOff: 0,
            controlChange: 0,
            programChange: 0,
            pitchBend: 0,
            aftertouch: 0,
            channelPressure: 0,
            system: 0
        };

        this.systemRealtimeState = {
            tempo: 120,
            lastClockAt: null,
            songPosition: 0,
            running: false
        };

        this.defaultInstrumentKey = 'piano';

        this.midiManager = null;
        this.audioEngine = null;
        this.soundfontManager = null;

        this.setAudioEngine(audioEngine, soundfontManager);
        this.setMidiManager(midiManager);
    }

    setMidiManager(manager) {
        if (manager === this.midiManager) {
            return;
        }

        this.midiManager = manager || null;
    }

    setAudioEngine(audioEngine, soundfontManager) {
        this.audioEngine = audioEngine || null;
        this.soundfontManager = soundfontManager || this.soundfontManager || null;
    }

    setSoundfontManager(soundfontManager) {
        this.soundfontManager = soundfontManager || null;
    }

    on(eventName, listener) {
        if (!eventName || typeof listener !== 'function') {
            return () => {};
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        const bucket = this.listeners.get(eventName);
        bucket.add(listener);

        return () => bucket.delete(listener);
    }

    emit(eventName, payload) {
        const bucket = this.listeners.get(eventName);
        if (!bucket || bucket.size === 0) {
            return;
        }

        bucket.forEach(listener => {
            try {
                listener(payload);
            } catch (error) {
                this.logger.warn?.(`⚠️ MIDIPerformanceEngine listener '${eventName}' falhou`, error);
            }
        });
    }

    getChannelState(channelNumber) {
        if (!Number.isFinite(channelNumber) || channelNumber < 1 || channelNumber > 16) {
            return null;
        }

        if (!this.channelStates.has(channelNumber)) {
            this.channelStates.set(channelNumber, this.createChannelState(channelNumber));
        }

        const state = this.channelStates.get(channelNumber);
        state.lastMessageAt = Date.now();
        return state;
    }

    createChannelState(channelNumber) {
        return {
            channelNumber,
            program: 0,
            bank: {
                msb: null,
                lsb: null
            },
            instrumentKey: null,
            volume: 1,
            expression: 1,
            pan: 0,
            modulation: 0,
            sustainPedal: false,
            sustainPending: new Set(),
            controllers: new Map(),
            activeNotes: new Map(),
            aftertouch: new Map(),
            channelPressure: 0,
            pitchBendRaw: 8192,
            pitchBendNormalized: 0,
            pitchBendRange: 2,
            dataEntry: {
                msb: null,
                lsb: null
            },
            rpn: {
                msb: 127,
                lsb: 127,
                active: false
            },
            nrpn: {
                msb: null,
                lsb: null,
                active: false
            },
            portamento: false,
            registeredParameters: {},
            lastMessageAt: Date.now()
        };
    }

    async handleMessage(message, context = {}) {
        if (!message || typeof message.type !== 'string') {
            return false;
        }

        const channelState = Number.isFinite(message.channel)
            ? this.getChannelState(message.channel)
            : null;

        const handledByDevice = Boolean(context?.handledByDevice);

        switch (message.type) {
            case 'noteOn':
                this.stats.noteOn += 1;
                return this.handleNoteOn(message, channelState, handledByDevice);
            case 'noteOff':
                this.stats.noteOff += 1;
                return this.handleNoteOff(message, channelState, handledByDevice);
            case 'controlChange':
                this.stats.controlChange += 1;
                return this.handleControlChange(message, channelState);
            case 'programChange':
                this.stats.programChange += 1;
                return this.handleProgramChange(message, channelState);
            case 'pitchBend':
                this.stats.pitchBend += 1;
                return this.handlePitchBend(message, channelState);
            case 'aftertouch':
                this.stats.aftertouch += 1;
                return this.handleAftertouch(message, channelState);
            case 'channelPressure':
                this.stats.channelPressure += 1;
                return this.handleChannelPressure(message, channelState);
            case 'systemExclusive':
            case 'timeCodeQuarterFrame':
            case 'songPositionPointer':
            case 'songSelect':
            case 'tuneRequest':
            case 'timingClock':
            case 'start':
            case 'continue':
            case 'stop':
            case 'activeSensing':
            case 'systemReset':
                this.stats.system += 1;
                return this.handleSystemMessage(message);
            default:
                return false;
        }
    }

    normalizeVelocity(velocity, channelState) {
        const normalizedVelocity = Math.max(0, Math.min(127, velocity ?? 0)) / 127;
        const volume = channelState?.volume ?? 1;
        const expression = channelState?.expression ?? 1;
        return Math.max(0, Math.min(1, normalizedVelocity * volume * expression));
    }

    async ensureInstrumentForChannel(channelState) {
        if (!channelState) {
            return null;
        }

        if (channelState.instrumentKey && this.soundfontManager?.loadedSoundfonts?.has?.(channelState.instrumentKey)) {
            return channelState.instrumentKey;
        }

        if (!this.soundfontManager || typeof this.soundfontManager.loadInstrumentForProgram !== 'function') {
            return this.soundfontManager?.currentInstrument || this.defaultInstrumentKey;
        }

        const program = Number.isFinite(channelState.program) ? channelState.program : 0;
        const channelIndex = Math.max(0, Math.min(15, (channelState.channelNumber ?? 1) - 1));
        const bank = (channelState.bank && (Number.isFinite(channelState.bank.msb) || Number.isFinite(channelState.bank.lsb)))
            ? {
                msb: Number.isFinite(channelState.bank.msb) ? channelState.bank.msb : null,
                lsb: Number.isFinite(channelState.bank.lsb) ? channelState.bank.lsb : null
            }
            : null;

        try {
            const result = await this.soundfontManager.loadInstrumentForProgram({
                program,
                channel: channelIndex,
                bank,
                setCurrent: false,
                clearKit: false
            });

            if (result?.success && result.catalogId) {
                channelState.instrumentKey = result.catalogId;
                return result.catalogId;
            }

            if (result?.fallback && result.catalogId) {
                channelState.instrumentKey = result.catalogId;
                return result.catalogId;
            }
        } catch (error) {
            this.logger.warn?.('⚠️ MIDIPerformanceEngine: falha ao carregar instrumento do Program Change', error);
        }

        const fallbackKey = this.soundfontManager?.currentInstrument || this.defaultInstrumentKey;
        if (!channelState.instrumentKey) {
            channelState.instrumentKey = fallbackKey;
        }
        return fallbackKey;
    }

    async handleNoteOn(message, channelState, handledByDevice) {
        if (!channelState) {
            return false;
        }

        const normalizedVelocity = this.normalizeVelocity(message.velocity, channelState);
        const instrumentKey = await this.ensureInstrumentForChannel(channelState);

        const entry = {
            note: message.note,
            velocity: message.velocity,
            normalizedVelocity,
            instrumentKey,
            startedAt: message.timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            noteId: null,
            metadata: {
                deviceId: message.deviceId || null,
                deviceName: message.deviceName || null
            }
        };

        if (!handledByDevice) {
            entry.noteId = await this.startNotePlayback(channelState, message, entry);
        }

        channelState.activeNotes.set(message.note, entry);
        channelState.aftertouch.delete(message.note);
        this.emit('noteOn', { message, channelState, entry, handledByDevice });
        return true;
    }

    async handleNoteOff(message, channelState, handledByDevice) {
        if (!channelState) {
            return false;
        }

        const entry = channelState.activeNotes.get(message.note);
        const sustainActive = channelState.sustainPedal && !handledByDevice;

        if (entry && sustainActive) {
            channelState.sustainPending.add(message.note);
            return true;
        }

        if (entry) {
            await this.stopNotePlayback(entry, handledByDevice);
            channelState.activeNotes.delete(message.note);
        }

        channelState.sustainPending.delete(message.note);
        channelState.aftertouch.delete(message.note);
        this.emit('noteOff', { message, channelState, entry, handledByDevice });
        return Boolean(entry);
    }

    async startNotePlayback(channelState, message, entry) {
        if (!this.soundfontManager || typeof this.soundfontManager.startSustainedNoteWithInstrument !== 'function') {
            if (this.audioEngine && typeof this.audioEngine.playNote === 'function') {
                try {
                    this.audioEngine.playNote(message.note, 0.8, entry.normalizedVelocity);
                } catch (error) {
                    this.logger.warn?.('⚠️ MIDIPerformanceEngine: falha ao reproduzir nota via AudioEngine', error);
                }
            }
            return null;
        }

        try {
            return this.soundfontManager.startSustainedNoteWithInstrument(
                message.note,
                entry.instrumentKey,
                entry.normalizedVelocity
            );
        } catch (error) {
            this.logger.warn?.('⚠️ MIDIPerformanceEngine: falha ao reproduzir nota via SoundfontManager', error);
            return null;
        }
    }

    async stopNotePlayback(entry, handledByDevice) {
        if (!entry || !this.soundfontManager || handledByDevice) {
            return;
        }

        try {
            if (entry.noteId) {
                await this.soundfontManager.stopSustainedNote(entry.noteId);
            } else if (typeof this.soundfontManager.stopSustainedNote === 'function') {
                await this.soundfontManager.stopSustainedNote(entry.note);
            }
        } catch (error) {
            this.logger.warn?.('⚠️ MIDIPerformanceEngine: falha ao interromper nota', error);
        }
    }

    async handleControlChange(message, channelState) {
        if (!channelState) {
            return false;
        }

        const { controller, value } = message;
        channelState.controllers.set(controller, value);

        switch (controller) {
            case 0: // Bank Select MSB
                channelState.bank.msb = value;
                break;
            case 32: // Bank Select LSB
                channelState.bank.lsb = value;
                break;
            case 1: // Modulation
                channelState.modulation = value / 127;
                break;
            case 7: // Channel Volume
                channelState.volume = value / 127;
                break;
            case 10: // Pan
                channelState.pan = (value - 64) / 64;
                break;
            case 11: // Expression
                channelState.expression = value / 127;
                break;
            case 64: // Sustain Pedal
                this.updateSustain(channelState, value);
                break;
            case 65: // Portamento
                channelState.portamento = value >= 64;
                break;
            case 98: // NRPN LSB
                channelState.nrpn.lsb = value;
                channelState.nrpn.active = true;
                channelState.rpn.active = false;
                break;
            case 99: // NRPN MSB
                channelState.nrpn.msb = value;
                channelState.nrpn.active = true;
                channelState.rpn.active = false;
                break;
            case 100: // RPN LSB
                channelState.rpn.lsb = value;
                channelState.rpn.active = true;
                channelState.nrpn.active = false;
                break;
            case 101: // RPN MSB
                channelState.rpn.msb = value;
                channelState.rpn.active = true;
                channelState.nrpn.active = false;
                break;
            case 6: // Data Entry MSB
                channelState.dataEntry.msb = value;
                this.applyDataEntry(channelState);
                break;
            case 38: // Data Entry LSB
                channelState.dataEntry.lsb = value;
                this.applyDataEntry(channelState);
                break;
            case 96: // Data Increment
                this.incrementDataEntry(channelState);
                break;
            case 97: // Data Decrement
                this.decrementDataEntry(channelState);
                break;
            case 120: // All Sound Off
                await this.handleAllSoundOff(channelState);
                break;
            case 121: // Reset All Controllers
                await this.resetAllControllers(channelState);
                break;
            case 122: // Local Control
                channelState.localControl = value >= 64;
                break;
            case 123: // All Notes Off
                await this.handleAllNotesOff(channelState);
                break;
            case 124: // Omni Off
                channelState.omniMode = false;
                break;
            case 125: // Omni On
                channelState.omniMode = true;
                break;
            case 126: // Mono On
                channelState.monoMode = true;
                break;
            case 127: // Poly On
                channelState.monoMode = false;
                break;
            default:
                break;
        }

        this.emit('controlChange', { message, channelState });
        return true;
    }

    async handleProgramChange(message, channelState) {
        if (!channelState) {
            return false;
        }

        channelState.program = message.program;
        const instrumentKey = await this.ensureInstrumentForChannel(channelState);

        this.emit('programChange', {
            message,
            channelState,
            instrumentKey
        });

        return true;
    }

    async handlePitchBend(message, channelState) {
        if (!channelState) {
            return false;
        }

        const raw = Number.isFinite(message.pitchBend)
            ? message.pitchBend
            : ((message.data2 << 7) | message.data1);

        const normalized = ((raw - 8192) / 8192) || 0;
        channelState.pitchBendRaw = raw;
        channelState.pitchBendNormalized = Math.max(-1, Math.min(1, normalized));

        this.emit('pitchBend', {
            message,
            channelState,
            cents: channelState.pitchBendNormalized * (channelState.pitchBendRange || 2) * 100
        });

        return true;
    }

    handleAftertouch(message, channelState) {
        if (!channelState) {
            return false;
        }

        const pressure = Math.max(0, Math.min(127, message.pressure ?? message.value ?? 0));
        const normalized = pressure / 127;
        channelState.aftertouch.set(message.note, normalized);
        this.emit('aftertouch', { message, channelState, normalized });
        return true;
    }

    handleChannelPressure(message, channelState) {
        if (!channelState) {
            return false;
        }

        const pressure = Math.max(0, Math.min(127, message.pressure ?? message.value ?? 0));
        channelState.channelPressure = pressure / 127;
        this.emit('channelPressure', { message, channelState });
        return true;
    }

    async handleSystemMessage(message) {
        switch (message.type) {
            case 'systemExclusive':
                this.emit('systemExclusive', message);
                break;
            case 'timeCodeQuarterFrame':
                this.emit('timeCodeQuarterFrame', message);
                break;
            case 'songPositionPointer':
                this.systemRealtimeState.songPosition = message.songPosition ?? 0;
                this.emit('songPositionPointer', message);
                break;
            case 'songSelect':
                this.emit('songSelect', message);
                break;
            case 'tuneRequest':
                this.emit('tuneRequest', message);
                break;
            case 'timingClock':
                this.systemRealtimeState.lastClockAt = Date.now();
                this.emit('timingClock', message);
                break;
            case 'start':
                this.systemRealtimeState.running = true;
                this.emit('start', message);
                break;
            case 'continue':
                this.systemRealtimeState.running = true;
                this.emit('continue', message);
                break;
            case 'stop':
                this.systemRealtimeState.running = false;
                this.emit('stop', message);
                break;
            case 'activeSensing':
                this.emit('activeSensing', message);
                break;
            case 'systemReset':
                await this.resetAllChannels();
                this.emit('systemReset', message);
                break;
            default:
                break;
        }

        return true;
    }

    async updateSustain(channelState, value) {
        const sustainActive = value >= 64;
        if (sustainActive === channelState.sustainPedal) {
            return;
        }

        channelState.sustainPedal = sustainActive;
        if (!sustainActive) {
            const pending = Array.from(channelState.sustainPending);
            channelState.sustainPending.clear();
            for (const midiNote of pending) {
                const entry = channelState.activeNotes.get(midiNote);
                if (!entry) {
                    continue;
                }
                await this.stopNotePlayback(entry, false);
                channelState.activeNotes.delete(midiNote);
            }
        }
    }

    applyDataEntry(channelState) {
        if (!channelState?.rpn?.active && !channelState?.nrpn?.active) {
            return;
        }

        if (channelState.rpn.active) {
            const identifier = (channelState.rpn.msb << 7) | channelState.rpn.lsb;
            const valueMsb = channelState.dataEntry.msb ?? 0;
            const valueLsb = channelState.dataEntry.lsb ?? 0;

            switch (identifier) {
                case 0: { // Pitch Bend Sensitivity
                    const semitones = valueMsb;
                    const cents = valueLsb / 100;
                    const range = semitones + cents;
                    channelState.pitchBendRange = range || 2;
                    break;
                }
                case 1: // Fine Tuning
                case 2: // Coarse Tuning
                default:
                    break;
            }
        }
    }

    incrementDataEntry(channelState) {
        if (!channelState) {
            return;
        }

        const current = channelState.dataEntry.msb ?? 0;
        channelState.dataEntry.msb = Math.min(127, current + 1);
        this.applyDataEntry(channelState);
    }

    decrementDataEntry(channelState) {
        if (!channelState) {
            return;
        }

        const current = channelState.dataEntry.msb ?? 0;
        channelState.dataEntry.msb = Math.max(0, current - 1);
        this.applyDataEntry(channelState);
    }

    async handleAllSoundOff(channelState) {
        await this.handleAllNotesOff(channelState);
    }

    async handleAllNotesOff(channelState) {
        if (!channelState) {
            return;
        }

        const activeNotes = Array.from(channelState.activeNotes.values());
        channelState.activeNotes.clear();
        channelState.sustainPending.clear();

        for (const entry of activeNotes) {
            await this.stopNotePlayback(entry, false);
        }
    }

    async resetAllControllers(channelState) {
        if (!channelState) {
            return;
        }

        channelState.volume = 1;
        channelState.expression = 1;
        channelState.pan = 0;
        channelState.modulation = 0;
        channelState.pitchBendRaw = 8192;
        channelState.pitchBendNormalized = 0;
        channelState.pitchBendRange = 2;
        channelState.sustainPedal = false;
        channelState.sustainPending.clear();
        channelState.controllers.clear();
        channelState.dataEntry = { msb: null, lsb: null };
        channelState.rpn = { msb: 127, lsb: 127, active: false };
        channelState.nrpn = { msb: null, lsb: null, active: false };
        await this.handleAllNotesOff(channelState);
    }

    async resetAllChannels() {
        const channelKeys = Array.from(this.channelStates.keys());
        for (const channel of channelKeys) {
            const state = this.channelStates.get(channel);
            await this.resetAllControllers(state);
        }
    }
}

if (typeof window !== 'undefined') {
    window.MIDIPerformanceEngine = MIDIPerformanceEngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MIDIPerformanceEngine;
}
