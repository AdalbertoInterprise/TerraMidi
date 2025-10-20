// Catalog Manager - Sistema completo de catálogo WebAudioFont com 1.400+ instrumentos
const BASE_SOUNDFONTS = [
    'Aspirin',
    'Chaos',
    'FluidR3_GM',
    'GeneralUserGS',
    'JCLive'
];

const DRUM_SOUNDFONT_BANKS = {
    Chaos: ['4'],
    JCLive: ['12', '16', '18']
};

const DRUM_SOUNDFONT_LABELS = {
    Chaos: 'Chaos',
    JCLive: 'JCLive'
};

const GM_DRUM_NOTES = Array.from({ length: 47 }, (_, index) => 35 + index);

const GM_DRUM_TITLES_PT = {
    35: 'Bumbo Acústico 2',
    36: 'Bumbo Acústico 1',
    37: 'Rimshot / Side Stick',
    38: 'Caixa 1',
    39: 'Palma',
    40: 'Caixa 2',
    41: 'Tom Baixo 2',
    42: 'Chimbal Fechado',
    43: 'Tom Baixo 1',
    44: 'Chimbal com Pedal',
    45: 'Tom Médio 2',
    46: 'Chimbal Aberto',
    47: 'Tom Médio 1',
    48: 'Tom Alto 2',
    49: 'Prato de Ataque 1',
    50: 'Tom Alto 1',
    51: 'Prato de Condução 1',
    52: 'Prato Chinês',
    53: 'Sino de Prato',
    54: 'Pandeiro',
    55: 'Prato Splash',
    56: 'Cowbell',
    57: 'Prato de Ataque 2',
    58: 'Vibra Slap',
    59: 'Prato de Condução 2',
    60: 'Bongô Alto',
    61: 'Bongô Baixo',
    62: 'Conga Alta (surda)',
    63: 'Conga Alta (aberta)',
    64: 'Conga Baixa',
    65: 'Timbal Alto',
    66: 'Timbal Baixo',
    67: 'Agogô Alto',
    68: 'Agogô Baixo',
    69: 'Cabasa',
    70: 'Maracas',
    71: 'Apito Curto',
    72: 'Apito Longo',
    73: 'Reco-reco Curto',
    74: 'Reco-reco Longo',
    75: 'Claves',
    76: 'Bloco de Madeira Alto',
    77: 'Bloco de Madeira Baixo',
    78: 'Cuíca Surda',
    79: 'Cuíca Aberta',
    80: 'Triângulo Surdo',
    81: 'Triângulo Aberto'
};

const CURATED_ACOUSTIC_KIT_ORDER = Object.freeze([
    36, // Bumbo Acústico 1
    38, // Caixa 1
    37, // Rimshot / Side Stick
    42, // Chimbal Fechado
    44, // Chimbal com Pedal
    46, // Chimbal Aberto
    43, // Tom Baixo 1
    45, // Tom Médio 2
    48, // Tom Alto 2
    49, // Prato de Ataque 1
    51, // Prato de Condução 1
    57  // Prato de Ataque 2
]);

const CURATED_ACOUSTIC_KIT_SET = new Set(CURATED_ACOUSTIC_KIT_ORDER);

function kitLabelSort(a, b) {
    return a.label.localeCompare(b.label, 'pt-BR');
}

const EXTRA_SOUNDFONTS_BY_MIDI = {
    '0250': ['Acoustic_Guitar'],
    '0270': ['SBAWE32', 'Stratocaster'],
    '0280': ['LesPaul'],
    '0290': ['LesPaul'],
    '0300': ['LesPaul'],
    '0310': ['LesPaul'],
    '0520': ['Soul_Ahhs']
};

const REMOTE_BASE_URLS = [
    'https://surikov.github.io/webaudiofontdata/sound/',
    'https://cdn.jsdelivr.net/gh/surikov/webaudiofontdata@latest/sound/'
];

class CatalogManager {
    constructor() {
        this.remoteSources = REMOTE_BASE_URLS;
        this.baseURL = this.remoteSources[0];
        this.favorites = this.loadFavorites();
        this.downloadedInstruments = new Set();
        this.currentCategory = null;
        
        // Catálogo completo do WebAudioFont - MIDI GM Standard
        // Estrutura: categoria -> subcategoria -> variações
        this.fullCatalog = {
            // ===== PIANOS (128 variações) =====
            'Pianos': {
                'Piano Acústico de Cauda': this.generateVariations('0000', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive', 
                    'SBLive', 'SoundBlasterOld', 'sgm_Plus', 'Timbres_Of_Heaven'
                ]),
                'Piano Acústico Brilhante': this.generateVariations('0010', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'sgm_Plus', 'Timbres_Of_Heaven'
                ]),
                'Piano Elétrico de Cauda': this.generateVariations('0020', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'sgm_Plus'
                ]),
                'Piano Honky-tonk': this.generateVariations('0030', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Piano Elétrico 1': this.generateVariations('0040', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'LesPaul', 'RX7'
                ]),
                'Piano Elétrico 2': this.generateVariations('0050', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'DX7', 'CP80'
                ]),
                'Cravo': this.generateVariations('0060', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Clavinet': this.generateVariations('0070', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== PERCUSSÃO MELÓDICA (104 variações) =====
            'Percussão Melódica': {
                'Celesta': this.generateVariations('0080', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Glockenspiel': this.generateVariations('0090', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Caixa de Música': this.generateVariations('0100', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Music_Box'
                ]),
                'Vibrafone': this.generateVariations('0110', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Marimba': this.generateVariations('0120', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Marimba'
                ]),
                'Xilofone': this.generateVariations('0130', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Sinos Tubulares': this.generateVariations('0140', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Tubular_Bells'
                ]),
                'Dulcimer': this.generateVariations('0150', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== ÓRGÃOS (70 variações) =====
            'Órgãos': {
                'Órgão Drawbar': this.generateVariations('0160', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'B3'
                ]),
                'Órgão Percussivo': this.generateVariations('0170', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Órgão Rock': this.generateVariations('0180', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Órgão de Igreja': this.generateVariations('0190', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Church_Organ'
                ]),
                'Órgão de Palheta': this.generateVariations('0200', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Acordeão': this.generateVariations('0210', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Harmônica': this.generateVariations('0220', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Bandoneon': this.generateVariations('0230', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== GUITARRAS (140 variações) =====
            'Guitarras': {
                'Violão Nylon': this.generateVariations('0240', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'LK_Godin_Nylon', 'SBLive', 'SoundBlasterOld', 'Classical'
                ]),
                'Violão Aço': this.generateVariations('0250', [
                    'Acoustic_Guitar', 'Aspirin', 'Chaos', 'FluidR3_GM', 
                    'GeneralUserGS', 'JCLive', 'LK_AcousticSteel', 'SBLive', 
                    'SoundBlasterOld', 'Steel_String'
                ]),
                'Guitarra Jazz': this.generateVariations('0260', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Jazz_Guitar'
                ]),
                'Guitarra Clean': this.generateVariations('0270', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 
                    'Gibson_Les_Paul', 'JCLive', 'SBAWE32', 'SBLive', 
                    'SoundBlasterOld', 'Stratocaster'
                ]),
                'Guitarra Muted': this.generateVariations('0280', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'LesPaul', 'SBLive', 'SoundBlasterOld'
                ]),
                'Guitarra Overdrive': this.generateVariations('0290', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'LesPaul', 'SBLive', 'SoundBlasterOld', 'Overdriven'
                ]),
                'Guitarra Distorção': this.generateVariations('0300', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'LesPaul', 'SBLive', 'SoundBlasterOld', 'Distortion'
                ]),
                'Harmônicos de Guitarra': this.generateVariations('0310', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'LesPaul', 'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== BAIXOS (80 variações) =====
            'Baixos': {
                'Contrabaixo Acústico': this.generateVariations('0320', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Upright_Bass'
                ]),
                'Baixo Elétrico (Finger)': this.generateVariations('0330', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Fender_Bass'
                ]),
                'Baixo Elétrico (Pick)': this.generateVariations('0340', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Baixo Fretless': this.generateVariations('0350', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Slap Bass 1': this.generateVariations('0360', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Slap Bass 2': this.generateVariations('0370', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Synth Bass 1': this.generateVariations('0380', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'TB303'
                ]),
                'Synth Bass 2': this.generateVariations('0390', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Moog'
                ])
            },
            
            // ===== CORDAS (90 variações) =====
            'Cordas': {
                'Violino': this.generateVariations('0400', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Stradivarius'
                ]),
                'Viola': this.generateVariations('0410', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Violoncelo': this.generateVariations('0420', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Cello'
                ]),
                'Contrabaixo': this.generateVariations('0430', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Cordas Tremolo': this.generateVariations('0440', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Cordas Pizzicato': this.generateVariations('0450', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Harpa Orquestral': this.generateVariations('0460', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Harp'
                ]),
                'Tímpano': this.generateVariations('0470', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Timpani'
                ]),
                'Conjunto de Cordas 1': this.generateVariations('0480', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'String_Ensemble'
                ]),
                'Conjunto de Cordas 2': this.generateVariations('0490', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Cordas Sintéticas 1': this.generateVariations('0500', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Cordas Sintéticas 2': this.generateVariations('0510', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== VOZES (40 variações) =====
            'Vozes': {
                'Coral Aahs': this.generateVariations('0520', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'Soul_Ahhs', 'SoundBlasterOld'
                ]),
                'Vozes Oohs': this.generateVariations('0530', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Choir'
                ]),
                'Synth Voice': this.generateVariations('0540', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Orchestra Hit': this.generateVariations('0550', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== METAIS (56 variações) =====
            'Metais': {
                'Trompete': this.generateVariations('0560', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Trombone': this.generateVariations('0570', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Tuba': this.generateVariations('0580', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Trompete com Surdina': this.generateVariations('0590', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Trompa': this.generateVariations('0600', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'French_Horn'
                ]),
                'Seção de Metais': this.generateVariations('0610', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Synth Brass 1': this.generateVariations('0620', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Synth Brass 2': this.generateVariations('0630', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== PALHETAS (32 variações) =====
            'Palhetas': {
                'Sax Soprano': this.generateVariations('0640', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Sax Alto': this.generateVariations('0650', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Alto_Sax'
                ]),
                'Sax Tenor': this.generateVariations('0660', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Tenor_Sax'
                ]),
                'Sax Barítono': this.generateVariations('0670', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Oboé': this.generateVariations('0680', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Corne Inglês': this.generateVariations('0690', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Fagote': this.generateVariations('0700', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Clarinete': this.generateVariations('0710', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Clarinet'
                ])
            },
            
            // ===== FLAUTAS (80 variações) =====
            'Flautas': {
                'Píccolo': this.generateVariations('0720', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Flauta': this.generateVariations('0730', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Flute'
                ]),
                'Flauta Doce': this.generateVariations('0740', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Flauta de Pã': this.generateVariations('0750', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Pan_Flute'
                ]),
                'Garrafa Soprada': this.generateVariations('0760', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Shakuhachi': this.generateVariations('0770', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Apito': this.generateVariations('0780', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Ocarina': this.generateVariations('0790', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== SYNTH LEADS (80 variações) =====
            'Synth Leads': {
                'Lead Square': this.generateVariations('0800', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Sawtooth': this.generateVariations('0810', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Calliope': this.generateVariations('0820', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Chiff': this.generateVariations('0830', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Charang': this.generateVariations('0840', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Voice': this.generateVariations('0850', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Fifths': this.generateVariations('0860', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Lead Bass+Lead': this.generateVariations('0870', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== SYNTH PADS (88 variações) =====
            'Synth Pads': {
                'Pad New Age': this.generateVariations('0880', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Warm': this.generateVariations('0890', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Polysynth': this.generateVariations('0900', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Choir': this.generateVariations('0910', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Bowed': this.generateVariations('0920', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Metallic': this.generateVariations('0930', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Halo': this.generateVariations('0940', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Pad Sweep': this.generateVariations('0950', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== EFEITOS AMBIENTAIS (96 variações) =====
            'Efeitos Ambientais': {
                'FX Rain': this.generateVariations('0960', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Soundtrack': this.generateVariations('0970', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Crystal': this.generateVariations('0980', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Atmosphere': this.generateVariations('0990', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Brightness': this.generateVariations('1000', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Goblins': this.generateVariations('1010', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Echoes': this.generateVariations('1020', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'FX Sci-Fi': this.generateVariations('1030', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== INSTRUMENTOS ÉTNICOS (88 variações) =====
            'Instrumentos Étnicos': {
                'Sitar': this.generateVariations('1040', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Sitar'
                ]),
                'Banjo': this.generateVariations('1050', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Shamisen': this.generateVariations('1060', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Koto': this.generateVariations('1070', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Koto'
                ]),
                'Kalimba': this.generateVariations('1080', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Gaita de Foles': this.generateVariations('1090', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Fiddle': this.generateVariations('1100', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Shanai': this.generateVariations('1110', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },
            
            // ===== PERCUSSÃO SUAVE (56 variações) =====
            'Percussão Suave': {
                'Sininho': this.generateVariations('1120', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Agogô': this.generateVariations('1130', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Steel Drums': this.generateVariations('1140', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Steel_Drums'
                ]),
                'Woodblock': this.generateVariations('1150', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Taiko Drum': this.generateVariations('1160', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Melodic Tom': this.generateVariations('1170', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Synth Drum': this.generateVariations('1180', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ])
            },

            // ===== BATERIAS GM (188 variações) =====
            'Baterias GM': this.buildDrumCatalog(),
            
            // ===== SONS DA NATUREZA (180 variações) =====
            'Sons da Natureza': {
                'Pássaros': this.generateVariations('1230', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Birds'
                ]),
                'Mar/Oceano': this.generateVariations('1220', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Seashore', 'Ocean_Waves'
                ]),
                'Helicóptero': this.generateVariations('1250', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld'
                ]),
                'Aplausos': this.generateVariations('1260', [
                    'Aspirin', 'Chaos', 'FluidR3_GM', 'GeneralUserGS', 'JCLive',
                    'SBLive', 'SoundBlasterOld', 'Applause'
                ])
            }
        };

        this.drumKitIndex = this.buildDrumKitIndex();
    }
    
    // Gerar variações de instrumento baseado no número MIDI e soundfonts
    generateVariations(midiNumber, soundfonts) {
        const allowed = new Set([
            ...BASE_SOUNDFONTS,
            ...(EXTRA_SOUNDFONTS_BY_MIDI[midiNumber] || [])
        ]);

        const validSoundfonts = soundfonts.filter(sf => allowed.has(sf));

        return validSoundfonts.map(sf => ({
            midiNumber: midiNumber,
            soundfont: sf,
            file: `${midiNumber}_${sf}_sf2_file.js`,
            variable: `_tone_${midiNumber}_${sf}_sf2_file`,
            url: `${this.baseURL}${midiNumber}_${sf}_sf2_file.js`
        }));
    }

    buildDrumCatalog() {
        const catalog = {};

        GM_DRUM_NOTES.forEach(noteNumber => {
            const title = GM_DRUM_TITLES_PT[noteNumber] || `Percussão GM ${noteNumber}`;
            const subcategory = `${noteNumber} — ${title}`;
            const variations = this.generateDrumVariations(noteNumber);

            if (variations.length) {
                catalog[subcategory] = variations.sort((a, b) => a.soundfont.localeCompare(b.soundfont, 'pt-BR'));
            }
        });

        return catalog;
    }

    generateDrumVariations(noteNumber) {
        // ✅ CORREÇÃO: NÃO usar padStart para o nome da variável (arquivos usam número sem zero à esquerda)
        // Mas USAR padStart para o nome do arquivo (arquivos físicos têm zero: 12835_4_Chaos_sf2_file.js)
        const noteStrPadded = String(noteNumber).padStart(2, '0'); // Para nome do arquivo
        const noteStrRaw = String(noteNumber); // Para nome da variável (sem zero à esquerda)
        const variations = [];

        Object.entries(DRUM_SOUNDFONT_BANKS).forEach(([soundfontKey, banks]) => {
            const labelBase = DRUM_SOUNDFONT_LABELS[soundfontKey] || soundfontKey;

            banks.forEach(bank => {
                const bankLabel = bank === '0' ? labelBase : `${labelBase} (Banco ${bank})`;
                // Nome do arquivo usa número com zero à esquerda: 12835_4_Chaos_sf2_file.js
                const fileBase = `128${noteStrPadded}_${bank}_${soundfontKey}_sf2_file`;

                variations.push({
                    midiNumber: noteNumber.toString(),
                    gmNote: noteNumber,
                    bank,
                    soundfont: bankLabel,
                    soundfontKey,
                    file: `${fileBase}.js`,
                    // ✅ CORREÇÃO: Variável usa número SEM zero à esquerda: _drum_35_4_Chaos_sf2_file
                    variable: `_drum_${noteStrRaw}_${bank}_${soundfontKey}_sf2_file`,
                    url: `${this.baseURL}${fileBase}.js`,
                    isPercussion: true
                });
            });
        });

        return variations;
    }

    buildDrumKitIndex() {
        const drumCategory = this.fullCatalog['Baterias GM'] || {};
        const kitMap = new Map();

        Object.entries(drumCategory).forEach(([subcategory, variations]) => {
            variations.forEach((variation, variationIndex) => {
                if (!variation?.isPercussion) return;

                const soundfontKey = variation.soundfontKey || variation.soundfont;
                const bank = variation.bank || '0';
                const kitId = `${soundfontKey}::${bank}`;

                if (!kitMap.has(kitId)) {
                    kitMap.set(kitId, {
                        id: kitId,
                        label: variation.soundfont,
                        soundfontKey,
                        bank,
                        pieces: []
                    });
                }

                const gmNote = typeof variation.gmNote === 'number'
                    ? variation.gmNote
                    : parseInt(variation.midiNumber, 10);

                kitMap.get(kitId).pieces.push({
                    category: 'Baterias GM',
                    subcategory,
                    variationIndex,
                    midiNumber: parseInt(variation.midiNumber, 10),
                    gmNote,
                    soundfont: variation.soundfont,
                    soundfontKey,
                    bank,
                    variable: variation.variable
                });
            });
        });

        return Array.from(kitMap.values()).map(kit => {
            kit.pieces.sort((a, b) => a.gmNote - b.gmNote);
            kit.curatedPieces = kit.pieces
                .filter(piece => CURATED_ACOUSTIC_KIT_SET.has(piece.gmNote))
                .sort((a, b) => CURATED_ACOUSTIC_KIT_ORDER.indexOf(a.gmNote) - CURATED_ACOUSTIC_KIT_ORDER.indexOf(b.gmNote));
            kit.totalPieces = kit.pieces.length;
            kit.displayPieces = kit.curatedPieces.length || kit.totalPieces;
            kit.extraPieces = kit.totalPieces - kit.curatedPieces.length;
            return kit;
        }).sort((a, b) => kitLabelSort(a, b));
    }

    getDrumKits() {
        if (!this.drumKitIndex) {
            this.drumKitIndex = this.buildDrumKitIndex();
        }

        return this.drumKitIndex.map(kit => ({
            ...kit,
            pieces: kit.pieces.map(piece => ({ ...piece })),
            curatedPieces: kit.curatedPieces.map(piece => ({ ...piece }))
        }));
    }
    
    // Obter todas as categorias
    getCategories() {
        return Object.keys(this.fullCatalog).sort();
    }
    
    // Obter subcategorias de uma categoria
    getSubcategories(category) {
        return this.fullCatalog[category] ? Object.keys(this.fullCatalog[category]).sort() : [];
    }
    
    // Obter variações de um instrumento
    getVariations(category, subcategory) {
        return this.fullCatalog[category]?.[subcategory] || [];
    }

    getRemoteSources() {
        return [...this.remoteSources];
    }
    
    // Pesquisar instrumentos
    search(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        Object.entries(this.fullCatalog).forEach(([category, subcategories]) => {
            Object.entries(subcategories).forEach(([subcategory, variations]) => {
                if (subcategory.toLowerCase().includes(lowerQuery) || 
                    category.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        category,
                        subcategory,
                        variations,
                        matchType: 'name'
                    });
                }
            });
        });
        
        return results;
    }
    
    // Download automático de instrumento
    async downloadInstrument(variation) {
        const { url, variable, file } = variation;
        
        // Verificar se já foi baixado
        if (this.downloadedInstruments.has(variable)) {
            console.log(`✅ ${file} já está carregado`);
            return window[variable];
        }
        
        console.log(`⬇️ Baixando ${file}...`);
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                this.downloadedInstruments.add(variable);
                console.log(`✅ ${file} baixado com sucesso!`);
                resolve(window[variable]);
            };
            script.onerror = () => {
                console.error(`❌ Erro ao baixar ${file}`);
                reject(new Error(`Falha ao baixar ${url}`));
            };
            document.head.appendChild(script);
        });
    }
    
    // Sistema de favoritos
    toggleFavorite(category, subcategory, variationIndex) {
        const key = `${category}::${subcategory}::${variationIndex}`;
        
        if (this.favorites.has(key)) {
            this.favorites.delete(key);
        } else {
            this.favorites.add(key);
            
            // 🔐 Proteger soundfont no cache do Service Worker
            const variations = this.getVariations(category, subcategory);
            const variation = variations[variationIndex];
            
            if (variation && variation.path && window.cacheManagerHelper) {
                window.cacheManagerHelper.protectFavorite(variation.path)
                    .then(() => {
                        console.log('⭐ Soundfont protegido no cache:', variation.path);
                    })
                    .catch(err => {
                        console.warn('⚠️ Não foi possível proteger no cache:', err);
                    });
            }
        }
        
        this.saveFavorites();
        return this.favorites.has(key);
    }
    
    isFavorite(category, subcategory, variationIndex) {
        const key = `${category}::${subcategory}::${variationIndex}`;
        return this.favorites.has(key);
    }
    
    getFavorites() {
        const favList = [];
        this.favorites.forEach(key => {
            const [category, subcategory, variationIndex] = key.split('::');
            const variations = this.getVariations(category, subcategory);
            if (variations[variationIndex]) {
                favList.push({
                    category,
                    subcategory,
                    variation: variations[variationIndex],
                    variationIndex: parseInt(variationIndex)
                });
            }
        });
        return favList;
    }
    
    saveFavorites() {
        localStorage.setItem('terra_game_favorites', JSON.stringify([...this.favorites]));
    }
    
    loadFavorites() {
        try {
            const stored = localStorage.getItem('terra_game_favorites');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch (e) {
            return new Set();
        }
    }
    
    // Estatísticas
    getTotalInstruments() {
        let total = 0;
        Object.values(this.fullCatalog).forEach(subcategories => {
            Object.values(subcategories).forEach(variations => {
                total += variations.length;
            });
        });
        return total;
    }
    
    getCategoryStats() {
        const stats = {};
        Object.entries(this.fullCatalog).forEach(([category, subcategories]) => {
            let count = 0;
            Object.values(subcategories).forEach(variations => {
                count += variations.length;
            });
            stats[category] = {
                subcategories: Object.keys(subcategories).length,
                variations: count
            };
        });
        return stats;
    }

    // Buscar instrumentos por nome
    search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        Object.entries(this.fullCatalog).forEach(([category, subcategories]) => {
            Object.entries(subcategories).forEach(([subcategory, variations]) => {
                // Filtrar variações que correspondam à busca
                const matchedVariations = variations.filter(v => 
                    v.soundfont.toLowerCase().includes(queryLower) ||
                    subcategory.toLowerCase().includes(queryLower) ||
                    category.toLowerCase().includes(queryLower) ||
                    v.midiNumber.toString().includes(query)
                );
                
                if (matchedVariations.length > 0) {
                    results.push({
                        category,
                        subcategory,
                        variations: matchedVariations
                    });
                }
            });
        });
        
        return results;
    }
}

window.CatalogManager = CatalogManager;
