// Instrument Categories - Gerenciamento de categorias de instrumentos
class InstrumentCategories {
    constructor() {
        // Categorias principais de instrumentos terapêuticos
        this.categories = {
            'Pianos': {
                icon: '🎹',
                description: 'Pianos acústicos e elétricos',
                therapeutic: 'Reduz ansiedade, promove concentração'
            },
            'Percussão Melódica': {
                icon: '🔔',
                description: 'Xilofones, marimbas, sinos',
                therapeutic: 'Estimula alegria e positividade'
            },
            'Órgãos': {
                icon: '⛪',
                description: 'Órgãos de igreja e palheta',
                therapeutic: 'Induz estado contemplativo'
            },
            'Cordas Dedilhadas': {
                icon: '🎸',
                description: 'Violões, harpas, bandolins',
                therapeutic: 'Evoca nostalgia e conforto'
            },
            'Cordas Orquestrais': {
                icon: '🎻',
                description: 'Violinos, violas, cellos e ensembles',
                therapeutic: 'Expressão emocional profunda'
            },
            'Vozes': {
                icon: '👥',
                description: 'Corais e vozes sintetizadas',
                therapeutic: 'Promove conexão e empatia'
            },
            'Metais': {
                icon: '🎺',
                description: 'Trompas, trompetes e metais suaves',
                therapeutic: 'Energia e motivação'
            },
            'Palhetas': {
                icon: '�',
                description: 'Oboés, clarinetes e palhetas duplas',
                therapeutic: 'Clareza mental e respiração'
            },
            'Flautas': {
                icon: '🪈',
                description: 'Flautas doces, de pã e afins',
                therapeutic: 'Respiração profunda e relaxamento'
            },
            'Pads Sintéticos': {
                icon: '🌌',
                description: 'Pads e texturas ambiente',
                therapeutic: 'Ambientação e imersão'
            },
            'Efeitos Ambientais': {
                icon: '�️',
                description: 'Sons da natureza e efeitos relaxantes',
                therapeutic: 'Relaxamento profundo'
            },
            // 🆕 CATEGORIAS ADICIONAIS DO MANIFEST (510 instrumentos)
            'Baixos': {
                icon: '🎵',
                description: 'Contrabaixos e baixos elétricos',
                therapeutic: 'Promove estabilidade e base rítmica'
            },
            'Baterias GM': {
                icon: '🎵',
                description: 'Percussão GM (General MIDI)',
                therapeutic: 'Estimula ritmo e energia'
            },
            'Cordas': {
                icon: '🎵',
                description: 'Instrumentos de cordas diversos',
                therapeutic: 'Expressividade e emoção'
            },
            'Guitarras': {
                icon: '🎵',
                description: 'Guitarras elétricas e acústicas',
                therapeutic: 'Estimula criatividade e expressão'
            },
            'Instrumentos Étnicos': {
                icon: '🌍',
                description: 'Instrumentos tradicionais de diversas culturas',
                therapeutic: 'Conexão cultural e ancestral'
            },
            'Percussão Suave': {
                icon: '🎵',
                description: 'Percussão melódica suave',
                therapeutic: 'Ritmo calmo e meditativo'
            },
            'Sons da Natureza': {
                icon: '🌊',
                description: 'Sons ambientais e naturais',
                therapeutic: 'Conexão com natureza e tranquilidade'
            },
            'Synth Leads': {
                icon: '🎵',
                description: 'Leads sintéticos e melodias eletrônicas',
                therapeutic: 'Estimula foco e concentração'
            },
            'Synth Pads': {
                icon: '🎵',
                description: 'Pads sintéticos e texturas atmosféricas',
                therapeutic: 'Ambientação e imersão sonora'
            }
        };

        this.aliases = {
            'Cordas Friccionadas': 'Cordas Orquestrais',
            'Sopros de Madeira': 'Palhetas',
            'Sopros de Metal': 'Metais',
            'Sintetizadores': 'Pads Sintéticos',
            'Natureza': 'Efeitos Ambientais',
            'Étnicos': 'Efeitos Ambientais'
        };

        this.displayOrder = [
            'Pianos',
            'Percussão Melódica',
            'Órgãos',
            'Cordas Dedilhadas',
            'Cordas Orquestrais',
            'Vozes',
            'Metais',
            'Palhetas',
            'Flautas',
            'Pads Sintéticos',
            'Efeitos Ambientais',
            // 🆕 CATEGORIAS ADICIONAIS
            'Baixos',
            'Baterias GM',
            'Cordas',
            'Guitarras',
            'Instrumentos Étnicos',
            'Percussão Suave',
            'Sons da Natureza',
            'Synth Leads',
            'Synth Pads'
        ];
    }
    
    /**
     * Obtém todas as categorias disponíveis
     * @returns {Array<string>} Lista de nomes de categorias
     */
    getAllCategories() {
        return Object.keys(this.categories);
    }
    
    /**
     * Obtém informações de uma categoria específica
     * @param {string} categoryName - Nome da categoria
     * @returns {Object|null} Dados da categoria
     */
    getCategoryInfo(categoryName) {
        const normalized = this.normalizeCategory(categoryName);
        return this.categories[normalized] || null;
    }
    
    /**
     * Obtém ícone de uma categoria
     * @param {string} categoryName - Nome da categoria
     * @returns {string} Emoji do ícone
     */
    getCategoryIcon(categoryName) {
        const normalized = this.normalizeCategory(categoryName);
        const category = this.categories[normalized];
        return category ? category.icon : '🎵';
    }
    
    /**
     * Obtém benefício terapêutico de uma categoria
     * @param {string} categoryName - Nome da categoria
     * @returns {string} Descrição terapêutica
     */
    getTherapeuticBenefit(categoryName) {
        const normalized = this.normalizeCategory(categoryName);
        const category = this.categories[normalized];
        return category ? category.therapeutic : 'Benefícios terapêuticos variados';
    }
    
    /**
     * Verifica se uma categoria existe
     * @param {string} categoryName - Nome da categoria
     * @returns {boolean}
     */
    hasCategory(categoryName) {
        const normalized = this.normalizeCategory(categoryName);
        return normalized in this.categories;
    }

    /**
     * Normaliza nomes de categoria para nomenclatura coerente
     * @param {string} categoryName
     * @returns {string}
     */
    normalizeCategory(categoryName) {
        if (!categoryName) {
            return 'Pianos';
        }
        return this.aliases[categoryName] || categoryName;
    }

    /**
     * Ordem canônica das categorias para exibição
     * @returns {Array<string>}
     */
    getDisplayOrder() {
        return this.displayOrder.slice();
    }
}

// Exportar instância única
if (typeof window !== 'undefined') {
    window.InstrumentCategories = InstrumentCategories;
}
