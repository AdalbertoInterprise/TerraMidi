/**
 * ============================================================
 * INITIALIZATION CHECKER
 * ============================================================
 * 
 * Utilitário para verificar e diagnosticar problemas de
 * inicialização de componentes no sistema Terra MIDI.
 * 
 * Fornece verificações robustas, mensagens de erro detalhadas
 * e mecanismo de retry para componentes críticos.
 * 
 * @version 1.0.0
 * @date 2025-10-18
 */

class InitializationChecker {
    constructor() {
        this.checks = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // ms
    }

    /**
     * Registra uma verificação de componente
     * @param {string} componentName - Nome do componente
     * @param {Function} checkFunction - Função que retorna true se inicializado
     * @param {Object} options - Opções de verificação
     */
    registerCheck(componentName, checkFunction, options = {}) {
        this.checks.set(componentName, {
            check: checkFunction,
            required: options.required !== false,
            description: options.description || componentName,
            dependencies: options.dependencies || [],
            troubleshooting: options.troubleshooting || []
        });
    }

    /**
     * Verifica se um componente está inicializado
     * @param {string} componentName - Nome do componente
     * @returns {boolean} True se inicializado
     */
    isInitialized(componentName) {
        const checkData = this.checks.get(componentName);
        if (!checkData) {
            console.warn(`⚠️ InitializationChecker: Componente "${componentName}" não registrado`);
            return false;
        }

        try {
            return checkData.check();
        } catch (error) {
            console.error(`❌ Erro ao verificar ${componentName}:`, error);
            return false;
        }
    }

    /**
     * Verifica todos os componentes registrados
     * @param {boolean} verbose - Mostrar logs detalhados
     * @returns {Object} Resultado da verificação
     */
    checkAll(verbose = true) {
        const results = {
            total: this.checks.size,
            initialized: 0,
            failed: 0,
            missing: []
        };

        if (verbose) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 VERIFICAÇÃO DE INICIALIZAÇÃO DE COMPONENTES');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        for (const [name, data] of this.checks) {
            const isInit = this.isInitialized(name);
            
            if (isInit) {
                results.initialized++;
                if (verbose) {
                    console.log(`✅ ${data.description}: OK`);
                }
            } else {
                results.failed++;
                results.missing.push(name);
                
                if (verbose) {
                    console.error(`❌ ${data.description}: FALHOU`);
                    
                    if (data.required) {
                        console.error('   └─ ⚠️ Componente OBRIGATÓRIO ausente');
                    }
                    
                    if (data.dependencies.length > 0) {
                        console.error(`   └─ Dependências: ${data.dependencies.join(', ')}`);
                    }
                    
                    if (data.troubleshooting.length > 0) {
                        console.error('   └─ Soluções possíveis:');
                        data.troubleshooting.forEach(tip => {
                            console.error(`      • ${tip}`);
                        });
                    }
                }
            }
        }

        if (verbose) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📊 Resultado: ${results.initialized}/${results.total} componentes OK`);
            
            if (results.failed > 0) {
                console.warn(`⚠️ ${results.failed} componente(s) falharam`);
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        return results;
    }

    /**
     * Aguarda até que um componente seja inicializado
     * @param {string} componentName - Nome do componente
     * @param {number} timeout - Timeout em ms
     * @returns {Promise<boolean>} True se inicializado
     */
    async waitFor(componentName, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.isInitialized(componentName)) {
                return true;
            }
            
            // Aguardar 100ms antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.error(`❌ Timeout aguardando inicialização de ${componentName}`);
        return false;
    }

    /**
     * Tenta inicializar um componente com retry
     * @param {string} componentName - Nome do componente
     * @param {Function} initFunction - Função de inicialização
     * @param {number} maxRetries - Máximo de tentativas
     * @returns {Promise<boolean>} True se inicializado
     */
    async retryInitialization(componentName, initFunction, maxRetries = 3) {
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;
            
            console.log(`🔄 Tentativa ${attempt}/${maxRetries}: Inicializando ${componentName}...`);
            
            try {
                const result = await initFunction();
                
                if (result) {
                    console.log(`✅ ${componentName} inicializado com sucesso na tentativa ${attempt}`);
                    return true;
                }
            } catch (error) {
                console.error(`❌ Erro na tentativa ${attempt}:`, error);
            }

            if (attempt < maxRetries) {
                const delay = this.retryDelay * attempt; // Backoff exponencial
                console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.error(`❌ Falha ao inicializar ${componentName} após ${maxRetries} tentativas`);
        return false;
    }

    /**
     * Gera relatório de diagnóstico detalhado
     */
    generateDiagnosticReport() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 RELATÓRIO DE DIAGNÓSTICO DO SISTEMA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Data: ${new Date().toLocaleString('pt-BR')}`);
        console.log('');

        // Verificar objetos globais críticos
        console.log('🌐 Objetos Globais:');
        const globalObjects = [
            'window.catalogManager',
            'window.catalogNavigationManager',
            'window.soundfontManager',
            'window.audioEngine',
            'window.midiManager',
            'window.midiDeviceManager',
            'window.instrumentSelector',
            'window.instrumentSelectorControls'
        ];

        globalObjects.forEach(path => {
            const parts = path.split('.');
            let obj = window;
            let exists = true;

            for (let i = 1; i < parts.length; i++) {
                if (obj && typeof obj === 'object' && parts[i] in obj) {
                    obj = obj[parts[i]];
                } else {
                    exists = false;
                    break;
                }
            }

            const status = exists ? '✅' : '❌';
            const type = exists ? typeof obj : 'undefined';
            console.log(`   ${status} ${path}: ${type}`);
        });

        console.log('');
        console.log('🔧 Classes Disponíveis:');
        const classes = [
            'CatalogManager',
            'CatalogNavigationManager',
            'SoundfontManager',
            'AudioEngine',
            'MIDIDeviceManager',
            'BoardBellsDevice',
            'MidiTerraDevice'
        ];

        classes.forEach(className => {
            const exists = typeof window[className] === 'function';
            const status = exists ? '✅' : '❌';
            console.log(`   ${status} ${className}`);
        });

        console.log('');
        console.log('📄 Elementos DOM Críticos:');
        const elements = [
            '#instrument-grid',
            '#instrument-select',
            '#catalog-nav-display',
            '#midi-status-panel',
            '#midi-oscilloscope'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            const status = element ? '✅' : '❌';
            console.log(`   ${status} ${selector}`);
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.initChecker = new InitializationChecker();

    // Registrar verificações padrão
    window.initChecker.registerCheck('CatalogManager', () => {
        return window.catalogManager && typeof window.catalogManager === 'object';
    }, {
        description: 'Catalog Manager',
        required: true,
        troubleshooting: [
            'Verifique se catalogManager.js foi carregado',
            'Verifique ordem de scripts no index.html',
            'Verifique console para erros durante carregamento'
        ]
    });

    window.initChecker.registerCheck('CatalogNavigationManager', () => {
        return window.catalogNavigationManager && 
               typeof window.catalogNavigationManager === 'object' &&
               typeof window.catalogNavigationManager.handleProgramChange === 'function';
    }, {
        description: 'Catalog Navigation Manager',
        required: true,
        dependencies: ['CatalogManager', 'SoundfontManager'],
        troubleshooting: [
            'Verifique se catalogNavigationManager.js foi carregado',
            'Verifique se CatalogManager e SoundfontManager foram criados',
            'Verifique logs de inicialização no app.js',
            'Execute: window.initChecker.generateDiagnosticReport()'
        ]
    });

    window.initChecker.registerCheck('SoundfontManager', () => {
        return window.soundfontManager && typeof window.soundfontManager === 'object';
    }, {
        description: 'Soundfont Manager',
        required: true,
        troubleshooting: [
            'Verifique se soundfontManager.js foi carregado',
            'Verifique se AudioEngine foi inicializado primeiro'
        ]
    });

    window.initChecker.registerCheck('InstrumentSelector', () => {
        return window.instrumentSelectorControls && 
               typeof window.instrumentSelectorControls === 'object' &&
               typeof window.instrumentSelectorControls.navigateByDirection === 'function';
    }, {
        description: 'Instrument Selector Controls',
        required: true,
        dependencies: ['InstrumentGrid DOM'],
        troubleshooting: [
            'Verifique se elemento #instrument-grid existe no DOM',
            'Verifique se instrumentSelector.js foi carregado',
            'Verifique se setupInstrumentSelection() foi chamado',
            'Execute: document.querySelector("#instrument-grid")'
        ]
    });

    window.initChecker.registerCheck('MIDIDeviceManager', () => {
        return window.midiDeviceManager && 
               typeof window.midiDeviceManager === 'object';
    }, {
        description: 'MIDI Device Manager',
        required: false,
        troubleshooting: [
            'Verifique se midiDeviceManager.js foi carregado',
            'Verifique suporte MIDI no navegador',
            'Execute: navigator.requestMIDIAccess()'
        ]
    });

    console.log('✅ InitializationChecker carregado e pronto');
    console.log('💡 Comandos disponíveis:');
    console.log('   • window.initChecker.checkAll() - Verificar todos os componentes');
    console.log('   • window.initChecker.generateDiagnosticReport() - Relatório completo');
    console.log('   • window.initChecker.isInitialized("CatalogNavigationManager") - Verificar componente específico');
}
