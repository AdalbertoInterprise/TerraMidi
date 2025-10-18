/**
 * ============================================================
 * CATALOG NAVIGATION MANAGER
 * ============================================================
 * 
 * Gerencia navegação incremental através do catálogo de 811 soundfonts
 * usando mensagens MIDI Program Change (0-127) como comandos de rolagem.
 * 
 * Funcionalidade:
 * - Interpreta Program Change como incremento (+1) ou decremento (-1)
 * - Navegação circular: 811 → 1 e 1 → 811
 * - Suporta todos os canais MIDI (0-15)
 * - Atualiza interface visual automaticamente
 * - Dispara som do soundfont selecionado
 * 
 * @version 1.0.0
 * @date 2025-10-17
 */

class CatalogNavigationManager {
    constructor(catalogManager, soundfontManager) {
        this.catalogManager = catalogManager;
        this.soundfontManager = soundfontManager;
        
        // Estado de navegação
        this.currentIndex = 1; // Índice atual no catálogo (1-811)
        this.totalSoundfonts = 0; // Total de soundfonts disponíveis
        this.flatCatalog = []; // Catálogo linearizado para acesso por índice
        
        // Estado de Program Change por canal
        this.channelState = new Map(); // Map<channel, lastProgramValue>
        
        // Referência ao seletor de instrumentos
        this.instrumentSelectorControls = null; // Será definido via setInstrumentSelectorControls()
        
        // Inicializar canais MIDI (0-15)
        for (let channel = 0; channel < 16; channel++) {
            this.channelState.set(channel, null);
        }
        
        // Callbacks
        this.onIndexChange = null; // Callback(index, soundfont)
        this.onSoundfontLoad = null; // Callback(soundfont, index)
        
        // Inicializar catálogo plano
        this.initializeFlatCatalog();
        
        console.log('🎼 CatalogNavigationManager inicializado');
        console.log(`   ├─ Total de soundfonts: ${this.totalSoundfonts}`);
        console.log(`   ├─ Índice inicial: ${this.currentIndex}`);
        console.log(`   ├─ Navegação circular: habilitada`);
        console.log(`   └─ ⚠️ instrumentSelectorControls ainda NÃO conectado (esperando app.js)`);
        
        // Timer de verificação de inicialização (aumento para 3 segundos para dar mais tempo)
        setTimeout(() => {
            if (!this.instrumentSelectorControls) {
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('❌ ERRO DE INICIALIZAÇÃO CRÍTICO');
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('⚠️ instrumentSelectorControls NÃO foi conectado após 3 segundos!');
                console.error('');
                console.error('Fluxo esperado em app.js:');
                console.error('1. window.instrumentSelector.setupInstrumentSelection() → retorna controls');
                console.error('2. window.catalogNavigationManager.setInstrumentSelectorControls(controls)');
                console.error('');
                console.error('Estado atual:');
                console.error('- window.instrumentSelector:', typeof window.instrumentSelector);
                console.error('- window.setupInstrumentSelection:', typeof window.setupInstrumentSelection);
                console.error('- window.instrumentSelectorControls:', window.instrumentSelectorControls);
                console.error('- document.getElementById("instrument-grid"):', document.getElementById('instrument-grid'));
                console.error('');
                console.error('Verifique:');
                console.error('- Se o elemento #instrument-grid existe no HTML');
                console.error('- Se os scripts estão carregando na ordem correta');
                console.error('- Se setupInstrumentSelection() está retornando null/undefined');
                console.error('- Console para erros anteriores (role para cima)');
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            } else {
                console.log('✅ Verificação de inicialização: instrumentSelectorControls conectado com sucesso!');
            }
        }, 3000);
    }
    
    /**
     * Define referência aos controles do seletor de instrumentos
     * @param {Object} controls - Objeto retornado por setupInstrumentSelection()
     */
    setInstrumentSelectorControls(controls) {
        if (!controls) {
            console.error('❌ setInstrumentSelectorControls: controls é null ou undefined');
            return;
        }
        
        // Validar métodos essenciais
        const requiredMethods = ['selectInstrumentByIndex', 'navigateByDirection', 'getTotalInstruments'];
        const missingMethods = requiredMethods.filter(method => typeof controls[method] !== 'function');
        
        if (missingMethods.length > 0) {
            console.error(`❌ Controles do seletor inválidos. Métodos ausentes: ${missingMethods.join(', ')}`);
            console.error('   Objeto recebido:', controls);
            console.error('   Métodos disponíveis:', Object.keys(controls).filter(k => typeof controls[k] === 'function'));
            return;
        }
        
        this.instrumentSelectorControls = controls;
        console.log('✅ CatalogNavigationManager conectado ao InstrumentSelector');
        console.log(`   ├─ Total de instrumentos no seletor: ${controls.getTotalInstruments()}`);
        console.log(`   ├─ Métodos disponíveis:`);
        console.log(`   │  ├─ selectInstrumentByIndex: ✅`);
        console.log(`   │  ├─ navigateByDirection: ✅`);
        console.log(`   │  ├─ triggerSpinUp: ${typeof controls.triggerSpinUp === 'function' ? '✅' : '❌'}`);
        console.log(`   │  └─ triggerSpinDown: ${typeof controls.triggerSpinDown === 'function' ? '✅' : '❌'}`);
        console.log(`   └─ Conexão estabelecida com sucesso!`);
    }
    
    /**
     * Cria um array plano de todos os soundfonts para acesso por índice
     */
    initializeFlatCatalog() {
        this.flatCatalog = [];
        
        if (!this.catalogManager || !this.catalogManager.fullCatalog) {
            console.error('❌ CatalogManager inválido ou catálogo não disponível');
            return;
        }
        
        const catalog = this.catalogManager.fullCatalog;
        
        // Iterar por todas as categorias e subcategorias
        Object.entries(catalog).forEach(([categoryName, subcategories]) => {
            Object.entries(subcategories).forEach(([subcategoryName, variations]) => {
                variations.forEach((variation, variationIndex) => {
                    // 🔧 CORREÇÃO: Extrair MIDI number real (0-127) do midiNumber string
                    // variation.midiNumber pode ser "0000", "0001", ..., "0127" (GM instruments)
                    // ou valores maiores como "1260" (apenas identificador de arquivo)
                    let realMidiNumber = null;
                    const rawMidiNumber = variation.midiNumber;
                    
                    if (rawMidiNumber !== undefined && rawMidiNumber !== null) {
                        const numericValue = parseInt(rawMidiNumber, 10);
                        
                        // Se estiver no range MIDI válido (0-127), usar como MIDI number real
                        if (Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 127) {
                            realMidiNumber = numericValue;
                        } else if (Number.isFinite(numericValue)) {
                            // Se for maior que 127, é apenas identificador de arquivo
                            // Tentar mapear via GM note se disponível
                            realMidiNumber = variation.gmNote !== undefined 
                                ? parseInt(variation.gmNote, 10)
                                : null;
                        }
                    }
                    
                    this.flatCatalog.push({
                        index: this.flatCatalog.length + 1, // 1-based index
                        category: categoryName,
                        subcategory: subcategoryName,
                        variation: variation,
                        variationIndex: variationIndex,
                        // Informações do soundfont
                        midiNumber: realMidiNumber, // MIDI number real (0-127 ou null)
                        fileNumber: rawMidiNumber,  // Número do arquivo (pode ser > 127)
                        soundfont: variation.soundfont,
                        url: variation.url
                    });
                });
            });
        });
        
        this.totalSoundfonts = this.flatCatalog.length;
        
        if (this.totalSoundfonts === 0) {
            console.error('❌ Catálogo plano está vazio!');
            return;
        }
        
        // 🔍 Análise de midiNumbers
        const withValidMidi = this.flatCatalog.filter(sf => Number.isFinite(sf.midiNumber) && sf.midiNumber >= 0 && sf.midiNumber <= 127);
        const withoutMidi = this.flatCatalog.filter(sf => !Number.isFinite(sf.midiNumber));
        const withFileNumberOnly = this.flatCatalog.filter(sf => !Number.isFinite(sf.midiNumber) && sf.fileNumber);
        
        console.log(`✅ Catálogo linearizado com ${this.totalSoundfonts} soundfonts`);
        console.log(`   ├─ Com MIDI number válido (0-127): ${withValidMidi.length}`);
        console.log(`   ├─ Sem MIDI number (só fileNumber): ${withFileNumberOnly.length}`);
        console.log(`   └─ Sem identificação numérica: ${withoutMidi.length - withFileNumberOnly.length}`);
        
        // Log das primeiras e últimas entradas para validação
        if (this.totalSoundfonts > 0) {
            const first = this.flatCatalog[0];
            const last = this.flatCatalog[this.totalSoundfonts - 1];
            
            console.log(`   ├─ Primeiro: [${first.index}] ${first.category} → ${first.subcategory} → ${first.soundfont}`);
            console.log(`   │  └─ MIDI: ${first.midiNumber ?? 'N/A'}, File: ${first.fileNumber ?? 'N/A'}`);
            console.log(`   └─ Último: [${last.index}] ${last.category} → ${last.subcategory} → ${last.soundfont}`);
            console.log(`      └─ MIDI: ${last.midiNumber ?? 'N/A'}, File: ${last.fileNumber ?? 'N/A'}`);
        }
        
        // Log de exemplos sem MIDI number
        if (withFileNumberOnly.length > 0) {
            const example = withFileNumberOnly[0];
            console.log(`   📌 Exemplo sem MIDI number: ${example.soundfont} (fileNumber: ${example.fileNumber})`);
        }
    }
    
    /**
     * Processa mensagem MIDI Program Change e determina direção de navegação
     * @param {Object} message - Mensagem MIDI Program Change
     * @param {number} message.program - Valor do programa (0-127)
     * @param {number} message.channel - Canal MIDI (0-15)
     */
    handleProgramChange(message) {
        const { program, channel } = message;
        
        // Validar entrada
        if (!Number.isFinite(program) || program < 0 || program > 127) {
            console.warn(`⚠️ Valor de programa inválido: ${program}`);
            return;
        }
        
        const channelIndex = Number.isFinite(channel) ? Math.max(0, Math.min(15, channel)) : 0;
        
        // Obter valor anterior do programa para este canal
        const previousProgram = this.channelState.get(channelIndex);
        
        // Se é a primeira mensagem deste canal, apenas armazenar
        if (previousProgram === null) {
            this.channelState.set(channelIndex, program);
            console.log(`🎹 Canal ${channelIndex}: valor inicial de programa definido como ${program}`);
            return;
        }
        
        // Determinar direção de navegação
        const direction = this.calculateDirection(previousProgram, program);
        
        // Atualizar estado do canal
        this.channelState.set(channelIndex, program);
        
        // Navegar no catálogo
        if (direction !== 0) {
            this.navigate(direction, channelIndex);
        }
        
        console.log(`📊 Canal ${channelIndex}: ${previousProgram} → ${program} | Direção: ${direction > 0 ? '+1' : direction < 0 ? '-1' : '0'}`);
    }
    
    /**
     * Calcula a direção de navegação baseado em dois valores consecutivos
     * @param {number} previous - Valor anterior (0-127)
     * @param {number} current - Valor atual (0-127)
     * @returns {number} +1 para incremento, -1 para decremento, 0 para sem mudança
     */
    calculateDirection(previous, current) {
        // Sem mudança
        if (previous === current) {
            return 0;
        }
        
        // Exceção 1: 127 → 0 = incremento (wrap-around para frente)
        if (previous === 127 && current === 0) {
            return +1;
        }
        
        // Exceção 2: 0 → 127 = decremento (wrap-around para trás)
        if (previous === 0 && current === 127) {
            return -1;
        }
        
        // Caso normal: comparação simples
        if (current > previous) {
            return +1; // Incremento
        } else {
            return -1; // Decremento
        }
    }
    
    /**
     * Navega pelo catálogo
     * @param {number} direction - +1 para avançar, -1 para retroceder
     * @param {number} channel - Canal MIDI que originou o comando
     */
    navigate(direction, channel = 0) {
        if (this.totalSoundfonts === 0) {
            console.warn('⚠️ Catálogo vazio, navegação impossível');
            return;
        }
        
        const previousIndex = this.currentIndex;
        
        // Aplicar direção com wrap-around circular
        if (direction > 0) {
            // Incremento: 811 → 1
            this.currentIndex = this.currentIndex >= this.totalSoundfonts ? 1 : this.currentIndex + 1;
        } else if (direction < 0) {
            // Decremento: 1 → 811
            this.currentIndex = this.currentIndex <= 1 ? this.totalSoundfonts : this.currentIndex - 1;
        }
        
        // Obter soundfont atual
        const currentSoundfont = this.getSoundfontAtIndex(this.currentIndex);
        
        if (!currentSoundfont) {
            console.error(`❌ Soundfont não encontrado no índice ${this.currentIndex}`);
            return;
        }
        
        // Log detalhado da transição
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🎼 NAVEGAÇÃO NO CATÁLOGO | Canal ${channel}`);
        console.log(`   ├─ Direção: ${direction > 0 ? '➡️ +1 (Incremento)' : '⬅️ -1 (Decremento)'}`);
        console.log(`   ├─ Índice: ${previousIndex} → ${this.currentIndex} / ${this.totalSoundfonts}`);
        console.log(`   ├─ Categoria: ${currentSoundfont.category}`);
        console.log(`   ├─ Subcategoria: ${currentSoundfont.subcategory}`);
        console.log(`   ├─ Soundfont: ${currentSoundfont.soundfont}`);
        console.log(`   ├─ MIDI Number: ${currentSoundfont.midiNumber}`);
        console.log(`   └─ URL: ${currentSoundfont.url}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        // Callback de mudança de índice
        if (this.onIndexChange) {
            try {
                this.onIndexChange(this.currentIndex, currentSoundfont);
            } catch (error) {
                console.error('❌ Erro no callback onIndexChange:', error);
            }
        }
        
        // 🔍 LOG DIAGNÓSTICO: Estado antes da atualização visual
        console.log('🔍 DEBUG: Estado antes de updateVisualSelector');
        console.log(`   ├─ this.currentIndex: ${this.currentIndex}`);
        console.log(`   ├─ direction: ${direction}`);
        console.log(`   ├─ instrumentSelectorControls disponível: ${!!this.instrumentSelectorControls}`);
        console.log(`   └─ navigateByDirection disponível: ${typeof this.instrumentSelectorControls?.navigateByDirection}`);
        
        // Atualizar interface visual (passando direção para feedback dos botões)
        this.updateVisualSelector(this.currentIndex, currentSoundfont, direction);
        
        // 🔍 LOG DIAGNÓSTICO: Verificar elemento #instrument-select após atualização
        const selectElement = document.getElementById('instrument-select');
        if (selectElement) {
            console.log('🔍 DEBUG: Estado de #instrument-select após atualização');
            console.log(`   ├─ Opções totais: ${selectElement.options.length}`);
            console.log(`   ├─ selectedIndex: ${selectElement.selectedIndex}`);
            console.log(`   ├─ value: ${selectElement.value}`);
            if (selectElement.selectedOptions[0]) {
                console.log(`   └─ Texto selecionado: ${selectElement.selectedOptions[0].textContent}`);
            }
        } else {
            console.error('❌ Elemento #instrument-select NÃO ENCONTRADO no DOM!');
        }
        
        // NOTA: loadAndPlaySoundfont não é mais chamado aqui porque
        // instrumentSelectorControls.navigateByDirection já carrega o soundfont
        // automaticamente através do stepInstrument
        // Se instrumentSelectorControls não estiver disponível, o fallback será usado
        
        // Verificar se precisa usar fallback de carregamento direto
        if (!this.instrumentSelectorControls) {
            console.log('⚠️ Usando fallback de carregamento direto (InstrumentSelector não conectado)');
            this.loadAndPlaySoundfont(currentSoundfont);
        }
    }
    
    /**
     * Obtém soundfont no índice especificado (1-based)
     * @param {number} index - Índice (1 a totalSoundfonts)
     * @returns {Object|null} Soundfont ou null se inválido
     */
    getSoundfontAtIndex(index) {
        if (index < 1 || index > this.totalSoundfonts) {
            return null;
        }
        
        // Array é 0-based, índice é 1-based
        return this.flatCatalog[index - 1];
    }
    
    /**
     * Atualiza interface visual do seletor de instrumentos
     * @param {number} index - Índice atual
     * @param {Object} soundfont - Dados do soundfont
     * @param {number} direction - Direção da navegação (+1 ou -1)
     */
    updateVisualSelector(index, soundfont, direction = 0) {
        let navigationSuccess = false;
        
        // PRIORIDADE 1: Acionar botão visual correspondente (spin-up ou spin-down)
        console.log(`🎛️ updateVisualSelector: Tentando simular clique em botão (direção: ${direction})`);
        
        if (this.instrumentSelectorControls && 
            typeof this.instrumentSelectorControls.navigateByDirection === 'function' &&
            direction !== 0) {
            try {
                console.log(`   └─ Chamando navigateByDirection(${direction})...`);
                const success = this.instrumentSelectorControls.navigateByDirection(direction);
                
                if (success) {
                    navigationSuccess = true;
                    if (direction > 0) {
                        console.log(`✅ Botão SPIN-DOWN (▼) acionado visualmente via MIDI`);
                        console.log(`   ├─ Simulação de clique completa`);
                        console.log(`   ├─ Efeito visual aplicado (pulse + glow)`);
                        console.log(`   ├─ Evento click disparado`);
                        console.log(`   └─ Próximo instrumento: [${index}/${this.totalSoundfonts}] ${soundfont.subcategory}`);
                    } else if (direction < 0) {
                        console.log(`✅ Botão SPIN-UP (▲) acionado visualmente via MIDI`);
                        console.log(`   ├─ Simulação de clique completa`);
                        console.log(`   ├─ Efeito visual aplicado (pulse + glow)`);
                        console.log(`   ├─ Evento click disparado`);
                        console.log(`   └─ Instrumento anterior: [${index}/${this.totalSoundfonts}] ${soundfont.subcategory}`);
                    }
                } else {
                    console.warn(`⚠️ navigateByDirection retornou false (direção: ${direction})`);
                    console.warn(`   └─ Possível causa: botões desabilitados ou carregamento em andamento`);
                }
            } catch (error) {
                console.error('❌ Erro ao acionar botão de navegação:', error);
            }
        } else if (direction === 0) {
            console.log('ℹ️ Navegação inicial (sem direção) - botões não acionados');
        } else {
            console.warn('⚠️ InstrumentSelectorControls.navigateByDirection não disponível');
            console.warn(`   ├─ instrumentSelectorControls existe: ${!!this.instrumentSelectorControls}`);
            console.warn(`   ├─ navigateByDirection é função: ${typeof this.instrumentSelectorControls?.navigateByDirection}`);
            console.warn(`   └─ direction: ${direction}`);
        }
        
        // FALLBACK: Se navigateByDirection não funcionou, usar selectInstrumentByIndex
        if (!navigationSuccess && this.instrumentSelectorControls && 
            typeof this.instrumentSelectorControls.selectInstrumentByIndex === 'function') {
            try {
                console.log(`🔄 Usando fallback selectInstrumentByIndex para índice ${index}`);
                const entry = this.instrumentSelectorControls.selectInstrumentByIndex(index);
                
                if (entry) {
                    console.log(`✅ #instrument-select atualizado via fallback: [${index}/${this.totalSoundfonts}] ${entry.subcategory}`);
                    navigationSuccess = true;
                } else {
                    console.warn(`⚠️ selectInstrumentByIndex retornou null para índice ${index}`);
                }
            } catch (error) {
                console.error('❌ Erro ao atualizar #instrument-select via fallback:', error);
            }
        }
        
        // ✅ CORREÇÃO: Forçar sincronização visual após navegação
        if (navigationSuccess && this.instrumentSelectorControls && 
            typeof this.instrumentSelectorControls.forceSyncVisualSelect === 'function') {
            try {
                console.log('🔄 Forçando sincronização visual do select após navegação MIDI...');
                this.instrumentSelectorControls.forceSyncVisualSelect();
            } catch (error) {
                console.warn('⚠️ Erro ao forçar sincronização visual:', error);
            }
        }
        
        // LEGADO: Atualizar seletor via highlightInstrument (fallback secundário)
        if (window.instrumentSelector && typeof window.instrumentSelector.highlightInstrument === 'function') {
            try {
                window.instrumentSelector.highlightInstrument({
                    category: soundfont.category,
                    subcategory: soundfont.subcategory,
                    variationIndex: soundfont.variationIndex
                });
                console.log(`✅ Interface legacy atualizada para índice ${index}`);
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar seletor visual legacy:', error);
            }
        }
        
        // Atualizar UI customizada se existir
        this.updateCustomUI(index, soundfont);
    }
    
    /**
     * Atualiza elementos UI customizados
     * @param {number} index - Índice atual
     * @param {Object} soundfont - Dados do soundfont
     */
    updateCustomUI(index, soundfont) {
        // Atualizar indicador de índice
        const indexDisplay = document.getElementById('catalog-index-display');
        if (indexDisplay) {
            indexDisplay.textContent = `${index} / ${this.totalSoundfonts}`;
        }
        
        // Atualizar nome do soundfont
        const nameDisplay = document.getElementById('catalog-soundfont-name');
        if (nameDisplay) {
            nameDisplay.textContent = soundfont.soundfont;
        }
        
        // Atualizar categoria
        const categoryDisplay = document.getElementById('catalog-category-name');
        if (categoryDisplay) {
            categoryDisplay.textContent = `${soundfont.category} → ${soundfont.subcategory}`;
        }
        
        // Atualizar barra de progresso
        const progressBar = document.getElementById('catalog-progress-bar');
        if (progressBar) {
            const percentage = (index / this.totalSoundfonts) * 100;
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', index);
        }
    }
    
    /**
     * Carrega e toca o soundfont selecionado
     * @param {Object} soundfont - Dados do soundfont
     */
    loadAndPlaySoundfont(soundfont) {
        if (!this.soundfontManager) {
            console.warn('⚠️ SoundfontManager não disponível');
            return;
        }
        
        try {
            // 🔧 CORREÇÃO: Usar midiNumber real (0-127) se disponível
            const midiNum = soundfont.midiNumber; // Já validado e convertido em initializeFlatCatalog
            
            // Tentar carregar via MIDI number se estiver no range válido
            if (Number.isFinite(midiNum) && midiNum >= 0 && midiNum <= 127) {
                console.log(`🎼 Carregando via MIDI number ${midiNum}: ${soundfont.soundfont}`);
                
                this.soundfontManager.loadInstrument(midiNum, {
                    setCurrent: true,
                    clearKit: false
                }).then(() => {
                    console.log(`✅ Soundfont ${soundfont.soundfont} carregado (MIDI ${midiNum})`);
                    
                    // Tocar nota de preview (Dó central - C4)
                    this.playPreviewNote();
                    
                    // Callback de carregamento
                    if (this.onSoundfontLoad) {
                        this.onSoundfontLoad(soundfont, this.currentIndex);
                    }
                }).catch(error => {
                    console.error(`❌ Erro ao carregar soundfont ${soundfont.soundfont}:`, error);
                    // Fallback: tentar carregar via objeto variation
                    this.loadSoundfontFallback(soundfont);
                });
            } else {
                // MIDI number não disponível ou inválido - usar fallback direto
                console.log(`⚠️ MIDI number ausente/inválido para ${soundfont.soundfont} (fileNumber: ${soundfont.fileNumber})`);
                console.log(`   └─ Usando fallback via variation object`);
                this.loadSoundfontFallback(soundfont);
            }
        } catch (error) {
            console.error('❌ Erro ao processar carregamento de soundfont:', error);
        }
    }
    
    /**
     * Método de fallback para carregar soundfont quando midiNumber é inválido
     * @param {Object} soundfont - Dados do soundfont
     */
    loadSoundfontFallback(soundfont) {
        if (!soundfont.variation) {
            console.error(`❌ Não foi possível carregar ${soundfont.soundfont} - variation não disponível`);
            return;
        }
        
        try {
            this.soundfontManager.loadFromCatalog(soundfont.variation)
                .then(() => {
                    console.log(`✅ Soundfont ${soundfont.soundfont} carregado via fallback`);
                    
                    // Tocar nota de preview
                    this.playPreviewNote();
                    
                    // Callback de carregamento
                    if (this.onSoundfontLoad) {
                        this.onSoundfontLoad(soundfont, this.currentIndex);
                    }
                }).catch(error => {
                    console.error(`❌ Erro ao carregar soundfont ${soundfont.soundfont} via fallback:`, error);
                });
        } catch (error) {
            console.error('❌ Erro ao processar fallback:', error);
        }
    }
    
    /**
     * Toca nota de preview do instrumento atual
     */
    playPreviewNote() {
        if (!this.soundfontManager) return;
        
        try {
            // Tocar C4 (Dó central) com velocity média
            const noteName = 'C4';
            const velocity = 0.7;
            const duration = 1000; // 1 segundo
            
            // Iniciar nota
            const noteId = this.soundfontManager.startSustainedNote(noteName, velocity);
            
            // Parar nota após duração
            setTimeout(() => {
                if (noteId) {
                    this.soundfontManager.stopSustainedNote(noteId);
                }
            }, duration);
            
            console.log(`🎵 Preview: ${noteName} tocado`);
        } catch (error) {
            console.warn('⚠️ Erro ao tocar nota de preview:', error);
        }
    }
    
    /**
     * Navega para índice específico
     * @param {number} index - Índice desejado (1-based)
     * @returns {boolean} Sucesso da navegação
     */
    goToIndex(index) {
        if (index < 1 || index > this.totalSoundfonts) {
            console.warn(`⚠️ Índice ${index} fora da faixa válida (1-${this.totalSoundfonts})`);
            return false;
        }
        
        this.currentIndex = index;
        const soundfont = this.getSoundfontAtIndex(index);
        
        if (!soundfont) {
            return false;
        }
        
        console.log(`🎯 Navegação direta para índice ${index}`);
        
        // Atualizar interface e carregar soundfont
        this.updateVisualSelector(index, soundfont);
        this.loadAndPlaySoundfont(soundfont);
        
        if (this.onIndexChange) {
            this.onIndexChange(index, soundfont);
        }
        
        return true;
    }
    
    /**
     * Obtém estado atual da navegação
     * @returns {Object} Estado atual
     */
    getState() {
        const currentSoundfont = this.getSoundfontAtIndex(this.currentIndex);
        
        return {
            currentIndex: this.currentIndex,
            totalSoundfonts: this.totalSoundfonts,
            currentSoundfont: currentSoundfont,
            channelStates: Array.from(this.channelState.entries()).map(([channel, program]) => ({
                channel,
                lastProgram: program
            })),
            progress: {
                percentage: (this.currentIndex / this.totalSoundfonts) * 100,
                remaining: this.totalSoundfonts - this.currentIndex
            }
        };
    }
    
    /**
     * Reseta estado de todos os canais
     */
    resetAllChannels() {
        for (let channel = 0; channel < 16; channel++) {
            this.channelState.set(channel, null);
        }
        console.log('🔄 Estado de todos os canais resetado');
    }
    
    /**
     * Reseta navegação para o início
     */
    reset() {
        this.currentIndex = 1;
        this.resetAllChannels();
        console.log('🔄 Navegação resetada para índice 1');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CatalogNavigationManager = CatalogNavigationManager;
}
