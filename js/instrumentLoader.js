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
        this.localBaseURL = './soundfonts/';
        
        // Estatísticas de uso
        this.stats = {
            totalDownloads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            localCacheHits: 0,
            totalBytesLoaded: 0,
            downloadTimes: []
        };
        
        // Cache local persistente (IndexedDB)
        this.localCache = null;
        this.initializeLocalCache();
        
        // Cache persistente no localStorage (fallback legado)
        this.persistentCache = this.loadPersistentCache();
        
        console.log('🚀 InstrumentLoader inicializado');
        console.log(`📦 Cache localStorage: ${this.persistentCache.size} instrumentos`);
    }
    
    /**
     * Inicializa o cache local (IndexedDB)
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
        
        // 2. Verificar cache local (IndexedDB) - NOVO!
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
        
        // 4. Iniciar novo download
        this.stats.cacheMisses++;
        const downloadPromise = this._downloadInstrument(instrumentPath, variableName, cacheKey);
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
     * Download efetivo do instrumento usando a API oficial
     */
    async _downloadInstrument(instrumentPath, variableName, cacheKey) {
        const sources = [
            { label: 'local', url: `${this.localBaseURL}${instrumentPath}` },
            ...this.remoteSources.map(source => ({
                label: source.label,
                url: `${source.url}${instrumentPath}`
            }))
        ];

        let lastError = null;

        for (const source of sources) {
            const sourceLabel = source.label.toUpperCase();
            try {
                if (this.player && this.player.loader) {
                    return await this._downloadViaLoader(source.url, variableName, cacheKey, sourceLabel);
                }
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Falha via loader (${sourceLabel}):`, error.message);
            }

            try {
                return await this._downloadViaScript(source.url, variableName, cacheKey, sourceLabel);
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Falha via script (${sourceLabel}):`, error.message);
            }
        }

        throw lastError || new Error(`Não foi possível carregar ${variableName}`);
    }
    
    /**
     * Download utilizando player.loader
     */
    async _downloadViaLoader(url, variableName, cacheKey, sourceLabel) {
        const startTime = performance.now();

        return new Promise((resolve, reject) => {
            this.player.loader.startLoad(this.audioContext, url, variableName);
            this.player.loader.waitLoad(() => {
                const endTime = performance.now();
                const loadTime = endTime - startTime;

                if (window[variableName]) {
                    const instrument = window[variableName];

                    this.cache.set(cacheKey, instrument);
                    this.stats.totalDownloads++;
                    this.stats.downloadTimes.push(loadTime);

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
                    reject(new Error(`Instrumento não encontrado após load (${sourceLabel}): ${variableName}`));
                }
            });
        });
    }

    /**
     * Método alternativo de download via <script> tag (fallback)
     */
    _downloadViaScript(fullURL, variableName, cacheKey, sourceLabel) {
        const startTime = performance.now();
        return new Promise((resolve, reject) => {
            console.log(`📜 Usando <script> (${sourceLabel})...`);
            
            const script = document.createElement('script');
            script.src = fullURL;
            
            script.onload = () => {
                const endTime = performance.now();
                const loadTime = endTime - startTime;
                
                if (window[variableName]) {
                    const instrument = window[variableName];
                    
                    // Armazenar no cache em memória
                    this.cache.set(cacheKey, instrument);
                    
                    // Atualizar estatísticas
                    this.stats.totalDownloads++;
                    this.stats.downloadTimes.push(loadTime);
                    
                    // Salvar no cache local (IndexedDB) - NOVO!
                    this.saveToLocalCache(cacheKey, instrument, variableName);
                    
                    // Salvar no cache persistente legado (localStorage)
                    this.saveToPersistentCache(cacheKey, {
                        path: fullURL,
                        variable: variableName,
                        timestamp: Date.now()
                    });
                    
                    console.log(`✅ Carregado (${sourceLabel}): ${variableName} (${loadTime.toFixed(0)}ms)`);
                    resolve(instrument);
                } else {
                    reject(new Error(`Instrumento não encontrado (${sourceLabel}): ${variableName}`));
                }
            };
            
            script.onerror = () => {
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
