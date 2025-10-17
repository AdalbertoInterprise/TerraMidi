// Soundfont Manager - Sistema de gerenciamento de instrumentos terapêuticos
const KIT_LANE_NOTES = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2']);
const KIT_GM_PREFERRED = Object.freeze([36, 38, 42, 46, 43, 45, 49, 51]);

class SoundfontManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.instruments = new Map();
        this.currentInstrument = 'piano';
        this.loadedSoundfonts = new Map();
        this.activeDrumKit = null;
        
        // 🆕 MÓDULOS UTILITÁRIOS
        this.noteMappingUtils = new NoteMappingUtils();
        this.instrumentCategories = new InstrumentCategories();
        
        // 🆕 CATÁLOGO COMPLETO (manifest externo)
        this.fullCatalog = null;
        this.catalogLoadPromise = null;
        
        // 🆕 NOVOS SISTEMAS AVANÇADOS
        this.loader = null;
        this.effectsManager = null;
        this.chordPlayer = null;
        this.envelopeGenerator = null;
        this.mainChannel = null;
        this.sustainedNoteManager = null;
        this.placeholderSustainedNotes = new Set();
        this.advancedSystemsReady = false;
        this._initializingAdvancedSystems = null;

        // 🆕 MAPEAMENTO PROGRAM → CATÁLOGO
        this.programMapper = (typeof window !== 'undefined' && window.ProgramCatalogMapper)
            ? window.ProgramCatalogMapper
            : null;
        this.mappingConfigPromise = null;
        this.midiConfig = null;
        this.lastProgramMappings = new Map();

        if (this.programMapper && typeof queueMicrotask === 'function') {
            queueMicrotask(() => {
                this.ensureProgramMapperReady().catch(error => {
                    console.warn('⚠️ ProgramCatalogMapper não pôde ser inicializado automaticamente:', error);
                });
            });
        } else if (!this.programMapper) {
            console.warn('⚠️ ProgramCatalogMapper indisponível. Program Change usará fallback GM até que o módulo seja carregado.');
        }
        
        // Agendar integração dos sistemas avançados somente após desbloqueio do áudio
        if (this.audioEngine && typeof this.audioEngine.onUnlock === 'function') {
            this.audioEngine.onUnlock(() => this.initializeAdvancedSystems());
        } else {
            // Fallback para cenários legados sem AudioEngine completo
            queueMicrotask(() => this.initializeAdvancedSystems());
        }
        
        // Definição completa dos instrumentos terapêuticos - 50 instrumentos organizados por categoria
        this.availableInstruments = {
            // ===== PIANOS (4 instrumentos) =====
            'piano_grand': {
                name: 'Piano de Cauda',
                category: 'Pianos',
                description: 'Piano clássico de concerto, som rico e profundo',
                file: 'piano_grand.js',
                variable: '_tone_0000_FluidR3_GM_sf2_file',
                therapeutic: 'Reduz ansiedade e promove concentração profunda',
                icon: '🎹'
            },
            'piano_acoustic': {
                name: 'Piano Acústico',
                category: 'Pianos',
                description: 'Piano tradicional, ideal para melodias calmantes',
                file: 'piano_acoustic.js',
                variable: '_tone_0000_FluidR3_GM_sf2_file',
                therapeutic: 'Equilibra emoções e induz relaxamento',
                icon: '🎹'
            },
            'piano_bright': {
                name: 'Piano Brilhante',
                category: 'Pianos',
                description: 'Piano com timbre cristalino e energético',
                file: 'piano_bright.js',
                variable: '_tone_0010_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula clareza mental e foco',
                icon: '✨'
            },
            'piano_electric': {
                name: 'Piano Elétrico',
                category: 'Pianos',
                description: 'Piano moderno com caráter suave',
                file: 'piano_electric.js',
                variable: '_tone_0020_FluidR3_GM_sf2_file',
                therapeutic: 'Promove criatividade e expressão',
                icon: '⚡'
            },
            
            // ===== PERCUSSÃO CROMÁTICA (8 instrumentos) =====
            'celesta': {
                name: 'Celesta',
                category: 'Percussão Melódica',
                description: 'Som cristalino como caixa de música',
                file: 'celesta.js',
                variable: '_tone_0080_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca memórias positivas e nostalgia',
                icon: '🎵'
            },
            'glockenspiel': {
                name: 'Glockenspiel',
                category: 'Percussão Melódica',
                description: 'Sinos metálicos brilhantes e alegres',
                file: 'glockenspiel.js',
                variable: '_tone_0090_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula alegria e positividade',
                icon: '🔔'
            },
            'music_box': {
                name: 'Caixa de Música',
                category: 'Percussão Melódica',
                description: 'Som delicado e nostálgico',
                file: 'music_box.js',
                variable: '_tone_0100_FluidR3_GM_sf2_file',
                therapeutic: 'Induz sono e tranquilidade infantil',
                icon: '🎁'
            },
            'vibraphone': {
                name: 'Vibrafone',
                category: 'Percussão Melódica',
                description: 'Percussão melódica com sustain natural',
                file: 'vibraphone.js',
                variable: '_tone_0110_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula foco e clareza mental',
                icon: '🎤'
            },
            'marimba': {
                name: 'Marimba',
                category: 'Percussão Melódica',
                description: 'Madeira quente e ressonante',
                file: 'marimba.js',
                variable: '_tone_0120_FluidR3_GM_sf2_file',
                therapeutic: 'Promove conexão com natureza',
                icon: '🪵'
            },
            'xylophone': {
                name: 'Xilofone',
                category: 'Percussão Melódica',
                description: 'Percussão de madeira alegre e brilhante',
                file: 'xylophone.js',
                variable: '_tone_0130_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula energia positiva e alegria',
                icon: '🥁'
            },
            'tubular_bells': {
                name: 'Sinos Tubulares',
                category: 'Percussão Melódica',
                description: 'Sinos profundos e ressonantes',
                file: 'tubular_bells.js',
                variable: '_tone_0140_FluidR3_GM_sf2_file',
                therapeutic: 'Induz meditação profunda',
                icon: '🛎️'
            },
            'dulcimer': {
                name: 'Dulcimer',
                category: 'Percussão Melódica',
                description: 'Cordas percutidas com timbre único',
                file: 'dulcimer.js',
                variable: '_tone_0150_FluidR3_GM_sf2_file',
                therapeutic: 'Promove serenidade e paz interior',
                icon: '🎼'
            },
            
            // ===== ÓRGÃOS (2 instrumentos) =====
            'church_organ': {
                name: 'Órgão de Igreja',
                category: 'Órgãos',
                description: 'Órgão majestoso e reverente',
                file: 'church_organ.js',
                variable: '_tone_0190_FluidR3_GM_sf2_file',
                therapeutic: 'Induz estado contemplativo e espiritual',
                icon: '⛪'
            },
            'reed_organ': {
                name: 'Órgão de Palheta',
                category: 'Órgãos',
                description: 'Órgão suave e envolvente',
                file: 'reed_organ.js',
                variable: '_tone_0200_FluidR3_GM_sf2_file',
                therapeutic: 'Promove calma e introspecção',
                icon: '🎹'
            },
            
            // ===== GUITARRAS (2 instrumentos) =====
            'guitar_nylon': {
                name: 'Violão Nylon',
                category: 'Cordas Dedilhadas',
                description: 'Guitarra clássica com cordas de nylon',
                file: 'guitar_nylon.js',
                variable: '_tone_0240_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca nostalgia e conforto',
                icon: '🎸'
            },
            'guitar_steel': {
                name: 'Violão Aço',
                category: 'Cordas Dedilhadas',
                description: 'Guitarra acústica brilhante',
                file: 'guitar_steel.js',
                variable: '_tone_0250_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula vitalidade e conexão',
                icon: '🎸'
            },
            
            // ===== CORDAS ORQUESTRAIS (4 instrumentos) =====
            'violin': {
                name: 'Violino',
                category: 'Cordas Orquestrais',
                description: 'Cordas expressivas e emotivas',
                file: 'violin.js',
                variable: '_tone_0400_FluidR3_GM_sf2_file',
                therapeutic: 'Libera emoções e promove catarse',
                icon: '🎻'
            },
            'cello': {
                name: 'Violoncelo',
                category: 'Cordas Orquestrais',
                description: 'Tons graves profundos e calorosos',
                file: 'cello.js',
                variable: '_tone_0420_FluidR3_GM_sf2_file',
                therapeutic: 'Conecta com emoções profundas',
                icon: '🎻'
            },
            'string_ensemble': {
                name: 'Conjunto de Cordas',
                category: 'Cordas Orquestrais',
                description: 'Orquestra de cordas completa',
                file: 'string_ensemble.js',
                variable: '_tone_0480_FluidR3_GM_sf2_file',
                therapeutic: 'Cria sensação de plenitude',
                icon: '🎼'
            },
            'harp': {
                name: 'Harpa',
                category: 'Cordas Orquestrais',
                description: 'Instrumento celestial e tranquilizante',
                file: 'harp.js',
                variable: '_tone_0460_FluidR3_GM_sf2_file',
                therapeutic: 'Reduz estresse e induz estado meditativo',
                icon: '🪕'
            },
            
            // ===== VOZES/CORAL (2 instrumentos) =====
            'choir_aahs': {
                name: 'Coral Aahs',
                category: 'Vozes',
                description: 'Vozes humanas em harmonia',
                file: 'choir_aahs.js',
                variable: '_tone_0520_FluidR3_GM_sf2_file',
                therapeutic: 'Promove conexão e empatia',
                icon: '👥'
            },
            'voice_oohs': {
                name: 'Vozes Oohs',
                category: 'Vozes',
                description: 'Vozes suaves e etéreas',
                file: 'voice_oohs.js',
                variable: '_tone_0530_FluidR3_GM_sf2_file',
                therapeutic: 'Induz relaxamento profundo',
                icon: '🎤'
            },
            
            // ===== METAIS (1 instrumento) =====
            'french_horn': {
                name: 'Trompa',
                category: 'Metais',
                description: 'Metal suave e pastoral',
                file: 'french_horn.js',
                variable: '_tone_0600_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca natureza e espaços abertos',
                icon: '🎺'
            },
            
            // ===== PALHETAS (2 instrumentos) =====
            'oboe': {
                name: 'Oboé',
                category: 'Palhetas',
                description: 'Palheta dupla expressiva',
                file: 'oboe.js',
                variable: '_tone_0680_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula introspecção',
                icon: '🎶'
            },
            'clarinet': {
                name: 'Clarinete',
                category: 'Palhetas',
                description: 'Palheta simples versátil',
                file: 'clarinet.js',
                variable: '_tone_0710_FluidR3_GM_sf2_file',
                therapeutic: 'Promove serenidade',
                icon: '🎷'
            },
            
            // ===== FLAUTAS (6 instrumentos) =====
            'flute': {
                name: 'Flauta',
                category: 'Flautas',
                description: 'Som suave e arejado, muito relaxante',
                file: 'flute.js',
                variable: '_tone_0730_FluidR3_GM_sf2_file',
                therapeutic: 'Promove respiração profunda e relaxamento',
                icon: '🪈'
            },
            'recorder': {
                name: 'Flauta Doce',
                category: 'Flautas',
                description: 'Flauta simples e pura',
                file: 'recorder.js',
                variable: '_tone_0740_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca inocência e simplicidade',
                icon: '🎵'
            },
            'pan_flute': {
                name: 'Flauta de Pã',
                category: 'Flautas',
                description: 'Flauta andina mística',
                file: 'pan_flute.js',
                variable: '_tone_0750_FluidR3_GM_sf2_file',
                therapeutic: 'Conecta com natureza e ancestralidade',
                icon: '🏔️'
            },
            'blown_bottle': {
                name: 'Garrafa Soprada',
                category: 'Flautas',
                description: 'Som único e meditativo',
                file: 'blown_bottle.js',
                variable: '_tone_0760_FluidR3_GM_sf2_file',
                therapeutic: 'Induz estado contemplativo',
                icon: '🍾'
            },
            'ocarina': {
                name: 'Ocarina',
                category: 'Flautas',
                description: 'Flauta cerâmica ancestral',
                file: 'ocarina.js',
                variable: '_tone_0790_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca memórias e conexão espiritual',
                icon: '🪈'
            },
            
            // ===== SYNTH PADS (6 instrumentos) - Sons ambiente relaxantes =====
            'pad_newage': {
                name: 'Pad New Age',
                category: 'Pads Sintéticos',
                description: 'Atmosfera envolvente e meditativa',
                file: 'pad_newage.js',
                variable: '_tone_0880_FluidR3_GM_sf2_file',
                therapeutic: 'Induz estados profundos de relaxamento',
                icon: '🌙'
            },
            'pad_warm': {
                name: 'Pad Quente',
                category: 'Pads Sintéticos',
                description: 'Textura macia e acolhedora',
                file: 'pad_warm.js',
                variable: '_tone_0890_FluidR3_GM_sf2_file',
                therapeutic: 'Promove sensação de conforto',
                icon: '☀️'
            },
            'pad_polysynth': {
                name: 'Pad Polysynth',
                category: 'Pads Sintéticos',
                description: 'Camadas sintéticas ricas',
                file: 'pad_polysynth.js',
                variable: '_tone_0900_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula imaginação',
                icon: '🎹'
            },
            'pad_choir': {
                name: 'Pad Coral',
                category: 'Pads Sintéticos',
                description: 'Vozes sintéticas etéreas',
                file: 'pad_choir.js',
                variable: '_tone_0910_FluidR3_GM_sf2_file',
                therapeutic: 'Cria ambiente sagrado',
                icon: '🎭'
            },
            'pad_bowed': {
                name: 'Pad Arqueado',
                category: 'Pads Sintéticos',
                description: 'Textura de cordas contínuas',
                file: 'pad_bowed.js',
                variable: '_tone_0920_FluidR3_GM_sf2_file',
                therapeutic: 'Induz fluxo meditativo',
                icon: '〰️'
            },
            'pad_halo': {
                name: 'Pad Halo',
                category: 'Pads Sintéticos',
                description: 'Aura luminosa e expansiva',
                file: 'pad_halo.js',
                variable: '_tone_0940_FluidR3_GM_sf2_file',
                therapeutic: 'Eleva consciência',
                icon: '👼'
            },
            'pad_sweep': {
                name: 'Pad Sweep',
                category: 'Pads Sintéticos',
                description: 'Movimento suave e envolvente',
                file: 'pad_sweep.js',
                variable: '_tone_0950_FluidR3_GM_sf2_file',
                therapeutic: 'Promove transição suave de estados',
                icon: '🌊'
            },
            
            // ===== EFEITOS SONOROS TERAPÊUTICOS (4 instrumentos) =====
            'fx_rain': {
                name: 'Chuva',
                category: 'Efeitos Ambientais',
                description: 'Som de chuva relaxante',
                file: 'fx_rain.js',
                variable: '_tone_0960_FluidR3_GM_sf2_file',
                therapeutic: 'Mascara ruídos e induz sono',
                icon: '🌧️'
            },
            'fx_crystal': {
                name: 'Cristal',
                category: 'Efeitos Ambientais',
                description: 'Timbres cristalinos etéreos',
                file: 'fx_crystal.js',
                variable: '_tone_0980_FluidR3_GM_sf2_file',
                therapeutic: 'Purifica energia mental',
                icon: '💎'
            },
            'fx_atmosphere': {
                name: 'Atmosfera',
                category: 'Efeitos Ambientais',
                description: 'Ambiente espacial profundo',
                file: 'fx_atmosphere.js',
                variable: '_tone_0990_FluidR3_GM_sf2_file',
                therapeutic: 'Expande consciência',
                icon: '🌌'
            },
            'fx_echoes': {
                name: 'Ecos',
                category: 'Efeitos Ambientais',
                description: 'Reverberações suaves',
                file: 'fx_echoes.js',
                variable: '_tone_1020_FluidR3_GM_sf2_file',
                therapeutic: 'Cria espaço meditativo',
                icon: '〰️'
            },
            
            // ===== INSTRUMENTOS ÉTNICOS (3 instrumentos) =====
            'sitar': {
                name: 'Sitar',
                category: 'Instrumentos Étnicos',
                description: 'Cordas indianas meditativas',
                file: 'sitar.js',
                variable: '_tone_1040_FluidR3_GM_sf2_file',
                therapeutic: 'Induz meditação transcendental',
                icon: '🇮🇳'
            },
            'koto': {
                name: 'Koto',
                category: 'Instrumentos Étnicos',
                description: 'Harpa japonesa tradicional',
                file: 'koto.js',
                variable: '_tone_1070_FluidR3_GM_sf2_file',
                therapeutic: 'Promove zen e mindfulness',
                icon: '🇯🇵'
            },
            'kalimba': {
                name: 'Kalimba',
                category: 'Instrumentos Étnicos',
                description: 'Piano de polegar africano',
                file: 'kalimba.js',
                variable: '_tone_1080_FluidR3_GM_sf2_file',
                therapeutic: 'Evoca alegria simples',
                icon: '🌍'
            },
            
            // ===== PERCUSSÃO SUAVE (4 instrumentos) =====
            'tinkle_bell': {
                name: 'Sininho',
                category: 'Percussão Suave',
                description: 'Sinos delicados cristalinos',
                file: 'tinkle_bell.js',
                variable: '_tone_1120_FluidR3_GM_sf2_file',
                therapeutic: 'Estimula atenção plena',
                icon: '🔔'
            },
            'agogo': {
                name: 'Agogô',
                category: 'Percussão Suave',
                description: 'Sinos metálicos duplos',
                file: 'agogo.js',
                variable: '_tone_1130_FluidR3_GM_sf2_file',
                therapeutic: 'Marca ritmo terapêutico',
                icon: '🔔'
            },
            'steel_drums': {
                name: 'Steel Drums',
                category: 'Percussão Suave',
                description: 'Percussão tropical relaxante',
                file: 'steel_drums.js',
                variable: '_tone_1140_FluidR3_GM_sf2_file',
                therapeutic: 'Promove sentimentos de alegria e paz',
                icon: '🏝️'
            },
            'woodblock': {
                name: 'Bloco de Madeira',
                category: 'Percussão Suave',
                description: 'Percussão seca e clara',
                file: 'woodblock.js',
                variable: '_tone_1150_FluidR3_GM_sf2_file',
                therapeutic: 'Marca tempo para meditação',
                icon: '🪵'
            },
            
            // ===== SONS DA NATUREZA (2 instrumentos) =====
            'seashore': {
                name: 'Mar',
                category: 'Sons da Natureza',
                description: 'Ondas do oceano',
                file: 'seashore.js',
                variable: '_tone_1220_FluidR3_GM_sf2_file',
                therapeutic: 'Reduz estresse e ansiedade',
                icon: '🌊'
            },
            'bird_tweet': {
                name: 'Pássaros',
                category: 'Sons da Natureza',
                description: 'Canto de pássaros',
                file: 'bird_tweet.js',
                variable: '_tone_1230_FluidR3_GM_sf2_file',
                therapeutic: 'Conecta com natureza',
                icon: '🐦'
            }
        };
        
        this.init();
    }
    
    async init() {
        const totalInstruments = Object.keys(this.availableInstruments).length;
        console.log('🎼 Soundfont Manager inicializado com', totalInstruments, 'instrumentos terapêuticos (curados)');
        
        // Inicializar carregamento do catálogo completo em background
        this.loadFullCatalog();
        
        // Contar instrumentos por categoria
        const categories = {};
        Object.values(this.availableInstruments).forEach(inst => {
            categories[inst.category] = (categories[inst.category] || 0) + 1;
        });
        console.log('📊 Categorias disponíveis:', categories);
        
        // Inicializar player WebAudioFont com configurações de latência zero
        if (window.WebAudioFontPlayer) {
            this.player = new WebAudioFontPlayer();
            
            // Inicializar array de envelopes ativos
            this.activeEnvelopes = [];
            this.sustainedNotes = new Map();
            
            // Limpar envelopes finalizados periodicamente
            setInterval(() => {
                if (!this.activeEnvelopes || !this.audioEngine || !this.audioEngine.audioContext) {
                    return;
                }

                const now = this.audioEngine.audioContext.currentTime;
                this.activeEnvelopes = this.activeEnvelopes.filter(env => {
                    // Manter apenas envelopes que ainda estão tocando
                    return env && env.when && (env.when + env.duration > now);
                });
            }, 1000);
            
            console.log('✅ WebAudioFontPlayer inicializado (Latência Zero)');
        }
        
        // Carregar instrumento padrão (primeiro piano)
        await this.loadInstrument('piano_grand');
    }
    
    // ===== CARREGAMENTO DO CATÁLOGO COMPLETO =====
    
    async loadFullCatalog() {
        if (this.fullCatalog) {
            return this.fullCatalog;
        }
        
        if (!this.catalogLoadPromise) {
            this.catalogLoadPromise = (async () => {
                try {
                    const response = await fetch('soundfonts-manifest.json');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const manifest = await response.json();
                    this.fullCatalog = this.processCatalogManifest(manifest);
                    
                    console.log(`📦 Catálogo completo carregado: ${this.fullCatalog.size} soundfonts disponíveis`);
                    
                    // Notificar componentes que o catálogo está pronto
                    if (typeof window.dispatchEvent === 'function') {
                        window.dispatchEvent(new CustomEvent('soundfont-catalog-ready', { 
                            detail: { catalog: this.fullCatalog }
                        }));
                    }
                    
                    return this.fullCatalog;
                } catch (error) {
                    console.warn('⚠️ Não foi possível carregar catálogo completo:', error);
                    this.fullCatalog = new Map();
                    return this.fullCatalog;
                }
            })();
        }
        
        return this.catalogLoadPromise;
    }
    
    processCatalogManifest(manifest) {
        const catalog = new Map();
        
        if (!manifest || !manifest.files || !Array.isArray(manifest.files)) {
            return catalog;
        }
        
        manifest.files.forEach(entry => {
            if (!entry.variable) {
                return;
            }
            
            const key = entry.variable;
            const soundfontName = entry.soundfont || 'Unknown';
            const midiNumber = entry.midiNumber || '0000';
            const rawCategory = entry.category || 'Instrumentos';
            const subcategory = entry.subcategory || '';
            
            // Normalizar categoria
            const category = this.instrumentCategories 
                ? this.instrumentCategories.normalizeCategory(rawCategory)
                : rawCategory;
            
            // Nome amigável: "Piano Acústico de Cauda (FluidR3_GM)"
            const baseName = subcategory || `Instrumento ${midiNumber}`;
            const displayName = `${baseName} (${soundfontName})`;
            
            // Ícone da categoria
            const icon = this.instrumentCategories 
                ? this.instrumentCategories.getCategoryIcon(category)
                : '🎵';
            
            catalog.set(key, {
                key,
                variable: key,
                name: displayName,
                baseName,
                soundfont: soundfontName,
                midiNumber,
                category,
                subcategory,
                icon,
                url: entry.url,
                file: entry.file,
                size: entry.size,
                sha256: entry.sha256,
                therapeutic: this.instrumentCategories 
                    ? this.instrumentCategories.getTherapeuticBenefit(category)
                    : 'Benefícios terapêuticos variados'
            });
        });
        
        return catalog;
    }
    
    // Obter todos os instrumentos (curados + catálogo completo)
    async getAllAvailableInstruments() {
        await this.loadFullCatalog();
        
        const all = new Map();
        
        // Primeiro: instrumentos curados (prioritários)
        Object.entries(this.availableInstruments).forEach(([key, data]) => {
            all.set(key, {
                key,
                ...data,
                isCurated: true
            });
        });
        
        // Depois: catálogo completo (secundário)
        if (this.fullCatalog) {
            this.fullCatalog.forEach((data, key) => {
                if (!all.has(key)) {
                    all.set(key, {
                        ...data,
                        isCurated: false
                    });
                }
            });
        }
        
        return all;
    }
    
    // ===== INTEGRAÇÃO COM CATÁLOGO COMPLETO =====
    
    // Carregar instrumento do catálogo completo (URL direta do WebAudioFont)
    async loadInstrumentFromCatalog(instrumentKey) {
        await this.loadFullCatalog();
        
        if (!this.fullCatalog || !this.fullCatalog.has(instrumentKey)) {
            console.warn(`⚠️ Instrumento ${instrumentKey} não encontrado no catálogo`);
            return false;
        }
        
        const entry = this.fullCatalog.get(instrumentKey);
        
        // Se já carregado, apenas ativar
        if (this.loadedSoundfonts.has(instrumentKey)) {
            this.currentInstrument = instrumentKey;
            console.log(`✅ Instrumento ${entry.name} já carregado`);
            return true;
        }
        
        try {
            console.log(`⏳ Carregando ${entry.name} do catálogo...`);
            
            // Carregar via URL remoto
            const script = document.createElement('script');
            script.src = entry.url;
            
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error(`Falha ao carregar ${entry.url}`));
                setTimeout(() => reject(new Error('Timeout')), 15000);
            });
            
            document.head.appendChild(script);
            await loadPromise;
            
            // Verificar se a variável foi definida
            if (!window[entry.variable]) {
                throw new Error(`Variável ${entry.variable} não foi definida`);
            }
            
            // ✅ CORREÇÃO: Decodificar e preparar preset ANTES de armazenar
            if (this.player && this.audioEngine && this.audioEngine.audioContext) {
                if (this.player.loader && typeof this.player.loader.decodeAfterLoading === 'function') {
                    console.log(`🔧 Decodificando ${entry.name}...`);
                    this.player.loader.decodeAfterLoading(
                        this.audioEngine.audioContext,
                        entry.variable
                    );
                }
            }
            
            // ✅ CORREÇÃO: Preparar e validar preset (mesmo fluxo de loadFromCatalog)
            let preset;
            try {
                preset = await this.preparePreset(entry.variable);
                console.log(`✅ Preset ${entry.name} preparado com ${preset.zones?.length || 0} zones`);
            } catch (prepareError) {
                console.warn(`⚠️ Não foi possível preparar ${entry.name} completamente:`, prepareError.message);
                preset = window[entry.variable];
            }

            if (!preset) {
                throw new Error(`❌ Preset ${entry.variable} inválido após carregamento`);
            }
            
            // ✅ CORREÇÃO: Armazenar PRESET REAL (window[variable]), não objeto de metadados
            this.loadedSoundfonts.set(instrumentKey, preset);
            
            this.currentInstrument = instrumentKey;
            console.log(`✅ ${entry.name} carregado com sucesso no vk-config-select`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao carregar ${entry.name}:`, error);
            return false;
        }
    }

    async ensureProgramMapperReady() {
        if (!this.programMapper || typeof this.programMapper.setRuntimeConfigs !== 'function') {
            return null;
        }

        if (this.mappingConfigPromise) {
            return this.mappingConfigPromise;
        }

        this.mappingConfigPromise = (async () => {
            try {
                const [catalog, instrumentMapping, midiConfig] = await Promise.all([
                    this.fetchConfigJson('src/config/catalog.json'),
                    this.fetchConfigJson('src/config/instrumentMapping.json'),
                    this.fetchConfigJson('src/config/midi.json')
                ]);

                const payload = {};
                if (catalog) {
                    payload.catalog = catalog;
                }
                if (instrumentMapping) {
                    payload.instrumentMapping = instrumentMapping;
                }
                if (midiConfig) {
                    payload.midiConfig = midiConfig;
                    this.midiConfig = {
                        ...(this.midiConfig || {}),
                        ...midiConfig
                    };
                } else if (!this.midiConfig) {
                    this.midiConfig = {};
                }

                if (Object.keys(payload).length > 0) {
                    this.programMapper.setRuntimeConfigs(payload);
                }

                if (typeof window !== 'undefined') {
                    window.TerraMidiConfigs = {
                        ...(window.TerraMidiConfigs || {}),
                        ...(catalog ? { catalog } : {}),
                        ...(instrumentMapping ? { instrumentMapping } : {}),
                        midi: this.midiConfig
                    };
                }

                if (typeof this.programMapper.getState === 'function') {
                    const state = this.programMapper.getState();
                    if (state) {
                        console.log(`🎚️ ProgramCatalogMapper pronto (preset ${state.preset}, cobertura GM ${state.gmCoverage}/128)`);
                        if (state.preset && (!this.midiConfig || !this.midiConfig.mappingPreset)) {
                            this.midiConfig = {
                                ...(this.midiConfig || {}),
                                mappingPreset: state.preset
                            };
                        }
                    }
                }

                return {
                    catalogLoaded: Boolean(catalog),
                    mappingLoaded: Boolean(instrumentMapping),
                    midiLoaded: Boolean(midiConfig)
                };
            } catch (error) {
                console.warn('⚠️ Falha ao carregar configurações de mapeamento MIDI:', error);
                return null;
            }
        })();

        return this.mappingConfigPromise;
    }

    async fetchConfigJson(path) {
        try {
            const response = await fetch(path, { cache: 'no-store' });
            if (!response || !response.ok) {
                throw new Error(`HTTP ${response?.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`⚠️ Não foi possível carregar configuração ${path}:`, error.message || error);
            return null;
        }
    }

    getLastProgramMapping(channelIndex) {
        if (channelIndex === null || channelIndex === undefined) {
            return null;
        }
        return this.lastProgramMappings.get(channelIndex) || null;
    }

    async loadInstrumentForProgram({
        program,
        channel = 0,
        bank = null,
        preset = null,
        setCurrent = true,
        clearKit = false
    } = {}) {
        if (!this.programMapper || typeof this.programMapper.mapProgramToCatalog !== 'function') {
            console.warn('⚠️ Program mapper indisponível. Usando fluxo legado de loadInstrument sem tradução GM.');
            const legacySuccess = await this.loadInstrument(program, { setCurrent, clearKit });
            return {
                success: Boolean(legacySuccess),
                legacy: true,
                mapping: null,
                catalogId: typeof program === 'string' ? program : null
            };
        }

        await this.ensureProgramMapperReady();

        const normalizedBank = (bank && (Number.isFinite(bank.msb) || Number.isFinite(bank.lsb)))
            ? {
                msb: Number.isFinite(bank.msb) ? bank.msb : null,
                lsb: Number.isFinite(bank.lsb) ? bank.lsb : null
            }
            : null;

        const mapping = this.programMapper.mapProgramToCatalog(
            program,
            Number.isFinite(channel) ? channel : 0,
            normalizedBank,
            preset ? { preset } : {}
        );

        if (mapping?.ignored) {
            if (this.midiConfig?.verboseLogging) {
                console.log('🎚️ Program Change ignorado por regra de configuração:', {
                    program,
                    channel,
                    bank: normalizedBank,
                    mapping
                });
            }
            return {
                success: false,
                ignored: true,
                mapping
            };
        }

        const targetId = mapping?.catalogId;

        const loadTarget = async (catalogId, options = {}) => {
            const success = await this.loadInstrument(catalogId, {
                setCurrent: options.setCurrent ?? setCurrent,
                clearKit: options.clearKit ?? clearKit
            });
            return Boolean(success);
        };

        const fallbackEntry = typeof this.programMapper.resolveFallback === 'function'
            ? this.programMapper.resolveFallback(program)
            : null;

        if (!targetId) {
            if (fallbackEntry?.id) {
                const fallbackSuccess = await loadTarget(fallbackEntry.id);
                const fallbackMapping = {
                    ...(mapping || {}),
                    catalogId: fallbackEntry?.id || null,
                    name: fallbackEntry?.name || (mapping && mapping.name) || fallbackEntry?.id || null,
                    fallback: true
                };

                if (fallbackSuccess && Number.isFinite(channel)) {
                    this.lastProgramMappings.set(channel, {
                        program,
                        bank: normalizedBank,
                        catalogId: fallbackEntry.id,
                        mapping: fallbackMapping
                    });
                }
                return {
                    success: fallbackSuccess,
                    fallback: true,
                    mapping: fallbackMapping,
                    catalogId: fallbackEntry?.id || null
                };
            }

            return {
                success: false,
                mapping,
                error: 'catalogId-unavailable'
            };
        }

        const success = await loadTarget(targetId);

        if (!success) {
            if (fallbackEntry?.id && fallbackEntry.id !== targetId) {
                const fallbackSuccess = await loadTarget(fallbackEntry.id);
                const fallbackMapping = {
                    ...(mapping || {}),
                    catalogId: fallbackEntry.id,
                    name: fallbackEntry?.name || (mapping && mapping.name) || fallbackEntry.id,
                    fallback: true
                };

                if (fallbackSuccess && Number.isFinite(channel)) {
                    this.lastProgramMappings.set(channel, {
                        program,
                        bank: normalizedBank,
                        catalogId: fallbackEntry.id,
                        mapping: fallbackMapping
                    });
                }
                return {
                    success: fallbackSuccess,
                    fallback: true,
                    mapping: fallbackMapping,
                    catalogId: fallbackEntry.id
                };
            }

            return {
                success: false,
                mapping,
                catalogId: targetId
            };
        }

        if (Number.isFinite(channel)) {
            this.lastProgramMappings.set(channel, {
                program,
                bank: normalizedBank,
                catalogId: targetId,
                mapping
            });
        }

        return {
            success: true,
            mapping,
            catalogId: targetId
        };
    }
    
    // 🆕 INICIALIZAR SISTEMAS AVANÇADOS
    async initializeAdvancedSystems() {
        if (this.advancedSystemsReady) {
            return true;
        }

        if (!this._initializingAdvancedSystems) {
            this._initializingAdvancedSystems = (async () => {
                const maxAttempts = 30;
                let attempts = 0;

                while (attempts < maxAttempts) {
                    // ✅ CORREÇÃO: Verificar apenas módulos que EXISTEM (instrumentLoader, effectsManager)
                    // chordPlayer e envelopeGenerator não foram implementados ainda
                    const hasRequiredModules = window.instrumentLoader && window.effectsManager;
                    const hasOptionalModules = window.chordPlayer && window.envelopeGenerator;
                    
                    if (hasRequiredModules) {
                        this.loader = window.instrumentLoader;
                        this.effectsManager = window.effectsManager;
                        
                        // Módulos opcionais (futuros)
                        if (window.chordPlayer) {
                            this.chordPlayer = window.chordPlayer;
                        }
                        if (window.envelopeGenerator) {
                            this.envelopeGenerator = window.envelopeGenerator;
                        }
                        
                        this.mainChannel = window.effectsManager.channels.get('main');

                        // Inicializar gerenciador de notas sustentadas
                        this.sustainedNoteManager = new SustainedNoteManager(
                            this.audioEngine,
                            this.audioEngine.player
                        );

                        this.advancedSystemsReady = true;
                        const moduleStatus = hasOptionalModules ? 'completos' : 'parciais (alguns módulos opcionais ausentes)';
                        console.log(`✅ SoundfontManager: Sistemas avançados ${moduleStatus}`);
                        return true;
                    }

                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                // 🆕 Log detalhado dos módulos faltantes
                const missing = [];
                if (!window.instrumentLoader) missing.push('instrumentLoader');
                if (!window.effectsManager) missing.push('effectsManager');
                
                console.warn('⚠️ SoundfontManager: Módulos essenciais não disponíveis:', missing.join(', '));
                console.info('ℹ️ Sistema funcionará em modo legado (sem efeitos avançados)');
                return false;
            })();
        }

        const result = await this._initializingAdvancedSystems;
        if (result) {
            this._initializingAdvancedSystems = null;
        } else {
            // Permitir novas tentativas futuras
            this._initializingAdvancedSystems = null;
        }
        return result;
    }

    clearActiveDrumKit() {
        if (this.activeDrumKit) {
            console.log('🥁 Desativando kit de bateria atual');
        }
        this.activeDrumKit = null;
    }
    
    async loadFromCatalog(variation, options = {}) {
        try {
            const { url, variable, file } = variation;
            const preserveKit = options?.preserveKit === true;

            if (!preserveKit) {
                this.clearActiveDrumKit();
            }
            
            // 🆕 USAR LOADER DINÂMICO SE DISPONÍVEL
            if (this.loader) {
                console.log(`⬇️ Carregando ${file} com InstrumentLoader...`);
                // Passar apenas o nome do arquivo (file), NÃO a URL completa
                await this.loader.loadInstrument(file, variable);
                const preparedPreset = await this.preparePreset(variable);
                this.currentInstrument = variable;
                this.loadedSoundfonts.set(variable, preparedPreset);
                console.log(`✅ ${file} carregado com cache inteligente!`);
                return preparedPreset;
            }
            
            // Fallback: método tradicional
            if (window[variable]) {
                console.log(`✅ ${file} já carregado`);
                this.currentInstrument = variable;
                return window[variable];
            }
            
            console.log(`⬇️ Baixando ${file} do catálogo...`);
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                
                script.onload = async () => {
                    if (window[variable]) {
                        console.log(`✅ ${file} carregado com sucesso!`);
                        let prepared;
                        try {
                            prepared = await this.preparePreset(variable);
                        } catch (prepError) {
                            console.warn(`⚠️ Não foi possível preparar completamente ${file}:`, prepError.message);
                            prepared = window[variable];
                        }
                        this.currentInstrument = variable;
                        this.loadedSoundfonts.set(variable, prepared);
                        resolve(prepared);
                    } else {
                        reject(new Error(`Variável ${variable} não encontrada`));
                    }
                };
                
                script.onerror = () => {
                    console.error(`❌ Erro ao carregar ${file}`);
                    reject(new Error(`Falha ao carregar ${url}`));
                };
                
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('Erro ao carregar instrumento do catálogo:', error);
            throw error;
        }
    }

    async applyDrumKit(kitDescriptor) {
        if (!kitDescriptor || !Array.isArray(kitDescriptor.pieces) || !kitDescriptor.pieces.length) {
            throw new Error('Kit de bateria inválido.');
        }

        console.log(`🥁 Aplicando kit completo: ${kitDescriptor.label}`);
        this.clearActiveDrumKit();

        const availablePieces = kitDescriptor.pieces.filter(piece => piece && piece.variation && piece.variation.variable);
        if (!availablePieces.length) {
            throw new Error('Kit não possui peças com variações carregáveis.');
        }

        const usedPieceIds = new Set();
        const laneAssignments = [];

        KIT_LANE_NOTES.forEach((laneNote, index) => {
            const preferredGm = KIT_GM_PREFERRED[index];
            let chosen = availablePieces.find(piece => piece.gmNote === preferredGm && !usedPieceIds.has(piece.id));

            if (!chosen) {
                chosen = availablePieces.find(piece => !usedPieceIds.has(piece.id));
            }

            if (!chosen) {
                chosen = availablePieces[0];
            }

            if (chosen) {
                if (!usedPieceIds.has(chosen.id)) {
                    usedPieceIds.add(chosen.id);
                }
                laneAssignments.push({
                    laneNote,
                    piece: chosen
                });
            }
        });

        if (!laneAssignments.length) {
            throw new Error('Não foi possível mapear peças do kit para as teclas disponíveis.');
        }

        const assignmentsMap = new Map();
        let firstAssignment = null;

        for (const assignment of laneAssignments) {
            const { piece, laneNote } = assignment;
            const variation = piece.variation;

            try {
                const preset = await this.loadFromCatalog(variation, { preserveKit: true });
                const prepared = preset || this.loadedSoundfonts.get(variation.variable);

                if (prepared) {
                    assignmentsMap.set(laneNote, {
                        gmNote: piece.gmNote,
                        variation,
                        variable: variation.variable,
                        preset: prepared
                    });

                    if (!firstAssignment) {
                        firstAssignment = {
                            variation,
                            preset: prepared
                        };
                    }
                }
            } catch (error) {
                console.error(`❌ Falha ao carregar peça ${variation?.file} do kit`, error);
            }
        }

        if (!assignmentsMap.size) {
            throw new Error('Falha ao carregar as peças essenciais do kit.');
        }

        if (firstAssignment) {
            this.currentInstrument = firstAssignment.variation.variable;
        }

        this.activeDrumKit = {
            kitId: kitDescriptor.kitId,
            label: kitDescriptor.label,
            assignments: assignmentsMap,
            createdAt: Date.now()
        };

        console.log(`✅ Kit ${kitDescriptor.label} ativo com ${assignmentsMap.size} teclas mapeadas.`);
        return this.activeDrumKit;
    }
    
    // Tocar nota com instrumento do catálogo
    async playNoteFromCatalog(variation, note, duration = 0.5, velocity = 0.8) {
        try {
            // Carregar instrumento se necessário
            const preset = await this.loadFromCatalog(variation);
            
            if (!this.audioEngine.audioContext) {
                console.error('AudioContext não inicializado');
                return;
            }
            
            const midiNote = this.noteToMidi(note);
            const when = this.audioEngine.audioContext.currentTime;
            
            // Tocar nota
            if (this.player && preset) {
                this.player.queueWaveTable(
                    this.audioEngine.audioContext,
                    this.audioEngine.audioContext.destination,
                    preset,
                    when,
                    midiNote,
                    duration,
                    velocity
                );
                
                console.log(`🎵 Tocando nota ${note} (MIDI ${midiNote}) com ${variation.file}`);
            }
        } catch (error) {
            console.error('Erro ao tocar nota do catálogo:', error);
        }
    }
    
    // Método para obter instrumentos organizados por categoria
    getInstrumentsByCategory() {
        const categorized = {};
        
        Object.entries(this.availableInstruments).forEach(([key, instrument]) => {
            const cat = instrument.category;
            if (!categorized[cat]) {
                categorized[cat] = [];
            }
            categorized[cat].push({
                key: key,
                ...instrument
            });
        });
        
        return categorized;
    }
    
    // Método para obter lista de todas as categorias
    getCategories() {
        const categories = new Set();
        Object.values(this.availableInstruments).forEach(inst => {
            categories.add(inst.category);
        });
        return Array.from(categories).sort();
    }
    
    // Carregar um instrumento específico
    async loadInstrument(instrumentKey, options = {}) {
        const {
            setCurrent = true,
            clearKit = true
        } = options;

        // Verificar primeiro nos instrumentos curados
        if (this.availableInstruments[instrumentKey]) {
            return this.loadCuratedInstrument(instrumentKey, { setCurrent, clearKit });
        }
        
        // Tentar carregar do catálogo completo
        return this.loadInstrumentFromCatalog(instrumentKey);
    }
    
    // Carregar instrumento curado (local)
    async loadCuratedInstrument(instrumentKey, options = {}) {
        const {
            setCurrent = true,
            clearKit = true
        } = options;

        if (!this.availableInstruments[instrumentKey]) {
            console.error('❌ Instrumento não encontrado:', instrumentKey);
            return false;
        }

        if (clearKit) {
            this.clearActiveDrumKit();
        }
        
        // Se já está carregado, apenas mudar
        if (this.loadedSoundfonts.has(instrumentKey)) {
            if (setCurrent) {
                this.currentInstrument = instrumentKey;
                console.log('🎵 Instrumento alterado para:', this.availableInstruments[instrumentKey].name);
            } else {
                console.log('ℹ️ Instrumento já carregado:', this.availableInstruments[instrumentKey].name);
            }
            return true;
        }
        
        const instrument = this.availableInstruments[instrumentKey];
        
        console.log('📥 Carregando instrumento:', instrument.name);
        
        try {
            // Carregar o arquivo JavaScript do soundfont
            await this.loadScript(`./soundfonts/${instrument.file}`);
            
            if (!window[instrument.variable]) {
                console.error('❌ Variável do soundfont não encontrada:', instrument.variable);
                return false;
            }

            if (this.player && this.player.loader && typeof this.player.loader.decodeAfterLoading === 'function' && this.audioEngine.audioContext) {
                console.log(`🔧 Decodificando ${instrument.name}...`);
                this.player.loader.decodeAfterLoading(this.audioEngine.audioContext, instrument.variable);
            }

            let preset;
            try {
                preset = await this.preparePreset(instrument.variable);
            } catch (prepareError) {
                console.warn(`⚠️ Não foi possível preparar ${instrument.name} totalmente:`, prepareError.message);
                preset = window[instrument.variable];
            }

            if (!preset) {
                console.error('❌ Preset inválido após carregamento:', instrument.variable);
                return false;
            }

            this.loadedSoundfonts.set(instrumentKey, preset);
            if (setCurrent) {
                this.currentInstrument = instrumentKey;
                console.log(`✅ ${instrument.name} pronto! ${instrument.icon}`);
            } else {
                console.log(`✅ ${instrument.name} carregado em segundo plano ${instrument.icon}`);
            }
            return true;
        } catch (error) {
            console.error('❌ Erro ao carregar instrumento:', error);
            return false;
        }
    }

    async ensureInstrumentLoaded(instrumentKey) {
        if (!instrumentKey) {
            return this.loadedSoundfonts.get(this.currentInstrument) || null;
        }

        if (this.loadedSoundfonts.has(instrumentKey)) {
            return this.loadedSoundfonts.get(instrumentKey);
        }

        const success = await this.loadInstrument(instrumentKey, {
            setCurrent: false,
            clearKit: false
        });

        if (!success) {
            return null;
        }

        return this.loadedSoundfonts.get(instrumentKey) || null;
    }

    startSustainedNoteWithInstrument(note, instrumentKey, velocity = 0.8) {
        if (!instrumentKey || instrumentKey === this.currentInstrument) {
            return this.startSustainedNote(note, velocity);
        }

        if (!this.audioEngine.audioContext) {
            console.error('❌ Audio Context não inicializado');
            return null;
        }

        const preset = this.loadedSoundfonts.get(instrumentKey);
        
        // 🆕 VALIDAÇÃO ROBUSTA: verificar se preset está completamente carregado
        if (!preset) {
            console.warn(`⚠️ Instrumento ${instrumentKey} não carregado. Usando instrumento padrão.`);
            return this.startSustainedNote(note, velocity);
        }
        
        // 🆕 Verificar se o preset tem zones válidas
        if (!preset.zones || !Array.isArray(preset.zones) || preset.zones.length === 0) {
            console.warn(`⚠️ Preset ${instrumentKey} sem zones válidas. Usando instrumento padrão.`);
            return this.startSustainedNote(note, velocity);
        }

        // 🆕 Verificar se pelo menos uma zone tem buffer decodificado
        const hasValidBuffer = preset.zones.some(zone => zone && zone.buffer);
        if (!hasValidBuffer) {
            console.warn(`⚠️ Preset ${instrumentKey} ainda sem buffers decodificados. Usando instrumento padrão.`);
            return this.startSustainedNote(note, velocity);
        }

        if (!this.player) {
            console.warn(`⚠️ Player não disponível. Usando instrumento padrão.`);
            return this.startSustainedNote(note, velocity);
        }

        const targetNode = this.mainChannel ? this.mainChannel.input : this.audioEngine.masterGain;

        try {
            const midiNote = this.noteToMidi(note);

            if (!this.sustainedNotes) {
                this.sustainedNotes = new Map();
            }
            if (!this.activeEnvelopes) {
                this.activeEnvelopes = [];
            }

            const envelope = this.player.queueWaveTable(
                this.audioEngine.audioContext,
                targetNode,
                preset,
                this.audioEngine.audioContext.currentTime,
                midiNote,
                99999,
                velocity
            );

            if (!envelope) {
                console.warn(`⚠️ Falha ao criar envelope para ${instrumentKey}. Usando instrumento padrão.`);
                return this.startSustainedNote(note, velocity);
            }

            const noteId = `sf_${instrumentKey}_${note}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const noteEnvelopes = [envelope];
            this.activeEnvelopes.push(envelope);

            this.sustainedNotes.set(noteId, {
                envelope,
                envelopes: noteEnvelopes,
                note,
                midiNote,
                velocity,
                instrumentKey,
                startTime: this.audioEngine.audioContext.currentTime
            });

            console.log(`🎹 Nota iniciada com instrumento personalizado: ${note} [${instrumentKey}]`);
            return noteId;
        } catch (error) {
            console.error(`❌ Erro ao iniciar nota com ${instrumentKey}:`, error);
            return this.startSustainedNote(note, velocity);
        }
    }

    playNoteWithInstrument(note, instrumentKey, duration = 0.5, velocity = 0.8) {
        if (!instrumentKey || instrumentKey === this.currentInstrument) {
            return this.playNote(note, duration, velocity);
        }

        if (!this.audioEngine.audioContext) {
            console.error('❌ Audio Context não inicializado');
            return;
        }

        const preset = this.loadedSoundfonts.get(instrumentKey);
        if (!preset || !this.player) {
            console.warn(`⚠️ Instrumento ${instrumentKey} indisponível para reprodução imediata. Usando fallback.`);
            return this.playNote(note, duration, velocity);
        }

        try {
            const midiNote = this.noteToMidi(note);
            const targetNode = this.mainChannel ? this.mainChannel.input : this.audioEngine.masterGain;
            this.player.queueWaveTable(
                this.audioEngine.audioContext,
                targetNode,
                preset,
                this.audioEngine.audioContext.currentTime,
                midiNote,
                duration,
                velocity
            );
        } catch (error) {
            console.error('❌ Erro ao tocar nota personalizada:', error);
            return this.playNote(note, duration, velocity);
        }
    }
    
    // Carregar script dinamicamente
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Verificar se já foi carregado
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async preparePreset(variableName) {
        if (!variableName) {
            return null;
        }

        const isLargePreset = typeof variableName === 'string' && variableName.includes('FluidR3');
        const maxAttempts = isLargePreset ? 150 : 80; // Aumentado para dar mais tempo
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const checkPreset = () => {
                const preset = window[variableName];
                if (!preset) {
                    if (attempts++ >= maxAttempts) {
                        console.error(`❌ Preset ${variableName} não disponível após ${maxAttempts} tentativas`);
                        reject(new Error(`Preset ${variableName} não disponível`));
                        return;
                    }
                    const waitTime = Math.min(200, 75 + attempts * 5);
                    setTimeout(checkPreset, waitTime);
                    return;
                }

                // 🆕 VALIDAÇÃO ROBUSTA: verificar se preset tem estrutura mínima necessária
                if (!preset.zones || !Array.isArray(preset.zones) || preset.zones.length === 0) {
                    if (attempts++ >= maxAttempts) {
                        console.error(`❌ Preset ${variableName} sem zones válidas após ${maxAttempts} tentativas`);
                        reject(new Error(`Preset ${variableName} sem zones válidas`));
                        return;
                    }
                    const waitTime = Math.min(250, 75 + attempts * 7);
                    setTimeout(checkPreset, waitTime);
                    return;
                }

                // ✅ CORREÇÃO: Verificar se zones têm buffer OU dados para decodificação (sample/file)
                // Isso permite que o preset seja usado mesmo que a decodificação ainda esteja pendente
                const hasValidZones = preset.zones.some(zone => {
                    if (!zone) return false;
                    // Zone válida deve ter buffer (já decodificado) ou sample/file (para decodificação futura)
                    return zone.buffer || zone.sample || zone.file;
                });

                if (!hasValidZones) {
                    if (attempts++ >= maxAttempts) {
                        console.error(`❌ Preset ${variableName} sem zones válidas (sem buffer/sample/file) após ${maxAttempts} tentativas`);
                        reject(new Error(`Preset ${variableName} sem zones válidas`));
                        return;
                    }
                    const waitTime = Math.min(250, 75 + attempts * 7);
                    setTimeout(checkPreset, waitTime);
                    return;
                }

                // 🆕 Ajustar preset para garantir decodificação
                if (this.player && typeof this.player.adjustPreset === 'function' && this.audioEngine.audioContext) {
                    try {
                        this.player.adjustPreset(this.audioEngine.audioContext, preset);
                    } catch (error) {
                        console.warn(`⚠️ Falha ao ajustar preset ${variableName}:`, error);
                    }
                }
                
                // Contar zones com buffer vs zones totais
                const bufferedZones = preset.zones.filter(z => z && z.buffer).length;
                const totalZones = preset.zones.length;
                
                // ✅ ACEITAR preset se tiver zones válidas, mesmo que nem todas tenham buffer ainda
                console.log(`✅ Preset ${variableName} preparado: ${bufferedZones}/${totalZones} zones com buffer, ${totalZones - bufferedZones} aguardando decodificação`);
                resolve(preset);
            };

            checkPreset();
        });
    }
    
    // INICIAR NOTA SUSTENTADA (latência zero - como teclado real)
    startSustainedNote(note, velocity = 0.8) {
        if (!this.audioEngine.audioContext) {
            console.error('❌ Audio Context não inicializado');
            return null;
        }
        
        const soundfont = this.loadedSoundfonts.get(this.currentInstrument);
        if (!soundfont || !this.player) {
            console.log(`⚠️ Soundfont não disponível, usando audioEngine para ${note}`);
            const fallbackId = this.audioEngine.startSustainedNote(note);
            if (fallbackId) {
                return fallbackId;
            }

            const placeholderId = `drum_placeholder_${note}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            this.placeholderSustainedNotes.add(placeholderId);
            console.warn(`⚠️ Registrando placeholder para nota ${note} (kit/percussão sem sustain)`);
            return placeholderId;
        }
        
        // 🆕 USAR CANAL DE EFEITOS SE DISPONÍVEL
        const targetNode = this.mainChannel ? this.mainChannel.input : this.audioEngine.masterGain;
        
        try {
            // Mapear nota para MIDI
            const midiNote = this.noteToMidi(note);

            // Inicializar estruturas se necessário
            if (!this.sustainedNotes) {
                this.sustainedNotes = new Map();
            }
            if (!this.activeEnvelopes) {
                this.activeEnvelopes = [];
            }

            // Tocar nota com duração longa
            const envelope = this.player.queueWaveTable(
                this.audioEngine.audioContext,
                targetNode,
                soundfont,
                this.audioEngine.audioContext.currentTime,
                midiNote,
                99999,
                velocity
            );

            if (!envelope) {
                console.warn(`⚠️ Soundfont sem buffer ativo para ${note}. Usando sintetizador interno.`);
                return this.audioEngine.startSustainedNote(note);
            }

            const noteId = `sf_${note}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const noteEnvelopes = [envelope];

            // Adicionar ao array global de envelopes ativos
            this.activeEnvelopes.push(envelope);
            
            // Armazenar referência completa
            this.sustainedNotes.set(noteId, { 
                envelope, 
                envelopes: noteEnvelopes,
                note, 
                midiNote,
                velocity,
                startTime: this.audioEngine.audioContext.currentTime
            });
            
            console.log(`🎹 Nota iniciada (sustentada): ${note} [${noteId}] - ${noteEnvelopes.length} envelope(s)`);
            
            return noteId;
            
        } catch (error) {
            console.error('❌ Erro ao iniciar nota sustentada:', error);
            return this.audioEngine.startSustainedNote(note);
        }
    }
    
    // PARAR NOTA SUSTENTADA (release suave como ao soltar tecla)
    stopSustainedNote(noteId) {
        if (!noteId) return;

        // Compatibilidade: aceitar notas (ex.: "C5") e converter para o identificador interno correspondente
        if (
            typeof noteId === 'string' &&
            !noteId.startsWith('sf_') &&
            this.sustainedNotes instanceof Map &&
            this.sustainedNotes.size > 0
        ) {
            const matchingEntry = Array.from(this.sustainedNotes.entries()).reverse()
                .find(([, data]) => data?.note === noteId || data?.midiNote === this.noteToMidi(noteId));

            if (matchingEntry) {
                noteId = matchingEntry[0];
            }
        }
        
        // Se não for nota do soundfont, usar audioEngine
        if (this.placeholderSustainedNotes && this.placeholderSustainedNotes.has(noteId)) {
            this.placeholderSustainedNotes.delete(noteId);
            return;
        }

        if (!noteId.startsWith('sf_')) {
            this.audioEngine.stopSustainedNote(noteId);
            return;
        }
        
        if (!this.sustainedNotes || !this.sustainedNotes.has(noteId)) {
            console.warn(`⚠️ Nota ${noteId} não encontrada nos sustentados`);
            return;
        }
        
        try {
            const noteData = this.sustainedNotes.get(noteId);
            const currentTime = this.audioEngine.audioContext.currentTime;
            const releaseDuration = 0.12; // Release rápido mas suave
            
            console.log(`🎹 Aplicando release em ${noteData.note} - ${noteData.envelopes.length} envelopes`);
            
            // Aplicar release em TODOS os envelopes desta nota específica
            if (noteData.envelopes && noteData.envelopes.length > 0) {
                noteData.envelopes.forEach((env, index) => {
                    if (env && env.audioBufferSourceNode) {
                        try {
                            // Aplicar fade out suave no gainNode
                            if (env.gainNode && env.gainNode.gain) {
                                const currentGain = env.gainNode.gain.value || 0.5;
                                env.gainNode.gain.cancelScheduledValues(currentTime);
                                env.gainNode.gain.setValueAtTime(currentGain, currentTime);
                                env.gainNode.gain.linearRampToValueAtTime(0.001, currentTime + releaseDuration);
                            }
                            
                            // Parar o source node após o release
                            const stopTime = currentTime + releaseDuration + 0.05;
                            env.audioBufferSourceNode.stop(stopTime);
                            
                            console.log(`  ✓ Envelope ${index} - release aplicado`);
                        } catch (e) {
                            console.log(`  ⚠️ Envelope ${index} - ${e.message}`);
                        }
                    }
                });
                
                // Remover envelopes do array global
                this.activeEnvelopes = this.activeEnvelopes.filter(env => 
                    !noteData.envelopes.includes(env)
                );
            }
            
            // Remover da lista de sustentados
            this.sustainedNotes.delete(noteId);
            
            console.log(`✅ Nota ${noteData.note} parada (release ${releaseDuration}s)`);
            
        } catch (error) {
            console.error('❌ Erro ao parar nota sustentada:', error);
            this.sustainedNotes.delete(noteId);
        }
    }
    
    // Reproduzir nota com o instrumento atual (versão curta - para melodias)
    async playNote(note, duration = 0.5, velocity = 0.8) {
        if (!this.audioEngine.audioContext) {
            console.error('❌ Audio Context não inicializado');
            return;
        }

        if (this.activeDrumKit && typeof note === 'string') {
            const assignment = this.activeDrumKit.assignments?.get(note);
            if (assignment) {
                return this.playDrumKitAssignment(assignment, duration, velocity);
            }
        }
        
        const soundfont = this.loadedSoundfonts.get(this.currentInstrument);
        if (!soundfont) {
            return this.audioEngine.playNote(note, duration);
        }
        
        try {
            // Verificar se WebAudioFontPlayer está disponível
            if (!this.player) {
                console.warn('⚠️ Player não inicializado');
                return this.audioEngine.playNote(note, duration);
            }
            
            // Mapear nota para MIDI
            const midiNote = this.noteToMidi(note);
            
            // Tocar IMEDIATAMENTE (when = 0) - LATÊNCIA ZERO
            const when = 0;
            const volumeLevel = velocity;
            
            // Tocar com WebAudioFont
            const envelope = this.player.queueWaveTable(
                this.audioEngine.audioContext,
                this.audioEngine.masterGain,
                soundfont,
                when,
                midiNote,
                duration,
                volumeLevel
            );

            if (!envelope) {
                console.warn(`⚠️ Preset ainda não pronto para ${note}. Usando sintetizador interno.`);
                return this.audioEngine.playNote(note, duration);
            }

            return;
            
        } catch (error) {
            console.error('❌ Erro ao tocar soundfont:', error);
            return this.audioEngine.playNote(note, duration);
        }
        
        try {
            // Mapear nota para MIDI
            const midiNote = this.noteToMidi(note);
            
            // Usar o método de reprodução do WebAudioFont
            const when = this.audioEngine.audioContext.currentTime;
            const pitch = midiNote;
            const vol = velocity;
            
            // WebAudioFont usa uma estrutura específica de zones
            if (soundfont.zones && soundfont.zones.length > 0) {
                // Encontrar a zona apropriada para a nota
                let zone = this.findZoneForNote(soundfont, midiNote);
                
                if (zone && zone.sample) {
                    await this.playWebAudioFontNote(zone, when, pitch, vol, duration);
                    return;
                }
            }
            
            // Se não conseguir reproduzir com soundfont, usar fallback
            console.warn('⚠️ Usando fallback para nota:', note);
            return this.audioEngine.playNote(note, duration);
            
        } catch (error) {
            console.error('❌ Erro ao reproduzir nota com soundfont:', error);
            // Fallback para oscillator básico
            return this.audioEngine.playNote(note, duration);
        }
    }
    
    // Converter nota para número MIDI
    noteToMidi(note) {
        if (typeof note === 'number' && Number.isFinite(note)) {
            return Math.max(0, Math.min(127, Math.round(note)));
        }

        // Preferir utilitário dedicado para lidar com bemóis, sustenidos e oitavas
        if (this.noteMappingUtils && typeof this.noteMappingUtils.noteToMidi === 'function') {
            return this.noteMappingUtils.noteToMidi(note);
        }

        if (typeof NoteMappingUtils === 'function') {
            this.noteMappingUtils = new NoteMappingUtils();
            if (typeof this.noteMappingUtils.noteToMidi === 'function') {
                return this.noteMappingUtils.noteToMidi(note);
            }
        }

        if (typeof note === 'string') {
            const numericValue = parseInt(note, 10);
            if (Number.isFinite(numericValue)) {
                return Math.max(0, Math.min(127, numericValue));
            }
        }

        console.warn('⚠️ Nota desconhecida sem NoteMappingUtils disponível:', note, 'usando C4 (60)');
        return 60;
    }

    async playDrumKitAssignment(assignment, duration, velocity) {
        if (!this.player) {
            console.warn('⚠️ Player não inicializado para reprodução de kit.');
            return this.audioEngine.playNote(assignment.gmNote, duration);
        }

        let preset = assignment.preset || this.loadedSoundfonts.get(assignment.variable);

        if (!preset) {
            try {
                preset = await this.loadFromCatalog(assignment.variation, { preserveKit: true });
                assignment.preset = preset || this.loadedSoundfonts.get(assignment.variable);
            } catch (error) {
                console.error('❌ Erro ao recarregar peça do kit:', error);
                return this.audioEngine.playNote(assignment.gmNote, duration);
            }
        }

        const midiNote = assignment.gmNote;
        const when = 0;
        const volumeLevel = velocity;

        try {
            this.player.queueWaveTable(
                this.audioEngine.audioContext,
                this.audioEngine.masterGain,
                preset,
                when,
                midiNote,
                duration,
                volumeLevel
            );
        } catch (error) {
            console.error('❌ Erro ao tocar peça do kit:', error);
            return this.audioEngine.playNote(midiNote, duration);
        }
    }
    
    // Encontrar zona apropriada para a nota MIDI
    findZoneForNote(soundfont, midiNote) {
        if (!soundfont.zones) return null;
        
        // Procurar zona que cubra a nota MIDI
        for (let zone of soundfont.zones) {
            const low = zone.keyRangeLow || 0;
            const high = zone.keyRangeHigh || 127;
            
            if (midiNote >= low && midiNote <= high) {
                return zone;
            }
        }
        
        // Se não encontrar, usar a primeira zona
        return soundfont.zones[0] || null;
    }
    
    // Reproduzir nota usando WebAudioFont
    async playWebAudioFontNote(zone, when, pitch, velocity, duration) {
        try {
            if (!zone.sample) {
                console.warn('⚠️ Zona sem sample');
                return;
            }
            
            // Decodificar dados do sample se necessário
            let audioBuffer = await this.decodeWebAudioFontSample(zone);
            
            if (!audioBuffer) {
                console.warn('⚠️ Não foi possível decodificar sample');
                return;
            }
            
            // Criar e configurar fonte de áudio
            const source = this.audioEngine.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Configurar ganho
            const gainNode = this.audioEngine.audioContext.createGain();
            gainNode.gain.setValueAtTime(velocity * 0.8, when);
            gainNode.gain.exponentialRampToValueAtTime(0.001, when + duration);
            
            // Configurar pitch se necessário
            const originalPitch = zone.originalPitch || 6000;
            const targetPitch = pitch * 100; // converter para cents
            const pitchRatio = Math.pow(2, (targetPitch - originalPitch) / 1200);
            source.playbackRate.value = pitchRatio;
            
            // Conectar e reproduzir
            source.connect(gainNode);
            gainNode.connect(this.audioEngine.masterGain);
            
            source.start(when);
            source.stop(when + duration);
            
        } catch (error) {
            console.error('❌ Erro ao reproduzir nota WebAudioFont:', error);
            throw error;
        }
    }
    
    // Decodificar sample do WebAudioFont
    async decodeWebAudioFontSample(zone) {
        try {
            // WebAudioFont samples são arrays de números
            if (!zone.sample || !Array.isArray(zone.sample)) {
                return null;
            }
            
            const sampleRate = zone.sampleRate || 44100;
            const sampleData = zone.sample;
            
            // Criar AudioBuffer
            const audioBuffer = this.audioEngine.audioContext.createBuffer(
                1, // mono
                sampleData.length,
                sampleRate
            );
            
            // Copiar dados do sample
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < sampleData.length; i++) {
                // Converter para float [-1, 1]
                channelData[i] = sampleData[i] / 32768.0;
            }
            
            return audioBuffer;
            
        } catch (error) {
            console.error('❌ Erro ao decodificar sample:', error);
            return null;
        }
    }
    
    // Criar buffer de áudio a partir do soundfont
    async createAudioBuffer(soundfontData, midiNote, velocity) {
        try {
            // Este é um método simplificado - na prática, soundfonts WebAudio
            // requerem decodificação mais complexa
            if (!soundfontData.zones || soundfontData.zones.length === 0) {
                return null;
            }
            
            // Encontrar a zona apropriada para a nota MIDI
            let zone = soundfontData.zones.find(z => 
                midiNote >= (z.keyRangeLow || 0) && 
                midiNote <= (z.keyRangeHigh || 127)
            ) || soundfontData.zones[0];
            
            if (!zone.sample) {
                return null;
            }
            
            // Criar buffer de áudio
            const sampleRate = this.audioEngine.audioContext.sampleRate;
            const buffer = this.audioEngine.audioContext.createBuffer(
                1, // mono
                zone.sample.length,
                sampleRate
            );
            
            // Copiar dados da amostra
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < zone.sample.length; i++) {
                channelData[i] = zone.sample[i] * velocity;
            }
            
            return buffer;
            
        } catch (error) {
            console.error('❌ Erro ao criar buffer de áudio:', error);
            return null;
        }
    }
    
    // Obter informações do instrumento atual
    getCurrentInstrument() {
        return this.availableInstruments[this.currentInstrument];
    }
    
    // Obter lista de instrumentos disponíveis
    getAvailableInstruments() {
        return this.availableInstruments;
    }
    
    // Verificar se instrumento está carregado
    isInstrumentLoaded(instrumentKey) {
        return this.loadedSoundfonts.has(instrumentKey);
    }
    
    // Pré-carregar todos os instrumentos
    async preloadAllInstruments() {
        console.log('📥 Pré-carregando todos os instrumentos...');
        const promises = Object.keys(this.availableInstruments).map(key =>
            this.loadInstrument(key)
        );
        
        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`✅ ${loaded}/${Object.keys(this.availableInstruments).length} instrumentos pré-carregados`);
        return loaded;
    }
    
    // Obter cor da nota (compatibilidade com Board Bells-08)
    getNoteColor(note) {
        return this.audioEngine.getNoteColor(note);
    }
}

// Integração com WebAudioFont (método simplificado)
// Para funcionar completamente, seria necessário implementar um decodificador
// completo de soundfont ou usar uma biblioteca como WebAudioFont
window.SoundfontManager = SoundfontManager;