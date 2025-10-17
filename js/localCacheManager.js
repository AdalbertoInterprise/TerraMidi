// Local Cache Manager - Sistema de cache persistente usando IndexedDB
// Funciona em desktop, mobile e tablets
// Reduz latência e melhora performance

class LocalCacheManager {
    constructor() {
        this.dbName = 'TerraGameSoundfonts';
        this.dbVersion = 1;
        this.storeName = 'soundfonts';
        this.db = null;
        this.isSupported = this.checkSupport();
        this.maxCacheSize = 500 * 1024 * 1024; // 500MB máximo
        this.currentCacheSize = 0;
        
        console.log('💾 LocalCacheManager inicializado');
        console.log(`✅ IndexedDB suportado: ${this.isSupported}`);
    }
    
    /**
     * Verifica se IndexedDB é suportado
     */
    checkSupport() {
        if (!window.indexedDB) {
            console.warn('⚠️ IndexedDB não suportado neste navegador');
            return false;
        }
        return true;
    }
    
    /**
     * Inicializa o banco de dados IndexedDB
     */
    async initialize() {
        if (!this.isSupported) {
            console.log('⚠️ Cache local desabilitado (IndexedDB não suportado)');
            return false;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB aberto com sucesso');
                this.calculateCacheSize().then(() => {
                    resolve(true);
                });
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar object store se não existir
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    
                    // Criar índices
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('size', 'size', { unique: false });
                    objectStore.createIndex('instrumentName', 'instrumentName', { unique: false });
                    
                    console.log('📦 Object store criado com sucesso');
                }
            };
        });
    }
    
    /**
     * Salva instrumento no cache local
     * @param {string} key - Chave única (instrumentPath|variableName)
     * @param {Object} instrumentData - Dados do instrumento
     * @param {string} instrumentName - Nome amigável do instrumento
     */
    async saveToCache(key, instrumentData, instrumentName) {
        if (!this.db) {
            console.warn('⚠️ DB não inicializado, ignorando cache');
            return false;
        }
        
        try {
            // Serializar dados do instrumento
            const serialized = JSON.stringify(instrumentData);
            const size = new Blob([serialized]).size;
            
            // Verificar limite de cache
            if (this.currentCacheSize + size > this.maxCacheSize) {
                console.warn('⚠️ Cache cheio, removendo itens antigos...');
                await this.cleanOldestEntries(size);
            }
            
            const entry = {
                key: key,
                data: serialized,
                instrumentName: instrumentName,
                timestamp: Date.now(),
                size: size,
                accessCount: 0,
                lastAccessed: Date.now()
            };
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.put(entry);
                
                request.onsuccess = () => {
                    this.currentCacheSize += size;
                    console.log(`💾 Salvo no cache local: ${instrumentName} (${this.formatBytes(size)})`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ Erro ao salvar no cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ Erro ao serializar instrumento:', error);
            return false;
        }
    }
    
    /**
     * Recupera instrumento do cache local
     * @param {string} key - Chave única
     * @returns {Promise<Object|null>} Dados do instrumento ou null
     */
    async getFromCache(key) {
        if (!this.db) {
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(key);
            
            request.onsuccess = () => {
                if (request.result) {
                    const entry = request.result;
                    
                    // Atualizar estatísticas de acesso
                    entry.accessCount++;
                    entry.lastAccessed = Date.now();
                    objectStore.put(entry);
                    
                    // Desserializar dados
                    try {
                        const instrumentData = JSON.parse(entry.data);
                        console.log(`✅ Cache local HIT: ${entry.instrumentName}`);
                        resolve(instrumentData);
                    } catch (error) {
                        console.error('❌ Erro ao desserializar:', error);
                        resolve(null);
                    }
                } else {
                    console.log(`⚠️ Cache local MISS: ${key}`);
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.error('❌ Erro ao ler cache:', request.error);
                resolve(null);
            };
        });
    }
    
    /**
     * Remove entradas mais antigas para liberar espaço
     */
    async cleanOldestEntries(requiredSpace) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('timestamp');
            const request = index.openCursor();
            
            let freedSpace = 0;
            const entries = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    entries.push({
                        key: cursor.value.key,
                        timestamp: cursor.value.timestamp,
                        size: cursor.value.size,
                        name: cursor.value.instrumentName
                    });
                    cursor.continue();
                } else {
                    // Ordenar por timestamp (mais antigos primeiro)
                    entries.sort((a, b) => a.timestamp - b.timestamp);
                    
                    // Remover até liberar espaço suficiente
                    for (const entry of entries) {
                        if (freedSpace >= requiredSpace) break;
                        
                        objectStore.delete(entry.key);
                        freedSpace += entry.size;
                        this.currentCacheSize -= entry.size;
                        console.log(`🗑️ Removido do cache: ${entry.name} (${this.formatBytes(entry.size)})`);
                    }
                    
                    resolve(freedSpace);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    /**
     * Calcula tamanho total do cache
     */
    async calculateCacheSize() {
        if (!this.db) return 0;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.openCursor();
            
            let totalSize = 0;
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    totalSize += cursor.value.size || 0;
                    count++;
                    cursor.continue();
                } else {
                    this.currentCacheSize = totalSize;
                    console.log(`📊 Cache: ${count} instrumentos, ${this.formatBytes(totalSize)}`);
                    resolve(totalSize);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    /**
     * Obtém estatísticas do cache
     */
    async getStats() {
        if (!this.db) {
            return {
                count: 0,
                size: 0,
                maxSize: this.maxCacheSize,
                supported: false
            };
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.openCursor();
            
            const stats = {
                count: 0,
                size: 0,
                maxSize: this.maxCacheSize,
                supported: true,
                instruments: [],
                oldestTimestamp: Infinity,
                newestTimestamp: 0,
                mostAccessed: null,
                totalAccesses: 0
            };
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const entry = cursor.value;
                    stats.count++;
                    stats.size += entry.size || 0;
                    stats.totalAccesses += entry.accessCount || 0;
                    
                    if (entry.timestamp < stats.oldestTimestamp) {
                        stats.oldestTimestamp = entry.timestamp;
                    }
                    if (entry.timestamp > stats.newestTimestamp) {
                        stats.newestTimestamp = entry.timestamp;
                    }
                    
                    if (!stats.mostAccessed || entry.accessCount > stats.mostAccessed.accessCount) {
                        stats.mostAccessed = {
                            name: entry.instrumentName,
                            accessCount: entry.accessCount
                        };
                    }
                    
                    stats.instruments.push({
                        name: entry.instrumentName,
                        size: entry.size,
                        accessCount: entry.accessCount,
                        lastAccessed: entry.lastAccessed
                    });
                    
                    cursor.continue();
                } else {
                    resolve(stats);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    /**
     * Limpa todo o cache
     */
    async clearCache() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();
            
            request.onsuccess = () => {
                this.currentCacheSize = 0;
                console.log('🗑️ Cache limpo com sucesso');
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Erro ao limpar cache:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Formata bytes para leitura humana
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LocalCacheManager = LocalCacheManager;
}
