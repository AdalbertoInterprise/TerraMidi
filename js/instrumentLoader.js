// Instrument Loader - Sistema de download dinâmico de soundfonts
// Baseado na API oficial do WebAudioFont: player.loader.startLoad() e waitLoad()

class InstrumentLoader {
    constructor(audioContext, player) {
        this.audioContext = audioContext;
        this.player = player; // WebAudioFontPlayer instance
        this.cache = new Map(); // Cache de instrumentos em memória
        this.loadingQueue = new Map(); // Fila de downloads em andamento
        this.remoteSources = [
            { label: 'Surikov', url: 'https://surikov.github.io/webaudiofontdata/sound/' },
            { label: 'jsDelivr', url: 'https://cdn.jsdelivr.net/gh/surikov/webaudiofontdata@latest/sound/' }
        ];
        this.baseURL = this.remoteSources[0].url;
        this.localBaseURL = 'soundfonts/';
        
        // Estatísticas de uso
        this.stats = {
            totalDownloads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            localCacheHits: 0,
            totalBytesLoaded: 0,
            downloadTimes: []
        };
        
        // 🧠 Cache Híbrido Inteligente (File System + IndexedDB)
        this.hybridCache = null;
        this.hybridCacheEnabled = true; // Pode ser desabilitado se muitos erros
        this.hybridCacheErrors = 0; // Contador de erros consecutivos
        this.initializeHybridCache();
        
        // 🚦 Sistema de Fila (limita downloads simultâneos)
        this.maxConcurrentDownloads = 3; // Máximo de 3 downloads simultâneos
        this.activeDownloads = 0; // Downloads ativos no momento
        this.downloadQueue = []; // Fila de espera
        
        // Cache local persistente (IndexedDB) - LEGADO, mantido como fallback
        this.localCache = null;
        this.initializeLocalCache();
        
        // Cache persistente no localStorage (fallback legado)
        this.persistentCache = this.loadPersistentCache();
        
        console.log('🚀 InstrumentLoader inicializado');
        console.log(`📦 Cache localStorage: ${this.persistentCache.size} instrumentos`);
    }
    
    /**
     * 🧠 Inicializa o cache híbrido inteligente (prioridade máxima)
     */
    async initializeHybridCache() {
        if (window.HybridCacheManager) {
            this.hybridCache = new HybridCacheManager();
            const initialized = await this.hybridCache.initialize();
            
            if (initialized) {
                const info = await this.hybridCache.getSystemInfo();
                console.log(`🧠 Cache Híbrido ativo: ${info.method}`);
                console.log(`📱 Plataforma: ${info.platform}`);
                
                if (info.method === 'filesystem') {
                    console.log('💾 Usando File System Access (até 2GB)');
                } else {
                    console.log('💾 Usando IndexedDB expandido');
                }
            }
        } else {
            console.warn('⚠️ HybridCacheManager não encontrado, usando fallback');
        }
    }
    
    /**
     * Inicializa o cache local (IndexedDB) - FALLBACK LEGADO
     */
    async initializeLocalCache() {
        if (window.LocalCacheManager) {
            this.localCache = new LocalCacheManager();
            const initialized = await this.localCache.initialize();
            
            if (initialized) {
                console.log('💾 Cache local (IndexedDB) habilitado');
                const stats = await this.localCache.getStats();
                console.log(`📊 ${stats.count} instrumentos no cache local (${this.localCache.formatBytes(stats.size)})`);
            } else {
                console.warn('⚠️ Cache local desabilitado, usando apenas memória');
            }
        } else {
            console.warn('⚠️ LocalCacheManager não encontrado');
        }
    }
    
    /**
     * Carrega um instrumento dinamicamente
     * @param {string} instrumentPath - Caminho do arquivo JS (ex: '0000_FluidR3_GM_sf2_file.js')
     * @param {string} variableName - Nome da variável global (ex: '_tone_0000_FluidR3_GM_sf2_file')
     * @returns {Promise<Object>} Preset do instrumento carregado
     */
    async loadInstrument(instrumentPath, variableName) {
        const cacheKey = `${instrumentPath}|${variableName}`;
        
        // 1. Verificar cache em memória (mais rápido)
        if (this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            console.log(`✅ Cache RAM hit: ${variableName}`);
            return this.cache.get(cacheKey);
        }
        
        // 2. Verificar cache híbrido (filesystem desktop ou IndexedDB mobile) - NOVO!
        if (this.hybridCache && this.hybridCache.isInitialized) {
            try {
                const cachedScript = await this.hybridCache.load(instrumentPath);
                if (cachedScript) {
                    // Executar código JavaScript carregado do cache
                    eval(cachedScript);
                    
                    if (window[variableName]) {
                        const instrument = window[variableName];
                        this.cache.set(cacheKey, instrument);
                        this.stats.cacheHits++;
                        console.log(`🧠 HybridCache hit: ${variableName} (${this.hybridCache.storageMethod})`);
                        return instrument;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Erro ao ler HybridCache:', error);
            }
        }
        
        // 3. Verificar cache local legado (IndexedDB) - Fallback
        if (this.localCache && this.localCache.db) {
            try {
                const cachedData = await this.localCache.getFromCache(cacheKey);
                if (cachedData) {
                    this.stats.localCacheHits++;
                    // Armazenar em memória para próximos acessos
                    this.cache.set(cacheKey, cachedData);
                    console.log(`💾 Cache local hit: ${variableName} (latência ZERO!)`);
                    return cachedData;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao ler cache local:', error);
            }
        }
        
        // 3. Verificar se já está sendo carregado
        if (this.loadingQueue.has(cacheKey)) {
            console.log(`⏳ Aguardando download em andamento: ${variableName}`);
            return await this.loadingQueue.get(cacheKey);
        }
        
        // 4. Iniciar novo download (com controle de fila)
        this.stats.cacheMisses++;
        const downloadPromise = this._queueDownload(instrumentPath, variableName, cacheKey);
        this.loadingQueue.set(cacheKey, downloadPromise);
        
        try {
            const instrument = await downloadPromise;
            this.loadingQueue.delete(cacheKey);
            return instrument;
        } catch (error) {
            this.loadingQueue.delete(cacheKey);
            throw error;
        }
    }
    
    /**
     * 🚦 Controla fila de downloads (limita concorrência)
     */
    async _queueDownload(instrumentPath, variableName, cacheKey) {
        // Se já atingiu o limite, adicionar à fila
        if (this.activeDownloads >= this.maxConcurrentDownloads) {
            console.log(`🚦 Fila: Aguardando slot disponível... (${this.activeDownloads}/${this.maxConcurrentDownloads})`);
            
            // Criar promessa que resolve quando houver slot disponível
            await new Promise(resolve => {
                this.downloadQueue.push(resolve);
            });
        }
        
        // Incrementar contador de downloads ativos
        this.activeDownloads++;
        console.log(`📥 Download iniciado (${this.activeDownloads}/${this.maxConcurrentDownloads}): ${variableName}`);
        
        try {
            // Executar download
            const instrument = await this._downloadInstrument(instrumentPath, variableName, cacheKey);
            return instrument;
        } finally {
            // Decrementar contador
            this.activeDownloads--;
            
            // Liberar próximo da fila (se houver)
            if (this.downloadQueue.length > 0) {
                const nextResolve = this.downloadQueue.shift();
                nextResolve(); // Libera próximo download
            }
            
            console.log(`✅ Download concluído (${this.activeDownloads}/${this.maxConcurrentDownloads})`);
        }
    }
    
    /**
     * Download efetivo do instrumento usando a API oficial (com retry)
     */
    async _downloadInstrument(instrumentPath, variableName, cacheKey, retryCount = 0) {
        const maxRetries = 2; // Tenta até 3 vezes total
        
        const sources = [
            { label: 'local', url: `${this.localBaseURL}${instrumentPath}`, timeout: 3000 },  // 3s para local
            ...this.remoteSources.map(source => ({
                label: source.label,
                url: `${source.url}${instrumentPath}`,
                timeout: 30000  // 30s para remoto (arquivos até 2MB)
            }))
        ];

        let lastError = null;

        for (const source of sources) {
            const sourceLabel = source.label.toUpperCase();
            
            try {
                if (this.player && this.player.loader) {
                    return await this._downloadViaLoader(source.url, variableName, cacheKey, sourceLabel, source.timeout);
                }
            } catch (error) {
                lastError = error;
                // Não logar erro de fonte local (arquivo pode não existir)
                if (sourceLabel !== 'LOCAL') {
                    console.warn(`⚠️ Falha via loader (${sourceLabel}):`, error.message);
                }
            }

            try {
                return await this._downloadViaScript(source.url, variableName, cacheKey, sourceLabel, source.timeout);
            } catch (error) {
                lastError = error;
                // Não logar erro de fonte local
                if (sourceLabel !== 'LOCAL') {
                    console.warn(`⚠️ Falha via script (${sourceLabel}):`, error.message);
                }
            }
        }

        // Retry automático se ainda não tentou o máximo
        if (retryCount < maxRetries) {
            console.log(`🔄 Retry ${retryCount + 1}/${maxRetries}: ${variableName}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1s
            return await this._downloadInstrument(instrumentPath, variableName, cacheKey, retryCount + 1);
        }

        throw lastError || new Error(`Falha após ${maxRetries + 1} tentativas: ${variableName}`);
    }
    
    /**
     * Download utilizando player.loader (com timeout configurável)
     */
    async _downloadViaLoader(url, variableName, cacheKey, sourceLabel, timeout = 10000) {
        const startTime = performance.now();

        return new Promise((resolve, reject) => {
            // Timeout configurável por fonte
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout ao carregar ${variableName} de ${sourceLabel}`));
            }, timeout);
            
            this.player.loader.startLoad(this.audioContext, url, variableName);
            this.player.loader.waitLoad(() => {
                clearTimeout(timeoutId); // Cancelar timeout se sucesso
                
                const endTime = performance.now();
                const loadTime = endTime - startTime;

                if (window[variableName]) {
                    const instrument = window[variableName];

                    this.cache.set(cacheKey, instrument);
                    this.stats.totalDownloads++;
                    this.stats.downloadTimes.push(loadTime);

                    // Salvar no HybridCache apenas se download foi bem-sucedido
                    if (sourceLabel !== 'LOCAL') {
                        // Só salva se veio de fonte remota (para cache futuro)
                        this.saveToHybridCache(url, variableName, instrument);
                    }

                    this.saveToLocalCache(cacheKey, instrument, variableName);
                    this.saveToPersistentCache(cacheKey, {
                        path: url,
                        variable: variableName,
                        timestamp: Date.now()
                    });

                    console.log(`✅ Carregado (${sourceLabel}): ${variableName} (${loadTime.toFixed(0)}ms)`);
                    console.log(`📊 Cache: ${this.cache.size} instrumentos | Downloads: ${this.stats.totalDownloads}`);

                    resolve(instrument);
                } else {
                    clearTimeout(timeoutId);
                    reject(new Error(`Instrumento não encontrado após load (${sourceLabel}): ${variableName}`));
                }
            });
        });
    }

    /**
     * Método alternativo de download via <script> tag (fallback)
     */
    _downloadViaScript(fullURL, variableName, cacheKey, sourceLabel, timeout = 10000) {
        const startTime = performance.now();
        return new Promise((resolve, reject) => {
            // Só loga se não for fonte local (reduzir ruído)
            if (sourceLabel !== 'LOCAL') {
                console.log(`📜 Usando <script> (${sourceLabel})...`);
            }
            
            // Timeout configurável por fonte
            const timeoutId = setTimeout(() => {
                script.remove();
                reject(new Error(`Timeout ao carregar (${sourceLabel})`));
            }, timeout);
            
            const script = document.createElement('script');
            script.src = fullURL;
            
            script.onload = () => {
                clearTimeout(timeoutId);
                const endTime = performance.now();
                const loadTime = endTime - startTime;
                
                if (window[variableName]) {
                    const instrument = window[variableName];
                    
                    // Armazenar no cache em memória
                    this.cache.set(cacheKey, instrument);
                    
                    // Atualizar estatísticas
                    this.stats.totalDownloads++;
                    this.stats.downloadTimes.push(loadTime);
                    
                    // Salvar no HybridCache apenas se veio de fonte remota
                    if (sourceLabel !== 'LOCAL') {
                        this.saveToHybridCache(fullURL, variableName, instrument);
                    }
                    
                    // Salvar no cache local (IndexedDB)
                    this.saveToLocalCache(cacheKey, instrument, variableName);
                    
                    // Salvar no cache persistente legado (localStorage)
                    this.saveToPersistentCache(cacheKey, {
                        path: fullURL,
                        variable: variableName,
                        timestamp: Date.now()
                    });
                    
                    console.log(`✅ Carregado (${sourceLabel}): ${variableName} (${loadTime.toFixed(0)}ms)`);
                    script.remove(); // Limpar script do DOM
                    resolve(instrument);
                } else {
                    clearTimeout(timeoutId);
                    script.remove();
                    reject(new Error(`Instrumento não encontrado (${sourceLabel}): ${variableName}`));
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                script.remove();
                reject(new Error(`Falha ao carregar (${sourceLabel}): ${fullURL}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Pré-carrega múltiplos instrumentos em background
     * @param {Array} instruments - Array de {path, variable}
     */
    async preloadInstruments(instruments) {
        console.log(`🔄 Pré-carregando ${instruments.length} instrumentos...`);
        
        const promises = instruments.map(({path, variable}) => 
            this.loadInstrument(path, variable)
                .catch(err => console.warn(`Falha ao pré-carregar ${variable}:`, err))
        );
        
        await Promise.allSettled(promises);
        console.log(`✅ Pré-carregamento concluído: ${this.cache.size} instrumentos em cache`);
    }
    
    /**
     * 🧠 Salva instrumento no cache híbrido (filesystem ou IndexedDB expandido)
     * ✅ PROTEGIDO CONTRA DOWNLOADS DUPLICADOS
     */
    async saveToHybridCache(url, variableName, instrument) {
        // Verificar se cache está disponível e habilitado
        if (!this.hybridCache || !this.hybridCache.isInitialized || !this.hybridCacheEnabled) {
            return;
        }
        
        // Extrair apenas o nome do arquivo do caminho
        const filename = url.split('/').pop();
        
        // 🔒 PROTEÇÃO: Criar chave única para prevenir salvamentos duplicados simultâneos
        const saveKey = `saving:${filename}`;
        if (this.loadingQueue.has(saveKey)) {
            console.log(`🔒 Salvamento já em andamento: ${filename}`);
            return await this.loadingQueue.get(saveKey);
        }
        
        // Verificar se já existe no cache antes de tentar salvar
        try {
            const exists = await this.hybridCache.exists(filename);
            if (exists) {
                // Já existe, não precisa salvar novamente
                this.hybridCacheErrors = Math.max(0, this.hybridCacheErrors - 1); // Reduzir contador de erros
                console.log(`✅ Já em cache: ${filename}`);
                return;
            }
        } catch (error) {
            // Ignorar erro de verificação
        }
        
        // Criar promessa de salvamento
        const savePromise = (async () => {
            try {
                // 🔒 USAR RESPONSE DO SERVICE WORKER ao invés de buscar novamente
                // Isso evita download duplicado desnecessário
                
                // Tentar buscar do cache do Service Worker primeiro
                if ('caches' in window) {
                    const cache = await caches.open('terra-soundfonts-v4.0.0');
                    const cachedResponse = await cache.match(url);
                    
                    if (cachedResponse) {
                        const scriptContent = await cachedResponse.text();
                        
                        // Validar conteúdo
                        if (scriptContent && scriptContent.length >= 100) {
                            // Salvar no HybridCache com metadados
                            await this.hybridCache.save(filename, scriptContent, {
                                name: variableName,
                                size: scriptContent.length,
                                url: url,
                                timestamp: Date.now()
                            });
                            
                            // Reset contador de erros em caso de sucesso
                            this.hybridCacheErrors = 0;
                            
                            console.log(`💾 Salvo no HybridCache (do SW): ${filename} (${(scriptContent.length / 1024).toFixed(1)} KB)`);
                            return;
                        }
                    }
                }
                
                // Fallback: Buscar do servidor (COM TIMEOUT ADEQUADO)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
                
                const response = await fetch(url, { 
                    signal: controller.signal,
                    cache: 'force-cache' // ✅ Reusar cache do navegador/SW
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    // Arquivo não existe (404, 403, etc)
                    this.hybridCacheErrors++;
                    
                    // Desabilitar temporariamente após 5 erros consecutivos
                    if (this.hybridCacheErrors >= 5) {
                        this.hybridCacheEnabled = false;
                        console.warn('⚠️ HybridCache desabilitado temporariamente (muitos erros de rede)');
                        
                        // Reabilitar após 30 segundos
                        setTimeout(() => {
                            this.hybridCacheEnabled = true;
                            this.hybridCacheErrors = 0;
                            console.log('✅ HybridCache reabilitado');
                        }, 30000);
                    }
                    return;
                }
                
                const scriptContent = await response.text();
                
                // Validar que o conteúdo não está vazio
                if (!scriptContent || scriptContent.length < 100) {
                    this.hybridCacheErrors++;
                    return;
                }
                
                // Salvar no HybridCache com metadados
                await this.hybridCache.save(filename, scriptContent, {
                    name: variableName,
                    size: scriptContent.length,
                    url: url,
                    timestamp: Date.now()
                });
                
                // Reset contador de erros em caso de sucesso
                this.hybridCacheErrors = 0;
                
                console.log(`💾 Salvo no HybridCache (do servidor): ${filename} (${(scriptContent.length / 1024).toFixed(1)} KB)`);
            } catch (error) {
                // Incrementar contador de erros apenas para erros não-abort
                if (error.name !== 'AbortError') {
                    this.hybridCacheErrors++;
                }
                
                // Desabilitar após muitos erros
                if (this.hybridCacheErrors >= 5) {
                    this.hybridCacheEnabled = false;
                    console.warn('⚠️ HybridCache desabilitado temporariamente (muitos erros consecutivos)');
                    
                    // Reabilitar após 30 segundos
                    setTimeout(() => {
                        this.hybridCacheEnabled = true;
                        this.hybridCacheErrors = 0;
                        console.log('✅ HybridCache reabilitado');
                    }, 30000);
                }
                
                // Não logar erros comuns de rede
                // (silencioso para não poluir console)
            } finally {
                // 🔓 Remover da fila de salvamento
                this.loadingQueue.delete(saveKey);
            }
        })();
        
        // Adicionar à fila de salvamento
        this.loadingQueue.set(saveKey, savePromise);
        return await savePromise;
    }
    
    /**
     * Salva instrumento no cache local (IndexedDB) - NOVO!
     */
    async saveToLocalCache(cacheKey, instrument, instrumentName) {
        if (!this.localCache || !this.localCache.db) {
            return; // Cache local não disponível
        }
        
        try {
            await this.localCache.saveToCache(cacheKey, instrument, instrumentName);
        } catch (error) {
            console.warn('⚠️ Erro ao salvar no cache local:', error);
        }
    }
    
    /**
     * Obtém estatísticas do cache local
     */
    async getLocalCacheStats() {
        if (!this.localCache || !this.localCache.db) {
            return null;
        }
        
        try {
            return await this.localCache.getStats();
        } catch (error) {
            console.warn('⚠️ Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }
    
    /**
     * 🧠 Obtém estatísticas do cache híbrido
     */
    async getHybridCacheStats() {
        if (!this.hybridCache || !this.hybridCache.isInitialized) {
            return null;
        }
        
        try {
            return await this.hybridCache.getStats();
        } catch (error) {
            console.warn('⚠️ Erro ao obter estatísticas do HybridCache:', error);
            return null;
        }
    }
    
    /**
     * 🧠 Obtém informações do sistema de cache híbrido
     */
    async getHybridCacheSystemInfo() {
        if (!this.hybridCache || !this.hybridCache.isInitialized) {
            return null;
        }
        
        try {
            return await this.hybridCache.getSystemInfo();
        } catch (error) {
            console.warn('⚠️ Erro ao obter info do sistema HybridCache:', error);
            return null;
        }
    }
    
    /**
     * Limpa cache local (IndexedDB)
     */
    async clearLocalCache() {
        if (!this.localCache || !this.localCache.db) {
            console.warn('⚠️ Cache local não disponível');
            return false;
        }
        
        try {
            await this.localCache.clearCache();
            console.log('🗑️ Cache local limpo com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar cache local:', error);
            return false;
        }
    }
    
    /**
     * Limpa cache de instrumentos não usados recentemente
     * @param {number} maxAge - Idade máxima em milissegundos
     */
    clearOldCache(maxAge = 30 * 60 * 1000) { // 30 minutos padrão
        const now = Date.now();
        let cleared = 0;
        
        for (const [key, data] of this.persistentCache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.persistentCache.delete(key);
                this.cache.delete(key);
                cleared++;
            }
        }
        
        if (cleared > 0) {
            this.savePersistentCache();
            console.log(`🗑️ Limpeza de cache: ${cleared} instrumentos removidos`);
        }
    }
    
    /**
     * Carrega cache persistente do localStorage
     */
    loadPersistentCache() {
        try {
            const stored = localStorage.getItem('instrumentCache');
            if (stored) {
                const parsed = JSON.parse(stored);
                return new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar cache persistente:', error);
        }
        return new Map();
    }
    
    /**
     * Salva cache persistente no localStorage
     */
    savePersistentCache() {
        try {
            const obj = Object.fromEntries(this.persistentCache);
            localStorage.setItem('instrumentCache', JSON.stringify(obj));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar cache persistente:', error);
        }
    }
    
    /**
     * Adiciona instrumento ao cache persistente
     */
    saveToPersistentCache(key, data) {
        this.persistentCache.set(key, data);
        this.savePersistentCache();
    }
    
    /**
     * Retorna estatísticas de uso
     */
    getStats() {
        const avgDownloadTime = this.stats.downloadTimes.length > 0
            ? this.stats.downloadTimes.reduce((a, b) => a + b, 0) / this.stats.downloadTimes.length
            : 0;
        
        return {
            cacheSize: this.cache.size,
            totalDownloads: this.stats.totalDownloads,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100,
            avgDownloadTime: avgDownloadTime.toFixed(0) + 'ms',
            persistentCacheSize: this.persistentCache.size
        };
    }
    
    /**
     * Limpa todo o cache
     */
    clearAllCache() {
        this.cache.clear();
        this.persistentCache.clear();
        localStorage.removeItem('instrumentCache');
        console.log('🗑️ Todo cache limpo');
    }
    
    /**
     * Lista instrumentos em cache
     */
    listCachedInstruments() {
        return Array.from(this.cache.keys()).map(key => {
            const [path, variable] = key.split('|');
            return { path, variable };
        });
    }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InstrumentLoader;
}
