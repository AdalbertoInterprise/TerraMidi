// 🎵 Terra MIDI - Service Worker Inteligente v1.0.0.0.0.3
// Sistema de cache auto-gerenciável com proteção USB/MIDI + Atualização Automática
// 🔧 CORREÇÃO: Liberação adequada de recursos USB para prevenir bloqueio de reconexão
// 🔄 NOVO: Detecção automática de atualizações com força de reload
// 🎹 ATUALIZAÇÃO: Suporte completo ao protocolo MIDI 1.0 (Control Changes, Aftertouch)

const VERSION = '1.0.0.0.0.4';
const CACHE_PREFIXES = {
    RESOURCES: 'terra-midi-v',
    SOUNDFONTS: 'terra-soundfonts-v',
    CRITICAL: 'terra-critical-v'
};

const CACHE_NAME = `${CACHE_PREFIXES.RESOURCES}${VERSION}`;
const SOUNDFONT_CACHE = `${CACHE_PREFIXES.SOUNDFONTS}${VERSION}`;
const CRITICAL_CACHE = `${CACHE_PREFIXES.CRITICAL}${VERSION}`;

self.__TERRA_APP_VERSION__ = VERSION;

// 🌐 Detectar se está em GitHub Pages (subdiretório)
const isGitHubPages = self.location.pathname.includes('/TerraMidi');
const BASE_PATH = isGitHubPages ? '/TerraMidi' : '';

console.log(`🌐 Service Worker detectado em: ${self.location.pathname}`);
console.log(`   └─ GitHub Pages: ${isGitHubPages}`);
console.log(`   └─ Base path: ${BASE_PATH || '/'}`);

function extractVersionFromCacheName(cacheName, prefix) {
    if (!cacheName.startsWith(prefix)) {
        return null;
    }
    return cacheName.substring(prefix.length) || null;
}

async function migrateCacheEntries(sourceCacheName, targetCacheName) {
    if (!sourceCacheName || !targetCacheName || sourceCacheName === targetCacheName) {
        return { migrated: 0, bytes: 0 };
    }

    const sourceCache = await self.caches.open(sourceCacheName);
    const targetCache = await self.caches.open(targetCacheName);
    const requests = await sourceCache.keys();

    let migrated = 0;
    let migratedBytes = 0;

    for (const request of requests) {
        const existing = await targetCache.match(request);
        if (existing) {
            continue;
        }

        const response = await sourceCache.match(request);
        if (!response) {
            continue;
        }

        await targetCache.put(request, response.clone());

        try {
            const blob = await response.clone().blob();
            migratedBytes += blob.size || 0;
        } catch (error) {
            // Ignorar falhas de cálculo de tamanho
        }

        migrated += 1;
    }

    return { migrated, bytes: migratedBytes };
}

function respondToMessage(event, payload) {
    if (!event) {
        return;
    }

    if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(payload);
        return;
    }

    if (event.source && typeof event.source.postMessage === 'function') {
        event.source.postMessage(payload);
    }
}

// 📊 Limites de Cache (otimizados para não interferir com USB)
const CACHE_LIMITS = {
    CRITICAL: 30 * 1024 * 1024,      // 30MB - Arquivos essenciais (reduzido)
    SOUNDFONTS: 300 * 1024 * 1024,   // 300MB - Soundfonts (reduzido para liberar memória)
    MAX_TOTAL: 350 * 1024 * 1024,    // 350MB - Limite total (reduzido)
    MAX_SOUNDFONTS: 100,              // Máximo de soundfonts (reduzido)
    MIN_FREE_SPACE: 50 * 1024 * 1024 // 50MB - Espaço mínimo livre
};

// 🔐 Arquivos Críticos (NUNCA deletados)
// ℹ️ Obs: Caminhos sem BASE_PATH pois são ajustados em tempo de execução
const CRITICAL_ASSETS = [
    '/index.html',  // ✅ Sem / duplicado (é reescrito automaticamente)
    '/manifest.json',
    '/styles.css',
    '/css/virtual-keyboard.css',
    '/css/midi-ui.css',
    '/css/pwa-installer.css',
    '/js/app.js',
    '/js/audioEngine.js',
    '/js/soundfontManager.js',
    '/js/instrumentLoader.js',
    '/js/catalogManager.js',
    '/js/WebAudioFontPlayer.js',
    '/js/localCacheManager.js',
    '/js/fileSystemCacheManager.js',
    '/js/pwaInstaller.js',
    '/js/serviceWorkerBridge.js',
    '/js/midi/midiDeviceManager.js',
    '/js/midi/devices/boardBellsDevice.js',
    '/js/midi/devices/midiTerraDevice.js',
    '/js/ui/virtual-keyboard.js',
    '/js/ui/instrumentSelector.js',
    '/soundfonts-manifest.json'
];

// 🎹 Soundfonts Essenciais (Piano padrão)
const ESSENTIAL_SOUNDFONTS = [
    '/soundfonts/0000_FluidR3_GM_sf2_file.js', // Piano Acústico
    '/soundfonts/0010_FluidR3_GM_sf2_file.js'  // Piano Elétrico
];

// 📝 Dados do Usuário (IndexedDB - NUNCA deletar)
const USER_DATA_STORES = [
    'TerraGameSoundfonts',           // Cache de instrumentos
    'terra-midi-favorites',           // Favoritos
    'terra-midi-assignments',         // Configurações de teclas
    'terra-midi-user-preferences'     // Preferências
];

// 🧹 Gerenciador de Cache Inteligente
class SmartCacheManager {
    constructor() {
        this.stats = {
            totalSize: 0,
            soundfontCount: 0,
            criticalSize: 0,
            lastCleanup: Date.now()
        };
    }

    /**
     * Verifica se um path é um asset crítico
     * Lida com BASE_PATH automaticamente
     */
    isCriticalAsset(pathname) {
        return CRITICAL_ASSETS.some(asset => {
            const normalizedPath = pathname.replace(BASE_PATH, '');
            if (asset === '/') {
                return normalizedPath === '/' || normalizedPath === '/index.html';
            }
            return normalizedPath === asset || normalizedPath.endsWith(asset);
        });
    }

    /**
     * Calcula tamanho total do cache
     */
    async calculateCacheSize() {
        let totalSize = 0;
        let soundfontCount = 0;
        let criticalSize = 0;

        const caches = await self.caches.keys();
        for (const cacheName of caches) {
            const cache = await self.caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    const size = blob.size;
                    totalSize += size;

                    if (cacheName === SOUNDFONT_CACHE) {
                        soundfontCount++;
                    } else if (cacheName === CRITICAL_CACHE) {
                        criticalSize += size;
                    }
                }
            }
        }

        this.stats = {
            totalSize,
            soundfontCount,
            criticalSize,
            lastCleanup: this.stats.lastCleanup
        };

        console.log('📊 Cache Stats:', {
            total: this.formatBytes(totalSize),
            soundfonts: soundfontCount,
            critical: this.formatBytes(criticalSize)
        });

        return this.stats;
    }

    /**
     * Verifica se precisa limpar cache
     */
    needsCleanup() {
        return (
            this.stats.totalSize > CACHE_LIMITS.MAX_TOTAL * 0.85 || // 85% do limite
            this.stats.soundfontCount > CACHE_LIMITS.MAX_SOUNDFONTS * 0.9 // 90% do limite
        );
    }

    /**
     * Limpa soundfonts menos usados (LRU - Least Recently Used)
     */
    async cleanupSoundfonts(requiredSpace = 0) {
        console.log('🧹 Iniciando limpeza de soundfonts...');
        
        const cache = await self.caches.open(SOUNDFONT_CACHE);
        const requests = await cache.keys();
        
        // Construir lista com metadados
        const items = [];
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                const headers = response.headers;
                
                // Verificar se está protegido (favorito)
                const isProtected = headers.get('x-protected') === 'true';
                
                items.push({
                    request,
                    url: request.url,
                    size: blob.size,
                    lastAccessed: parseInt(headers.get('x-last-accessed')) || 0,
                    accessCount: parseInt(headers.get('x-access-count')) || 0,
                    timestamp: parseInt(headers.get('x-cached-at')) || Date.now(),
                    protected: isProtected
                });
            }
        }

        // Ordenar por uso (menos acessados primeiro)
        // Favoritos sempre no final (nunca removidos)
        items.sort((a, b) => {
            if (a.protected && !b.protected) return 1;
            if (!a.protected && b.protected) return -1;
            
            const scoreA = a.accessCount + (Date.now() - a.lastAccessed) / 86400000;
            const scoreB = b.accessCount + (Date.now() - b.lastAccessed) / 86400000;
            return scoreA - scoreB;
        });

        // Remover até liberar espaço
        let freedSpace = 0;
        let removed = 0;
        const targetSpace = requiredSpace || CACHE_LIMITS.MIN_FREE_SPACE;

        for (const item of items) {
            if (freedSpace >= targetSpace && this.stats.totalSize - freedSpace < CACHE_LIMITS.MAX_TOTAL * 0.7) {
                break; // Liberar até 70% do limite
            }

            // NUNCA remover protegidos (favoritos) ou essenciais
            if (item.protected || ESSENTIAL_SOUNDFONTS.some(sf => {
                const normalizedUrl = item.url.replace(BASE_PATH, '');
                const normalizedSf = sf;
                return normalizedUrl.includes(normalizedSf);
            })) {
                console.log(`⭐ Protegido: ${item.url.split('/').pop()}`);
                continue;
            }

            await cache.delete(item.request);
            freedSpace += item.size;
            removed++;
            console.log(`🗑️ Removido: ${item.url.split('/').pop()} (${this.formatBytes(item.size)}, acessos: ${item.accessCount})`);
        }

        console.log(`✅ Limpeza concluída: ${removed} soundfonts removidos, ${this.formatBytes(freedSpace)} liberados`);
        
        await this.calculateCacheSize();
        return freedSpace;
    }

    /**
     * Adiciona/atualiza item no cache com metadados
     */
    async addWithMetadata(cacheName, request, response) {
        const cache = await self.caches.open(cacheName);
        
        // ✅ Clonar antes de usar o body
        const responseClone = response.clone();
        
        // Criar response com headers de metadados
        const headers = new Headers(responseClone.headers);
        headers.set('x-cached-at', Date.now().toString());
        headers.set('x-last-accessed', Date.now().toString());
        headers.set('x-access-count', '1');
        
        const modifiedResponse = new Response(responseClone.body, {
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: headers
        });

        await cache.put(request, modifiedResponse);
    }

    /**
     * Atualiza metadados de acesso
     */
    async updateAccessMetadata(cacheName, request, response) {
        const cache = await self.caches.open(cacheName);
        
        // ✅ Clonar antes de usar o body
        const responseClone = response.clone();
        
        const headers = new Headers(responseClone.headers);
        
        const currentCount = parseInt(headers.get('x-access-count')) || 0;
        headers.set('x-access-count', (currentCount + 1).toString());
        headers.set('x-last-accessed', Date.now().toString());
        
        const modifiedResponse = new Response(responseClone.body, {
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: headers
        });

        await cache.put(request, modifiedResponse);
    }

    /**
     * Formata bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

const cacheManager = new SmartCacheManager();

// 📥 INSTALL - Pré-cache de arquivos críticos
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker v4.0 - Instalando...');
    
    event.waitUntil(
        (async () => {
            try {
                // Verificar quota disponível
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    const percentUsed = (estimate.usage / estimate.quota) * 100;
                    console.log(`💾 Storage: ${cacheManager.formatBytes(estimate.usage)} / ${cacheManager.formatBytes(estimate.quota)} (${percentUsed.toFixed(1)}%)`);
                    
                    if (percentUsed > 95) {
                        console.warn('⚠️ Storage quase cheio! Executando limpeza...');
                        await cacheManager.cleanupSoundfonts(CACHE_LIMITS.MIN_FREE_SPACE);
                    }
                }

                // Cache CRÍTICO (arquivos da aplicação)
                const criticalCache = await self.caches.open(CRITICAL_CACHE);
                console.log('🔐 Cacheando arquivos críticos...');
                
                // Adicionar assets com BASE_PATH ajustado
                const assetsWithBasePath = CRITICAL_ASSETS.map(asset => BASE_PATH + asset);
                
                await criticalCache.addAll(assetsWithBasePath);
                
                // Cache ESSENCIAL (soundfonts padrão)
                console.log('🎹 Cacheando soundfonts essenciais...');
                for (const sf of ESSENTIAL_SOUNDFONTS) {
                    try {
                        const sfWithBasePath = BASE_PATH + sf;
                        const response = await fetch(sfWithBasePath);
                        await cacheManager.addWithMetadata(SOUNDFONT_CACHE, sfWithBasePath, response);
                    } catch (error) {
                        console.warn(`⚠️ Falha ao cachear soundfont:`, error);
                    }
                }

                console.log('✅ Service Worker v1.0.0.0.0 instalado com sucesso!');
                await self.skipWaiting();
            } catch (error) {
                console.error('❌ Erro na instalação do Service Worker:', error);
            }
        })()
    );
});

// 🔄 ACTIVATE - Limpeza de caches antigos + LIBERAÇÃO DE RECURSOS USB
self.addEventListener('activate', (event) => {
    console.log(`🔄 Service Worker v${VERSION} - Ativando com detecção de atualização...`);
    
    event.waitUntil(
        (async () => {
            try {
                // 🔥 CRÍTICO: Liberar clientes antigos PRIMEIRO para evitar bloqueio USB
                console.log('🧹 Liberando clientes antigos...');
                const clients = await self.clients.matchAll({ type: 'window' });
                console.log(`   ├─ Clientes conectados: ${clients.length}`);

                const cacheNames = await self.caches.keys();
                const previousResourceCache = cacheNames.find((name) =>
                    name.startsWith(CACHE_PREFIXES.RESOURCES) && name !== CACHE_NAME
                );
                const previousVersion = previousResourceCache
                    ? extractVersionFromCacheName(previousResourceCache, CACHE_PREFIXES.RESOURCES)
                    : null;
                const isUpdateFromOldVersion = Boolean(previousVersion && previousVersion !== VERSION);

                for (const client of clients) {
                    try {
                        const payload = {
                            version: VERSION,
                            previousVersion: previousVersion || null,
                            timestamp: Date.now()
                        };

                        if (isUpdateFromOldVersion) {
                            console.log(`   ├─ Notificando cliente sobre atualização: ${previousVersion || 'desconhecida'} → ${VERSION}`);
                            client.postMessage({
                                ...payload,
                                type: 'SW_UPDATED',
                                action: 'FORCE_RELOAD',
                                reason: `Atualização detectada (cache ${previousVersion || 'legacy'} → ${VERSION})`
                            });
                        } else {
                            console.log('   ├─ Enviando mensagem RELEASE_USB_RESOURCES...');
                            client.postMessage({
                                ...payload,
                                type: 'SW_ACTIVATED',
                                action: 'RELEASE_USB_RESOURCES',
                                reason: 'Service Worker ativado - permitir reconexão MIDI'
                            });
                        }

                        // Broadcast de versão para sincronização global
                        client.postMessage({
                            ...payload,
                            type: 'SW_VERSION_SYNC',
                            action: 'SYNC_VERSION',
                            reason: 'Sincronização de versão com o cliente ativo'
                        });

                        console.log('   ✅ Mensagens enviadas com sucesso');
                    } catch (error) {
                        console.warn('⚠️ Não foi possível notificar cliente:', error);
                    }
                }

                console.log('   └─ Aguardando 200ms para processamento dos clientes...');
                await new Promise(resolve => setTimeout(resolve, 200));

                if (isUpdateFromOldVersion) {
                    console.log('�️ Atualização detectada! Migrando caches existentes...');

                    const migrationResults = [];

                    for (const cacheName of cacheNames) {
                        if (cacheName.startsWith(CACHE_PREFIXES.SOUNDFONTS) && cacheName !== SOUNDFONT_CACHE) {
                            console.log(`   🔁 Migrando soundfonts de ${cacheName} para ${SOUNDFONT_CACHE}`);
                            const result = await migrateCacheEntries(cacheName, SOUNDFONT_CACHE);
                            migrationResults.push({ cacheName, ...result });
                            await self.caches.delete(cacheName);
                        }
                    }

                    migrationResults.forEach(({ cacheName, migrated, bytes }) => {
                        console.log(`   ✅ ${cacheName}: ${migrated} soundfont(s) migrados (${cacheManager.formatBytes(bytes)})`);
                    });
                }

                const validCaches = new Set([CACHE_NAME, SOUNDFONT_CACHE, CRITICAL_CACHE]);

                for (const cacheName of cacheNames) {
                    if (validCaches.has(cacheName)) {
                        continue;
                    }

                    if (cacheName.startsWith(CACHE_PREFIXES.SOUNDFONTS)) {
                        // Já migrado acima (ou vazio) – garantir remoção para evitar lixo
                        console.log(`   🗑️ Removendo cache de soundfonts obsoleto: ${cacheName}`);
                        await self.caches.delete(cacheName);
                        continue;
                    }

                    if (cacheName.startsWith(CACHE_PREFIXES.RESOURCES) || cacheName.startsWith(CACHE_PREFIXES.CRITICAL)) {
                        console.log(`   🗑️ Removendo cache obsoleto: ${cacheName}`);
                        await self.caches.delete(cacheName);
                    }
                }

                // Calcular estado inicial do cache
                console.log('📊 Calculando estado do cache...');
                await cacheManager.calculateCacheSize();

                // Verificar se precisa limpeza
                if (cacheManager.needsCleanup()) {
                    console.log('🧹 Cache acima do limite, executando limpeza...');
                    await cacheManager.cleanupSoundfonts();
                }

                console.log(`✅ Service Worker v${VERSION} ativado!`);
                await self.clients.claim();
            } catch (error) {
                console.error('❌ Erro na ativação do Service Worker:', error);
            }
        })()
    );
});

// 🌐 FETCH - Estratégia inteligente por tipo de recurso
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Ignorar requisições não-GET ou de outros domínios
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            try {
                // 🔐 CRÍTICOS: Cache-First (sempre offline)
                if (cacheManager.isCriticalAsset(url.pathname)) {
                    const criticalCache = await self.caches.open(CRITICAL_CACHE);
                    let response = await criticalCache.match(event.request);
                    
                    if (!response) {
                        console.log('🔐 Cacheando arquivo crítico:', url.pathname);
                        response = await fetch(event.request);
                        await criticalCache.put(event.request, response.clone());
                    }
                    
                    return response;
                }

                // 🎹 SOUNDFONTS: Cache-First com gerenciamento inteligente
                // ✅ PROTEÇÃO CONTRA DOWNLOADS DUPLICADOS
                if (url.pathname.includes('/soundfonts/') && url.pathname.endsWith('.js')) {
                    const soundfontCache = await self.caches.open(SOUNDFONT_CACHE);
                    const requestKey = event.request.url;
                    
                    // 🔒 VERIFICAÇÃO DUPLA: Garantir que arquivo não está sendo baixado simultaneamente
                    let response = await soundfontCache.match(event.request);
                    
                    if (response) {
                        // Atualizar metadados de acesso (async, não bloqueia resposta)
                        cacheManager.updateAccessMetadata(SOUNDFONT_CACHE, event.request, response.clone())
                            .catch(err => console.warn('⚠️ Erro ao atualizar metadados:', err));
                        console.log('🎵 Soundfont do cache:', url.pathname.split('/').pop());
                        return response;
                    }

                    // 🔒 VERIFICAR SE JÁ ESTÁ SENDO BAIXADO (prevenir duplicatas)
                    if (!self.downloadingFiles) {
                        self.downloadingFiles = new Map();
                    }
                    
                    if (self.downloadingFiles.has(requestKey)) {
                        console.log('🔒 Download já em andamento:', url.pathname.split('/').pop());
                        return await self.downloadingFiles.get(requestKey);
                    }

                    // Não está no cache, buscar da rede
                    console.log('🌐 Baixando soundfont:', url.pathname.split('/').pop());
                    
                    // Criar promessa de download
                    const downloadPromise = (async () => {
                        try {
                            // Verificar espaço antes de cachear (não bloqueia)
                            cacheManager.calculateCacheSize()
                                .then(() => {
                                    if (cacheManager.needsCleanup()) {
                                        console.log('🧹 Limpando cache antes de adicionar novo soundfont...');
                                        return cacheManager.cleanupSoundfonts();
                                    }
                                })
                                .catch(err => console.warn('⚠️ Erro na verificação de espaço:', err));

                            response = await fetch(event.request, {
                                cache: 'default', // ✅ Usar cache HTTP do navegador quando possível
                                priority: 'high'   // Priorizar soundfonts
                            });
                            
                            if (response && response.status === 200) {
                                // ✅ CRIAR CLONES IMEDIATAMENTE (antes de qualquer operação)
                                const responseToCache = response.clone();
                                const responseToReturn = response.clone();
                                const responseToPeek = response.clone();
                                
                                // Verificar tamanho do arquivo (async, não bloqueia retorno)
                                responseToPeek.blob().then(async (blob) => {
                                    // Se muito grande e cache cheio, limpar antes
                                    if (blob.size > 5 * 1024 * 1024 && cacheManager.stats.totalSize > CACHE_LIMITS.MAX_TOTAL * 0.8) {
                                        await cacheManager.cleanupSoundfonts(blob.size);
                                    }
                                    
                                    // ✅ VERIFICAÇÃO FINAL: Garantir que não foi adicionado por outra requisição
                                    const alreadyCached = await soundfontCache.match(event.request);
                                    if (!alreadyCached) {
                                        // Salvar no cache com metadados
                                        await cacheManager.addWithMetadata(SOUNDFONT_CACHE, event.request, responseToCache);
                                        console.log(`✅ Soundfont cacheado: ${url.pathname.split('/').pop()} (${cacheManager.formatBytes(blob.size)})`);
                                    } else {
                                        console.log(`✅ Soundfont já estava em cache: ${url.pathname.split('/').pop()}`);
                                    }
                                }).catch(err => console.warn('⚠️ Erro ao cachear soundfont:', err));
                                
                                // Retornar resposta imediatamente (não espera cache)
                                return responseToReturn;
                            }
                            
                            return response;
                        } catch (error) {
                            console.error('❌ Erro ao baixar soundfont:', error);
                            
                            // Tentar retornar piano padrão como fallback
                            const fallbackPath = '/soundfonts/0000_FluidR3_GM_sf2_file.js';
                            const fallbackResponse = await soundfontCache.match(fallbackPath);
                            
                            if (fallbackResponse) {
                                console.log('🎹 Usando piano padrão como fallback');
                                return fallbackResponse;
                            }
                            
                            throw error;
                        } finally {
                            // 🔓 Remover da lista de downloads em andamento
                            self.downloadingFiles.delete(requestKey);
                        }
                    })();
                    
                    // Adicionar à lista de downloads em andamento
                    self.downloadingFiles.set(requestKey, downloadPromise);
                    
                    return await downloadPromise;
                }

                // 📄 OUTROS RECURSOS: Network-First
                try {
                    const response = await fetch(event.request);
                    
                    if (response && response.status === 200) {
                        const cache = await self.caches.open(CACHE_NAME);
                        await cache.put(event.request, response.clone());
                    }
                    
                    return response;
                } catch (error) {
                    // Fallback para cache se rede falhar
                    const cachedResponse = await self.caches.match(event.request);
                    
                    if (cachedResponse) {
                        console.log('📦 Servindo do cache (offline):', url.pathname);
                        return cachedResponse;
                    }
                    
                    // Se navegação, retornar index.html
                    if (event.request.mode === 'navigate') {
                        const indexResponse = await self.caches.match('/index.html');
                        if (indexResponse) return indexResponse;
                    }
                    
                    throw error;
                }
            } catch (error) {
                console.error('❌ Erro no fetch:', error);
                throw error;
            }
        })()
    );
});

// 📊 MESSAGE - Comunicação com a aplicação
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'GET_VERSION':
            respondToMessage(event, {
                success: true,
                version: VERSION,
                cacheNames: {
                    resources: CACHE_NAME,
                    soundfonts: SOUNDFONT_CACHE,
                    critical: CRITICAL_CACHE
                }
            });
            break;

        case 'GET_CACHE_STATS':
            (async () => {
                const stats = await cacheManager.calculateCacheSize();
                
                // Verificar quota do navegador
                let quota = null;
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    quota = await navigator.storage.estimate();
                }

                respondToMessage(event, {
                    success: true,
                    stats,
                    quota
                });
            })();
            break;

        case 'CLEANUP_CACHE':
            (async () => {
                try {
                    const freedSpace = await cacheManager.cleanupSoundfonts(data?.requiredSpace);
                    respondToMessage(event, {
                        success: true,
                        freedSpace,
                        message: `${cacheManager.formatBytes(freedSpace)} liberados`
                    });
                } catch (error) {
                    respondToMessage(event, {
                        success: false,
                        error: error.message
                    });
                }
            })();
            break;

        case 'PROTECT_FAVORITE':
            // Marcar combinação favorita como protegida
            (async () => {
                try {
                    const { instrumentName } = data;
                    console.log('⭐ Protegendo favorito:', instrumentName);
                    
                    // Buscar soundfont no cache e adicionar flag de proteção
                    const soundfontCache = await self.caches.open(SOUNDFONT_CACHE);
                    const requests = await soundfontCache.keys();
                    
                    for (const request of requests) {
                        if (request.url.includes(instrumentName)) {
                            const response = await soundfontCache.match(request);
                            const headers = new Headers(response.headers);
                            headers.set('x-protected', 'true');
                            
                            const protectedResponse = new Response(response.body, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: headers
                            });
                            
                            await soundfontCache.put(request, protectedResponse);
                            console.log('✅ Favorito protegido:', instrumentName);
                            break;
                        }
                    }
                    
                    respondToMessage(event, { success: true });
                } catch (error) {
                    respondToMessage(event, { success: false, error: error.message });
                }
            })();
            break;

        case 'SKIP_WAITING':
            self.skipWaiting();
            respondToMessage(event, { success: true });
            break;
        
        case 'RELEASE_USB_RESOURCES':
            // Cliente solicitando liberação de recursos USB antes de reload
            console.log('🔓 Liberando recursos USB/MIDI para reconexão...');
            respondToMessage(event, { success: true, action: 'usb-released' });
            break;

        default:
            console.warn('⚠️ Mensagem não reconhecida:', type);
    }
});

console.log(`🎵 Terra MIDI Service Worker v${VERSION} carregado com cache inteligente, proteção USB e atualização automática!`);