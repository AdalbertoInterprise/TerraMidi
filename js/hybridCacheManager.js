// 🧠 Hybrid Cache Manager - Sistema Inteligente Multi-Plataforma
// Desktop: File System Access API (pasta em Documentos)
// Mobile/Tablet: IndexedDB expandido + Cache Storage
// Automático, progressivo e seguro

class HybridCacheManager {
    constructor() {
        this.platform = this.detectPlatform();
        this.fileSystemCache = null;
        this.indexedDBCache = null;
        this.cacheStorage = null;
        this.isInitialized = false;
        
        // Configurações adaptativas por plataforma
        this.config = {
            desktop: {
                preferredMethod: 'opfs', // Origin Private File System (automático!)
                maxSize: 2 * 1024 * 1024 * 1024, // 2GB
                autoRequestPermission: false, // OPFS não precisa permissão!
                fallbackToIndexedDB: true
            },
            mobile: {
                preferredMethod: 'opfs', // OPFS também funciona em mobile!
                maxSize: 1 * 1024 * 1024 * 1024, // 1GB
                useQuotaAPI: true,
                persistentStorage: true,
                fallbackToIndexedDB: true
            }
        };
        
        this.stats = {
            totalSaved: 0,
            totalLoaded: 0,
            cacheHits: 0,
            cacheMisses: 0,
            bytesStored: 0,
            method: null
        };
        
        console.log(`🧠 HybridCacheManager inicializado`);
        console.log(`📱 Plataforma detectada: ${this.platform}`);
    }
    
    /**
     * Detecta plataforma (desktop vs mobile)
     */
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
        
        if (isMobile || isTablet) {
            return 'mobile';
        }
        return 'desktop';
    }
    
    /**
     * Inicialização automática inteligente
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ HybridCacheManager já inicializado');
            return true;
        }
        
        const config = this.config[this.platform];
        console.log(`🔧 Inicializando cache para ${this.platform}...`);
        
        try {
            if (this.platform === 'desktop') {
                await this.initializeDesktopCache(config);
            } else {
                await this.initializeMobileCache(config);
            }
            
            this.isInitialized = true;
            console.log(`✅ HybridCacheManager pronto (método: ${this.stats.method})`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar cache:', error);
            return false;
        }
    }
    
    /**
     * Inicializa cache para DESKTOP (prioriza OPFS)
     */
    async initializeDesktopCache(config) {
        // 1. Tentar OPFS (Origin Private File System) - AUTOMÁTICO, SEM PERMISSÃO!
        if (config.preferredMethod === 'opfs' && 'storage' in navigator && 'getDirectory' in navigator.storage) {
            console.log('📁 Inicializando OPFS (automático, sem permissão)...');
            
            try {
                // Obter diretório raiz do OPFS (criado automaticamente)
                this.opfsRoot = await navigator.storage.getDirectory();
                
                // Criar subdiretório para soundfonts (automático)
                this.opfsDir = await this.opfsRoot.getDirectoryHandle('terra_soundfonts', { create: true });
                
                this.stats.method = 'opfs';
                console.log('✅ OPFS ativo (pasta privada automática)');
                
                // Solicitar persistent storage para evitar limpeza
                if (navigator.storage && navigator.storage.persist) {
                    const isPersistent = await navigator.storage.persist();
                    if (isPersistent) {
                        console.log('🔒 Persistent Storage ativo');
                    }
                }
                
                return;
            } catch (error) {
                console.warn('⚠️ OPFS não disponível:', error.message);
            }
        }
        
        // 2. Fallback para IndexedDB (desktop também suporta)
        if (config.fallbackToIndexedDB) {
            console.log('📦 Fallback para IndexedDB...');
            await this.initializeIndexedDB();
            this.stats.method = 'indexeddb-desktop';
        }
    }
    
    /**
     * Inicializa cache para MOBILE/TABLET
     */
    async initializeMobileCache(config) {
        // 1. Tentar OPFS (automático também em mobile!)
        if (config.preferredMethod === 'opfs' && 'storage' in navigator && 'getDirectory' in navigator.storage) {
            console.log('📁 Inicializando OPFS mobile (automático)...');
            
            try {
                this.opfsRoot = await navigator.storage.getDirectory();
                this.opfsDir = await this.opfsRoot.getDirectoryHandle('terra_soundfonts', { create: true });
                
                this.stats.method = 'opfs-mobile';
                console.log('✅ OPFS mobile ativo');
                
                // Solicitar persistent storage
                if (navigator.storage && navigator.storage.persist) {
                    const isPersistent = await navigator.storage.persist();
                    if (isPersistent) {
                        console.log('🔒 Persistent Storage ativo');
                    }
                }
                
                return;
            } catch (error) {
                console.warn('⚠️ OPFS mobile não disponível:', error.message);
            }
        }
        
        // 2. Solicitar Persistent Storage (evita limpeza automática)
        if (config.persistentStorage && navigator.storage && navigator.storage.persist) {
            const isPersistent = await navigator.storage.persist();
            if (isPersistent) {
                console.log('✅ Persistent Storage concedido (dados protegidos)');
            } else {
                console.warn('⚠️ Persistent Storage negado (dados podem ser limpos pelo navegador)');
            }
        }
        
        // 2. Verificar quota disponível
        if (config.useQuotaAPI && navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const available = estimate.quota - estimate.usage;
            console.log(`💾 Espaço disponível: ${this.formatBytes(available)} / ${this.formatBytes(estimate.quota)}`);
            
            if (available < 100 * 1024 * 1024) { // Menos de 100MB
                console.warn('⚠️ Espaço limitado no dispositivo');
            }
        }
        
        // 3. Inicializar IndexedDB expandido
        await this.initializeIndexedDB();
        
        // 4. Usar Cache Storage como camada adicional
        if ('caches' in window) {
            this.cacheStorage = caches;
            console.log('✅ Cache Storage disponível');
        }
        
        this.stats.method = 'indexeddb-mobile';
    }
    
    /**
     * Verifica se há permissão salva do File System
     */
    async checkSavedPermission() {
        try {
            // Tentar recuperar handle salvo do localStorage
            const savedHandle = localStorage.getItem('terra_fs_handle');
            if (!savedHandle) return false;
            
            // Verificar se ainda tem permissão
            const handle = JSON.parse(savedHandle);
            if (handle && handle.kind === 'directory') {
                return true;
            }
        } catch (error) {
            return false;
        }
        return false;
    }
    
    /**
     * Solicita permissão do File System com UI amigável
     */
    async requestFileSystemPermission() {
        try {
            // Mostrar mensagem não-intrusiva
            if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                SystemLogger.log('info', '📁 Selecione uma pasta para armazenar soundfonts (recomendado: Documentos)');
            }
            
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents',
                id: 'terra-midi-soundfonts' // ID persistente
            });
            
            // Salvar referência (não persiste entre sessões, mas ajuda)
            localStorage.setItem('terra_fs_handle', JSON.stringify({
                kind: 'directory',
                name: dirHandle.name
            }));
            
            // Inicializar FileSystemCacheManager com o handle
            if (!this.fileSystemCache) {
                this.fileSystemCache = new FileSystemCacheManager();
            }
            this.fileSystemCache.directoryHandle = dirHandle;
            
            if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                SystemLogger.log('success', `✅ Pasta selecionada: ${dirHandle.name}`);
            }
            
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('ℹ️ Usuário cancelou seleção de pasta');
                
                if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                    SystemLogger.log('info', 'Usando cache do navegador (menor capacidade)');
                }
            } else {
                console.error('❌ Erro ao solicitar permissão:', error);
            }
            return false;
        }
    }
    
    /**
     * Inicializa IndexedDB
     */
    async initializeIndexedDB() {
        if (!this.indexedDBCache) {
            this.indexedDBCache = new LocalCacheManager();
        }
        await this.indexedDBCache.initialize();
        console.log('✅ IndexedDB inicializado');
    }
    
    /**
     * Salva soundfont (roteamento inteligente com OPFS)
     * ✅ PROTEÇÃO CONTRA SALVAMENTOS DUPLICADOS
     */
    async save(filename, content, metadata = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // 🔒 PROTEÇÃO: Prevenir salvamentos duplicados simultâneos
        if (!this.savingFiles) {
            this.savingFiles = new Map();
        }
        
        const saveKey = `save:${filename}`;
        if (this.savingFiles.has(saveKey)) {
            console.log(`🔒 Salvamento já em andamento: ${filename}`);
            return await this.savingFiles.get(saveKey);
        }
        
        // Criar promessa de salvamento
        const savePromise = (async () => {
            try {
                let success = false;
                
                // ✅ VERIFICAÇÃO PRÉVIA: Arquivo já existe?
                const alreadyExists = await this.exists(filename);
                if (alreadyExists) {
                    console.log(`✅ Arquivo já existe em cache: ${filename}`);
                    return true;
                }
                
                // OPFS (automático, sem permissão - Desktop e Mobile!)
                if ((this.stats.method === 'opfs' || this.stats.method === 'opfs-mobile') && this.opfsDir) {
                    try {
                        // ✅ VERIFICAÇÃO DUPLA: Garantir que não foi criado por outra thread
                        try {
                            const existingHandle = await this.opfsDir.getFileHandle(filename, { create: false });
                            if (existingHandle) {
                                console.log(`✅ Arquivo já existe no OPFS: ${filename}`);
                                return true;
                            }
                        } catch (notFoundError) {
                            // Arquivo não existe, pode criar
                        }
                        
                        // Criar/obter arquivo no OPFS
                        const fileHandle = await this.opfsDir.getFileHandle(filename, { create: true });
                        
                        // Criar writable stream
                        const writable = await fileHandle.createWritable();
                        
                        // Escrever conteúdo
                        await writable.write(content);
                        await writable.close();
                        
                        this.stats.totalSaved++;
                        this.stats.bytesStored += new Blob([content]).size;
                        
                        console.log(`💾 Salvo em OPFS: ${filename}`);
                        return true;
                    } catch (opfsError) {
                        console.warn('⚠️ Erro no OPFS:', opfsError);
                    }
                }
                
                // Fallback: IndexedDB (desktop fallback ou mobile)
                if (this.indexedDBCache) {
                    const key = `soundfont:${filename}`;
                    
                    // ✅ VERIFICAÇÃO DUPLA: Checar se já existe no IndexedDB
                    const existingData = await this.indexedDBCache.getFromCache(key);
                    if (existingData) {
                        console.log(`✅ Arquivo já existe no IndexedDB: ${filename}`);
                        return true;
                    }
                    
                    const data = {
                        content: content,
                        metadata: metadata,
                        timestamp: Date.now()
                    };
                    success = await this.indexedDBCache.saveToCache(key, data, metadata.name || filename);
                    if (success) {
                        this.stats.totalSaved++;
                        this.stats.bytesStored += new Blob([content]).size;
                        console.log(`💾 Salvo em IndexedDB: ${filename}`);
                    }
                }
                
                // Cache Storage adicional (mobile) - SEM DUPLICAR
                if (this.platform === 'mobile' && this.cacheStorage) {
                    const cache = await this.cacheStorage.open('terra-soundfonts-hybrid');
                    
                    // Verificar se já existe
                    const existing = await cache.match(`/soundfonts/${filename}`);
                    if (!existing) {
                        const response = new Response(content, {
                            headers: { 'Content-Type': 'application/javascript' }
                        });
                        await cache.put(`/soundfonts/${filename}`, response);
                    }
                }
                
                return success;
            } catch (error) {
                console.error(`❌ Erro ao salvar ${filename}:`, error);
                return false;
            } finally {
                // 🔓 Remover da lista de salvamentos em andamento
                this.savingFiles.delete(saveKey);
            }
        })();
        
        // Adicionar à lista de salvamentos em andamento
        this.savingFiles.set(saveKey, savePromise);
        
        return await savePromise;
    }
    
    /**
     * Carrega soundfont (roteamento inteligente com OPFS)
     */
    async load(filename) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            // OPFS (automático - Desktop e Mobile!)
            if ((this.stats.method === 'opfs' || this.stats.method === 'opfs-mobile') && this.opfsDir) {
                try {
                    // Tentar obter arquivo do OPFS
                    const fileHandle = await this.opfsDir.getFileHandle(filename, { create: false });
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    
                    if (content) {
                        this.stats.totalLoaded++;
                        this.stats.cacheHits++;
                        console.log(`✅ OPFS hit: ${filename}`);
                        return content;
                    }
                } catch (opfsError) {
                    // Arquivo não existe no OPFS, continuar para fallback
                    if (opfsError.name !== 'NotFoundError') {
                        console.warn('⚠️ Erro ao ler OPFS:', opfsError);
                    }
                }
            }
            
            // Fallback: IndexedDB
            if (this.indexedDBCache) {
                const key = `soundfont:${filename}`;
                const data = await this.indexedDBCache.getFromCache(key);
                if (data && data.content) {
                    this.stats.totalLoaded++;
                    this.stats.cacheHits++;
                    console.log(`✅ IndexedDB hit: ${filename}`);
                    return data.content;
                }
            }
            
            // Cache Storage (mobile)
            if (this.platform === 'mobile' && this.cacheStorage) {
                const cache = await this.cacheStorage.open('terra-soundfonts-hybrid');
                const response = await cache.match(`/soundfonts/${filename}`);
                if (response) {
                    const content = await response.text();
                    this.stats.totalLoaded++;
                    this.stats.cacheHits++;
                    return content;
                }
            }
            
            this.stats.cacheMisses++;
            return null;
        } catch (error) {
            console.error(`❌ Erro ao carregar ${filename}:`, error);
            this.stats.cacheMisses++;
            return null;
        }
    }
    
    /**
     * Verifica se arquivo existe no cache (com OPFS)
     */
    async exists(filename) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Verificar OPFS primeiro
        if ((this.stats.method === 'opfs' || this.stats.method === 'opfs-mobile') && this.opfsDir) {
            try {
                await this.opfsDir.getFileHandle(filename, { create: false });
                return true;
            } catch (error) {
                // Não existe, continuar
            }
        }
        
        // Verificar IndexedDB
        if (this.indexedDBCache) {
            const key = `soundfont:${filename}`;
            const data = await this.indexedDBCache.getFromCache(key);
            if (data) return true;
        }
        
        return false;
    }
    
    /**
     * Lista todos os arquivos salvos no OPFS
     */
    async listOPFSFiles() {
        if (!this.opfsDir) return [];
        
        const files = [];
        try {
            for await (const entry of this.opfsDir.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    files.push({
                        name: entry.name,
                        size: file.size,
                        lastModified: file.lastModified
                    });
                }
            }
        } catch (error) {
            console.error('❌ Erro ao listar arquivos OPFS:', error);
        }
        
        return files;
    }
    
    /**
     * Limpa arquivos antigos do OPFS
     */
    async clearOPFSCache() {
        if (!this.opfsDir) return false;
        
        try {
            for await (const entry of this.opfsDir.values()) {
                if (entry.kind === 'file') {
                    await this.opfsDir.removeEntry(entry.name);
                }
            }
            console.log('🗑️ Cache OPFS limpo');
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar OPFS:', error);
            return false;
        }
    }
    
    /**
     * @deprecated - Método antigo, mantido para compatibilidade
     */
    async exists_old(filename) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (this.stats.method === 'filesystem' && this.fileSystemCache) {
            return await this.fileSystemCache.fileExists(filename);
        }
        
        if (this.indexedDBCache) {
            const key = `soundfont:${filename}`;
            const data = await this.indexedDBCache.getFromCache(key);
            return data !== null;
        }
        
        return false;
    }
    
    /**
     * Obtém estatísticas completas (com OPFS)
     */
    async getStats() {
        const stats = { ...this.stats };
        
        // Estatísticas do OPFS
        if ((this.stats.method === 'opfs' || this.stats.method === 'opfs-mobile') && this.opfsDir) {
            const files = await this.listOPFSFiles();
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            
            stats.opfs = {
                filesCount: files.length,
                totalSize: totalSize,
                files: files.map(f => ({
                    filename: f.name,
                    size: f.size,
                    timestamp: f.lastModified
                }))
            };
            
            stats.filesCount = files.length;
            stats.totalSize = totalSize;
            stats.files = stats.opfs.files;
        }
        
        // Estatísticas do IndexedDB (fallback)
        if (this.indexedDBCache) {
            const idbStats = await this.indexedDBCache.getStats();
            stats.indexeddb = idbStats;
            
            // Se OPFS não estiver ativo, usar dados do IndexedDB
            if (!stats.filesCount) {
                stats.filesCount = idbStats.count || 0;
                stats.totalSize = idbStats.size || 0;
            }
        }
        
        // Quota API (disponível em todos os navegadores modernos)
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            stats.quota = {
                usage: estimate.usage,
                quota: estimate.quota,
                available: estimate.quota - estimate.usage,
                percentage: Math.round((estimate.usage / estimate.quota) * 100)
            };
        }
        
        return stats;
    }
    
    /**
     * Limpa caches antigos (mantém os recentes)
     */
    async cleanup(keepRecent = 10) {
        console.log(`🧹 Limpando caches antigos (mantendo ${keepRecent} mais recentes)...`);
        
        if (this.indexedDBCache) {
            // IndexedDB tem cleanup próprio baseado em timestamp
            const stats = await this.indexedDBCache.getStats();
            if (stats.count > keepRecent * 2) {
                const toFree = (stats.count - keepRecent) * 1024 * 1024; // Estimar 1MB por preset
                await this.indexedDBCache.cleanOldestEntries(toFree);
            }
        }
    }
    
    /**
     * Exporta informações do sistema (com OPFS)
     */
    async getSystemInfo() {
        const stats = await this.getStats();
        
        return {
            platform: this.platform,
            method: this.stats.method,
            initialized: this.isInitialized,
            capabilities: {
                opfs: navigator.storage && 'getDirectory' in navigator.storage,
                filesystem: 'showDirectoryPicker' in window,
                indexeddb: 'indexedDB' in window,
                cacheStorage: 'caches' in window,
                persistentStorage: navigator.storage && navigator.storage.persist,
                quotaAPI: navigator.storage && navigator.storage.estimate
            },
            stats: stats,
            config: this.config[this.platform]
        };
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
    window.HybridCacheManager = HybridCacheManager;
}
