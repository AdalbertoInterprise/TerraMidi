/**
 * ============================================================
 * DEPENDENCY LOADER - Gerenciador de Dependências e Carregamento
 * ============================================================
 * 
 * Sistema robusto para garantir que todas as dependências críticas
 * estejam carregadas antes de inicializar componentes que dependem delas.
 * 
 * Funcionalidades:
 * - Verificação assíncrona de dependências
 * - Retry automático com backoff exponencial
 * - Logs diagnósticos detalhados
 * - Timeout configurável
 * - Validação de integridade de objetos
 * 
 * @version 1.0.0
 * @date 2025-10-18
 */

class DependencyLoader {
    constructor(config = {}) {
        this.maxRetries = config.maxRetries || 10;
        this.initialDelay = config.initialDelay || 100; // ms
        this.maxDelay = config.maxDelay || 3000; // ms
        this.timeout = config.timeout || 10000; // ms
        this.debug = config.debug !== false; // default true
        
        this.loadStatus = new Map(); // Rastrear status de carregamento
    }
    
    /**
     * Aguarda uma dependência estar disponível no window
     * @param {string} dependencyPath - Caminho da dependência (ex: 'CatalogManager', 'window.catalogManager')
     * @param {Object} options - Opções de validação
     * @returns {Promise<any>} A dependência carregada
     */
    async waitForDependency(dependencyPath, options = {}) {
        const {
            type = 'any', // 'function', 'object', 'instance', 'any'
            validateFn = null, // Função customizada de validação
            requiredMethods = [], // Métodos que devem existir
            requiredProperties = [] // Propriedades que devem existir
        } = options;
        
        const startTime = Date.now();
        let attempts = 0;
        let lastError = null;
        
        if (this.debug) {
            console.log(`🔍 DependencyLoader: Aguardando "${dependencyPath}"...`);
            console.log(`   ├─ Tipo esperado: ${type}`);
            console.log(`   ├─ Métodos requeridos: ${requiredMethods.length > 0 ? requiredMethods.join(', ') : 'nenhum'}`);
            console.log(`   ├─ Propriedades requeridas: ${requiredProperties.length > 0 ? requiredProperties.join(', ') : 'nenhuma'}`);
            console.log(`   ├─ Max tentativas: ${this.maxRetries}`);
            console.log(`   └─ Timeout: ${this.timeout}ms`);
        }
        
        while (attempts < this.maxRetries) {
            attempts++;
            
            // Verificar timeout global
            if (Date.now() - startTime > this.timeout) {
                const error = new Error(`Timeout aguardando "${dependencyPath}" após ${this.timeout}ms`);
                this.logError(dependencyPath, error, attempts);
                throw error;
            }
            
            try {
                const dependency = this.resolveDependency(dependencyPath);
                
                // Validação básica de tipo
                if (!this.validateType(dependency, type)) {
                    throw new Error(`Tipo inválido: esperado "${type}", obteve "${typeof dependency}"`);
                }
                
                // Validação de métodos requeridos
                if (requiredMethods.length > 0) {
                    const missingMethods = requiredMethods.filter(method => 
                        typeof dependency[method] !== 'function'
                    );
                    
                    if (missingMethods.length > 0) {
                        throw new Error(`Métodos ausentes: ${missingMethods.join(', ')}`);
                    }
                }
                
                // Validação de propriedades requeridas
                if (requiredProperties.length > 0) {
                    const missingProps = requiredProperties.filter(prop => 
                        !(prop in dependency)
                    );
                    
                    if (missingProps.length > 0) {
                        throw new Error(`Propriedades ausentes: ${missingProps.join(', ')}`);
                    }
                }
                
                // Validação customizada
                if (validateFn && typeof validateFn === 'function') {
                    const isValid = validateFn(dependency);
                    if (!isValid) {
                        throw new Error('Validação customizada falhou');
                    }
                }
                
                // ✅ Dependência válida!
                if (this.debug) {
                    console.log(`✅ DependencyLoader: "${dependencyPath}" carregado com sucesso!`);
                    console.log(`   ├─ Tentativas: ${attempts}`);
                    console.log(`   ├─ Tempo decorrido: ${Date.now() - startTime}ms`);
                    console.log(`   └─ Tipo: ${typeof dependency}`);
                }
                
                this.loadStatus.set(dependencyPath, {
                    loaded: true,
                    attempts,
                    duration: Date.now() - startTime,
                    timestamp: new Date().toISOString()
                });
                
                return dependency;
                
            } catch (error) {
                lastError = error;
                
                // Calcular delay com backoff exponencial
                const delay = Math.min(
                    this.initialDelay * Math.pow(2, attempts - 1),
                    this.maxDelay
                );
                
                if (this.debug && attempts % 3 === 0) {
                    console.warn(`⏳ DependencyLoader: "${dependencyPath}" ainda não disponível (tentativa ${attempts}/${this.maxRetries})`);
                    console.warn(`   └─ Próxima tentativa em ${delay}ms`);
                }
                
                // Aguardar antes da próxima tentativa
                await this.sleep(delay);
            }
        }
        
        // ❌ Falha após todas as tentativas
        const finalError = new Error(
            `Falha ao carregar "${dependencyPath}" após ${attempts} tentativas. ` +
            `Último erro: ${lastError?.message}`
        );
        
        this.logError(dependencyPath, finalError, attempts);
        this.loadStatus.set(dependencyPath, {
            loaded: false,
            attempts,
            error: finalError.message,
            timestamp: new Date().toISOString()
        });
        
        throw finalError;
    }
    
    /**
     * Aguarda múltiplas dependências em paralelo
     * @param {Array<{path: string, options?: Object}>} dependencies - Array de dependências
     * @returns {Promise<Object>} Objeto com as dependências carregadas
     */
    async waitForMultiple(dependencies) {
        if (this.debug) {
            console.log(`🔍 DependencyLoader: Carregando ${dependencies.length} dependências em paralelo...`);
        }
        
        const promises = dependencies.map(dep => {
            const path = typeof dep === 'string' ? dep : dep.path;
            const options = typeof dep === 'object' ? dep.options : {};
            
            return this.waitForDependency(path, options)
                .then(result => ({ path, result, success: true }))
                .catch(error => ({ path, error, success: false }));
        });
        
        const results = await Promise.all(promises);
        
        // Verificar falhas
        const failures = results.filter(r => !r.success);
        
        if (failures.length > 0) {
            console.error(`❌ ${failures.length} dependência(s) falharam ao carregar:`);
            failures.forEach(f => {
                console.error(`   • ${f.path}: ${f.error.message}`);
            });
            
            throw new Error(
                `Falha ao carregar ${failures.length} dependência(s): ${failures.map(f => f.path).join(', ')}`
            );
        }
        
        // Retornar objeto com resultados
        const loadedDependencies = {};
        results.forEach(r => {
            const key = r.path.split('.').pop(); // Último segmento do path
            loadedDependencies[key] = r.result;
        });
        
        if (this.debug) {
            console.log(`✅ Todas as ${dependencies.length} dependências carregadas com sucesso!`);
        }
        
        return loadedDependencies;
    }
    
    /**
     * Resolve uma dependência a partir de um path string
     * @param {string} path - Caminho da dependência (ex: 'CatalogManager', 'window.catalogManager')
     * @returns {any} A dependência ou undefined
     */
    resolveDependency(path) {
        // Remover 'window.' do início se presente
        const cleanPath = path.replace(/^window\./, '');
        
        // Tentar acessar via window
        const parts = cleanPath.split('.');
        let current = window;
        
        for (const part of parts) {
            if (current == null) return undefined;
            current = current[part];
        }
        
        return current;
    }
    
    /**
     * Valida o tipo de uma dependência
     * @param {any} dependency - A dependência a validar
     * @param {string} expectedType - Tipo esperado ('function', 'object', 'instance', 'any')
     * @returns {boolean} true se válido
     */
    validateType(dependency, expectedType) {
        if (dependency === undefined || dependency === null) {
            return false;
        }
        
        switch (expectedType) {
            case 'function':
                return typeof dependency === 'function';
                
            case 'object':
                return typeof dependency === 'object' && dependency !== null;
                
            case 'instance':
                return typeof dependency === 'object' && 
                       dependency !== null && 
                       dependency.constructor && 
                       dependency.constructor !== Object;
                
            case 'any':
                return true;
                
            default:
                return typeof dependency === expectedType;
        }
    }
    
    /**
     * Sleep assíncrono
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Log detalhado de erro
     * @param {string} dependencyPath - Caminho da dependência
     * @param {Error} error - Erro ocorrido
     * @param {number} attempts - Número de tentativas
     */
    logError(dependencyPath, error, attempts) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`❌ ERRO ao carregar dependência: "${dependencyPath}"`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`   Tentativas: ${attempts}/${this.maxRetries}`);
        console.error(`   Erro: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Diagnóstico do estado atual do window
        console.error('🔍 Diagnóstico do window:');
        console.error(`   ├─ CatalogManager (classe): ${typeof window.CatalogManager}`);
        console.error(`   ├─ catalogManager (instância): ${typeof window.catalogManager}`);
        console.error(`   ├─ CatalogNavigationManager (classe): ${typeof window.CatalogNavigationManager}`);
        console.error(`   ├─ catalogNavigationManager (instância): ${typeof window.catalogNavigationManager}`);
        console.error(`   ├─ SoundfontManager (classe): ${typeof window.SoundfontManager}`);
        console.error(`   ├─ soundfontManager (instância): ${typeof window.soundfontManager}`);
        console.error(`   └─ instrumentSelector (módulo): ${typeof window.instrumentSelector}`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    /**
     * Obtém estatísticas de carregamento
     * @returns {Object} Estatísticas
     */
    getStats() {
        const stats = {
            total: this.loadStatus.size,
            loaded: 0,
            failed: 0,
            avgAttempts: 0,
            avgDuration: 0,
            details: []
        };
        
        let totalAttempts = 0;
        let totalDuration = 0;
        
        this.loadStatus.forEach((status, path) => {
            if (status.loaded) {
                stats.loaded++;
                totalAttempts += status.attempts;
                totalDuration += status.duration;
            } else {
                stats.failed++;
            }
            
            stats.details.push({
                path,
                ...status
            });
        });
        
        if (stats.loaded > 0) {
            stats.avgAttempts = totalAttempts / stats.loaded;
            stats.avgDuration = totalDuration / stats.loaded;
        }
        
        return stats;
    }
    
    /**
     * Imprime relatório de carregamento
     */
    printReport() {
        const stats = this.getStats();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 RELATÓRIO DE CARREGAMENTO DE DEPENDÊNCIAS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Total: ${stats.total}`);
        console.log(`   ✅ Carregadas: ${stats.loaded}`);
        console.log(`   ❌ Falharam: ${stats.failed}`);
        console.log(`   📊 Média de tentativas: ${stats.avgAttempts.toFixed(1)}`);
        console.log(`   ⏱️ Tempo médio: ${stats.avgDuration.toFixed(0)}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (stats.details.length > 0) {
            console.log('📋 Detalhes:');
            stats.details.forEach(detail => {
                const icon = detail.loaded ? '✅' : '❌';
                const time = detail.duration ? ` (${detail.duration}ms)` : '';
                const error = detail.error ? ` - ${detail.error}` : '';
                console.log(`   ${icon} ${detail.path}${time}${error}`);
            });
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DependencyLoader = DependencyLoader;
    
    // Criar instância global padrão
    window.dependencyLoader = new DependencyLoader({
        debug: true,
        maxRetries: 15,
        timeout: 15000
    });
    
    console.log('✅ DependencyLoader disponível globalmente');
}
