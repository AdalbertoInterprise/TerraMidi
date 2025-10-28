// Board Bells Device - Handler específico para dispositivo Board Bells
// Autor: Terra MIDI System
// Data: 18/10/2025 (Atualizado)
// Descrição: Gerencia comunicação MIDI com Board Bells (notas, program change e pitch bend)
//
// 🆕 ATUALIZAÇÃO 18/10/2025 - Compatibilidade com Catálogo de 811 Soundfonts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// O Board Bells envia comandos programChange (0-127), mas o sistema tem 811 soundfonts.
// Solução implementada:
//   • Armazena último valor programChange recebido
//   • Compara novo valor com anterior para determinar direção
//   • Se MENOR que anterior → dispara botão SPIN-DOWN (▼) = próximo instrumento
//   • Se MAIOR que anterior → dispara botão SPIN-UP (▲) = instrumento anterior
//   • Suporta wrap-around: 127→0 continua incrementando, 0→127 continua decrementando
//   • Atualização visual automática via simulação de clique nos botões
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Handler específico para dispositivo Board Bells
 * Gerencia 8 notas musicais, navegação incremental por programChange e pitch bend
 * 
 * Estratégia de ProgramChange:
 * - Board Bells envia valores 0-127 via MIDI programChange
 * - Sistema compara valor atual com anterior para determinar direção de navegação
 * - Navegação incremental permite acessar catálogo completo de 811 soundfonts
 * - Interface visual atualiza automaticamente via simulação de clique em botões
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
            defaultChannel: 10,
            instrumentsCount: 5,
            chordWindowMs: 45,
            forceChannelOverride: true,
            projectionUpperCThreshold: 60
        };
        
        // 🎹 MAPEAMENTO BOARD BELLS → VIRTUAL KEYBOARD
        // Board Bells tem 8 teclas físicas que enviam MIDI 48-60 (C2-C3)
        // Virtual Keyboard tem 8 teclas gráficas: C, D, E, F, G, A, B, C2
        // 
        // IMPORTANTE: O mapeamento é POSICIONAL (tecla 1 do BB → tecla 1 do VK)
        // independente da oitava MIDI real que o Board Bells envia.
        // 
        // Isto permite que o INSTRUMENTO controle a oitava do Virtual Keyboard,
        // fazendo o VK funcionar como representação gráfica das 8 teclas físicas.
        this.noteMap = new Map([
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // MAPEAMENTO PADRÃO: Board Bells C2-C3 (MIDI 48-60)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Tecla 1: C2 (MIDI 48) → Virtual Keyboard "C" (1ª tecla)
            [48, 'C'],
            // Tecla 2: D2 (MIDI 50) → Virtual Keyboard "D" (2ª tecla)
            [50, 'D'],
            // Tecla 3: E2 (MIDI 52) → Virtual Keyboard "E" (3ª tecla)
            [52, 'E'],
            // Tecla 4: F2 (MIDI 53) → Virtual Keyboard "F" (4ª tecla)
            [53, 'F'],
            // Tecla 5: G2 (MIDI 55) → Virtual Keyboard "G" (5ª tecla)
            [55, 'G'],
            // Tecla 6: A2 (MIDI 57) → Virtual Keyboard "A" (6ª tecla)
            [57, 'A'],
            // Tecla 7: B2 (MIDI 59) → Virtual Keyboard "B" (7ª tecla)
            [59, 'B'],
            // Tecla 8: C3 (MIDI 60) → Virtual Keyboard "C2" (8ª tecla)
            [60, 'C2'],
            
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // COMPATIBILIDADE: Outras revisões de firmware (se existirem)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // Revision antiga (faixa grave C1-C2)
            [36, 'C'],  // C1
            [38, 'D'],  // D1
            [40, 'E'],  // E1
            [41, 'F'],  // F1
            [43, 'G'],  // G1
            [45, 'A'],  // A1
            [47, 'B'],  // B1
            // Nota: C2 já mapeado acima (MIDI 48)
            
            // Revision alternativa (faixa aguda C4-C5)
            [72, 'C'],  // C4
            [74, 'D'],  // D4
            [76, 'E'],  // E4
            [77, 'F'],  // F4
            [79, 'G'],  // G4
            [81, 'A'],  // A4
            [83, 'B'],  // B4
            [84, 'C2']  // C5
        ]);

        this._noteMappingUtils = null;
        this._channelOverrideLogged = false;
        this._preferredKitInitialized = false;
        this.channelProfile = {
            mode: 'percussion',
            channel: this.config.defaultChannel
        };
        
        // Estado atual
        this.state = {
            activeNotes: new Map(),
            currentProgram: 0,
            lastProgramChange: null, // 🆕 Armazena último valor programChange recebido (0-127)
            lastPitchBend: 8192, // Centro (0)
            pitchBendValue: 0,
            isConnected: true,
            notesPlayed: 0,
            lastActivity: Date.now(),
            chordPlaybackEnabled: this.manager?.isChordPlaybackEnabled?.() ?? true,
            currentChordRoot: null,
            lastChordStartTime: 0,
            suppressedNotes: new Set(),
            controllers: new Map(), // 🆕 Control Change values (CC0-127)
            sustainPedal: false, // 🆕 Estado do pedal de sustain (CC64)
            pendingSustainNotes: new Map(), // 🆕 Notas aguardando release do sustain
            channelPressure: 0, // 🆕 Aftertouch de canal
            polyPressure: new Map(), // 🆕 Aftertouch por nota
            bankSelect: { msb: 0, lsb: 0 } // 🆕 Bank Select (CC0 + CC32)
        };
        this.state.uiKeyUsage = new Map();
        
        // Callbacks
        this.onNoteOn = null;
        this.onNoteOff = null;
        this.onProgramChange = null;
        this.onPitchBend = null;
        this.onControlChange = null; // 🆕 Callback genérico para CC
        this.onVolumeChange = null; // 🆕 CC7
        this.onPanChange = null; // 🆕 CC10
        this.onExpressionChange = null; // 🆕 CC11
        this.onSustainChange = null; // 🆕 CC64
        this.onModulationChange = null; // 🆕 CC1
        this.onReverbChange = null; // 🆕 CC91
        this.onChorusChange = null; // 🆕 CC93
        this.onChannelPressure = null; // 🆕 Aftertouch de canal
        this.onPolyPressure = null; // 🆕 Aftertouch por nota
        
        // Integração com sistema de áudio
        this.audioEngine = null;
        this.soundfontManager = null;
        
        // 🆕 Integração com assignments do Virtual Keyboard
        this.virtualKeyboard = null;
        this.keyAssignments = {}; // Cache local dos assignments
        this._boundAssignmentChangeHandler = null; // Handler bound para eventos
        this._syncThrottleTimeout = null; // Timeout para throttling
        
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
        const overrideLabel = this.config.forceChannelOverride === false ? 'respeita canal de origem' : 'forçado';
        console.log(`   - Canal MIDI padrão: ${this.config.defaultChannel} (${overrideLabel})`);
        console.log(`   - Perfil ativo: ${this.isMelodicMode() ? 'Melódico (catálogo completo)' : 'Percussão (kits preferidos)'}`);
        console.log(`   - ProgramChange: Navegação incremental no catálogo (0-127 → 811 soundfonts)`);
        console.log('   - Mapeamento de notas reconhecidas:', Array.from(this.noteMap.entries())
            .map(([midi, note]) => `${midi}→${note}`)
            .join(', '));
        console.log('');
        console.log('🎯 Estratégia de ProgramChange:');
        console.log('   - Valor MENOR que anterior → Botão ▼ (próximo instrumento)');
        console.log('   - Valor MAIOR que anterior → Botão ▲ (instrumento anterior)');
        console.log('   - Wrap-around automático: 127→0 (continua ▼), 0→127 (continua ▲)');
    }

    /**
     * Define integração com motor de áudio
     * @param {Object} audioEngine - Motor de áudio
     * @param {Object} soundfontManager - Gerenciador de soundfonts
     */
    setAudioIntegration(audioEngine, soundfontManager) {
        this.audioEngine = audioEngine;
        this.soundfontManager = soundfontManager;
        if (this.isPercussionMode()) {
            this.initializePreferredDrumKit();
        }
        console.log('✅ BoardBells integrado com motor de áudio');
    }

    isMelodicMode() {
        return (this.channelProfile?.mode || '').toLowerCase() === 'melodic';
    }

    isPercussionMode() {
        return !this.isMelodicMode();
    }

    shouldForceChannelOverride() {
        if (this.config?.forceChannelOverride === false) {
            return false;
        }
        if (this.isMelodicMode()) {
            return false;
        }
        return true;
    }

    setChannelProfile(profile = {}) {
        const normalized = profile && typeof profile === 'object' ? profile : {};
        const channel = Number.isFinite(normalized.channel)
            ? Math.max(1, Math.min(16, normalized.channel))
            : null;
        const mode = normalized.mode === 'melodic' ? 'melodic' : 'percussion';
        const forceChannel = typeof normalized.forceChannel === 'boolean'
            ? normalized.forceChannel
            : undefined;

        if (channel) {
            this.config.defaultChannel = channel;
        }

        if (!this.channelProfile) {
            this.channelProfile = {};
        }

        this.channelProfile.mode = mode;
        this.channelProfile.channel = channel || this.channelProfile.channel || this.config.defaultChannel;

        if (forceChannel !== undefined) {
            this.config.forceChannelOverride = forceChannel;
        } else if (mode === 'melodic') {
            this.config.forceChannelOverride = false;
        } else if (typeof this.config.forceChannelOverride !== 'boolean') {
            this.config.forceChannelOverride = true;
        }

        this._channelOverrideLogged = false;

        if (mode === 'melodic') {
            this._preferredKitInitialized = false;
        }

        console.log(`🎛️ Board Bells: perfil atualizado → modo=${mode}, canal=${this.config.defaultChannel}, override=${this.config.forceChannelOverride}`);
    }

    initializePreferredDrumKit() {
        if (!this.isPercussionMode()) {
            return;
        }

        if (!this.soundfontManager || typeof this.soundfontManager.ensurePreferredDrumKit !== 'function') {
            return;
        }

        if (this._preferredKitInitialized) {
            return;
        }

        try {
            const initPromise = this.soundfontManager.ensurePreferredDrumKit({
                origin: 'board-bells-init',
                broadcast: true
            });

            if (initPromise && typeof initPromise.then === 'function') {
                initPromise
                    .then(kit => {
                        if (kit?.label) {
                            console.log(`🥁 Board Bells: kit inicial pronto (${kit.label})`);
                        }
                        this._preferredKitInitialized = true;
                    })
                    .catch(error => {
                        console.warn('⚠️ Board Bells: falha ao preparar kit inicial', error);
                    });
            } else {
                this._preferredKitInitialized = true;
            }
        } catch (error) {
            console.warn('⚠️ Board Bells: erro ao requisitar kit inicial', error);
        }
    }

    ensurePreferredDrumKitForCurrentState(program = null) {
        if (!this.isPercussionMode()) {
            return;
        }

        if (!this.soundfontManager || typeof this.soundfontManager.ensurePreferredDrumKit !== 'function') {
            return;
        }

        try {
            const ensurePromise = this.soundfontManager.ensurePreferredDrumKit({
                origin: 'board-bells-sync',
                program: Number.isFinite(program) ? program : null,
                broadcast: true
            });

            if (ensurePromise && typeof ensurePromise.catch === 'function') {
                ensurePromise.catch(error => {
                    console.warn('⚠️ Board Bells: falha ao sincronizar kit preferido', error);
                });
            }
        } catch (error) {
            console.warn('⚠️ Board Bells: erro ao sincronizar kit preferido', error);
        }
    }

    rotatePreferredDrumKit(direction, program = null) {
        if (!this.isPercussionMode()) {
            return false;
        }

        if (!direction) {
            this.ensurePreferredDrumKitForCurrentState(program);
            return false;
        }

        if (!this.soundfontManager || typeof this.soundfontManager.rotateChannel10Kit !== 'function') {
            console.warn('⚠️ Board Bells: rotateChannel10Kit indisponível no soundfontManager');
            return false;
        }

        const normalized = Number.isFinite(direction) ? (direction > 0 ? -1 : 1) : 0;
        if (!normalized) {
            this.ensurePreferredDrumKitForCurrentState(program);
            return false;
        }

        try {
            const rotationPromise = this.soundfontManager.rotateChannel10Kit(normalized, {
                origin: 'board-bells-program-change',
                broadcast: true,
                program: Number.isFinite(program) ? program : null
            });

            if (rotationPromise && typeof rotationPromise.then === 'function') {
                rotationPromise
                    .then(kit => {
                        if (kit?.label) {
                            console.log(`🥁 Board Bells: kit ativo → ${kit.label}`);
                        }
                    })
                    .catch(error => {
                        console.warn('⚠️ Board Bells: falha ao rotacionar kit preferido', error);
                    });
            }

            return true;
        } catch (error) {
            console.error('❌ Board Bells: erro ao rotacionar kit preferido', error);
            return false;
        }
    }

    /**
     * 🆕 Define integração com Virtual Keyboard para suporte a soundfonts por tecla
     * @param {Object} virtualKeyboard - Instância do VirtualKeyboard
     */
    setVirtualKeyboard(virtualKeyboard) {
        if (!virtualKeyboard) {
            console.warn('⚠️ VirtualKeyboard não fornecido para integração');
            return;
        }
        
        // Remover listener anterior se houver
        this.removeVirtualKeyboardListener();
        
        this.virtualKeyboard = virtualKeyboard;
        
        // 🆕 SINCRONIZAÇÃO AUTOMÁTICA: Escutar mudanças nos assignments
        this.setupVirtualKeyboardListener();
        
        // Sincronizar estado inicial
        this.syncKeyAssignments();
        
        console.log('✅ BoardBells integrado com Virtual Keyboard (soundfonts individuais por tecla)');
        console.log('   └─ 🔄 Sincronização automática ativada');
    }

    /**
     * 🆕 Configura listener para mudanças nos assignments do Virtual Keyboard
     */
    setupVirtualKeyboardListener() {
        if (typeof window === 'undefined') return;
        
        // Criar função bound para poder remover depois
        this._boundAssignmentChangeHandler = this._handleAssignmentChange.bind(this);
        
        window.addEventListener('virtual-keyboard-assignment-changed', this._boundAssignmentChangeHandler);
        
        console.log('🎧 Board Bells: Listener de assignments configurado');
    }

    /**
     * 🆕 Remove listener de mudanças nos assignments
     */
    removeVirtualKeyboardListener() {
        if (typeof window === 'undefined') return;
        
        if (this._boundAssignmentChangeHandler) {
            window.removeEventListener('virtual-keyboard-assignment-changed', this._boundAssignmentChangeHandler);
            console.log('🔇 Board Bells: Listener de assignments removido');
        }

        if (this.virtualKeyboard && this.state?.uiKeyUsage?.size) {
            Array.from(this.state.uiKeyUsage.keys()).forEach(key => {
                try {
                    this.virtualKeyboard.releaseKey(key, 'board-bells', { skipAudio: true });
                } catch (error) {
                    console.warn(`⚠️ Board Bells: falha ao liberar tecla ${key} ao remover listener`, error);
                }
            });
        }

        if (this.state?.uiKeyUsage) {
            this.state.uiKeyUsage.clear();
        }

        this._boundAssignmentChangeHandler = null;
    }

    /**
     * 🆕 Handler para evento de mudança nos assignments
     * @param {CustomEvent} event - Evento com detalhes da mudança
     */
    _handleAssignmentChange(event) {
        if (!event || !event.detail) return;
        
        const {
            changedNote,
            instrumentKey,
            assignments,
            note // 🔙 Compatibilidade com versões antigas
        } = event.detail;

        const effectiveNote = changedNote || note || '(desconhecida)';

        console.log(`🔄 Board Bells: Assignment alterado → ${effectiveNote}: ${instrumentKey || '(removido)'}`);
        
        // 🎯 THROTTLING: Evita sincronizações excessivas durante configuração rápida
        // Cancela sincronização anterior pendente
        if (this._syncThrottleTimeout) {
            clearTimeout(this._syncThrottleTimeout);
        }
        
        // Agenda nova sincronização com delay de 100ms
        // Se múltiplas mudanças ocorrerem rapidamente, apenas a última será executada
        this._syncThrottleTimeout = setTimeout(() => {
            this.syncKeyAssignments();
            this._syncThrottleTimeout = null;
        }, 100);
    }

    /**
     * 🆕 Sincroniza assignments do Virtual Keyboard
     * Copia os soundfonts atribuídos a cada tecla
     */
    syncKeyAssignments() {
        if (!this.virtualKeyboard || !this.virtualKeyboard.assignments) {
            this.keyAssignments = {};
            console.log('🔄 Board Bells: Virtual Keyboard não disponível, limpando assignments');
            return;
        }
        
        // Copiar assignments do Virtual Keyboard (deep clone para evitar referências)
        const previousCount = Object.keys(this.keyAssignments || {}).length;
        this.keyAssignments = JSON.parse(JSON.stringify(this.virtualKeyboard.assignments));
        const newCount = Object.keys(this.keyAssignments).length;
        
        // Detectar mudanças específicas
        const changedNotes = this._detectAssignmentChanges();
        
        console.log(`🔄 Board Bells: Sincronizando assignments (${previousCount} → ${newCount})`);
        
        if (changedNotes.length > 0) {
            console.log(`   📝 ${changedNotes.length} mudança(s) detectada(s):`);
            changedNotes.forEach(({ note, action, instrumentKey }) => {
                if (action === 'added' || action === 'modified') {
                    const meta = this.virtualKeyboard.instrumentCatalog?.metadata?.get(instrumentKey);
                    const name = meta ? meta.name : instrumentKey;
                    console.log(`   ${action === 'added' ? '➕' : '🔄'} ${note}: ${name}`);
                } else if (action === 'removed') {
                    console.log(`   ➖ ${note}: (removido)`);
                }
            });
        }
        
        if (newCount > 0) {
            console.log(`🎹 Board Bells: Total de ${newCount} tecla(s) configurada(s)`);
        } else {
            console.log('   ℹ️ Nenhum assignment configurado (usando soundfont global)');
        }
    }

    /**
     * 🆕 Detecta mudanças entre assignments anteriores e atuais
     * @returns {Array} - Lista de mudanças {note, action, instrumentKey}
     */
    _detectAssignmentChanges() {
        if (!this.virtualKeyboard || !this.virtualKeyboard.assignments) {
            return [];
        }
        
        const changes = [];
        const oldAssignments = this.keyAssignments || {};
        const newAssignments = this.virtualKeyboard.assignments;
        
        // Detectar novas e modificadas
        for (const [note, instrumentKey] of Object.entries(newAssignments)) {
            if (!oldAssignments[note]) {
                changes.push({ note, action: 'added', instrumentKey });
            } else if (oldAssignments[note] !== instrumentKey) {
                changes.push({ note, action: 'modified', instrumentKey });
            }
        }
        
        // Detectar removidas
        for (const note of Object.keys(oldAssignments)) {
            if (!newAssignments[note]) {
                changes.push({ note, action: 'removed', instrumentKey: null });
            }
        }
        
        return changes;
    }

    /**
     * 🆕 Obtém o soundfont atribuído a uma tecla específica
     * @param {string} noteName - Nome da nota (C, D, E, F, G, A, B, C2)
     * @returns {string|null} - Chave do instrumento ou null se usar soundfont global
     */
    getAssignmentForNote(noteName) {
        if (!noteName) return null;
        
        // 1. Tentar obter do cache local (mais rápido)
        if (this.keyAssignments && this.keyAssignments[noteName]) {
            const instrumentKey = this.keyAssignments[noteName];
            console.log(`🎵 Assignment (cache): ${noteName} → ${instrumentKey}`);
            return instrumentKey;
        }
        
        // 2. Se houver referência direta ao VirtualKeyboard, buscar de lá (mais confiável)
        if (this.virtualKeyboard && this.virtualKeyboard.assignments) {
            const instrumentKey = this.virtualKeyboard.assignments[noteName];
            if (instrumentKey) {
                console.log(`🎵 Assignment (VK direto): ${noteName} → ${instrumentKey}`);
                return instrumentKey;
            }
        }
        
        // 3. Nenhum assignment encontrado - usar soundfont global
        return null;
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

    normalizePitchClass(midiNote) {
        if (!Number.isFinite(midiNote)) {
            return null;
        }
        return ((midiNote % 12) + 12) % 12;
    }

    projectMidiNoteToBoardKey(midiNote, pitchNoteName = null) {
        if (!Number.isFinite(midiNote)) {
            return null;
        }

        const pitchClass = this.normalizePitchClass(midiNote);

        const baseMapping = {
            0: 'C',
            2: 'D',
            4: 'E',
            5: 'F',
            7: 'G',
            9: 'A',
            11: 'B'
        };

        let letter = baseMapping[pitchClass] || null;

        if (!letter && typeof pitchNoteName === 'string') {
            const match = pitchNoteName.trim().toUpperCase().match(/^([A-G])([#B]?)(-?\d+)?$/);
            if (match) {
                letter = match[1];
            }
        }

        if (!letter) {
            const fallbackMapping = {
                0: 'C',
                1: 'C',
                2: 'D',
                3: 'D',
                4: 'E',
                5: 'F',
                6: 'F',
                7: 'G',
                8: 'G',
                9: 'A',
                10: 'A',
                11: 'B'
            };
            letter = fallbackMapping[pitchClass] || null;
        }

        if (!letter) {
            return null;
        }

        if (letter === 'C') {
            const threshold = Number.isFinite(this.config.projectionUpperCThreshold)
                ? this.config.projectionUpperCThreshold
                : 60;
            return midiNote >= threshold ? 'C2' : 'C';
        }

        return letter;
    }

    trackVirtualKeyboardKey(uiNoteName, velocity = 1.0) {
        if (!uiNoteName) {
            return { tracked: false, activated: false };
        }

        const current = this.state.uiKeyUsage.get(uiNoteName) || 0;
        const next = current + 1;
        this.state.uiKeyUsage.set(uiNoteName, next);

        if (!this.virtualKeyboard || next <= 0) {
            return { tracked: true, activated: false };
        }

        let activated = false;

        if (current === 0) {
            try {
                this.virtualKeyboard.pressKey(uiNoteName, velocity, 'board-bells', { skipAudio: true });
                activated = true;
            } catch (error) {
                if (next <= 1) {
                    this.state.uiKeyUsage.delete(uiNoteName);
                } else {
                    this.state.uiKeyUsage.set(uiNoteName, current);
                }
                console.error(`❌ Erro ao acionar Virtual Keyboard para ${uiNoteName}:`, error);
                return { tracked: false, activated: false };
            }
        }

        return { tracked: true, activated };
    }

    untrackVirtualKeyboardKey(uiNoteName, { allowRelease = true } = {}) {
        if (!uiNoteName) {
            return;
        }

        const current = this.state.uiKeyUsage.get(uiNoteName) || 0;
        if (current <= 0) {
            this.state.uiKeyUsage.delete(uiNoteName);
            return;
        }

        const next = current - 1;

        if (next <= 0) {
            this.state.uiKeyUsage.delete(uiNoteName);
            if (allowRelease && this.virtualKeyboard) {
                try {
                    this.virtualKeyboard.releaseKey(uiNoteName, 'board-bells', { skipAudio: true });
                } catch (error) {
                    console.error(`❌ Erro ao liberar Virtual Keyboard para ${uiNoteName}:`, error);
                }
            }
            return;
        }

        this.state.uiKeyUsage.set(uiNoteName, next);
    }

    resolveNoteContext(midiNote, metadata = {}) {
        let boardKey = this.noteMap.has(midiNote)
            ? this.noteMap.get(midiNote)
            : null;

        let pitchNoteName = null;

        if (metadata && typeof metadata.noteName === 'string') {
            pitchNoteName = metadata.noteName;
        } else if (typeof this.manager?.midiNoteToName === 'function') {
            pitchNoteName = this.manager.midiNoteToName(midiNote);
        } else {
            const utils = this.ensureNoteMappingUtils();
            if (utils && typeof utils.midiToNote === 'function') {
                pitchNoteName = utils.midiToNote(midiNote);
            }
        }

        if (!pitchNoteName && boardKey) {
            const utils = this.ensureNoteMappingUtils();
            if (utils && typeof utils.noteToMidi === 'function' && typeof utils.midiToNote === 'function') {
                const midiFromBoard = utils.noteToMidi(boardKey);
                if (Number.isFinite(midiFromBoard)) {
                    pitchNoteName = utils.midiToNote(midiFromBoard);
                }
            }
        }

        const projectedBoardKey = this.projectMidiNoteToBoardKey(midiNote, pitchNoteName);

        if (!boardKey || (Number.isFinite(midiNote) && (midiNote < 48 || midiNote > 60))) {
            boardKey = projectedBoardKey || boardKey;
        }

        return {
            boardKey,
            pitchNoteName
        };
    }

    resolveNoteName(midiNote, metadata = {}) {
        const { pitchNoteName, boardKey } = this.resolveNoteContext(midiNote, metadata);
        if (metadata?.preferBoardKey && boardKey) {
            return boardKey;
        }
        return pitchNoteName || boardKey || null;
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

        const audioNoteName = entry.noteName ?? this.resolveNoteName(midiNote);
        const resolvedContext = this.resolveNoteContext(midiNote, { preferBoardKey: true });
        const uiNoteName = entry.uiNoteName ?? resolvedContext.boardKey ?? audioNoteName;
        const hasRemaining = (this.state.activeNotes.get(midiNote)?.length ?? 0) + (this.state.pendingSustainNotes.get(midiNote)?.length ?? 0);

        if (entry.uiKeyTracked && uiNoteName) {
            this.untrackVirtualKeyboardKey(uiNoteName, { allowRelease: hasRemaining === 0 });
        }

        if (this.soundfontManager) {
            const targetId = entry.soundfontNoteId || audioNoteName;
            if (targetId) {
                try {
                    this.soundfontManager.stopSustainedNote(targetId);
                } catch (error) {
                    console.error(`❌ Erro ao parar áudio para ${audioNoteName || midiNote}:`, error);
                }
            }
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

    /**
     * Manipula mensagens MIDI do dispositivo
     * @param {Object} message - Mensagem MIDI decodificada
     */
    handleMessage(message) {
        this.state.lastActivity = Date.now();
        this.enforceDefaultChannel(message);
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
            
            case 'channelPressure':
                handled = this.handleChannelPressure(message);
                break;
            
            case 'polyPressure':
                handled = this.handlePolyPressure(message);
                break;
            
            default:
                console.log(`ℹ️ Mensagem MIDI não tratada: ${message.type}`, message);
                handled = false;
        }

        return handled;
    }

    enforceDefaultChannel(message) {
        if (!message || typeof message !== 'object') {
            return this.config.defaultChannel;
        }

        const shouldForce = this.shouldForceChannelOverride();
        const current = Number.isFinite(message.channel) ? message.channel : null;

        if (!shouldForce) {
            if (!current && Number.isFinite(this.config.defaultChannel)) {
                const fallback = Math.max(1, Math.min(16, this.config.defaultChannel));
                message.channel = fallback;
                message.channelZeroBased = fallback - 1;
            }
            return message.channel;
        }

        const target = Math.min(16, Math.max(1, Number(this.config.defaultChannel) || 10));

        if (current === target) {
            return target;
        }

        const prevChannel = current;
        message.channel = target;
        message.channelZeroBased = target - 1;

        if (Number.isFinite(message.status)) {
            const statusNibble = message.status & 0xF0;
            if (statusNibble >= 0x80 && statusNibble <= 0xE0) {
                message.status = statusNibble | ((target - 1) & 0x0F);
            }
        }

        const rawData = message.rawData;
        if (rawData && rawData.length && typeof rawData[0] === 'number') {
            const statusNibble = rawData[0] & 0xF0;
            if (statusNibble >= 0x80 && statusNibble <= 0xE0) {
                const updatedStatus = statusNibble | ((target - 1) & 0x0F);
                if (rawData[0] !== updatedStatus) {
                    rawData[0] = updatedStatus;
                }
            }
        }

        if (!this._channelOverrideLogged && prevChannel !== target) {
            const originLabel = Number.isFinite(prevChannel) ? prevChannel : 'desconhecido';
            console.log(`🎯 Board Bells: forçando canal ${target} (recebido: ${originLabel})`);
            this._channelOverrideLogged = true;
        }

        return target;
    }

    /**
     * Manipula evento Note On
     * @param {Object} message - Mensagem MIDI
     */
    handleNoteOn(message) {
        const context = this.resolveNoteContext(message.note, { noteName: message.noteName });
        const audioNoteName = context.pitchNoteName || context.boardKey;
        const uiNoteName = context.boardKey || audioNoteName;

        if (!audioNoteName && !uiNoteName) {
            console.warn(`⚠️ Nota MIDI ${message.note} não pôde ser resolvida pelo Board Bells`);
            return true;
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
            const suppressedLabel = audioNoteName || message.note;
            console.log(`🎵 Board Bells: nota ${suppressedLabel} ignorada (acorde desabilitado)`);
        }

        if (suppressNote) {
            return true;
        }

    const normalizedVelocity = message.velocity / 127;

        let soundfontNoteId = null;
        let instrumentKey = null;
        let uiKeyTracked = false;

        if (uiNoteName) {
            const trackingResult = this.trackVirtualKeyboardKey(uiNoteName, normalizedVelocity);
            uiKeyTracked = trackingResult.tracked;
            if (trackingResult.activated) {
                if (context.boardKey && context.boardKey !== audioNoteName) {
                    console.log(`🔔→🎹 Board Bells: UI ${context.boardKey} com pitch ${audioNoteName}`);
                } else {
                    console.log(`🔔→🎹 Board Bells: UI sincronizada para ${uiNoteName}`);
                }
            }
        }

        if (this.soundfontManager && audioNoteName) {
            const assignmentNote = context.boardKey || audioNoteName;
            instrumentKey = this.getAssignmentForNote(assignmentNote);
            try {
                if (instrumentKey) {
                    soundfontNoteId = this.soundfontManager.startSustainedNoteWithInstrument(
                        audioNoteName,
                        instrumentKey,
                        normalizedVelocity,
                        {
                            bypassDrumKit: this.isMelodicMode()
                        }
                    );
                    console.log(`✅ Board Bells: áudio iniciado ${audioNoteName} com instrumento [${instrumentKey}]`);
                } else {
                    soundfontNoteId = this.soundfontManager.startSustainedNote(audioNoteName, normalizedVelocity);
                    console.log(`✅ Board Bells: áudio iniciado ${audioNoteName} (soundfont global)`);
                }
            } catch (error) {
                console.error(`❌ Erro ao iniciar áudio para ${audioNoteName}:`, error);
            }
        }

        const entry = {
            id: `bb_${message.note}_${Math.floor(timestamp)}_${Math.random().toString(36).slice(2, 8)}`,
            velocity: message.velocity,
            timestamp,
            noteName: audioNoteName,
            uiNoteName,
            instrumentKey,
            soundfontNoteId,
            uiKeyTracked
        };

        this.enqueueActiveNote(message.note, entry);
        this.state.notesPlayed++;

        const consoleLabel = audioNoteName || message.note;
        console.log(`🎵 Board Bells: Note ON - ${consoleLabel} (MIDI ${message.note}) | Velocity: ${message.velocity}`);

        this.updateStatusPanelForNote(message.note);

        // Callback customizado
        if (this.onNoteOn) {
            this.onNoteOn({
                note: message.note,
                noteName: audioNoteName,
                velocity: message.velocity,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }

        return true;
    }

    /**
     * Manipula evento Note Off
     * @param {Object} message - Mensagem MIDI
     */
    handleNoteOff(message) {
        if (this.state.suppressedNotes.has(message.note)) {
            this.state.suppressedNotes.delete(message.note);
            return true;
        }

        const context = this.resolveNoteContext(message.note, { noteName: message.noteName });
        const consoleLabel = context.pitchNoteName || context.boardKey || message.note;

        console.log(`🎵 Board Bells: Note OFF - ${consoleLabel} (MIDI ${message.note})`);

        const entry = this.dequeueActiveNote(message.note);

        if (!entry) {
            const pendingStack = this.state.pendingSustainNotes.get(message.note);
            if (pendingStack && pendingStack.length > 0) {
                const pendingEntry = pendingStack.shift();
                if (pendingStack.length === 0) {
                    this.state.pendingSustainNotes.delete(message.note);
                }
                this.finalizeNoteEntry(message.note, pendingEntry);
            }
            this.updateStatusPanelForNote(message.note);
        } else if (this.state.sustainPedal) {
            this.enqueuePendingSustain(message.note, entry);
            this.updateStatusPanelForNote(message.note);
        } else {
            this.finalizeNoteEntry(message.note, entry);
            this.updateStatusPanelForNote(message.note);
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

        return true;
    }

    /**
     * Manipula mudança de programa (instrumento)
     * 
     * 🎯 ESTRATÉGIA BOARD BELLS: Navegação Incremental Visual (811 soundfonts via 0-127)
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * O Board Bells envia comandos programChange (0-127), mas o sistema possui 811 soundfonts.
     * 
     * Solução implementada:
     * 1. Armazena último valor programChange recebido
     * 2. Compara novo valor com anterior para determinar direção
     * 3. Se MENOR → dispara botão SPIN-DOWN (▼) = próximo instrumento
     * 4. Se MAIOR → dispara botão SPIN-UP (▲) = instrumento anterior
     * 5. Suporta wrap-around: 127→0 continua incrementando, 0→127 continua decrementando
     * 6. Atualização visual automática via simulação de clique nos botões
     * 
     * ⚠️ IMPORTANTE: Este método NÃO delega para catalogNavigationManager porque:
     *    - A comparação de valores já foi feita aqui (previous vs current)
     *    - A direção (+1/-1) já foi calculada
     *    - Deve disparar DIRETAMENTE o botão para preservar navegação visual
     *    - Evita troca direta por número (preserva experiência do usuário)
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * @param {Object} message - Mensagem MIDI
     */
    handleProgramChange(message) {
        const program = message.program;
        
        // Validar entrada
        if (!Number.isFinite(program) || program < 0 || program > 127) {
            console.warn(`⚠️ Board Bells: Valor de programa inválido: ${program}`);
            return true;
        }

        const usingPercussionFlow = this.isPercussionMode();

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🎹 BOARD BELLS: Program Change Recebido (${usingPercussionFlow ? 'Percussão' : 'Melódico'})`);
        console.log(`   ├─ Valor atual: ${program}`);
        console.log(`   ├─ Valor anterior: ${this.state.lastProgramChange ?? 'Nenhum'}`);
        console.log(`   ├─ Canal: ${message.channel ?? 'Padrão'}`);
        
        // Se é o primeiro programChange, apenas armazenar
        if (this.state.lastProgramChange === null) {
            this.state.lastProgramChange = program;
            if (usingPercussionFlow) {
                console.log('   └─ ℹ️ Primeiro comando - valor armazenado como referência (modo percussão)');
                this.ensurePreferredDrumKitForCurrentState(program);
            } else {
                console.log('   └─ ℹ️ Primeiro comando - aguardando próxima variação (modo melódico)');
            }
            console.log('═══════════════════════════════════════════════════════════');
            return true;
        }
        
        // Calcular direção baseado na comparação
        const direction = this.calculateProgramChangeDirection(this.state.lastProgramChange, program);
        
        // Atualizar estado
        const previousProgram = this.state.lastProgramChange;
        this.state.lastProgramChange = program;
        this.state.currentProgram = program;
        
        let handledByKitRotation = false;

        if (usingPercussionFlow) {
            if (direction > 0) {
                console.log(`   ├─ Análise: ${previousProgram} → ${program} = MAIOR`);
                console.log('   ├─ Ação: Rotacionar kit preferido (sentido ▲)');
                console.log('   └─ Fallback: botão SPIN-UP (instrumento anterior)');
            } else if (direction < 0) {
                console.log(`   ├─ Análise: ${previousProgram} → ${program} = MENOR`);
                console.log('   ├─ Ação: Rotacionar kit preferido (sentido ▼)');
                console.log('   └─ Fallback: botão SPIN-DOWN (próximo instrumento)');
            } else {
                console.log('   └─ ℹ️ Sem mudança - comando ignorado (modo percussão)');
            }
            console.log('═══════════════════════════════════════════════════════════');

            if (direction !== 0) {
                handledByKitRotation = this.rotatePreferredDrumKit(direction, program);
            } else {
                this.ensurePreferredDrumKitForCurrentState(program);
            }

            if (!handledByKitRotation && direction !== 0) {
                this.triggerNavigationButton(direction, program);
            }
        } else {
            if (direction > 0) {
                console.log(`   ├─ Análise: ${previousProgram} → ${program} = MAIOR`);
                console.log('   └─ Ação: navegar catálogo ▲ (instrumento anterior)');
            } else if (direction < 0) {
                console.log(`   ├─ Análise: ${previousProgram} → ${program} = MENOR`);
                console.log('   └─ Ação: navegar catálogo ▼ (próximo instrumento)');
            } else {
                console.log('   └─ ℹ️ Sem mudança - comando ignorado (modo melódico)');
            }
            console.log('═══════════════════════════════════════════════════════════');

            if (direction !== 0) {
                this.triggerNavigationButton(direction, program);
            }
        }
        
        // Integração com painel de status MIDI
        if (window.midiStatusPanel) {
            window.midiStatusPanel.updateProgram(
                this.midiInput.id,
                program,
                `Program ${program} (Navegação: ${direction > 0 ? '▲' : direction < 0 ? '▼' : '—'})`
            );
        }

        // Callback customizado (mantido para compatibilidade)
        if (this.onProgramChange) {
            this.onProgramChange({
                program,
                previousProgram,
                direction,
                channel: message.channel,
                timestamp: message.timestamp
            });
        }

        return true;
    }
    
    /**
     * Calcula direção de navegação baseado em dois valores programChange consecutivos
     * @param {number} previous - Valor anterior (0-127)
     * @param {number} current - Valor atual (0-127)
     * @returns {number} +1 para maior (▲ anterior), -1 para menor (▼ próximo), 0 para igual
     */
    calculateProgramChangeDirection(previous, current) {
        // Sem mudança
        if (previous === current) {
            return 0;
        }
        
        // Wrap-around: 127 → 0 = incremento para frente
        if (previous === 127 && current === 0) {
            return -1; // Continua incrementando (▼ próximo)
        }
        
        // Wrap-around: 0 → 127 = decremento para trás
        if (previous === 0 && current === 127) {
            return +1; // Continua decrementando (▲ anterior)
        }
        
        // Comparação direta:
        // - Se atual > anterior: navegar para instrumento anterior (▲)
        // - Se atual < anterior: navegar para próximo instrumento (▼)
        return current > previous ? +1 : -1;
    }
    
    /**
     * Dispara clique simulado nos botões de navegação do InstrumentSelector
     * 🎯 ESTRATÉGIA BOARD BELLS: Navegação Incremental Visual
     * 
     * Este método dispara DIRETAMENTE os botões spin-up/spin-down do seletor visual,
     * garantindo que a navegação seja sempre incremental (+1 ou -1) independente
     * do valor do programChange recebido.
     * 
     * @param {number} direction - +1 para spin-up (▲), -1 para spin-down (▼)
     * @param {number} programValue - Valor do programa que originou o comando (apenas para log)
     */
    triggerNavigationButton(direction, programValue) {
        // 🎯 ESTRATÉGIA PRINCIPAL: Disparar clique DIRETO nos botões de navegação
        // Isso garante que a navegação seja sempre incremental (+1/-1) e preserve
        // a experiência visual do usuário no seletor "SELECIONAR INSTRUMENTO RÁPIDO"
        
        const buttonSelector = direction > 0 
            ? '.selector-spin-btn.spin-up'    // ▲ Instrumento anterior (índice diminui)
            : '.selector-spin-btn.spin-down'; // ▼ Próximo instrumento (índice aumenta)
        
        const button = document.querySelector(buttonSelector);
        
        if (button && !button.disabled) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`🎯 BOARD BELLS → NAVEGAÇÃO INCREMENTAL VISUAL`);
            console.log(`   ├─ Botão acionado: ${direction > 0 ? 'SPIN-UP (▲)' : 'SPIN-DOWN (▼)'}`);
            console.log(`   ├─ Direção: ${direction > 0 ? 'Instrumento ANTERIOR' : 'PRÓXIMO instrumento'}`);
            console.log(`   ├─ Program Change origem: ${programValue}`);
            console.log(`   ├─ Método: Clique direto no botão (navegação incremental)`);
            console.log(`   └─ Resultado: Atualização visual + carregamento de soundfont`);
            
            // Adicionar indicador visual de acionamento via MIDI
            button.classList.add('midi-triggered', 'active');
            
            // Disparar evento de clique (simula interação do usuário)
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1
            });
            button.dispatchEvent(clickEvent);
            
            // Remover indicadores após animação
            setTimeout(() => button.classList.remove('active'), 150);
            setTimeout(() => button.classList.remove('midi-triggered'), 800);
            
            console.log('   ✅ Clique disparado - aguardando atualização do seletor');
            console.log('═══════════════════════════════════════════════════════════');
        } else {
            // Botão não encontrado ou desabilitado - tentar fallback
            console.warn('═══════════════════════════════════════════════════════════');
            console.warn(`⚠️ BOARD BELLS: Botão ${direction > 0 ? 'SPIN-UP' : 'SPIN-DOWN'} indisponível`);
            console.warn(`   ├─ Botão encontrado: ${!!button}`);
            console.warn(`   ├─ Botão habilitado: ${button && !button.disabled}`);
            console.warn(`   ├─ Seletor usado: ${buttonSelector}`);
            
            // FALLBACK: Tentar usar InstrumentSelectorControls se disponível
            if (window.instrumentSelectorControls && 
                typeof window.instrumentSelectorControls.navigateByDirection === 'function') {
                try {
                    console.warn(`   ├─ Tentando fallback: instrumentSelectorControls.navigateByDirection`);
                    const success = window.instrumentSelectorControls.navigateByDirection(direction);
                    if (success) {
                        console.log('   └─ ✅ Fallback bem-sucedido');
                    } else {
                        console.warn('   └─ ⚠️ Fallback retornou false');
                    }
                } catch (error) {
                    console.error('   └─ ❌ Erro no fallback:', error);
                }
            } else {
                console.warn(`   └─ ⚠️ Nenhum método de navegação disponível`);
            }
            console.warn('═══════════════════════════════════════════════════════════');
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
            return true;
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

        return true;
    }

    /**
     * Manipula Control Change (CC)
     * @param {Object} message - Mensagem MIDI com controller e value
     */
    handleControlChange(message) {
        const cc = message.controller;
        const value = message.value;
        
        // Armazenar valor do controlador no estado
        if (!this.state.controllers) {
            this.state.controllers = new Map();
        }
        this.state.controllers.set(cc, value);

        // ═══════════════════════════════════════════════════════════
        // CC123: All Notes Off (PANIC BUTTON)
        // ═══════════════════════════════════════════════════════════
        if (cc === 123) {
            console.log(`🛑 Board Bells: CC123 (All Notes Off) recebido (valor ${value})`);
            this.stopAllNotes();
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC120: All Sound Off (mais agressivo que CC123)
        // ═══════════════════════════════════════════════════════════
        if (cc === 120) {
            console.log(`🔇 Board Bells: CC120 (All Sound Off) recebido (valor ${value})`);
            this.stopAllNotes();
            
            // Limpar controladores também
            if (this.state.controllers) {
                this.state.controllers.clear();
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC121: Reset All Controllers
        // ═══════════════════════════════════════════════════════════
        if (cc === 121) {
            console.log(`🔄 Board Bells: CC121 (Reset All Controllers) recebido`);
            
            // Resetar controladores para valores padrão
            if (this.state.controllers) {
                this.state.controllers.clear();
                // Volume padrão: 100 (CC7)
                this.state.controllers.set(7, 100);
                // Pan centro: 64 (CC10)
                this.state.controllers.set(10, 64);
                // Expression máximo: 127 (CC11)
                this.state.controllers.set(11, 127);
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC7: Channel Volume
        // ═══════════════════════════════════════════════════════════
        if (cc === 7) {
            const percent = Math.round((value / 127) * 100);
            console.log(`🔊 Board Bells: Volume = ${percent}% (${value}/127)`);
            
            // Callback customizado
            if (this.onVolumeChange) {
                this.onVolumeChange({ value, percent, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC10: Pan
        // ═══════════════════════════════════════════════════════════
        if (cc === 10) {
            const position = value === 64 ? 'Centro' : 
                           value < 64 ? `Esquerda ${64 - value}` : 
                           `Direita ${value - 64}`;
            console.log(`🎚️ Board Bells: Pan = ${position} (${value}/127)`);
            
            // Callback customizado
            if (this.onPanChange) {
                this.onPanChange({ value, position, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC11: Expression
        // ═══════════════════════════════════════════════════════════
        if (cc === 11) {
            const percent = Math.round((value / 127) * 100);
            console.log(`🎭 Board Bells: Expression = ${percent}% (${value}/127)`);
            
            // Callback customizado
            if (this.onExpressionChange) {
                this.onExpressionChange({ value, percent, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC64: Sustain Pedal (Hold)
        // ═══════════════════════════════════════════════════════════
        if (cc === 64) {
            const sustainActive = value >= 64;
            const previousState = this.state.sustainPedal;
            this.state.sustainPedal = sustainActive;
            
            if (sustainActive !== previousState) {
                console.log(`🦶 Board Bells: Sustain ${sustainActive ? 'ATIVADO' : 'DESATIVADO'} (${value})`);
                
                // Se sustain foi desativado, liberar notas pendentes
                if (!sustainActive && this.state.pendingSustainNotes) {
                    const pendingEntries = Array.from(this.state.pendingSustainNotes.entries());
                    const totalToRelease = pendingEntries.reduce((sum, [, stack]) => sum + (stack?.length ?? 0), 0);
                    console.log(`   └─ Liberando ${totalToRelease} nota(s) sustentada(s)`);

                    this.state.pendingSustainNotes.clear();

                    pendingEntries.forEach(([midiNote, entries]) => {
                        entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
                        this.updateStatusPanelForNote(midiNote);
                    });
                }
            }
            
            // Callback customizado
            if (this.onSustainChange) {
                this.onSustainChange({ value, active: sustainActive, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC1: Modulation Wheel
        // ═══════════════════════════════════════════════════════════
        if (cc === 1) {
            const percent = Math.round((value / 127) * 100);
            console.log(`🌀 Board Bells: Modulation = ${percent}% (${value}/127)`);
            
            // Callback customizado
            if (this.onModulationChange) {
                this.onModulationChange({ value, percent, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC91: Reverb Depth
        // ═══════════════════════════════════════════════════════════
        if (cc === 91) {
            const percent = Math.round((value / 127) * 100);
            console.log(`🌊 Board Bells: Reverb = ${percent}% (${value}/127)`);
            
            // Callback customizado
            if (this.onReverbChange) {
                this.onReverbChange({ value, percent, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC93: Chorus Depth
        // ═══════════════════════════════════════════════════════════
        if (cc === 93) {
            const percent = Math.round((value / 127) * 100);
            console.log(`🎶 Board Bells: Chorus = ${percent}% (${value}/127)`);
            
            // Callback customizado
            if (this.onChorusChange) {
                this.onChorusChange({ value, percent, channel: message.channel });
            }
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC0: Bank Select MSB
        // ═══════════════════════════════════════════════════════════
        if (cc === 0) {
            console.log(`🏦 Board Bells: Bank Select MSB = ${value}`);
            
            if (!this.state.bankSelect) {
                this.state.bankSelect = { msb: 0, lsb: 0 };
            }
            this.state.bankSelect.msb = value;
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // CC32: Bank Select LSB
        // ═══════════════════════════════════════════════════════════
        if (cc === 32) {
            console.log(`🏦 Board Bells: Bank Select LSB = ${value}`);
            
            if (!this.state.bankSelect) {
                this.state.bankSelect = { msb: 0, lsb: 0 };
            }
            this.state.bankSelect.lsb = value;
            
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        // Outros Control Changes (log genérico)
        // ═══════════════════════════════════════════════════════════
        console.log(`🎛️ Board Bells: CC${cc} = ${value}`);
        
        // Callback genérico
        if (this.onControlChange) {
            this.onControlChange({ controller: cc, value, channel: message.channel });
        }
        
        return true;
    }

    /**
     * Manipula Channel Pressure (Aftertouch)
     * @param {Object} message - Mensagem MIDI
     */
    handleChannelPressure(message) {
        const pressure = message.pressure || message.value || 0;
        const percent = Math.round((pressure / 127) * 100);
        
        this.state.channelPressure = pressure;
        
        console.log(`👆 Board Bells: Channel Pressure (Aftertouch) = ${percent}% (${pressure}/127)`);
        
        // Callback customizado
        if (this.onChannelPressure) {
            this.onChannelPressure({ 
                pressure, 
                percent, 
                channel: message.channel,
                timestamp: message.timestamp 
            });
        }
        
        return true;
    }

    /**
     * Manipula Polyphonic Key Pressure (Aftertouch por nota)
     * @param {Object} message - Mensagem MIDI
     */
    handlePolyPressure(message) {
        const note = message.note;
        const pressure = message.pressure || message.value || 0;
        const percent = Math.round((pressure / 127) * 100);
        const context = this.resolveNoteContext(note, { noteName: message.noteName });
        const noteName = context.pitchNoteName || context.boardKey || note;
        
        if (!this.state.polyPressure) {
            this.state.polyPressure = new Map();
        }
        this.state.polyPressure.set(note, pressure);
        
        console.log(`👆 Board Bells: Poly Pressure - Nota ${noteName} = ${percent}% (${pressure}/127)`);
        
        // Callback customizado
        if (this.onPolyPressure) {
            this.onPolyPressure({ 
                note,
                noteName,
                pressure, 
                percent, 
                channel: message.channel,
                timestamp: message.timestamp 
            });
        }
        
        return true;
    }

    /**
     * Obtém estado atual do dispositivo
     * @returns {Object} Estado completo
     */
    getState() {
        const activeNotesKeys = Array.from(this.state.activeNotes.keys());
        const activeStackSummary = activeNotesKeys.map(midiNote => ({
            midiNote,
            activeCount: this.state.activeNotes.get(midiNote)?.length ?? 0,
            pendingCount: this.state.pendingSustainNotes.get(midiNote)?.length ?? 0
        }));

        const pendingOnlySummary = Array.from(this.state.pendingSustainNotes.entries())
            .filter(([midiNote]) => !this.state.activeNotes.has(midiNote))
            .map(([midiNote, entries]) => ({
                midiNote,
                activeCount: 0,
                pendingCount: entries.length
            }));

        const combinedSummary = [...activeStackSummary, ...pendingOnlySummary];
        const activeVoices = combinedSummary.reduce((sum, item) => sum + item.activeCount, 0);
        const pendingVoices = combinedSummary.reduce((sum, item) => sum + item.pendingCount, 0);

        return {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            isConnected: this.state.isConnected,
            activeNotes: activeNotesKeys,
            activeNotesCount: activeNotesKeys.length,
            activeVoices,
            pendingSustainCount: pendingVoices,
            activeStackSummary: combinedSummary,
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
        
        const activeEntries = Array.from(this.state.activeNotes.entries());
        const pendingEntries = Array.from(this.state.pendingSustainNotes.entries());
        const totalActive = activeEntries.reduce((sum, [, entries]) => sum + (entries?.length ?? 0), 0);
        const totalPending = pendingEntries.reduce((sum, [, entries]) => sum + (entries?.length ?? 0), 0);
        const affectedNotes = new Set([
            ...activeEntries.map(([note]) => note),
            ...pendingEntries.map(([note]) => note)
        ]);
        
        // Parar notas através do sustainedNoteManager se disponível
        if (window.sustainedNoteManager && typeof window.sustainedNoteManager.stopAllNotes === 'function') {
            try {
                window.sustainedNoteManager.stopAllNotes();
                console.log('   ├─ ✅ sustainedNoteManager.stopAllNotes() executado');
            } catch (error) {
                console.error('   ├─ ❌ Erro ao chamar sustainedNoteManager:', error);
            }
        }
        
        this.state.activeNotes.clear();
        this.state.pendingSustainNotes.clear();

        activeEntries.forEach(([midiNote, entries]) => {
            entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
        });

        pendingEntries.forEach(([midiNote, entries]) => {
            entries.forEach(entry => this.finalizeNoteEntry(midiNote, entry));
        });

        if (this.virtualKeyboard && this.state.uiKeyUsage.size) {
            Array.from(this.state.uiKeyUsage.keys()).forEach(key => {
                try {
                    this.virtualKeyboard.releaseKey(key, 'board-bells', { skipAudio: true });
                } catch (error) {
                    console.warn(`⚠️ Board Bells: falha ao liberar tecla ${key} durante panic`, error);
                }
            });
        }

        this.state.uiKeyUsage.clear();

        if (this.state.suppressedNotes instanceof Set) {
            this.state.suppressedNotes.clear();
        }

        this.resetChordGrouping();

        affectedNotes.forEach(midiNote => this.updateStatusPanelForNote(midiNote));

        console.log(`   └─ ✅ Board Bells: ${totalActive + totalPending} evento(s) de nota finalizado(s).`);
    }

    /**
     * Desconecta o dispositivo
     */
    disconnect() {
        console.log(`🔌 Desconectando Board Bells: ${this.deviceName}`);
        
        // Parar todas as notas
        this.stopAllNotes();
        
        // 🆕 Remover listener do Virtual Keyboard
        this.removeVirtualKeyboardListener();
        
        // Limpar estado
        this.state.isConnected = false;
        
        // Limpar callbacks
        this.onNoteOn = null;
        this.onNoteOff = null;
        this.onProgramChange = null;
        this.onPitchBend = null;
        
        // Limpar referências
        this.virtualKeyboard = null;
        this.keyAssignments = {};
        
        console.log('✅ Board Bells desconectado');
    }

    /**
     * 🆕 Verifica status de sincronização com Virtual Keyboard
     * @returns {Object} - Status de sincronização
     */
    getSyncStatus() {
        const hasVirtualKeyboard = !!this.virtualKeyboard;
        const hasListener = !!this._boundAssignmentChangeHandler;
        const assignmentsCount = Object.keys(this.keyAssignments || {}).length;
        
        const status = {
            integrated: hasVirtualKeyboard,
            autoSync: hasListener,
            assignmentsCount,
            assignments: { ...this.keyAssignments }
        };
        
        return status;
    }

    /**
     * 🆕 Força sincronização manual dos assignments
     * Útil para debug ou quando necessário garantir estado atualizado
     */
    forceSyncAssignments() {
        console.log('🔄 Board Bells: Forçando sincronização manual de assignments...');
        this.syncKeyAssignments();
    }

    /**
     * Obtém estatísticas de uso
     * @returns {Object} Estatísticas
     */
    getStats() {
        const uptime = Date.now() - (this.state.lastActivity - this.state.notesPlayed * 100);
        const syncStatus = this.getSyncStatus();
        const activeUnique = this.state.activeNotes.size;
        const activeVoices = Array.from(this.state.activeNotes.values()).reduce((sum, stack) => sum + (stack?.length ?? 0), 0);
        const pendingVoices = Array.from(this.state.pendingSustainNotes.values()).reduce((sum, stack) => sum + (stack?.length ?? 0), 0);
        
        return {
            deviceName: this.deviceName,
            notesPlayed: this.state.notesPlayed,
            activeNotes: activeUnique,
            activeVoices,
            pendingSustain: pendingVoices,
            currentProgram: this.state.currentProgram,
            uptime: Math.floor(uptime / 1000), // segundos
            lastActivity: new Date(this.state.lastActivity).toLocaleTimeString(),
            // 🆕 Adicionar status de sincronização
            virtualKeyboard: syncStatus
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BoardBellsDevice = BoardBellsDevice;
}
