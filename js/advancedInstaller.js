// 🚀 Advanced Installer - Instalação Offline Completa
// Versão: 1.1.0
// Data: 12/11/2025
// Objetivo: Baixar automaticamente todos os recursos essenciais e a pasta completa de soundfonts,
//           salvando em múltiplas camadas (Cache Storage, OPFS, File System Access, HybridCache)
//           assim que o usuário seleciona um diretório. Otimizado para GitHub Pages.

const ADVANCED_INSTALLER_VERSION = '1.1.0';
const ADVANCED_INSTALLER_META_KEY = 'terra-advanced-installer-meta';
const ADVANCED_INSTALLER_AUTO_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 6; // 6 horas
const RESOURCE_CACHE_NAME = `terra-resources-v${ADVANCED_INSTALLER_VERSION}`;
const SOUNDFONT_CACHE_NAME = `terra-soundfonts-v${ADVANCED_INSTALLER_VERSION}`;
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.json', '.css', '.html', '.htm', '.svg', '.txt', '.md', '.yml', '.yaml', '.toml']);
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp']);

function getExtension(path) {
    const match = /\.([\w\d]+)(?:\?.*)?$/.exec(path);
    return match ? `.${match[1].toLowerCase()}` : '';
}

function guessContentType(path) {
    const ext = getExtension(path);
    switch (ext) {
        case '.js':
        case '.mjs':
            return 'application/javascript';
        case '.json':
            return 'application/json';
        case '.css':
            return 'text/css';
        case '.html':
        case '.htm':
            return 'text/html';
        case '.svg':
            return 'image/svg+xml';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.ico':
            return 'image/x-icon';
        case '.webp':
            return 'image/webp';
        default:
            return 'text/plain';
    }
}

class AdvancedInstaller {
    constructor(options = {}) {
        this.version = ADVANCED_INSTALLER_VERSION;
        this.platform = this.detectPlatform();
        this.options = {
            resourceConcurrency: options.resourceConcurrency ?? 4,
            soundfontConcurrency: options.soundfontConcurrency ?? 6,
            retryLimit: options.retryLimit ?? 2,
            autoPersistDirectory: options.autoPersistDirectory ?? true,
            manifestPath: options.manifestPath ?? 'soundfonts-manifest.json',
            requireDirectorySelection: options.requireDirectorySelection ?? (this.platform === 'desktop')
        };

        this.basePath = this.detectBasePath(options.basePath);
        this.baseUrl = new URL(this.basePath, window.location.origin).toString();

        this.installationState = this.createInitialState();
        this.resourceConfig = this.createResourceConfig();
        this.resourceSet = new Set();

        this.metaKey = ADVANCED_INSTALLER_META_KEY;
        this.installationMeta = this.loadInstallationMeta();

        this.isRunning = false;
        this.soundfontManifest = null;

        this.hybridCache = null;
        this.opfsRoot = null;
        this.opfsResourcesRoot = null;
        this.opfsSoundfontsRoot = null;
        this.opfsDirCache = new Map();
        this.opfsSoundfontDirCache = new Map();

        this.userDirectoryRoot = null;
        this.userCacheResourcesRoot = null;
        this.userSoundfontsRoot = null;
        this.userDirCache = new Map();
        this.userSoundfontDirCache = new Map();

        console.log(`🚀 AdvancedInstaller v${this.version} inicializado`);
        console.log(`📱 Plataforma detectada: ${this.platform}`);
        console.log(`🌐 Base URL de instalação: ${this.baseUrl}`);
    }

    createInitialState() {
        return {
            started: false,
            completed: false,
            progress: 0,
            phase: 'idle',
            phaseDescription: 'Aguardando início',
            totalFiles: 0,
            downloadedFiles: 0,
            totalSize: 0,
            downloadedSize: 0,
            startTime: null,
            estimatedTime: null,
            errors: [],
            directoryName: null
        };
    }

    createResourceConfig() {
        const normalize = (item) => this.normalizeResourcePath(item);

        const critical = [
            'index.html',
            'manifest.json',
            'styles.css',
            'sw.js',
            'soundfonts-manifest.json',
            'js/app.js',
            'js/audioEngine.js',
            'js/soundfontManager.js',
            'js/instrumentLoader.js',
            'js/catalogManager.js',
            'js/WebAudioFontPlayer.js',
            'js/advancedInstaller.js',
            'js/advancedInstallerUI.js',
            'js/hybridCacheManager.js',
            'js/localCacheManager.js',
            'js/pwaInstaller.js',
            'js/serviceWorkerBridge.js'
        ].map(normalize);

        const styles = [
            'css/catalog-list.css',
            'css/catalog-navigation.css',
            'css/instrument-grid.css',
            'css/instrument-selector.css',
            'css/instruments-professional.css',
            'css/layout.css',
            'css/midi-ui.css',
            'css/pwa-installer.css',
            'css/theme.css',
            'css/virtual-keyboard.css',
            'css/advanced-installer.css',
            'css/0-settings/_variables.css',
            'css/1-base/_animations.css'
        ].map(normalize);

        const scripts = [
            'js/chordPlayer.js',
            'js/effectsManager.js',
            'js/fileSystemCacheManager.js',
            'js/hybridCacheManager.js',
            'js/localCacheManager.js',
            'js/secureAPIClient.js',
            'js/catalogNavigationManager.js',
            'js/midi/browserCompatibility.js',
            'js/midi/midiAutoReconnect.js',
            'js/midi/midiConnectionNotifier.js',
            'js/midi/midiDeviceManager.js',
            'js/midi/midiDiagnostics.js',
            'js/midi/midiOscilloscope.js',
            'js/midi/midiStatusPanel.js',
            'js/midi/midiTroubleshootingGuide.js',
            'js/synth/tibetanBowlSynth.js',
            'js/ui/catalogList.js',
            'js/ui/instrumentSelector.js',
            'js/ui/virtual-keyboard.js',
            'js/utils/dependencyLoader.js',
            'js/utils/initializationChecker.js',
            'js/utils/instrumentCategories.js',
            'js/utils/noteMappingUtils.js',
            'js/utils/sustainedNoteManager.js'
        ].map(normalize);

        const images = [
            'favicon.svg',
            'Logos/icon-16x16.png',
            'Logos/icon-32x32.png',
            'Logos/icon-192x192.png',
            'Logos/icon-512x512.png',
            'Logos/icon-maskable-192x192.png',
            'Logos/icon-maskable-512x512.png',
            'Imagens_Instrumentos/Big_KBD.png',
            'Imagens_Instrumentos/Board_Bealls.png',
            'Imagens_Instrumentos/Board_som.png',
            'Imagens_Instrumentos/Giro_som.png',
            'Imagens_Instrumentos/Logo_Terra_noBack.png',
            'Imagens_Instrumentos/Musical_beam.png',
            'Imagens_Instrumentos/sala-de-musicoterapia.jpeg'
        ].map(normalize);

        const all = Array.from(new Set([...critical, ...styles, ...scripts, ...images]));

        return {
            critical,
            styles,
            scripts,
            images,
            all
        };
    }

    resetState() {
        this.installationState = this.createInitialState();
        this.resourceSet.clear();
    }

    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
        if (isMobile || isTablet) return 'mobile';
        return 'desktop';
    }

    detectBasePath(customBase) {
        if (customBase) {
            return this.ensureSlashes(customBase);
        }

        const resolver = window.__terra;
        if (resolver && typeof resolver.getBasePath === 'function') {
            const base = resolver.getBasePath();
            if (!base || base === '/') {
                return '/';
            }
            return this.ensureSlashes(base);
        }

        const pathname = window.location.pathname;

        if (pathname.endsWith('.html')) {
            const parts = pathname.split('/');
            parts.pop();
            const joined = parts.join('/') || '/';
            return this.ensureSlashes(joined);
        }

        if (!pathname.endsWith('/')) {
            return `${pathname}/`;
        }

        return pathname.includes('/TerraMidi/') ? '/TerraMidi/' : (pathname || '/');
    }

    ensureSlashes(path) {
        let normalized = path.trim();
        if (!normalized.startsWith('/')) normalized = `/${normalized}`;
        if (!normalized.endsWith('/')) normalized = `${normalized}/`;
        return normalized;
    }

    normalizeResourcePath(path) {
        if (!path) return '';
        let normalized = path.trim();

        if (normalized.startsWith(window.location.origin)) {
            normalized = normalized.replace(window.location.origin, '');
        }

        const resolver = window.__terra;
        if (resolver && typeof resolver.stripBasePath === 'function') {
            normalized = resolver.stripBasePath(normalized);
        }

        if (normalized.startsWith(this.basePath)) {
            normalized = normalized.substring(this.basePath.length);
        }

        if (normalized.startsWith('/')) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    buildUrl(path) {
        if (!path) return this.baseUrl;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        const normalized = this.normalizeResourcePath(path);
        return new URL(normalized, this.baseUrl).toString();
    }

    isBinaryPath(path) {
        const ext = getExtension(path);
        return BINARY_EXTENSIONS.has(ext);
    }

    isTextPayload(contentType, path) {
        if (!contentType) {
            const ext = getExtension(path);
            return TEXT_EXTENSIONS.has(ext);
        }
        return contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('javascript');
    }

    async startAggressiveInstallation(options = {}) {
        if (this.isRunning) {
            console.warn('⚠️ Instalação já está em andamento');
            return false;
        }

        this.resetState();
        this.isRunning = true;
        this.installationState.started = true;
        this.installationState.startTime = Date.now();
        this.setPhase('initializing', 'Preparando ambiente de instalação');
        this.notifyProgress();
        this.updateInstallationMeta({
            lastAttemptAt: Date.now(),
            lastAttemptVersion: this.version
        });

        try {
            await this.initializeHybridCache();
            await this.setupStorage();

            const providedDir = options.directoryHandle;
            if (providedDir) {
                await this.applyUserDirectory(providedDir, { persist: options.persistDirectory ?? this.options.autoPersistDirectory });
            } else if (!this.userDirectoryRoot && window.pwaInstaller && window.pwaInstaller.directoryHandle) {
                await this.applyUserDirectory(window.pwaInstaller.directoryHandle, { persist: false });
            } else if (!this.userDirectoryRoot && this.platform === 'desktop' && (options.requireDirectorySelection || this.options.requireDirectorySelection)) {
                await this.requestUserDirectory();
            }

            await this.requestPersistentStorage();

            this.soundfontManifest = await this.fetchSoundfontManifest();
            const soundfontList = this.buildSoundfontList(this.soundfontManifest);

            const totalFiles = this.resourceConfig.all.length + soundfontList.length;
            this.installationState.totalFiles = totalFiles;
            this.installationState.totalSize = (this.soundfontManifest && this.soundfontManifest.totalSize) || 0;
            this.notifyProgress();

            await this.downloadStaticResources();
            await this.downloadSoundfonts(soundfontList);

            this.installationState.completed = true;
            this.setPhase('completed', 'Instalação concluída com sucesso');
            this.notifyProgress();
            this.updateInstallationMeta({
                lastSuccessfulRunAt: Date.now(),
                lastSuccessfulVersion: this.version,
                totalFilesDownloaded: this.installationState.totalFiles,
                totalBytesDownloaded: this.installationState.downloadedSize
            });
            console.log('✅ Instalação agressiva finalizada');
            return true;
        } catch (error) {
            console.error('❌ Erro durante instalação agressiva:', error);
            this.registerError((error && error.message) || String(error));
            this.setPhase('error', 'Falha durante a instalação');
            this.notifyProgress();
            this.updateInstallationMeta({
                lastFailureAt: Date.now(),
                lastFailureMessage: (error && error.message) || String(error)
            });
            return false;
        } finally {
            this.isRunning = false;
        }
    }

    async initializeHybridCache() {
        if (this.hybridCache) return;
        if (typeof HybridCacheManager === 'undefined') {
            console.warn('⚠️ HybridCacheManager não disponível');
            return;
        }
        this.hybridCache = new HybridCacheManager();
        await this.hybridCache.initialize();
    }

    async setupStorage() {
        try {
            if ('storage' in navigator && typeof navigator.storage.getDirectory === 'function') {
                this.opfsRoot = await navigator.storage.getDirectory();
                const terraDir = await this.ensureDirectory(this.opfsRoot, this.opfsDirCache, ['TerraMidi']);
                this.opfsResourcesRoot = await this.ensureDirectory(terraDir, this.opfsDirCache, ['resources']);
                this.opfsSoundfontsRoot = await this.ensureDirectory(terraDir, this.opfsSoundfontDirCache, ['soundfonts']);
                console.log('✅ OPFS configurado com sucesso');
            }
        } catch (error) {
            console.warn('⚠️ OPFS indisponível:', (error && error.message) || error);
        }
    }

    async requestPersistentStorage() {
        if (!navigator.storage || !navigator.storage.persist) {
            return false;
        }
        try {
            const persistent = await navigator.storage.persist();
                console.log(persistent ? '✅ Armazenamento persistente concedido' : 'ℹ️ Armazenamento persistente não garantido');
                return persistent;
            } catch (error) {
                console.warn('⚠️ Erro ao solicitar armazenamento persistente:', (error && error.message) || error);
            return false;
        }
    }

    async requestUserDirectory() {
        if (!('showDirectoryPicker' in window)) {
            console.warn('⚠️ File System Access API não disponível');
            return null;
        }
        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents',
                id: 'terra-midi-offline'
            });
            await this.applyUserDirectory(dirHandle, { persist: this.options.autoPersistDirectory });
            return dirHandle;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                console.log('ℹ️ Seleção de pasta cancelada');
            } else {
                console.warn('⚠️ Erro ao selecionar diretório:', (error && error.message) || error);
            }
            return null;
        }
    }

    async applyUserDirectory(dirHandle, { persist = true } = {}) {
        if (!dirHandle) return;

        this.userDirectoryRoot = dirHandle;
        this.installationState.directoryName = dirHandle.name;
        this.notifyDirectoryChange();

        const terraDir = await this.ensureDirectory(dirHandle, this.userDirCache, ['TerraMidi']);
        this.userCacheResourcesRoot = await this.ensureDirectory(terraDir, this.userDirCache, ['cache', 'resources']);
        this.userSoundfontsRoot = await this.ensureDirectory(terraDir, this.userSoundfontDirCache, ['soundfonts']);

        if (persist) {
            await this.saveDirectoryPermission(dirHandle);
        }

        this.updateInstallationMeta({
            directoryName: dirHandle.name,
            directoryLastSelectedAt: Date.now()
        });

        console.log(`📂 Diretório de usuário definido: ${dirHandle.name}`);
    }

    async saveDirectoryPermission(dirHandle) {
        try {
            const db = await this.openPermissionsDB();
            const tx = db.transaction(['permissions'], 'readwrite');
            tx.objectStore('permissions').put(dirHandle, 'userDirectory');
            await tx.complete;
            console.log('✅ Permissão do diretório salva');
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar permissão de diretório:', (error && error.message) || error);
        }
    }

    openPermissionsDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TerraMidiSettings', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('permissions')) {
                    db.createObjectStore('permissions');
                }
            };
        });
    }

    async fetchSoundfontManifest() {
        const manifestUrl = this.buildUrl(this.options.manifestPath);
        this.setPhase('manifest', 'Carregando manifesto de soundfonts');
        this.notifyProgress();
        const response = await this.fetchWithRetry(manifestUrl, { cache: 'no-store' });
        const manifest = await response.json();
        if (!manifest || !Array.isArray(manifest.files)) {
            throw new Error('Manifesto de soundfonts inválido');
        }
        return manifest;
    }

    buildSoundfontList(manifest) {
        const baseUrl = manifest.baseUrl || 'https://surikov.github.io/webaudiofontdata/sound/';
        return manifest.files.map((item) => {
            const filename = item.file;
            const subfolder = typeof detectSoundfontSubfolder === 'function'
                ? detectSoundfontSubfolder(filename)
                : 'other';
            return {
                filename,
                remoteUrl: item.url || `${baseUrl}${filename}`,
                subfolder,
                size: item.size || null
            };
        });
    }

    async downloadStaticResources() {
        const phases = [
            { key: 'critical', label: 'Recursos críticos', items: this.resourceConfig.critical },
            { key: 'styles', label: 'Folhas de estilo', items: this.resourceConfig.styles },
            { key: 'scripts', label: 'Scripts auxiliares', items: this.resourceConfig.scripts },
            { key: 'images', label: 'Ícones e imagens', items: this.resourceConfig.images }
        ];

        for (const phase of phases) {
            await this.downloadResourcePhase(phase.key, phase.label, phase.items);
        }
    }

    async downloadResourcePhase(key, label, items) {
        const pending = items.filter((item) => !this.resourceSet.has(item));
        if (!pending.length) return;

        this.setPhase(`resources:${key}`, `${label} (${pending.length})`);
        this.notifyProgress();

        await this.processQueue(pending, this.options.resourceConcurrency, async (path) => {
            await this.downloadSingleResource(path);
        });
    }

    async downloadSingleResource(relativePath) {
        const normalized = this.normalizeResourcePath(relativePath);
        if (!normalized || this.resourceSet.has(normalized)) return;

        this.resourceSet.add(normalized);

        const url = this.buildUrl(normalized);
        const treatAsBinary = this.isBinaryPath(normalized);

        try {
            const payload = await this.fetchResourcePayload(url, { treatAsBinary, originalPath: normalized });
            await this.saveResource(normalized, payload);
            this.installationState.totalSize += payload.size;
            this.incrementProgress(payload.size);
        } catch (error) {
            console.warn(`⚠️ Falha ao baixar recurso ${normalized}:`, (error && error.message) || error);
            this.registerError(`${normalized}: ${(error && error.message) || error}`);
        }
    }

    async downloadSoundfonts(soundfontList) {
        if (!soundfontList.length) return;

        this.setPhase('soundfonts', `Baixando soundfonts (${soundfontList.length})`);
        this.notifyProgress();

        await this.processQueue(soundfontList, this.options.soundfontConcurrency, async (entry) => {
            await this.downloadSingleSoundfont(entry);
        });
    }

    async downloadSingleSoundfont(entry) {
        const { filename, remoteUrl, subfolder } = entry;
        const relativePath = subfolder ? `soundfonts/${subfolder}/${filename}` : `soundfonts/${filename}`;

        try {
            if (await this.shouldSkipSoundfont(entry)) {
                this.incrementProgress(entry.size || 0);
                return;
            }

            const payload = await this.fetchResourcePayload(remoteUrl, {
                treatAsBinary: false,
                originalPath: relativePath
            });

            await this.saveSoundfont(relativePath, payload, entry);
            this.incrementProgress(entry.size || payload.size);
        } catch (error) {
            console.warn(`⚠️ Falha ao baixar soundfont ${filename}:`, (error && error.message) || error);
            this.registerError(`${filename}: ${(error && error.message) || error}`);
        }
    }

    async shouldSkipSoundfont(entry) {
        const filename = entry.filename;

        if (this.hybridCache && await this.hybridCache.exists(filename)) {
            return true;
        }

        if (this.userSoundfontsRoot) {
            const existsUser = await this.fileExistsInDirectory(this.userSoundfontsRoot, this.userSoundfontDirCache, [entry.subfolder], filename);
            if (existsUser) {
                return true;
            }
        }

        if (this.opfsSoundfontsRoot) {
            const existsOpfs = await this.fileExistsInDirectory(this.opfsSoundfontsRoot, this.opfsSoundfontDirCache, [entry.subfolder], filename);
            if (existsOpfs) {
                return true;
            }
        }

        return false;
    }

    async fetchResourcePayload(url, { treatAsBinary = false, originalPath = '' } = {}) {
        const response = await this.fetchWithRetry(url, { cache: 'no-store' });
        const responseForCache = response.clone();
        const arrayBuffer = await response.arrayBuffer();
        const size = arrayBuffer.byteLength;

        const contentType = response.headers.get('content-type') || guessContentType(originalPath || url);
        const isText = !treatAsBinary && this.isTextPayload(contentType, originalPath || url);

        let text = null;
        let binary = null;

        if (isText) {
            text = new TextDecoder('utf-8').decode(arrayBuffer);
        } else {
            binary = new Uint8Array(arrayBuffer);
        }

        return {
            response: responseForCache,
            size,
            contentType,
            text,
            binary
        };
    }

    async saveResource(relativePath, payload) {
        await Promise.all([
            this.saveToCache(RESOURCE_CACHE_NAME, relativePath, payload),
            this.saveToOpfs(this.opfsResourcesRoot, this.opfsDirCache, relativePath, payload),
            this.saveToUserDirectory(this.userCacheResourcesRoot, this.userDirCache, relativePath, payload)
        ]);
    }

    async saveSoundfont(relativePath, payload, entry) {
        await Promise.all([
            this.saveToCache(SOUNDFONT_CACHE_NAME, relativePath, payload, {
                soundfont: entry.subfolder,
                filename: entry.filename
            }),
            this.saveToOpfs(this.opfsSoundfontsRoot, this.opfsSoundfontDirCache, relativePath, payload),
            this.saveToUserDirectory(this.userSoundfontsRoot, this.userSoundfontDirCache, relativePath, payload),
            this.saveToHybridCache(entry.filename, payload.text, entry)
        ]);
    }

    async saveToCache(cacheName, relativePath, payload, metadata = {}) {
        if (typeof caches === 'undefined') return;
        try {
            const cache = await caches.open(cacheName);
            const requestUrl = this.buildUrl(relativePath);
            const headersSource = (payload.response && payload.response.headers) || {};
            const headers = new Headers(headersSource);
            const now = Date.now().toString();
            headers.set('x-cached-at', now);
            headers.set('x-last-accessed', now);
            headers.set('x-access-count', '1');
            headers.set('Content-Type', payload.contentType || guessContentType(relativePath));
            Object.entries(metadata).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    headers.set(`x-${key}`, String(value));
                }
            });

            const body = payload.binary ?? payload.text ?? (await payload.response.clone().arrayBuffer());
            const response = new Response(body, { headers });
            await cache.put(requestUrl, response);
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar no cache ${cacheName}:`, (error && error.message) || error);
        }
    }

    async saveToOpfs(rootHandle, cacheMap, relativePath, payload) {
        if (!rootHandle) return;
        try {
            const segments = this.splitPath(relativePath);
            const filename = segments.pop();
            const dir = await this.ensureDirectory(rootHandle, cacheMap, segments);
            const fileHandle = await dir.getFileHandle(filename, { create: true });
            await this.writeFile(fileHandle, payload);
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar em OPFS (${relativePath}):`, (error && error.message) || error);
        }
    }

    async saveToUserDirectory(rootHandle, cacheMap, relativePath, payload) {
        if (!rootHandle) return;
        try {
            const segments = this.splitPath(relativePath);
            const filename = segments.pop();
            const dir = await this.ensureDirectory(rootHandle, cacheMap, segments);
            const fileHandle = await dir.getFileHandle(filename, { create: true });
            await this.writeFile(fileHandle, payload);
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar em diretório do usuário (${relativePath}):`, (error && error.message) || error);
        }
    }

    async saveToHybridCache(filename, textContent, entry) {
        if (!textContent || !this.hybridCache) return;
        try {
            await this.hybridCache.save(filename, textContent, {
                type: 'soundfont',
                url: entry.remoteUrl,
                subfolder: entry.subfolder,
                size: entry.size || textContent.length,
                timestamp: Date.now()
            });
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar no HybridCache (${filename}):`, (error && error.message) || error);
        }
    }

    async ensureDirectory(rootHandle, cacheMap, segments) {
        let current = rootHandle;
        if (!Array.isArray(segments) || !segments.length) {
            return current;
        }

        for (const segment of segments) {
            if (!segment) continue;
            const key = `${current.name || 'root'}::${segment}`;
            if (cacheMap.has(key)) {
                current = cacheMap.get(key);
                continue;
            }
            current = await current.getDirectoryHandle(segment, { create: true });
            cacheMap.set(key, current);
        }

        return current;
    }

    async fileExistsInDirectory(rootHandle, cacheMap, segments, filename) {
        try {
            const dir = await this.ensureDirectoryExists(rootHandle, cacheMap, segments);
            if (!dir) return false;
            await dir.getFileHandle(filename, { create: false });
            return true;
        } catch (error) {
            if (error && error.name === 'NotFoundError') {
                return false;
            }
            return false;
        }
    }

    async ensureDirectoryExists(rootHandle, cacheMap, segments) {
        let current = rootHandle;
        if (!current) return null;
        if (!Array.isArray(segments) || !segments.length) {
            return current;
        }
        for (const segment of segments) {
            if (!segment) continue;
            const key = `${current.name || 'root'}::${segment}`;
            if (cacheMap.has(key)) {
                current = cacheMap.get(key);
                continue;
            }
            try {
                current = await current.getDirectoryHandle(segment, { create: false });
                cacheMap.set(key, current);
            } catch (error) {
                if (error && error.name === 'NotFoundError') {
                    return null;
                }
                throw error;
            }
        }
        return current;
    }

    splitPath(path) {
        return path.split('/').filter(Boolean);
    }

    async writeFile(fileHandle, payload) {
        const writable = await fileHandle.createWritable();
        try {
            if (payload.binary) {
                await writable.write(payload.binary);
            } else if (typeof payload.text === 'string') {
                await writable.write(payload.text);
            } else {
                const buffer = await payload.response.clone().arrayBuffer();
                await writable.write(buffer);
            }
        } finally {
            await writable.close();
        }
    }

    async processQueue(items, concurrency, handler) {
        if (!items.length) return;
        let index = 0;
        const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
        const workers = Array.from({ length: safeConcurrency }, async () => {
            while (true) {
                const currentIndex = index++;
                if (currentIndex >= items.length) break;
                const item = items[currentIndex];
                await handler(item, currentIndex);
            }
        });
        await Promise.all(workers);
    }

    incrementProgress(size = 0) {
        this.installationState.downloadedFiles += 1;
        if (size && Number.isFinite(size)) {
            this.installationState.downloadedSize += size;
        }
        const { downloadedFiles, totalFiles } = this.installationState;
        const progress = totalFiles > 0 ? Math.min(100, Math.round((downloadedFiles / totalFiles) * 100)) : 0;
        this.installationState.progress = progress;
        this.updateEta();
        this.notifyProgress();
    }

    updateEta() {
        const state = this.installationState;
        if (!state.startTime || state.downloadedFiles === 0) {
            state.estimatedTime = null;
            return;
        }
        const elapsed = (Date.now() - state.startTime) / 1000;
        const rate = state.downloadedFiles / elapsed;
        const remaining = state.totalFiles - state.downloadedFiles;
        if (rate > 0 && remaining > 0) {
            state.estimatedTime = Math.ceil(remaining / rate);
        } else {
            state.estimatedTime = 0;
        }
    }

    setPhase(phase, description) {
        this.installationState.phase = phase;
        this.installationState.phaseDescription = description;
    }

    notifyProgress() {
        const detail = { ...this.installationState };
        window.dispatchEvent(new CustomEvent('terra-installation-progress', { detail }));
    }

    notifyDirectoryChange() {
        window.dispatchEvent(new CustomEvent('terra-installation-directory', {
            detail: {
                name: this.installationState.directoryName,
                timestamp: Date.now()
            }
        }));
    }

    registerError(message) {
        if (!message) return;
        if (this.installationState.errors.length >= 20) {
            return;
        }
        this.installationState.errors.push(message);
        this.updateInstallationMeta({
            lastFailureMessage: message,
            lastFailureAt: Date.now()
        });
    }

    async fetchWithRetry(url, options = {}, retries = this.options.retryLimit) {
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText}`);
                }
                return response;
            } catch (error) {
                lastError = error;
                const isLastAttempt = attempt === retries;
                if (isLastAttempt) {
                    throw lastError;
                }
                const wait = Math.min(2000 * (attempt + 1), 8000);
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
        }
        throw lastError || new Error('Falha desconhecida em fetchWithRetry');
    }

    formatBytes(bytes) {
        if (!Number.isFinite(bytes)) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(1)} ${sizes[i]}`;
    }

    loadInstallationMeta() {
        if (typeof localStorage === 'undefined') {
            return {};
        }
        try {
            const raw = localStorage.getItem(this.metaKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('⚠️ Não foi possível carregar metadados de instalação:', (error && error.message) || error);
            return {};
        }
    }

    saveInstallationMeta() {
        if (typeof localStorage === 'undefined') {
            return;
        }
        try {
            const payload = JSON.stringify(this.installationMeta || {});
            localStorage.setItem(this.metaKey, payload);
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar metadados de instalação:', (error && error.message) || error);
        }
    }

    updateInstallationMeta(partial) {
        if (!partial || typeof partial !== 'object') return;
        const next = {
            ...(this.installationMeta || {}),
            ...partial,
            lastKnownVersion: this.version
        };
        this.installationMeta = next;
        this.saveInstallationMeta();
    }

    getInstallationMetadata() {
        return { ...(this.installationMeta || {}) };
    }
}

if (typeof window !== 'undefined') {
    window.AdvancedInstaller = AdvancedInstaller;
    AdvancedInstaller.META_STORAGE_KEY = ADVANCED_INSTALLER_META_KEY;
    AdvancedInstaller.AUTO_SYNC_INTERVAL_MS = ADVANCED_INSTALLER_AUTO_SYNC_INTERVAL_MS;
}
