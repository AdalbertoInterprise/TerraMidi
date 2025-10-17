// Board Bella Catalog - Utilitário para catálogo completo de instrumentos
// Autor: Terra MIDI System
// Data: 17/10/2025
// Descrição: Organiza o catálogo com 811 soundfonts, favoritos e grupos específicos do Board Bella

const BOARD_BELLA_SLOT_NAMES = Object.freeze(['A', 'B', 'C', 'D', 'E']);

const DEFAULT_FAVORITE_SPECS = Object.freeze([
    { program: 0x00, soundfont: 'FluidR3_GM', label: 'Piano de Cauda' },
    { program: 0x18, soundfont: 'FluidR3_GM', label: 'Violão Nylon' },
    { program: 0x20, soundfont: 'FluidR3_GM', label: 'Baixo Acústico' },
    { program: 0x28, soundfont: 'FluidR3_GM', label: 'Violino' },
    { program: 0x30, soundfont: 'FluidR3_GM', label: 'Conjunto de Cordas' },
    { program: 0x34, soundfont: 'FluidR3_GM', label: 'Coral Aahs' },
    { program: 0x38, soundfont: 'FluidR3_GM', label: 'Trompete' },
    { program: 0x49, soundfont: 'FluidR3_GM', label: 'Flauta' },
    { program: 0x58, soundfont: 'FluidR3_GM', label: 'Pad New Age' },
    { program: 0x76, soundfont: 'FluidR3_GM', label: 'Bateria Sintética' }
]);

const DEFAULT_GROUP_SPECS = Object.freeze([
    {
        id: 'group-1',
        label: 'Relaxamento & Ambientação',
        description: 'Texturas suaves para ambientes terapêuticos',
        slots: {
            A: { program: 0x00, soundfont: 'FluidR3_GM' }, // Piano de Cauda
            B: { program: 0x34, soundfont: 'FluidR3_GM' }, // Coral Aahs
            C: { program: 0x49, soundfont: 'FluidR3_GM' }, // Flauta
            D: { program: 0x58, soundfont: 'FluidR3_GM' }, // Pad New Age
            E: { program: 0x2E, soundfont: 'FluidR3_GM' }  // Harpa
        }
    },
    {
        id: 'group-2',
        label: 'Orquestra & Cordas',
        description: 'Combinações clássicas para repertório orquestral',
        slots: {
            A: { program: 0x28, soundfont: 'FluidR3_GM' }, // Violino
            B: { program: 0x29, soundfont: 'FluidR3_GM' }, // Viola
            C: { program: 0x2A, soundfont: 'FluidR3_GM' }, // Violoncelo
            D: { program: 0x2F, soundfont: 'FluidR3_GM' }, // Cordas Tremolo
            E: { program: 0x30, soundfont: 'FluidR3_GM' }  // Conjunto de Cordas
        }
    },
    {
        id: 'group-3',
        label: 'Moderno & Sintético',
        description: 'Sons elétricos e sintetizados para ambiências modernas',
        slots: {
            A: { program: 0x00, soundfont: 'JCLive' },     // Piano brilhante alternativo
            B: { program: 0x04, soundfont: 'JCLive' },     // Piano elétrico
            C: { program: 0x50, soundfont: 'FluidR3_GM' }, // Synth Lead Square
            D: { program: 0x51, soundfont: 'FluidR3_GM' }, // Synth Lead Saw
            E: { program: 0x59, soundfont: 'FluidR3_GM' }  // Pad Warm
        }
    },
    {
        id: 'group-4',
        label: 'Percussão & Mundo',
        description: 'Percussões étnicas e variações rítmicas',
        slots: {
            A: { program: 0x72, soundfont: 'FluidR3_GM' }, // Taiko Drum
            B: { program: 0x73, soundfont: 'FluidR3_GM' }, // Orchestral Cymbals
            C: { program: 0x74, soundfont: 'FluidR3_GM' }, // Tambores Étnicos
            D: { program: 0x76, soundfont: 'FluidR3_GM' }, // Bateria Sintética
            E: { program: 0x72, soundfont: 'Chaos' }       // Taiko alternativo
        }
    }
]);

class BoardBellaCatalog {
    constructor(options = {}) {
        this.soundfontManager = options.soundfontManager || (typeof window !== 'undefined' ? window.soundfontManager : null);
        this.catalogManager = options.catalogManager || (typeof window !== 'undefined' ? window.catalogManager : null);
        this.instrumentCategories = options.instrumentCategories || this.createInstrumentCategories();
        this.maxFavorites = typeof options.maxFavorites === 'number' ? options.maxFavorites : 10;
        this.slotNames = BOARD_BELLA_SLOT_NAMES;

        this.ready = false;
        this.readyPromise = null;

        this.flatList = [];
        this.byKey = new Map();
        this.byProgram = new Map();
        this.bySignature = new Map();
        this.byIndex = [];

        this.favorites = new Array(this.maxFavorites).fill(null);
        this.groups = [];

        this.defaultFavoriteSpecs = Array.isArray(options.defaultFavorites)
            ? options.defaultFavorites
            : DEFAULT_FAVORITE_SPECS;
        this.defaultGroupSpecs = Array.isArray(options.defaultGroups)
            ? options.defaultGroups
            : DEFAULT_GROUP_SPECS;
    }

    createInstrumentCategories() {
        if (typeof InstrumentCategories === 'function') {
            try {
                return new InstrumentCategories();
            } catch (error) {
                console.warn('⚠️ BoardBellaCatalog: não foi possível instanciar InstrumentCategories', error);
            }
        }
        return null;
    }

    async ensureReady() {
        if (this.ready) {
            return this.flatList;
        }

        if (!this.readyPromise) {
            this.readyPromise = this.loadCatalog();
        }

        return this.readyPromise;
    }

    async loadCatalog() {
        try {
            const rawEntries = await this.obtainRawCatalogEntries();
            if (!rawEntries || rawEntries.length === 0) {
                throw new Error('Catálogo de soundfonts vazio ou indisponível');
            }

            this.populateEntries(rawEntries);
            this.applyDefaultFavoritesAndGroups();
            this.ready = true;
            console.log(`📚 BoardBellaCatalog inicializado com ${this.flatList.length} instrumentos`);
        } catch (error) {
            console.error('❌ BoardBellaCatalog: falha ao carregar catálogo', error);
            this.flatList = [];
            this.ready = true;
        }

        return this.flatList;
    }

    async obtainRawCatalogEntries() {
        const entriesFromManager = await this.obtainFromSoundfontManager();
        if (entriesFromManager && entriesFromManager.length > 0) {
            return entriesFromManager;
        }

        const fallbackEntries = await this.obtainFromManifest();
        if (fallbackEntries && fallbackEntries.length > 0) {
            return fallbackEntries;
        }

        console.warn('⚠️ BoardBellaCatalog: utilizando catálogo reduzido (curated)');
        return this.obtainFromCuratedList();
    }

    async obtainFromSoundfontManager() {
        if (!this.soundfontManager || typeof this.soundfontManager.loadFullCatalog !== 'function') {
            return null;
        }

        try {
            const map = await this.soundfontManager.loadFullCatalog();
            if (!(map instanceof Map) || map.size === 0) {
                return null;
            }
            return Array.from(map.values());
        } catch (error) {
            console.warn('⚠️ BoardBellaCatalog: falha ao obter catálogo via SoundfontManager', error);
            return null;
        }
    }

    async obtainFromManifest() {
        try {
            const response = await fetch('soundfonts-manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const manifest = await response.json();
            if (!manifest || !Array.isArray(manifest.files)) {
                return null;
            }

            return manifest.files.map(entry => ({
                variable: entry.variable,
                midiNumber: entry.midiNumber,
                soundfont: entry.soundfont,
                category: entry.category,
                subcategory: entry.subcategory,
                url: entry.url,
                file: entry.file,
                size: entry.size,
                sha256: entry.sha256,
                name: entry.subcategory ? `${entry.subcategory} (${entry.soundfont})` : `${entry.soundfont} ${entry.midiNumber}`
            }));
        } catch (error) {
            console.warn('⚠️ BoardBellaCatalog: falha ao carregar soundfonts-manifest.json', error);
            return null;
        }
    }

    obtainFromCuratedList() {
        if (!this.soundfontManager || !this.soundfontManager.availableInstruments) {
            return [];
        }

        return Object.entries(this.soundfontManager.availableInstruments).map(([key, value]) => ({
            variable: key,
            midiNumber: this.deriveMidiNumberFromCuratedKey(key),
            soundfont: value.soundfont || 'FluidR3_GM',
            category: value.category,
            subcategory: value.name,
            url: value.file ? `soundfonts/${value.file}` : null,
            file: value.file,
            name: value.name
        }));
    }

    deriveMidiNumberFromCuratedKey(key) {
        if (!key) {
            return '0000';
        }

        const match = /_(\d{4})_/.exec(key);
        if (match && match[1]) {
            return match[1];
        }

        return '0000';
    }

    populateEntries(rawEntries) {
        this.flatList = [];
        this.byKey.clear();
        this.byProgram.clear();
        this.bySignature.clear();
        this.byIndex = [];

        rawEntries.forEach(entry => {
            const normalized = this.normalizeRawEntry(entry);
            if (!normalized) {
                return;
            }
            this.flatList.push(normalized);
        });

        this.flatList.sort((a, b) => {
            if (a.program !== b.program) {
                return a.program - b.program;
            }
            if (a.bankMsb !== b.bankMsb) {
                return a.bankMsb - b.bankMsb;
            }
            if (a.soundfont !== b.soundfont) {
                return a.soundfont.localeCompare(b.soundfont, 'pt-BR', { sensitivity: 'base' });
            }
            return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        });

        this.flatList.forEach((item, index) => {
            item.index = index;
            item.signature = this.buildSignature(item.program, item.soundfont);

            this.byKey.set(item.key, item);
            this.bySignature.set(item.signature, item);
            this.byIndex[index] = item;

            if (!this.byProgram.has(item.program)) {
                this.byProgram.set(item.program, []);
            }
            this.byProgram.get(item.program).push(item);
        });

        this.byProgram.forEach(bucket => {
            bucket.sort((a, b) => a.soundfont.localeCompare(b.soundfont, 'pt-BR', { sensitivity: 'base' }));
        });
    }

    normalizeRawEntry(raw) {
        if (!raw) {
            return null;
        }

        const key = raw.variable || raw.key || raw.name;
        if (!key) {
            return null;
        }

        const midiHex = (raw.midiNumber || '0000').toString().padStart(4, '0').toUpperCase();
        const program = this.parseHexPair(midiHex.slice(0, 2));
        const bankMsb = this.parseHexPair(midiHex.slice(2, 4));
        const category = this.normalizeCategory(raw.category);
        const icon = this.instrumentCategories
            ? this.instrumentCategories.getCategoryIcon(category)
            : (raw.icon || '🎵');
        const therapeutic = this.instrumentCategories
            ? this.instrumentCategories.getTherapeuticBenefit(category)
            : raw.therapeutic;

        return {
            index: -1,
            key,
            variable: key,
            name: raw.name || raw.baseName || raw.subcategory || key,
            baseName: raw.subcategory || raw.baseName || raw.name || key,
            program,
            bankMsb,
            midiNumber: midiHex,
            soundfont: raw.soundfont || raw.library || 'FluidR3_GM',
            category,
            subcategory: raw.subcategory || '',
            icon,
            therapeutic,
            url: raw.url || null,
            file: raw.file || null,
            size: raw.size || null,
            sha256: raw.sha256 || null,
            metadata: {
                source: raw.source || null,
                original: raw
            }
        };
    }

    normalizeCategory(category) {
        if (!category) {
            return 'Instrumentos';
        }
        if (this.instrumentCategories && typeof this.instrumentCategories.normalizeCategory === 'function') {
            return this.instrumentCategories.normalizeCategory(category);
        }
        return category;
    }

    parseHexPair(value) {
        const normalized = value || '00';
        const parsed = parseInt(normalized, 16);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.min(parsed, 127));
        }
        return 0;
    }

    applyDefaultFavoritesAndGroups() {
        this.favorites = new Array(this.maxFavorites).fill(null);
        this.defaultFavoriteSpecs.forEach((spec, slotIndex) => {
            if (slotIndex >= this.maxFavorites) {
                return;
            }
            const entry = this.resolveEntry(spec);
            this.favorites[slotIndex] = entry ? entry.index : null;
        });

        this.groups = this.defaultGroupSpecs.map((groupSpec, groupIndex) => {
            const slots = {};
            this.slotNames.forEach(slotName => {
                const spec = groupSpec.slots ? groupSpec.slots[slotName] : null;
                const entry = this.resolveEntry(spec);
                slots[slotName] = entry ? entry.index : null;
            });
            return {
                id: groupSpec.id || `group-${groupIndex + 1}`,
                name: groupSpec.label || `Grupo ${groupIndex + 1}`,
                index: groupIndex,
                description: groupSpec.description || null,
                slots
            };
        });
    }

    resolveEntry(spec) {
        if (!spec || !this.flatList.length) {
            return null;
        }

        if (typeof spec === 'number' && Number.isFinite(spec)) {
            return this.byIndex[this.normalizeIndex(spec)] || null;
        }

        if (typeof spec === 'string') {
            return this.byKey.get(spec) || this.matchByName(spec) || null;
        }

        if (typeof spec !== 'object') {
            return null;
        }

        if (typeof spec.index === 'number') {
            return this.byIndex[this.normalizeIndex(spec.index)] || null;
        }

        if (spec.key && this.byKey.has(spec.key)) {
            return this.byKey.get(spec.key);
        }

        if (spec.variable && this.byKey.has(spec.variable)) {
            return this.byKey.get(spec.variable);
        }

        if (spec.midiNumber) {
            const midi = spec.midiNumber.toString().padStart(4, '0').toUpperCase();
            const direct = this.flatList.find(item => item.midiNumber === midi);
            if (direct) {
                return direct;
            }
        }

        const program = this.normalizeProgram(spec.program ?? spec.gm ?? spec.pc);
        const soundfont = spec.soundfont || spec.library || null;
        let entry = soundfont ? this.bySignature.get(this.buildSignature(program, soundfont)) : null;
        if (!entry) {
            entry = this.findFirstByProgram(program);
        }
        return entry;
    }

    normalizeProgram(program) {
        if (program === undefined || program === null) {
            return 0;
        }
        if (typeof program === 'string' && program.startsWith('0x')) {
            const parsed = parseInt(program, 16);
            if (Number.isFinite(parsed)) {
                return this.clampProgram(parsed);
            }
        }
        const numeric = Number(program);
        if (Number.isFinite(numeric)) {
            return this.clampProgram(numeric);
        }
        return 0;
    }

    clampProgram(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        if (value < 0) {
            return 0;
        }
        if (value > 127) {
            return 127;
        }
        return Math.trunc(value);
    }

    buildSignature(program, soundfont) {
        const normalizedFont = (soundfont || '').toString().trim().toLowerCase();
        return `${program}|${normalizedFont}`;
    }

    matchByName(term) {
        if (!term) {
            return null;
        }
        const normalized = term.toString().trim().toLowerCase();
        return this.flatList.find(item => item.name.toLowerCase() === normalized || item.baseName.toLowerCase() === normalized) || null;
    }

    getInstrumentByIndex(index) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado. Chame ensureReady() antes de acessar.');
        }
        if (!this.flatList.length) {
            return null;
        }
        return this.byIndex[this.normalizeIndex(index)] || null;
    }

    normalizeIndex(index) {
        if (!this.flatList.length) {
            return 0;
        }
        let normalized = Number.isFinite(index) ? Math.trunc(index) : 0;
        const total = this.flatList.length;
        normalized %= total;
        if (normalized < 0) {
            normalized += total;
        }
        return normalized;
    }

    shiftIndex(currentIndex, delta) {
        if (!Number.isFinite(delta) || !this.flatList.length) {
            return null;
        }
        const base = Number.isFinite(currentIndex) ? currentIndex : 0;
        const target = this.normalizeIndex(base + delta);
        return this.byIndex[target] || null;
    }

    getFavorite(slotIndex) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        const normalizedSlot = this.normalizeSlotIndex(slotIndex);
        const index = this.favorites[normalizedSlot];
        return typeof index === 'number' ? this.getInstrumentByIndex(index) : null;
    }

    setFavorite(slotIndex, spec) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        const normalizedSlot = this.normalizeSlotIndex(slotIndex);
        const entry = this.resolveEntry(spec);
        this.favorites[normalizedSlot] = entry ? entry.index : null;
        return entry;
    }

    getAllFavorites() {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        return this.favorites.map(index => (typeof index === 'number' ? this.getInstrumentByIndex(index) : null));
    }

    normalizeSlotIndex(slot) {
        if (!Number.isFinite(slot)) {
            return 0;
        }
        const normalized = Math.trunc(slot);
        if (normalized < 0) {
            return 0;
        }
        if (normalized >= this.maxFavorites) {
            return this.maxFavorites - 1;
        }
        return normalized;
    }

    getGroupInstrument(groupIndex, slotIndex) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        const group = this.groups[groupIndex];
        if (!group) {
            return null;
        }
        const slotName = this.slotNames[this.ensureSlotRange(slotIndex)];
        if (!slotName) {
            return null;
        }
        const index = group.slots[slotName];
        return typeof index === 'number' ? this.getInstrumentByIndex(index) : null;
    }

    setGroupInstrument(groupIndex, slotIndex, spec) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        const group = this.groups[groupIndex];
        if (!group) {
            return null;
        }
        const slotName = this.slotNames[this.ensureSlotRange(slotIndex)];
        const entry = this.resolveEntry(spec);
        group.slots[slotName] = entry ? entry.index : null;
        return entry;
    }

    ensureSlotRange(slotIndex) {
        let normalized = Number.isFinite(slotIndex) ? Math.trunc(slotIndex) : 0;
        if (normalized < 0) {
            normalized = 0;
        }
        if (normalized >= this.slotNames.length) {
            normalized = this.slotNames.length - 1;
        }
        return normalized;
    }

    findFirstByProgram(program) {
        const normalized = this.clampProgram(program);
        const bucket = this.byProgram.get(normalized);
        return bucket && bucket.length ? bucket[0] : null;
    }

    findByProgramAndSoundfont(program, soundfont) {
        if (!soundfont) {
            return this.findFirstByProgram(program);
        }
        return this.bySignature.get(this.buildSignature(this.clampProgram(program), soundfont)) || this.findFirstByProgram(program);
    }

    getProgramVariations(program) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        const normalized = this.clampProgram(program);
        return (this.byProgram.get(normalized) || []).slice();
    }

    getGroupsSnapshot() {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        return this.groups.map(group => ({
            id: group.id,
            name: group.name,
            index: group.index,
            description: group.description,
            slots: { ...group.slots }
        }));
    }

    getCatalogSummary() {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        return {
            totalInstruments: this.flatList.length,
            totalPrograms: this.byProgram.size,
            favoritesConfigured: this.favorites.filter(index => typeof index === 'number').length,
            groups: this.getGroupsSnapshot()
        };
    }

    searchByName(term, limit = 10) {
        if (!this.ready) {
            throw new Error('BoardBellaCatalog não inicializado');
        }
        if (!term) {
            return [];
        }
        const normalized = term.toString().trim().toLowerCase();
        if (!normalized) {
            return [];
        }
        const results = [];
        for (const entry of this.flatList) {
            if (entry.name.toLowerCase().includes(normalized) || entry.baseName.toLowerCase().includes(normalized)) {
                results.push(entry);
                if (results.length >= limit) {
                    break;
                }
            }
        }
        return results;
    }
}

if (typeof window !== 'undefined') {
    window.BoardBellaCatalog = BoardBellaCatalog;
}
