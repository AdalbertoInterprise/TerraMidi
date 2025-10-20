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
            defaultChannel: 1,
            instrumentsCount: 5,
            chordWindowMs: 45
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
        
        // Estado atual
        this.state = {
            activeNotes: new Set(),
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
        console.log(`   - Canal MIDI padrão: ${this.config.defaultChannel}`);
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
        console.log('✅ BoardBells integrado com motor de áudio');
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
    }

    /**
     * 🆕 Handler para evento de mudança nos assignments
     * @param {CustomEvent} event - Evento com detalhes da mudança
     */
    _handleAssignmentChange(event) {
        if (!event || !event.detail) return;
        
        const { note, instrumentKey, assignments } = event.detail;
        
        console.log(`🔄 Board Bells: Assignment alterado → ${note}: ${instrumentKey || '(removido)'}`);
        
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

        // 🆕 INTEGRAÇÃO DIRETA COM VIRTUAL KEYBOARD - Board Bells controla o Virtual Keyboard
        if (this.virtualKeyboard) {
            try {
                // Converter velocity MIDI (0-127) para normalizado (0-1)
                const normalizedVelocity = message.velocity / 127;
                
                // Acionar a tecla do Virtual Keyboard (isso dispara o soundfont configurado + feedback visual)
                this.virtualKeyboard.pressKey(noteName, normalizedVelocity, 'board-bells');
                
                console.log(`🔔→� Board Bells acionou Virtual Keyboard: ${noteName}`);
            } catch (error) {
                console.error(`❌ Erro ao acionar Virtual Keyboard para ${noteName}:`, error);
            }
        } else {
            // Fallback: tocar diretamente com soundfontManager (compatibilidade com código antigo)
            if (this.soundfontManager) {
                const normalizedVelocity = message.velocity / 127;
                
                try {
                    const instrumentKey = this.getAssignmentForNote(noteName);
                    
                    if (instrumentKey) {
                        this.soundfontManager.startSustainedNoteWithInstrument(
                            noteName, 
                            instrumentKey, 
                            normalizedVelocity
                        );
                        console.log(`✅ Board Bells: Áudio iniciado para ${noteName} com instrumento [${instrumentKey}] (fallback)`);
                    } else {
                        this.soundfontManager.startSustainedNote(noteName, normalizedVelocity);
                        console.log(`✅ Board Bells: Áudio iniciado para ${noteName} (soundfont global, fallback)`);
                    }
                } catch (error) {
                    console.error(`❌ Erro ao iniciar áudio para ${noteName}:`, error);
                }
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

        // 🆕 INTEGRAÇÃO DIRETA COM VIRTUAL KEYBOARD - Board Bells libera a tecla
        if (this.virtualKeyboard) {
            try {
                // Liberar a tecla do Virtual Keyboard (isso para o som + remove feedback visual)
                this.virtualKeyboard.releaseKey(noteName, 'board-bells');
                
                console.log(`🔔→🎹 Board Bells liberou Virtual Keyboard: ${noteName}`);
            } catch (error) {
                console.error(`❌ Erro ao liberar Virtual Keyboard para ${noteName}:`, error);
            }
        } else {
            // Fallback: parar diretamente com soundfontManager (compatibilidade com código antigo)
            if (this.soundfontManager) {
                try {
                    this.soundfontManager.stopSustainedNote(noteName);
                    console.log(`✅ Áudio parado para ${noteName} (fallback)`);
                } catch (error) {
                    console.error(`❌ Erro ao parar áudio para ${noteName}:`, error);
                }
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
            return;
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🎹 BOARD BELLS: Program Change Recebido`);
        console.log(`   ├─ Valor atual: ${program}`);
        console.log(`   ├─ Valor anterior: ${this.state.lastProgramChange ?? 'Nenhum'}`);
        console.log(`   ├─ Canal: ${message.channel ?? 'Padrão'}`);
        
        // Se é o primeiro programChange, apenas armazenar
        if (this.state.lastProgramChange === null) {
            this.state.lastProgramChange = program;
            console.log(`   └─ ℹ️ Primeiro comando - valor armazenado como referência`);
            console.log('═══════════════════════════════════════════════════════════');
            return;
        }
        
        // Calcular direção baseado na comparação
        const direction = this.calculateProgramChangeDirection(this.state.lastProgramChange, program);
        
        // Atualizar estado
        const previousProgram = this.state.lastProgramChange;
        this.state.lastProgramChange = program;
        this.state.currentProgram = program;
        
        // Log da análise
        if (direction > 0) {
            console.log(`   ├─ Análise: ${previousProgram} → ${program} = MAIOR`);
            console.log(`   ├─ Ação: Disparar botão SPIN-UP (▲)`);
            console.log(`   └─ Resultado: Navegar para instrumento ANTERIOR`);
        } else if (direction < 0) {
            console.log(`   ├─ Análise: ${previousProgram} → ${program} = MENOR`);
            console.log(`   ├─ Ação: Disparar botão SPIN-DOWN (▼)`);
            console.log(`   └─ Resultado: Navegar para PRÓXIMO instrumento`);
        } else {
            console.log(`   └─ ℹ️ Sem mudança - comando ignorado`);
        }
        console.log('═══════════════════════════════════════════════════════════');
        
        // 🎯 NAVEGAÇÃO INCREMENTAL: Disparar botão visual (spin-up ou spin-down)
        // NÃO usar catalogNavigationManager.handleProgramChange aqui para evitar
        // reprocessamento do valor do programa (troca direta indesejada)
        if (direction !== 0) {
            this.triggerNavigationButton(direction, program);
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
        
        return {
            deviceName: this.deviceName,
            notesPlayed: this.state.notesPlayed,
            activeNotes: this.state.activeNotes.size,
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
