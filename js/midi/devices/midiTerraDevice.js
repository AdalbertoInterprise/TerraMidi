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
            pendingSustainNotes: new Map(),
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

        // 🆕 ROTEAMENTO POR CANAL - Suporte a múltiplos instrumentos no receptor RX
        // Midi-Terra é um receptor que suporta até 5 instrumentos em canais diferentes
        // Canal 5 = Board Bells (detecção automática e roteamento)
        this.channelRouters = new Map();
        this.boardBellsHandler = null;
        
        console.log('📡 Midi-Terra: Receptor RX inicializado (suporta até 5 instrumentos)');
        console.log('   ├─ Canal 1-4: Instrumentos gerais (MidiTerraDevice)');
        console.log('   └─ Canal 5: 🔔 Board Bells (roteamento automático)');

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
        
        // Propagar integração para Board Bells se já foi criado
        if (this.boardBellsHandler && typeof this.boardBellsHandler.setAudioIntegration === 'function') {
            this.boardBellsHandler.setAudioIntegration(audioEngine, soundfontManager);
            console.log('   └─ 🔔 Board Bells: integração de áudio propagada');
        }
    }

    setPerformanceEngine(performanceEngine) {
        super.setPerformanceEngine(performanceEngine);

        if (this.boardBellsHandler && typeof this.boardBellsHandler.setPerformanceEngine === 'function') {
            this.boardBellsHandler.setPerformanceEngine(performanceEngine);
        }
    }

    /**
     * 🆕 Configura integração com Virtual Keyboard
     * Propaga automaticamente para Board Bells (canal 5)
     */
    setVirtualKeyboard(virtualKeyboard) {
        console.log('🎹 MidiTerraDevice: Configurando integração com Virtual Keyboard');
        
        // Inicializar Board Bells handler se ainda não existe
        if (!this.boardBellsHandler) {
            this.initializeBoardBellsHandler();
        }
        
        // Configurar Virtual Keyboard no Board Bells
        if (this.boardBellsHandler && typeof this.boardBellsHandler.setVirtualKeyboard === 'function') {
            this.boardBellsHandler.setVirtualKeyboard(virtualKeyboard);
            console.log('   └─ 🔔 Board Bells (Canal 5): Virtual Keyboard integrado');
        } else {
            console.warn('⚠️ Board Bells handler não disponível ou sem método setVirtualKeyboard');
        }
    }

    /**
     * 🆕 Inicializa handler específico para Board Bells (Canal 5)
     */
    initializeBoardBellsHandler() {
        if (this.boardBellsHandler) {
            console.log('♻️ Board Bells handler já existe, reutilizando...');
            return;
        }
        
        console.log('🆕 Inicializando Board Bells handler para Canal 5...');
        
        // Verificar se classe BoardBellsDevice está disponível
        if (typeof BoardBellsDevice === 'undefined' || !window.BoardBellsDevice) {
            console.error('❌ Classe BoardBellsDevice não encontrada!');
            console.log('   Verifique se boardBellsDevice.js foi carregado.');
            return;
        }
        
        try {
            // Criar instância do Board Bells
            this.boardBellsHandler = new BoardBellsDevice(this.midiInput, this.manager);
            
            // Propagar integrações existentes
            if (this.audioEngine || this.soundfontManager) {
                this.boardBellsHandler.setAudioIntegration(this.audioEngine, this.soundfontManager);
            }
            
            // Integrar com Virtual Keyboard se disponível
            const virtualKeyboard = window.musicTherapyApp?.virtualKeyboard || window.virtualKeyboard;
            if (virtualKeyboard && typeof this.boardBellsHandler.setVirtualKeyboard === 'function') {
                this.boardBellsHandler.setVirtualKeyboard(virtualKeyboard);
                console.log('   └─ Virtual Keyboard detectado e integrado automaticamente');
            }
            
            console.log('✅ Board Bells handler inicializado e pronto para Canal 5');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Board Bells handler:', error);
        }
    }

    /**
     * 🆕 Roteia mensagens MIDI do Canal 5 para o Board Bells handler
     */
    routeToBoardBells(message) {
        // Inicializar Board Bells handler se necessário (lazy initialization)
        if (!this.boardBellsHandler) {
            console.log('🔔 Primeira mensagem no Canal 5 detectada - inicializando Board Bells...');
            this.initializeBoardBellsHandler();
        }
        
        // Rotear mensagem para Board Bells
        if (this.boardBellsHandler && typeof this.boardBellsHandler.handleMessage === 'function') {
            this.boardBellsHandler.handleMessage(message);
            return true;
        }

        console.warn('⚠️ Board Bells handler não disponível, mensagem do Canal 5 ignorada');
        return false;
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

        // 🆕 ROTEAMENTO POR CANAL - Detectar Board Bells (Canal 5)
        if (message.channel === 5) {
            return this.routeToBoardBells(message);
        }

        let handled = false;

        switch (message.type) {
            case 'noteOn':
                handled = message.velocity > 0
                    ? this.handleNoteOn(message)
                    : this.handleNoteOff(message);
                break;
            case 'noteOff':
                handled = this.handleNoteOff(message);
                break;
            case 'controlChange':
                handled = this.handleControlChange(message);
                break;
            case 'programChange':
                handled = this.handleProgramChange(message);
                break;
            case 'pitchBend':
                handled = this.handlePitchBend(message);
                break;
            default:
                console.log(`ℹ️ MidiTerraDevice recebeu mensagem não mapeada: ${message.type}`, message);
                handled = false;
        }

        return handled;
    }

    handleNoteOn(message) {
        if (!this.isNoteWithinRange(message.note)) {
            console.warn(`⚠️ Nota ${message.note} fora da faixa configurada para o Midi-Terra.`);
            return true;
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
            return true;
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

        const entry = {
            id: `mt_${message.note}_${Math.floor(timestamp)}_${Math.random().toString(36).slice(2, 8)}`,
            velocity: message.velocity,
            timestamp,
            noteName,
            soundfontNoteId
        };

        this.enqueueActiveNote(message.note, entry);
        this.state.notesPlayed += 1;

        console.log(`🎹 Midi-Terra Note ON: ${noteName} (MIDI ${message.note}) | Velocity ${message.velocity}`);

        this.updateStatusPanelForNote(message.note);

        return true;
    }

    handleNoteOff(message) {
        const midiNote = message.note;

        if (this.state.suppressedNotes.has(midiNote)) {
            this.state.suppressedNotes.delete(midiNote);
            return true;
        }

        const entry = this.dequeueActiveNote(midiNote);

        if (!entry) {
            const pendingStack = this.state.pendingSustainNotes.get(midiNote);
            if (pendingStack && pendingStack.length > 0) {
                const pendingEntry = pendingStack.shift();
                if (pendingStack.length === 0) {
                    this.state.pendingSustainNotes.delete(midiNote);
                }
                this.finalizeNoteEntry(midiNote, pendingEntry);
                this.updateStatusPanelForNote(midiNote);
            }
            return true;
        }

        if (this.isSustainActive()) {
            this.enqueuePendingSustain(midiNote, entry);
            this.updateStatusPanelForNote(midiNote);
            return true;
        }

        this.finalizeNoteEntry(midiNote, entry);
        this.updateStatusPanelForNote(midiNote);
        return true;
    }

    enqueueActiveNote(midiNote, entry) {
        let stack = this.state.activeNotes.get(midiNote);
        if (!stack) {
            stack = [];
            this.state.activeNotes.set(midiNote, stack);
        }
        stack.push(entry);
    }

    dequeueActiveNote(midiNote) {
        const stack = this.state.activeNotes.get(midiNote);
        if (!stack || stack.length === 0) {
            return null;
        }

        const entry = stack.shift();
        if (stack.length === 0) {
            this.state.activeNotes.delete(midiNote);
        }
        return entry;
    }

    enqueuePendingSustain(midiNote, entry) {
        let stack = this.state.pendingSustainNotes.get(midiNote);
        if (!stack) {
            stack = [];
            this.state.pendingSustainNotes.set(midiNote, stack);
        }
        stack.push(entry);
    }

    updateStatusPanelForNote(midiNote) {
        if (!window?.midiStatusPanel) {
            return;
        }
        const activeCount = this.state.activeNotes.get(midiNote)?.length ?? 0;
        const pendingCount = this.state.pendingSustainNotes.get(midiNote)?.length ?? 0;
        window.midiStatusPanel.updateNote(this.deviceId, midiNote, (activeCount + pendingCount) > 0);
    }

    finalizeNoteEntry(midiNote, entry) {
        if (!entry) {
            return;
        }

        const resolvedNoteName = entry.noteName ?? this.manager?.midiNoteToName?.(midiNote) ?? midiNote;
        const soundfontNoteId = entry.soundfontNoteId;

        if (this.state.suppressedNotes.has(midiNote)) {
            this.state.suppressedNotes.delete(midiNote);
        }

        console.log(`🎹 Midi-Terra Note OFF: ${resolvedNoteName}`);

        if (this.soundfontManager && soundfontNoteId) {
            try {
                this.soundfontManager.stopSustainedNote(soundfontNoteId);
            } catch (error) {
                console.warn(`⚠️ Não foi possível parar nota em soundfont (${resolvedNoteName}):`, error);
            }
            return;
        }

        if (this.soundfontManager) {
            try {
                this.soundfontManager.stopSustainedNote(resolvedNoteName);
            } catch (error) {
                console.warn(`⚠️ Não foi possível parar nota em soundfont (${resolvedNoteName}) via fallback:`, error);
            }
        }
    }

    handleControlChange(message) {
        this.state.controllers.set(message.controller, message.value);

        if (message.controller === 0) {
            this.updateBankSelect('msb', message.value);
            console.log(`🎛️ Midi-Terra CC0 (Bank MSB) = ${message.value}`);
            return true;
        }

        if (message.controller === 32) {
            this.updateBankSelect('lsb', message.value);
            console.log(`🎛️ Midi-Terra CC32 (Bank LSB) = ${message.value}`);
            return true;
        }

        if (message.controller === 123) {
            console.log(`🛑 Midi-Terra CC123 (All Notes Off) recebido (valor ${message.value})`);
            this.stopAllNotes();
            return true;
        }

        console.log(`🎛️ Midi-Terra CC${message.controller} = ${message.value}`);

        if (message.controller === this.config.sustainControl) {
            this.updateSustainState(message.value);
            return true;
        }

        if (message.controller === this.config.modulationControl) {
            this.handleModulation(message.value);
            return true;
        }

        if (message.controller === this.config.expressionControl) {
            this.handleExpression(message.value);
            return true;
        }

        return true;
    }

    updateSustainState(value) {
        const sustainActive = value >= 64;
        if (sustainActive === this.state.sustainPedal) {
            return;
        }

        this.state.sustainPedal = sustainActive;
        console.log(`🎚️ Sustain ${sustainActive ? 'ativado' : 'desativado'} (${value})`);

        if (!sustainActive) {
            const pendingNotes = Array.from(this.state.pendingSustainNotes.entries());
            pendingNotes.forEach(([midiNote, entries]) => {
                this.state.pendingSustainNotes.delete(midiNote);
                entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
                this.updateStatusPanelForNote(midiNote);
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

        // ============================================================
        // SISTEMA DE NAVEGAÇÃO POR CATÁLOGO
        // ============================================================
        // Se o CatalogNavigationManager estiver disponível, usar navegação incremental
        if (window.catalogNavigationManager && typeof window.catalogNavigationManager.handleProgramChange === 'function') {
            try {
                window.catalogNavigationManager.handleProgramChange({
                    program: message.program,
                    channel: channelIndex
                });
                
                console.log(`✅ Program Change processado via CatalogNavigationManager`);
                
                // Atualizar painel de status
                if (window.midiStatusPanel) {
                    const state = window.catalogNavigationManager.getState();
                    const displayName = state.currentSoundfont 
                        ? `[${state.currentIndex}/${state.totalSoundfonts}] ${state.currentSoundfont.soundfont}`
                        : `Programa ${message.program}`;
                    window.midiStatusPanel.updateProgram(this.deviceId, message.program, displayName);
                }
                
                return true; // Usar navegação incremental, ignorar fluxo tradicional
            } catch (error) {
                console.warn('⚠️ Erro ao processar via CatalogNavigationManager, usando fallback:', error);
                // Continuar para fluxo tradicional em caso de erro
            }
        }

        // ============================================================
        // FLUXO TRADICIONAL DE PROGRAM CHANGE
        // ============================================================
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
                    return true;
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
                    return true;
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
                    return true;
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
            return true;
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

        return true;
    }

    handlePitchBend(message) {
        this.state.lastPitchBend = message.pitchBend;
        this.state.lastPitchBendPercent = message.pitchBendValue;

        console.log(`🎚️ Pitch Bend: ${message.pitchBendValue.toFixed(2)}% (raw ${message.pitchBend})`);

        if (window.midiOscilloscope && typeof window.midiOscilloscope.updatePitchBend === 'function') {
            window.midiOscilloscope.updatePitchBend(message.pitchBendValue);
        }

        return true;
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

        const affectedNotes = new Set([
            ...this.state.activeNotes.keys(),
            ...this.state.pendingSustainNotes.keys()
        ]);

        this.state.activeNotes.forEach((entries, midiNote) => {
            entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
        });

        this.state.pendingSustainNotes.forEach((entries, midiNote) => {
            entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
        });

        this.state.activeNotes.clear();
        this.state.pendingSustainNotes.clear();
        if (this.state.suppressedNotes instanceof Set) {
            this.state.suppressedNotes.clear();
        }
        this.resetChordGrouping();

        affectedNotes.forEach(midiNote => this.updateStatusPanelForNote(midiNote));
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
