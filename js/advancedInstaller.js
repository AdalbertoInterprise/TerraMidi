// 🚀 Advanced Installer - Sistema Agressivo de Instalação Offline
// Versão: 1.0.0.0.0
// Data: 21/10/2025
// Descrição: Download agressivo de todos os recursos com múltiplas camadas de cache
//           Funciona em Desktop (File System Access API + OPFS) e Mobile (IndexedDB + OPFS)
// Compatibilidade: Chrome/Edge 86+, Firefox 111+, Safari 15.1+, Mobile browsers

class AdvancedInstaller {
    constructor() {
        this.platform = this.detectPlatform();
        this.storageManager = null;
        this.installationState = {
            started: false,
            completed: false,
            progress: 0,
            totalFiles: 0,
            downloadedFiles: 0,
            totalSize: 0,
            downloadedSize: 0,
            startTime: null,
            estimatedTime: null,
            errors: []
        };
        
        // Configuração de recursos a baixar
        this.resourceConfig = {
            // HTML/CSS/JS core
            critical: [
                '/TerraMidi/index.html',
                '/TerraMidi/manifest.json',
                '/TerraMidi/styles.css',
                '/TerraMidi/sw.js',
                '/TerraMidi/js/app.js',
                '/TerraMidi/js/audioEngine.js',
                '/TerraMidi/js/soundfontManager.js',
                '/TerraMidi/js/instrumentLoader.js',
                '/TerraMidi/js/catalogManager.js',
                '/TerraMidi/js/WebAudioFontPlayer.js'
            ],
            
            // CSS completo
            styles: [
                '/TerraMidi/css/catalog-list.css',
                '/TerraMidi/css/catalog-navigation.css',
                '/TerraMidi/css/instrument-grid.css',
                '/TerraMidi/css/instrument-selector.css',
                '/TerraMidi/css/instruments-professional.css',
                '/TerraMidi/css/layout.css',
                '/TerraMidi/css/midi-ui.css',
                '/TerraMidi/css/pwa-installer.css',
                '/TerraMidi/css/theme.css',
                '/TerraMidi/css/virtual-keyboard.css'
            ],
            
            // JavaScript completo
            scripts: [
                '/TerraMidi/js/chordPlayer.js',
                '/TerraMidi/js/effectsManager.js',
                '/TerraMidi/js/fileSystemCacheManager.js',
                '/TerraMidi/js/hybridCacheManager.js',
                '/TerraMidi/js/localCacheManager.js',
                '/TerraMidi/js/pwaInstaller.js',
                '/TerraMidi/js/secureAPIClient.js',
                '/TerraMidi/js/serviceWorkerBridge.js',
                '/TerraMidi/js/midi/browserCompatibility.js',
                '/TerraMidi/js/midi/midiAutoReconnect.js',
                '/TerraMidi/js/midi/midiConnectionNotifier.js',
                '/TerraMidi/js/midi/midiDeviceManager.js',
                '/TerraMidi/js/midi/midiDiagnostics.js',
                '/TerraMidi/js/midi/midiOscilloscope.js',
                '/TerraMidi/js/midi/midiStatusPanel.js',
                '/TerraMidi/js/midi/midiTroubleshootingGuide.js',
                '/TerraMidi/js/synth/tibetanBowlSynth.js',
                '/TerraMidi/js/ui/catalogList.js',
                '/TerraMidi/js/ui/instrumentSelector.js',
                '/TerraMidi/js/ui/virtual-keyboard.js',
                '/TerraMidi/js/utils/dependencyLoader.js',
                '/TerraMidi/js/utils/initializationChecker.js',
                '/TerraMidi/js/utils/instrumentCategories.js',
                '/TerraMidi/js/utils/noteMappingUtils.js',
                '/TerraMidi/js/utils/sustainedNoteManager.js',
                '/TerraMidi/js/catalogNavigationManager.js'
            ],
            
            // Logos e ícones
            images: [
                '/TerraMidi/Logos/icon-16x16.png',
                '/TerraMidi/Logos/icon-32x32.png',
                '/TerraMidi/Logos/icon-192x192.png',
                '/TerraMidi/Logos/icon-512x512.png',
                '/TerraMidi/Logos/icon-maskable-192x192.png',
                '/TerraMidi/Logos/icon-maskable-512x512.png'
            ],
            
            // Soundfonts essenciais (primeiros 10 arquivos de cada categoria)
            soundfonts: {
                fluidr3_gm: 10,  // Primeiros 10
                aspirin: 5,      // Primeiros 5
                chaos: 5,        // Primeiros 5
                generaluser: 5,  // Primeiros 5
                guitars: 3,      // Primeiros 3
                curated: 15      // Todos os curated
            }
        };
        
        console.log('🚀 AdvancedInstaller v1.0.0.0.0 inicializado');
        console.log(`📱 Plataforma: ${this.platform}`);
    }
    
    /**
     * Detecta plataforma (desktop vs mobile)
     */
    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
        
        if (isMobile || isTablet) return 'mobile';
        return 'desktop';
    }
    
    /**
     * Inicia processo de instalação agressiva
     */
    async startAggressiveInstallation() {
        if (this.installationState.started) {
            console.warn('⚠️ Instalação já em andamento');
            return false;
        }
        
        this.installationState.started = true;
        this.installationState.startTime = Date.now();
        
        console.log('🔥 Iniciando instalação agressiva...');
        
        try {
            // Calcular total de arquivos
            this.calculateTotalFiles();
            
            // Fase 1: Requisitar permissões e validar armazenamento
            console.log('📋 Fase 1: Validando armazenamento...');
            await this.setupStorage();
            
            // Fase 2: Solicitar permissão de armazenamento persistente
            console.log('📋 Fase 2: Solicitando armazenamento persistente...');
            await this.requestPersistentStorage();
            
            // Fase 3: Em Desktop, solicitar pasta de usuário
            if (this.platform === 'desktop') {
                console.log('📋 Fase 3: Solicitando acesso à pasta do usuário...');
                await this.requestUserDirectory();
            }
            
            // Fase 4: Download de recursos críticos
            console.log('📋 Fase 4: Baixando recursos críticos...');
            await this.downloadResourcePhase('critical', this.resourceConfig.critical);
            
            // Fase 5: Download de estilos
            console.log('📋 Fase 5: Baixando estilos...');
            await this.downloadResourcePhase('styles', this.resourceConfig.styles);
            
            // Fase 6: Download de scripts
            console.log('📋 Fase 6: Baixando scripts...');
            await this.downloadResourcePhase('scripts', this.resourceConfig.scripts);
            
            // Fase 7: Download de imagens
            console.log('📋 Fase 7: Baixando imagens...');
            await this.downloadResourcePhase('images', this.resourceConfig.images);
            
            // Fase 8: Download de soundfonts (executado em background)
            console.log('📋 Fase 8: Iniciando download de soundfonts (background)...');
            this.downloadSoundfontsBg(); // Não aguarda
            
            this.installationState.completed = true;
            console.log('✅ Instalação agressiva concluída!');
            console.log(`📊 ${this.installationState.downloadedFiles}/${this.installationState.totalFiles} arquivos baixados`);
            
            return true;
        } catch (error) {
            console.error('❌ Erro durante instalação:', error);
            this.installationState.errors.push(error.message);
            return false;
        }
    }
    
    /**
     * Calcula total de arquivos a baixar
     */
    calculateTotalFiles() {
        let total = 0;
        total += this.resourceConfig.critical.length;
        total += this.resourceConfig.styles.length;
        total += this.resourceConfig.scripts.length;
        total += this.resourceConfig.images.length;
        
        // Soundfonts
        for (const [category, count] of Object.entries(this.resourceConfig.soundfonts)) {
            total += count;
        }
        
        this.installationState.totalFiles = total;
        console.log(`📦 Total de arquivos a baixar: ${total}`);
    }
    
    /**
     * Configura sistema de armazenamento (OPFS + IndexedDB)
     */
    async setupStorage() {
        try {
            // Tentar OPFS (automático, sem permissão)
            if ('storage' in navigator && 'getDirectory' in navigator.storage) {
                const root = await navigator.storage.getDirectory();
                const terraDir = await root.getDirectoryHandle('TerraMidi', { create: true });
                console.log('✅ OPFS configurado');
                this.opfsRoot = terraDir;
            }
        } catch (error) {
            console.warn('⚠️ OPFS não disponível:', error.message);
        }
        
        // Sempre configurar fallback para IndexedDB
        this.hybridCache = new HybridCacheManager();
        await this.hybridCache.initialize();
        console.log('✅ Armazenamento híbrido configurado');
    }
    
    /**
     * Solicita armazenamento persistente
     */
    async requestPersistentStorage() {
        if (!navigator.storage || !navigator.storage.persist) {
            console.log('⚠️ API de armazenamento persistente não disponível');
            return false;
        }
        
        try {
            const persistent = await navigator.storage.persist();
            if (persistent) {
                console.log('✅ Armazenamento persistente concedido');
            } else {
                console.log('ℹ️ Armazenamento não persistente (será mantido no melhor esforço)');
            }
            return persistent;
        } catch (error) {
            console.warn('⚠️ Erro ao solicitar armazenamento persistente:', error.message);
            return false;
        }
    }
    
    /**
     * Solicita acesso à pasta do usuário (Desktop)
     */
    async requestUserDirectory() {
        if (!('showDirectoryPicker' in window)) {
            console.log('⚠️ File System Access API não disponível');
            return false;
        }
        
        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents',
                id: 'terra-midi-install'
            });
            
            // Criar pasta TerraMidi
            const terraDir = await dirHandle.getDirectoryHandle('TerraMidi', { create: true });
            
            console.log('✅ Pasta de usuário selecionada:', dirHandle.name);
            this.userDirectory = terraDir;
            this.userDirectoryRoot = dirHandle;
            
            // Salvar permissão no IndexedDB
            await this.saveDirectoryPermission(dirHandle);
            
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('ℹ️ Usuário cancelou seleção de pasta');
            } else {
                console.warn('⚠️ Erro ao solicitar pasta:', error.message);
            }
            return false;
        }
    }
    
    /**
     * Salva permissão do diretório no IndexedDB
     */
    async saveDirectoryPermission(dirHandle) {
        try {
            const db = new Promise((resolve, reject) => {
                const req = indexedDB.open('TerraMidiSettings', 1);
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve(req.result);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('permissions')) {
                        db.createObjectStore('permissions');
                    }
                };
            });
            
            const transaction = (await db).transaction(['permissions'], 'readwrite');
            const store = transaction.objectStore('permissions');
            store.put(dirHandle, 'userDirectory');
            
            console.log('✅ Permissão de pasta salva');
        } catch (error) {
            console.warn('⚠️ Erro ao salvar permissão:', error.message);
        }
    }
    
    /**
     * Download de fase de recursos
     */
    async downloadResourcePhase(phaseName, urls) {
        console.log(`⬇️ Iniciando fase: ${phaseName} (${urls.length} arquivos)`);
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const url of urls) {
            try {
                await this.downloadSingleResource(url);
                successCount++;
                this.installationState.downloadedFiles++;
            } catch (error) {
                console.warn(`⚠️ Erro ao baixar ${url}:`, error.message);
                failureCount++;
                this.installationState.errors.push(`${url}: ${error.message}`);
            }
            
            // Atualizar progresso
            this.installationState.progress = Math.round(
                (this.installationState.downloadedFiles / this.installationState.totalFiles) * 100
            );
            
            this.notifyProgress();
        }
        
        console.log(`✅ Fase ${phaseName}: ${successCount} sucesso, ${failureCount} falhas`);
    }
    
    /**
     * Download de um recurso individual
     */
    async downloadSingleResource(url) {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            this.installationState.totalSize += parseInt(contentLength);
            this.installationState.downloadedSize += parseInt(contentLength);
        }
        
        const content = await response.text();
        const filename = url.split('/').pop();
        
        // Salvar em múltiplas camadas
        await this.saveResourceMultiLayer(filename, content, url);
        
        return content;
    }
    
    /**
     * Salva recurso em múltiplas camadas de cache
     */
    async saveResourceMultiLayer(filename, content, url) {
        // Camada 1: Cache Storage (para Service Worker)
        try {
            const cache = await caches.open(`terra-resources-v1.0.0.0.0`);
            const response = new Response(content, {
                headers: { 'Content-Type': 'text/javascript' }
            });
            await cache.put(url, response);
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar em Cache Storage: ${error.message}`);
        }
        
        // Camada 2: OPFS (se disponível)
        if (this.opfsRoot) {
            try {
                const fileHandle = await this.opfsRoot.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            } catch (error) {
                console.warn(`⚠️ Erro ao salvar em OPFS: ${error.message}`);
            }
        }
        
        // Camada 3: User Directory (Desktop)
        if (this.userDirectory) {
            try {
                const fileHandle = await this.userDirectory.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            } catch (error) {
                console.warn(`⚠️ Erro ao salvar em User Directory: ${error.message}`);
            }
        }
        
        // Camada 4: IndexedDB (fallback universal)
        if (this.hybridCache) {
            try {
                await this.hybridCache.save(filename, content, { url, type: 'resource' });
            } catch (error) {
                console.warn(`⚠️ Erro ao salvar em IndexedDB: ${error.message}`);
            }
        }
    }
    
    /**
     * Download de soundfonts em background (não bloqueia)
     */
    downloadSoundfontsBg() {
        // Executar em background sem await
        (async () => {
            console.log('🎵 Iniciando download de soundfonts em background...');
            
            try {
                // Gerar lista de soundfonts a baixar baseado na configuração
                const soundfontsList = await this.generateSoundfontsList();
                
                console.log(`📦 ${soundfontsList.length} soundfonts identificados para download`);
                
                // Baixar com prioridade baixa (usando setTimeout para não bloquear UI)
                for (const sf of soundfontsList) {
                    // Pequeno delay entre downloads para não sobrecarregar
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    try {
                        await this.downloadSoundFont(sf);
                        this.installationState.downloadedFiles++;
                        this.notifyProgress();
                    } catch (error) {
                        console.warn(`⚠️ Erro ao baixar soundfont ${sf.name}:`, error.message);
                    }
                }
                
                console.log('✅ Download de soundfonts em background concluído');
            } catch (error) {
                console.error('❌ Erro no download background de soundfonts:', error);
            }
        })();
    }
    
    /**
     * Gera lista de soundfonts a baixar
     */
    async generateSoundfontsList() {
        const list = [];
        
        // Obter manifesto de soundfonts
        try {
            const response = await fetch('/TerraMidi/soundfonts-manifest.json');
            const manifest = await response.json();
            
            // FluidR3_GM
            const fluidCount = this.resourceConfig.soundfonts.fluidr3_gm;
            manifest
                .filter(f => f.soundfont === 'FluidR3_GM')
                .slice(0, fluidCount)
                .forEach(f => list.push({ name: f.file, url: f.url, soundfont: 'fluidr3_gm' }));
            
            // Aspirin
            const aspirinCount = this.resourceConfig.soundfonts.aspirin;
            manifest
                .filter(f => f.soundfont === 'Aspirin')
                .slice(0, aspirinCount)
                .forEach(f => list.push({ name: f.file, url: f.url, soundfont: 'aspirin' }));
            
            // Chaos
            const chaosCount = this.resourceConfig.soundfonts.chaos;
            manifest
                .filter(f => f.soundfont === 'Chaos')
                .slice(0, chaosCount)
                .forEach(f => list.push({ name: f.file, url: f.url, soundfont: 'chaos' }));
            
            // GeneralUser
            const genCount = this.resourceConfig.soundfonts.generaluser;
            manifest
                .filter(f => f.soundfont === 'GeneralUserGS')
                .slice(0, genCount)
                .forEach(f => list.push({ name: f.file, url: f.url, soundfont: 'generaluser' }));
            
            // Guitars
            const guitCount = this.resourceConfig.soundfonts.guitars;
            manifest
                .filter(f => f.soundfont?.includes('Guitar') || f.soundfont?.includes('guitar'))
                .slice(0, guitCount)
                .forEach(f => list.push({ name: f.file, url: f.url, soundfont: 'guitars' }));
            
            // Curated
            const curatedCount = this.resourceConfig.soundfonts.curated;
            ['piano_grand', 'piano_acoustic', 'harpsichord', 'organ', 'vibraphone']
                .slice(0, curatedCount)
                .forEach(name => {
                    const sf = manifest.find(f => f.file?.startsWith(name));
                    if (sf) list.push({ name: sf.file, url: sf.url, soundfont: 'curated' });
                });
            
        } catch (error) {
            console.warn('⚠️ Erro ao obter manifesto de soundfonts:', error);
        }
        
        return list;
    }
    
    /**
     * Download de soundfont individual
     */
    async downloadSoundFont(sf) {
        const url = sf.url;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const content = await response.text();
        
        // Salvar com subfolder
        const filename = `soundfonts/${sf.soundfont}/${sf.name}`;
        
        // Salvar em Cache Storage
        try {
            const cache = await caches.open(`terra-soundfonts-v1.0.0.0.0`);
            const cacheUrl = `/TerraMidi/${filename}`;
            const response2 = new Response(content, {
                headers: { 'Content-Type': 'text/javascript' }
            });
            await cache.put(cacheUrl, response2);
        } catch (error) {
            console.warn(`⚠️ Erro ao cachear soundfont: ${error.message}`);
        }
        
        // Salvar em armazenamento híbrido
        if (this.hybridCache) {
            try {
                await this.hybridCache.save(filename, content, { type: 'soundfont', url });
            } catch (error) {
                console.warn(`⚠️ Erro ao salvar soundfont em storage: ${error.message}`);
            }
        }
    }
    
    /**
     * Notifica progresso de instalação
     */
    notifyProgress() {
        const state = this.installationState;
        const elapsed = Date.now() - state.startTime;
        const rate = state.downloadedFiles / (elapsed / 1000); // files/sec
        const remaining = state.totalFiles - state.downloadedFiles;
        state.estimatedTime = Math.ceil(remaining / rate);
        
        // Emitir evento customizado
        window.dispatchEvent(new CustomEvent('terra-installation-progress', {
            detail: state
        }));
        
        // Log periódico
        if (state.downloadedFiles % 10 === 0 || state.progress === 100) {
            console.log(`📊 Progresso: ${state.progress}% - ${state.downloadedFiles}/${state.totalFiles} arquivos`);
            if (state.estimatedTime) {
                console.log(`⏱️ Tempo estimado: ${state.estimatedTime}s`);
            }
        }
    }
    
    /**
     * Obter status da instalação
     */
    getStatus() {
        return this.installationState;
    }
    
    /**
     * Limpar dados de instalação
     */
    async clearInstallationCache() {
        try {
            // Limpar caches
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
                if (name.includes('terra')) {
                    await caches.delete(name);
                }
            }
            console.log('✅ Cache limpo');
        } catch (error) {
            console.warn('⚠️ Erro ao limpar cache:', error.message);
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AdvancedInstaller = AdvancedInstaller;
}
