// MidiTerraDevice - Handler específico para o controlador Midi-Terra
// Autor: Terra MIDI System
// Data: 17/10/2025
// Descrição: Gerencia mensagens MIDI do dispositivo Midi-Terra com suporte a notas,
// controles contínuos, sustain, pitch bend e troca de programa.

class MidiTerraDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'MidiTerra');

        this.config = {
            defaultChannel: 1,
            sustainControl: 64,
            modulationControl: 1,
            expressionControl: 11,
            velocityCurve: 'linear',
            noteRange: [0, 127], // Faixa completa MIDI 1.0
            pitchBendRange: 2, // semitons
            chordWindowMs: 45
        };

        this.state = {
            ...this.state,
            activeNotes: new Map(),
            pendingSustainNotes: new Set(),
            sustainPedal: false,
            controllers: new Map(),
            lastProgram: null,
            lastProgramMapping: null,
            bankSelect: {
                msb: null,
                lsb: null
            },
            lastPitchBend: 8192,
            lastPitchBendPercent: 0,
            notesPlayed: 0,
            chordPlaybackEnabled: this.manager?.isChordPlaybackEnabled?.() ?? true,
            currentChordRoot: null,
            lastChordStartTime: 0,
            suppressedNotes: new Set()
        };

        // Integração automática quando disponível
        this.autoDetectAudioIntegrations();

        console.log(`✅ MidiTerraDevice inicializado: ${this.deviceName}`);
        this.logConfiguration();
    }

    autoDetectAudioIntegrations() {
        const audioEngine = typeof window !== 'undefined' ? window.audioEngine : null;
        const soundfontManager = typeof window !== 'undefined' ? window.soundfontManager : null;

        if (audioEngine || soundfontManager) {
            this.setAudioIntegration(audioEngine, soundfontManager);
        }
    }

    logConfiguration() {
        console.log('📋 Configuração Midi-Terra:');
        console.log(`   - Canal padrão: ${this.config.defaultChannel}`);
        console.log(`   - Controle de sustain (CC): ${this.config.sustainControl}`);
        console.log(`   - Controle de modulação (CC): ${this.config.modulationControl}`);
        console.log(`   - Controle de expressão (CC): ${this.config.expressionControl}`);
        console.log(`   - Curva de velocity: ${this.config.velocityCurve}`);
        console.log(`   - Faixa de notas: MIDI ${this.config.noteRange[0]} até ${this.config.noteRange[1]}`);
    }

    setAudioIntegration(audioEngine, soundfontManager) {
        super.setAudioIntegration(audioEngine, soundfontManager);
        if (audioEngine || soundfontManager) {
            console.log('🔗 MidiTerraDevice integrado a motor de áudio/soundfonts');
        }
    }

    setChordPlaybackEnabled(enabled) {
        const normalized = Boolean(enabled);

        if (this.state.chordPlaybackEnabled === normalized) {
            return;
        }

        this.state.chordPlaybackEnabled = normalized;

        if (normalized) {
            console.log('🎼 Midi-Terra: reprodução completa de acordes habilitada');
        } else {
            console.log('🎼 Midi-Terra: reprodução limitada à nota raiz');
        }

        this.resetChordGrouping();
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
        if (this.state.suppressedNotes instanceof Set) {
            this.state.suppressedNotes.clear();
        }
    }

    getActiveBankSelection() {
        const msb = Number.isFinite(this.state.bankSelect?.msb) ? this.state.bankSelect.msb : null;
        const lsb = Number.isFinite(this.state.bankSelect?.lsb) ? this.state.bankSelect.lsb : null;
        if (msb === null && lsb === null) {
            return null;
        }
        return { msb, lsb };
    }

    describeActiveBank() {
        const bank = this.getActiveBankSelection();
        if (!bank) {
            return 'Banco padrão (MSB/LSB não definidos)';
        }
        const msbLabel = bank.msb === null ? '--' : bank.msb;
        const lsbLabel = bank.lsb === null ? '--' : bank.lsb;
        return `Banco MSB ${msbLabel} / LSB ${lsbLabel}`;
    }

    updateBankSelect(part, value) {
        const normalized = Number.isFinite(value) ? Math.max(0, Math.min(127, value)) : null;
        const property = part === 'lsb' ? 'lsb' : 'msb';
        const previous = this.state.bankSelect[property];
        this.state.bankSelect[property] = normalized;

        if (previous !== normalized) {
            console.log(`🏦 Midi-Terra Bank Select ${property.toUpperCase()} = ${normalized === null ? 'null' : normalized}`);
        }
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

    handleMessage(message) {
        super.handleMessage(message);

        switch (message.type) {
            case 'noteOn':
                if (message.velocity > 0) {
                    this.handleNoteOn(message);
                } else {
                    this.handleNoteOff(message);
                }
                break;
            case 'noteOff':
                this.handleNoteOff(message);
                break;
            case 'controlChange':
                this.handleControlChange(message);
                break;
            case 'programChange':
                this.handleProgramChange(message);
                break;
            case 'pitchBend':
                this.handlePitchBend(message);
                break;
            default:
                console.log(`ℹ️ MidiTerraDevice recebeu mensagem não mapeada: ${message.type}`, message);
        }
    }

    handleNoteOn(message) {
        if (!this.isNoteWithinRange(message.note)) {
            console.warn(`⚠️ Nota ${message.note} fora da faixa configurada para o Midi-Terra.`);
            return;
        }

        const noteName = this.manager?.midiNoteToName?.(message.note) || message.note;
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

        let suppressNote = false;
        if (!chordEnabled && this.state.currentChordRoot !== message.note) {
            suppressNote = true;
            this.state.suppressedNotes.add(message.note);
            console.log(`🎵 Midi-Terra: nota ${noteName} ignorada (acorde desabilitado)`);
        }

        if (suppressNote) {
            return;
        }

        const normalizedVelocity = message.velocity / 127;

        let soundfontNoteId = null;

        if (this.soundfontManager && noteName) {
            try {
                // Guardar o identificador único retornado pelo soundfont manager para encerrar a nota corretamente
                soundfontNoteId = this.soundfontManager.startSustainedNote(noteName, normalizedVelocity);
            } catch (error) {
                console.warn(`⚠️ Não foi possível iniciar nota em soundfont (${noteName}):`, error);
            }
        }

        this.state.activeNotes.set(message.note, {
            velocity: message.velocity,
            timestamp,
            noteName,
            soundfontNoteId
        });
        this.state.notesPlayed += 1;

        console.log(`🎹 Midi-Terra Note ON: ${noteName} (MIDI ${message.note}) | Velocity ${message.velocity}`);

        if (window.midiStatusPanel) {
            window.midiStatusPanel.updateNote(this.deviceId, message.note, true);
        }
    }

    handleNoteOff(message) {
        if (this.state.suppressedNotes.has(message.note)) {
            this.state.suppressedNotes.delete(message.note);
            return;
        }

        const noteName = this.manager?.midiNoteToName?.(message.note) || message.note;

        if (!this.state.activeNotes.has(message.note) && !this.state.pendingSustainNotes.has(message.note)) {
            return;
        }

        if (this.isSustainActive()) {
            this.state.pendingSustainNotes.add(message.note);
            return;
        }

        this.finalizeNote(message.note, noteName);
    }

    finalizeNote(midiNote, noteName) {
        const activeNoteData = this.state.activeNotes.get(midiNote);
        const soundfontNoteId = activeNoteData?.soundfontNoteId;
        const resolvedNoteName = noteName ?? activeNoteData?.noteName ?? midiNote;

        this.state.activeNotes.delete(midiNote);
        this.state.pendingSustainNotes.delete(midiNote);
        if (this.state.suppressedNotes.has(midiNote)) {
            this.state.suppressedNotes.delete(midiNote);
        }

        console.log(`🎹 Midi-Terra Note OFF: ${resolvedNoteName}`);

        if (this.soundfontManager && soundfontNoteId) {
            try {
                // Priorizar o identificador retornado pelo soundfont manager; se ausente, usar nota como fallback legada
                this.soundfontManager.stopSustainedNote(soundfontNoteId);
            } catch (error) {
                console.warn(`⚠️ Não foi possível parar nota em soundfont (${resolvedNoteName}):`, error);
            }
        } else if (!soundfontNoteId) {
            console.warn(`⚠️ Identificador da nota ${resolvedNoteName} ausente ao solicitar Note OFF. Executando fallback de segurança.`);
            this.soundfontManager?.stopSustainedNote?.(resolvedNoteName);
        }

        if (window.midiStatusPanel) {
            window.midiStatusPanel.updateNote(this.deviceId, midiNote, false);
        }
    }

    handleControlChange(message) {
        this.state.controllers.set(message.controller, message.value);

        if (message.controller === 0) {
            this.updateBankSelect('msb', message.value);
            console.log(`🎛️ Midi-Terra CC0 (Bank MSB) = ${message.value}`);
            return;
        }

        if (message.controller === 32) {
            this.updateBankSelect('lsb', message.value);
            console.log(`🎛️ Midi-Terra CC32 (Bank LSB) = ${message.value}`);
            return;
        }

        if (message.controller === 123) {
            console.log(`🛑 Midi-Terra CC123 (All Notes Off) recebido (valor ${message.value})`);
            this.stopAllNotes();
            return;
        }

        console.log(`🎛️ Midi-Terra CC${message.controller} = ${message.value}`);

        if (message.controller === this.config.sustainControl) {
            this.updateSustainState(message.value);
            return;
        }

        if (message.controller === this.config.modulationControl) {
            this.handleModulation(message.value);
            return;
        }

        if (message.controller === this.config.expressionControl) {
            this.handleExpression(message.value);
        }
    }

    updateSustainState(value) {
        const sustainActive = value >= 64;
        if (sustainActive === this.state.sustainPedal) {
            return;
        }

        this.state.sustainPedal = sustainActive;
        console.log(`🎚️ Sustain ${sustainActive ? 'ativado' : 'desativado'} (${value})`);

        if (!sustainActive) {
            const notesToRelease = Array.from(this.state.pendingSustainNotes);
            notesToRelease.forEach(midiNote => {
                const noteName = this.manager?.midiNoteToName?.(midiNote) || midiNote;
                this.finalizeNote(midiNote, noteName);
            });
        }
    }

    handleModulation(value) {
        const percent = Math.round((value / 127) * 100);
        console.log(`📡 Modulação: ${percent}%`);
    }

    handleExpression(value) {
        const percent = Math.round((value / 127) * 100);
        console.log(`🎚️ Expressão: ${percent}%`);
    }

    handleProgramChange(message) {
        this.state.lastProgram = message.program;

        const channelIndex = Number.isFinite(message.channel)
            ? Math.max(0, message.channel - 1)
            : Math.max(0, this.config.defaultChannel - 1);
        const bankInfo = this.getActiveBankSelection();
        const bankLabel = this.describeActiveBank();

        console.log(`🎼 Program Change recebido: Programa ${message.program} | Canal ${message.channel ?? (channelIndex + 1)} | ${bankLabel}`);

        if (this.soundfontManager && typeof this.soundfontManager.loadInstrumentForProgram === 'function') {
            const preset = this.soundfontManager?.midiConfig?.mappingPreset || null;
            this.soundfontManager.loadInstrumentForProgram({
                program: message.program,
                channel: channelIndex,
                bank: bankInfo,
                preset,
                setCurrent: true,
                clearKit: false
            }).then(result => {
                if (!result) {
                    return;
                }

                if (result.ignored) {
                    console.log(`🥁 Program Change ignorado no canal ${channelIndex + 1} (regras de bateria).`);
                    this.state.lastProgramMapping = {
                        program: message.program,
                        channel: channelIndex,
                        bank: bankInfo,
                        ignored: true,
                        mapping: result.mapping || null
                    };

                    if (window.midiStatusPanel) {
                        window.midiStatusPanel.updateProgram(this.deviceId, message.program, 'Ignorado (Canal Bateria)');
                    }
                    return;
                }

                if (!result.success) {
                    console.warn('⚠️ Program Change não conseguiu carregar instrumento mapeado:', {
                        program: message.program,
                        channel: channelIndex,
                        bank: bankInfo,
                        mapping: result.mapping,
                        catalogId: result.catalogId
                    });
                    this.state.lastProgramMapping = {
                        program: message.program,
                        channel: channelIndex,
                        bank: bankInfo,
                        success: false,
                        mapping: result.mapping || null
                    };

                    if (window.midiStatusPanel) {
                        window.midiStatusPanel.updateProgram(this.deviceId, message.program, `Falha no mapeamento (${message.program})`);
                    }
                    return;
                }

                const mapping = result.mapping || {};
                const catalogId = result.catalogId;
                const isFallback = Boolean(mapping.fallback);
                const strategy = mapping.strategy || (isFallback ? 'fallback' : 'desconhecida');
                const presetName = mapping.preset || preset || 'default';
                const displayName = mapping.name || catalogId || `Programa ${message.program}`;
                const fallbackSuffix = isFallback ? ' (fallback)' : '';

                console.log(`🎼 Program ${message.program} → ${displayName}${fallbackSuffix} | Catálogo ${catalogId} | Estratégia ${strategy} | Preset ${presetName}`);

                this.state.lastProgramMapping = {
                    program: message.program,
                    channel: channelIndex,
                    bank: bankInfo,
                    catalogId,
                    mapping
                };

                if (window.midiStatusPanel) {
                    window.midiStatusPanel.updateProgram(this.deviceId, message.program, `${displayName}${fallbackSuffix}`);
                }
            }).catch(error => {
                console.warn('⚠️ Falha ao processar Program Change mapeado:', error);
            });
            return;
        }

        console.warn('ℹ️ Program mapper indisponível, usando fluxo legado de Program Change.');

        if (this.soundfontManager) {
            this.soundfontManager.loadInstrument(message.program, {
                setCurrent: true,
                clearKit: false
            }).catch(error => {
                console.warn('⚠️ Falha ao carregar instrumento para Program Change:', error);
            });
        }

        if (window.midiStatusPanel) {
            window.midiStatusPanel.updateProgram(this.deviceId, message.program, `Programa ${message.program}`);
        }
    }

    handlePitchBend(message) {
        this.state.lastPitchBend = message.pitchBend;
        this.state.lastPitchBendPercent = message.pitchBendValue;

        console.log(`🎚️ Pitch Bend: ${message.pitchBendValue.toFixed(2)}% (raw ${message.pitchBend})`);

        if (window.midiOscilloscope && typeof window.midiOscilloscope.updatePitchBend === 'function') {
            window.midiOscilloscope.updatePitchBend(message.pitchBendValue);
        }
    }

    isSustainActive() {
        return Boolean(this.state.sustainPedal);
    }

    isNoteWithinRange(midiNote) {
        return midiNote >= this.config.noteRange[0] && midiNote <= this.config.noteRange[1];
    }

    stopAllNotes() {
        if (this.soundfontManager?.sustainedNoteManager?.stopAllNotes) {
            try {
                this.soundfontManager.sustainedNoteManager.stopAllNotes();
            } catch (error) {
                console.warn('⚠️ Falha ao encerrar notas via SustainedNoteManager:', error);
            }
        }

        const activeNotes = Array.from(this.state.activeNotes.keys());
        const sustainedNotes = Array.from(this.state.pendingSustainNotes.values());
        const allNotes = new Set([...activeNotes, ...sustainedNotes]);

        allNotes.forEach(midiNote => {
            const noteName = this.manager?.midiNoteToName?.(midiNote) || midiNote;
            if (this.soundfontManager && noteName) {
                try {
                    this.soundfontManager.stopSustainedNote(noteName);
                } catch (error) {
                    console.warn(`⚠️ Erro ao encerrar nota ${noteName} durante stopAllNotes:`, error);
                }
            }
        });

        this.state.activeNotes.clear();
        this.state.pendingSustainNotes.clear();
        if (this.state.suppressedNotes instanceof Set) {
            this.state.suppressedNotes.clear();
        }
        this.resetChordGrouping();
        console.log('🛑 Midi-Terra: todas as notas foram interrompidas.');
    }

    disconnect() {
        console.log(`🔌 Desconectando Midi-Terra (${this.deviceName})`);
        this.stopAllNotes();
        this.state.isConnected = false;
    }

    getState() {
        return {
            ...super.getState(),
            activeNotes: Array.from(this.state.activeNotes.keys()),
            chordPlaybackEnabled: this.isChordPlaybackEnabled(),
            sustainPedal: this.state.sustainPedal,
            controllers: Array.from(this.state.controllers.entries()),
            lastProgram: this.state.lastProgram,
            lastPitchBend: this.state.lastPitchBend,
            lastPitchBendPercent: this.state.lastPitchBendPercent,
            notesPlayed: this.state.notesPlayed
        };
    }
}

if (typeof window !== 'undefined') {
    window.MidiTerraDevice = MidiTerraDevice;
}
