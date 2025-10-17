// Board Bells Device - Handler específico para dispositivo Board Bells
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Gerencia comunicação MIDI com Board Bells (notas, program change e pitch bend)

/**
 * Handler específico para dispositivo Board Bells
 * Gerencia 8 notas musicais, program change e pitch bend com margem de segurança
 */
class BoardBellsDevice {
    constructor(midiInput, manager) {
        this.midiInput = midiInput;
        this.manager = manager;
        this.deviceId = midiInput.id;
        this.deviceName = midiInput.name;
        
        // Configurações
        this.config = {
            notesCount: 8,
            pitchBendDeadzone: 2, // Margem de segurança de 2% do centro
            defaultChannel: 1,
            instrumentsCount: 5,
            chordWindowMs: 45
        };
        
        // Mapeamento de notas para compatibilidade entre revisões de firmware
        this.noteMap = new Map([
            // Revision 1 (faixa grave)
            [12, 'C1'],
            [14, 'D1'],
            [16, 'E1'],
            [17, 'F1'],
            [19, 'G1'],
            [21, 'A1'],
            [23, 'B1'],
            [24, 'C2'],
            // Revision 2 (faixa central - padrão anterior)
            [60, 'C4'],
            [62, 'D4'],
            [64, 'E4'],
            [65, 'F4'],
            [67, 'G4'],
            [69, 'A4'],
            [71, 'B4'],
            [72, 'C5']
        ]);

        this._noteMappingUtils = null;
        
        // Estado atual
        this.state = {
            activeNotes: new Set(),
            currentProgram: 0,
            lastPitchBend: 8192, // Centro (0)
            pitchBendValue: 0,
            isConnected: true,
            notesPlayed: 0,
            lastActivity: Date.now(),
            chordPlaybackEnabled: this.manager?.isChordPlaybackEnabled?.() ?? true,
            currentChordRoot: null,
            lastChordStartTime: 0,
            suppressedNotes: new Set()
        };
        
        // Callbacks
        this.onNoteOn = null;
        this.onNoteOff = null;
        this.onProgramChange = null;
        this.onPitchBend = null;
        
        // Integração com sistema de áudio
        this.audioEngine = null;
        this.soundfontManager = null;
        
        console.log(`✅ BoardBellsDevice inicializado: ${this.deviceName}`);
        this.logConfiguration();
    }

    /**
     * Loga configuração do dispositivo
     */
    logConfiguration() {
        console.log('📋 Configuração Board Bells:');
    console.log(`   - Notas: ${this.config.notesCount} (faixa suportada dinâmica)`);
        console.log(`   - Pitch Bend Deadzone: ${this.config.pitchBendDeadzone}%`);
        console.log(`   - Canal MIDI padrão: ${this.config.defaultChannel}`);
        console.log(`   - Instrumentos disponíveis: ${this.config.instrumentsCount}`);
        console.log('   - Mapeamento de notas reconhecidas:', Array.from(this.noteMap.entries())
            .map(([midi, note]) => `${midi}→${note}`)
            .join(', '));
    }

    /**
     * Define integração com motor de áudio
     * @param {Object} audioEngine - Motor de áudio
     * @param {Object} soundfontManager - Gerenciador de soundfonts
     */
    setAudioIntegration(audioEngine, soundfontManager) {
        this.audioEngine = audioEngine;
        this.soundfontManager = soundfontManager;
        console.log('✅ BoardBells integrado com motor de áudio');
    }

    setChordPlaybackEnabled(enabled) {
        const normalized = Boolean(enabled);

        if (this.state.chordPlaybackEnabled === normalized) {
            return;
        }

        this.state.chordPlaybackEnabled = normalized;
        if (normalized) {
            console.log('🎼 Board Bells: reprodução completa de acordes habilitada');
        } else {
            console.log('🎼 Board Bells: reprodução limitada à nota raiz');
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

    ensureNoteMappingUtils() {
        if (this._noteMappingUtils) {
            return this._noteMappingUtils;
        }

        const NoteMappingUtilsClass = (typeof window !== 'undefined' && window.NoteMappingUtils)
            ? window.NoteMappingUtils
            : (typeof NoteMappingUtils === 'function' ? NoteMappingUtils : null);

        if (NoteMappingUtilsClass) {
            this._noteMappingUtils = new NoteMappingUtilsClass();
        }

        return this._noteMappingUtils;
    }

    resolveNoteName(midiNote) {
        if (this.noteMap.has(midiNote)) {
            return this.noteMap.get(midiNote);
        }

        if (typeof this.manager?.midiNoteToName === 'function') {
            return this.manager.midiNoteToName(midiNote);
        }

        const utils = this.ensureNoteMappingUtils();
        if (utils && typeof utils.midiToNote === 'function') {
            return utils.midiToNote(midiNote);
        }

        return null;
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

    /**
     * Manipula mensagens MIDI do dispositivo
     * @param {Object} message - Mensagem MIDI decodificada
     */
    handleMessage(message) {
        this.state.lastActivity = Date.now();

        switch (message.type) {
            case 'noteOn':
                if (message.velocity > 0) {
                    this.handleNoteOn(message);
                } else {
                    // Velocity 0 = Note Off
                    this.handleNoteOff(message);
                }
                break;
            
            case 'noteOff':
                this.handleNoteOff(message);
                break;
            
            case 'programChange':
                this.handleProgramChange(message);
                break;
            
            case 'pitchBend':
                this.handlePitchBend(message);
                break;
            
            default:
                console.log(`ℹ️ Mensagem MIDI não tratada: ${message.type}`, message);
        }
    }

    /**
     * Manipula evento Note On
     * @param {Object} message - Mensagem MIDI
     */
    handleNoteOn(message) {
        const noteName = this.resolveNoteName(message.note);

        if (!noteName) {
            console.warn(`⚠️ Nota MIDI ${message.note} não mapeada no Board Bells`);
            return;
        }

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
            console.log(`🎵 Board Bells: nota ${noteName} ignorada (acorde desabilitado)`);
        }

        if (suppressNote) {
            return;
        }

    console.log(`🎵 Board Bells: Note ON - ${noteName} (MIDI ${message.note}) | Velocity: ${message.velocity}`);
        
        this.state.activeNotes.add(message.note);
        this.state.notesPlayed++;

        // Integração com sistema de áudio
    if (this.soundfontManager) {
            // Converter velocity MIDI (0-127) para normalizado (0-1)
            const normalizedVelocity = message.velocity / 127;
            
            try {
                this.soundfontManager.startSustainedNote(noteName, normalizedVelocity);
                console.log(`✅ Áudio iniciado para ${noteName}`);
            } catch (error) {
                console.error(`❌ Erro ao iniciar áudio para ${noteName}:`, error);
            }
        }

        // Integração com painel de status MIDI
        if (window.midiStatusPanel) {
            window.midiStatusPanel.updateNote(this.midiInput.id, message.note, true);
        }

        // Callback customizado
        if (this.onNoteOn) {
            this.onNoteOn({
                note: message.note,
                noteName,
                velocity: message.velocity,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }
    }

    /**
     * Manipula evento Note Off
     * @param {Object} message - Mensagem MIDI
     */
    handleNoteOff(message) {
        if (this.state.suppressedNotes.has(message.note)) {
            this.state.suppressedNotes.delete(message.note);
            return;
        }

        const noteName = this.resolveNoteName(message.note);

        if (!noteName) {
            return;
        }

        console.log(`🎵 Board Bells: Note OFF - ${noteName} (MIDI ${message.note})`);
        
        this.state.activeNotes.delete(message.note);

        // Integração com sistema de áudio
        if (this.soundfontManager) {
            try {
                this.soundfontManager.stopSustainedNote(noteName);
                console.log(`✅ Áudio parado para ${noteName}`);
            } catch (error) {
                console.error(`❌ Erro ao parar áudio para ${noteName}:`, error);
            }
        }

        // Callback customizado
        if (this.onNoteOff) {
            this.onNoteOff({
                note: message.note,
                noteName,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }
    }

    /**
     * Manipula mudança de programa (instrumento)
     * @param {Object} message - Mensagem MIDI
     */
    handleProgramChange(message) {
        const program = message.program;
        
        if (program >= this.config.instrumentsCount) {
            console.warn(`⚠️ Programa ${program} fora do range (0-${this.config.instrumentsCount - 1})`);
            return;
        }

        console.log(`🎼 Board Bells: Program Change - ${program}`);
        
        this.state.currentProgram = program;

        // Mapear programa MIDI para instrumento do sistema
        const instrumentMap = [
            'piano_grand',      // Program 0
            'violin_ensemble',  // Program 1
            'flute_concert',    // Program 2
            'guitar_nylon',     // Program 3
            'harp_orchestral'   // Program 4
        ];

        const instrumentKey = instrumentMap[program];

        if (instrumentKey && this.soundfontManager) {
            console.log(`🎹 Trocando para instrumento: ${instrumentKey}`);
            
            this.soundfontManager.loadInstrument(instrumentKey, {
                setCurrent: true,
                clearKit: false
            }).then(success => {
                if (success) {
                    console.log(`✅ Instrumento ${instrumentKey} carregado`);
                } else {
                    console.error(`❌ Falha ao carregar instrumento ${instrumentKey}`);
                }
            }).catch(error => {
                console.error(`❌ Erro ao trocar instrumento:`, error);
            });
        }

        // Integração com painel de status MIDI
        if (window.midiStatusPanel) {
            const instrumentNames = {
                'piano_grand': 'Piano de Cauda',
                'violin_ensemble': 'Violino Ensemble',
                'flute_concert': 'Flauta Concerto',
                'guitar_nylon': 'Violão Nylon',
                'harp_orchestral': 'Harpa Orquestral'
            };
            window.midiStatusPanel.updateProgram(
                this.midiInput.id,
                program,
                instrumentNames[instrumentKey] || instrumentKey
            );
        }

        // Callback customizado
        if (this.onProgramChange) {
            this.onProgramChange({
                program,
                instrumentKey,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }
    }

    /**
     * Manipula pitch bend com margem de segurança
     * @param {Object} message - Mensagem MIDI
     */
    handlePitchBend(message) {
        const rawValue = message.pitchBend; // 0-16383, centro = 8192
        const percentValue = message.pitchBendValue; // -100 a +100
        
        // Aplicar margem de segurança (deadzone de 2%)
        const deadzone = this.config.pitchBendDeadzone;
        let effectiveValue = percentValue;
        
        if (Math.abs(percentValue) < deadzone) {
            effectiveValue = 0; // Ignorar movimentos dentro da deadzone
        }

        // Só processar se houver mudança significativa
        if (this.state.pitchBendValue === effectiveValue) {
            return;
        }

        this.state.lastPitchBend = rawValue;
        this.state.pitchBendValue = effectiveValue;

        // Log apenas se fora da deadzone
        if (effectiveValue !== 0) {
            console.log(`🎚️ Board Bells: Pitch Bend - ${effectiveValue.toFixed(2)}% (raw: ${rawValue})`);
        }

        // Callback customizado
        if (this.onPitchBend) {
            this.onPitchBend({
                rawValue,
                percentValue,
                effectiveValue,
                inDeadzone: Math.abs(percentValue) < deadzone,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }

        // Integração com osciloscópio (se disponível)
        if (window.midiOscilloscope && typeof window.midiOscilloscope.updatePitchBend === 'function') {
            window.midiOscilloscope.updatePitchBend(percentValue);
        }
    }

    /**
     * Obtém estado atual do dispositivo
     * @returns {Object} Estado completo
     */
    getState() {
        return {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            isConnected: this.state.isConnected,
            activeNotes: Array.from(this.state.activeNotes),
            activeNotesCount: this.state.activeNotes.size,
            chordPlaybackEnabled: this.isChordPlaybackEnabled(),
            currentProgram: this.state.currentProgram,
            pitchBendValue: this.state.pitchBendValue,
            notesPlayed: this.state.notesPlayed,
            lastActivity: this.state.lastActivity,
            config: this.config
        };
    }

    /**
     * Para todas as notas ativas (panic)
     */
    stopAllNotes() {
        console.log('🛑 Board Bells: Parando todas as notas...');
        
        const activeNotes = Array.from(this.state.activeNotes);
        activeNotes.forEach(midiNote => {
            const noteName = this.resolveNoteName(midiNote);
            if (noteName && this.soundfontManager) {
                this.soundfontManager.stopSustainedNote(noteName);
            }
        });
        
        this.state.activeNotes.clear();
        if (this.state.suppressedNotes instanceof Set) {
            this.state.suppressedNotes.clear();
        }
        this.resetChordGrouping();
        console.log('✅ Todas as notas paradas');
    }

    /**
     * Desconecta o dispositivo
     */
    disconnect() {
        console.log(`🔌 Desconectando Board Bells: ${this.deviceName}`);
        
        // Parar todas as notas
        this.stopAllNotes();
        
        // Limpar estado
        this.state.isConnected = false;
        
        // Limpar callbacks
        this.onNoteOn = null;
        this.onNoteOff = null;
        this.onProgramChange = null;
        this.onPitchBend = null;
        
        console.log('✅ Board Bells desconectado');
    }

    /**
     * Obtém estatísticas de uso
     * @returns {Object} Estatísticas
     */
    getStats() {
        const uptime = Date.now() - (this.state.lastActivity - this.state.notesPlayed * 100);
        
        return {
            deviceName: this.deviceName,
            notesPlayed: this.state.notesPlayed,
            activeNotes: this.state.activeNotes.size,
            currentProgram: this.state.currentProgram,
            uptime: Math.floor(uptime / 1000), // segundos
            lastActivity: new Date(this.state.lastActivity).toLocaleTimeString()
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BoardBellsDevice = BoardBellsDevice;
}
