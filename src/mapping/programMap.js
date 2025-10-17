(function (factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require, module.exports, globalThis);
  } else {
    const exported = factory(null, {}, globalThis);
    if (typeof globalThis !== 'undefined') {
      globalThis.ProgramCatalogMapper = exported;
    }
  }
})(function (maybeRequire, exports, globalScope) {
  const fs = safeRequire('fs');
  const path = safeRequire('path');

  const DEFAULT_PRESET = 'gm_strict';
  const runtime = {
    catalog: null,
    catalogById: new Map(),
    gmIndex: [],
    collections: new Map(),
    instrumentMapping: null,
    midiConfig: null,
    lastPreset: null,
    roundRobinCache: null
  };

  function safeRequire(moduleName) {
    try {
      if (typeof maybeRequire === 'function') {
        return maybeRequire(moduleName);
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function loadJson(relativePath) {
    if (!path || !fs) {
      return null;
    }

    try {
      const absolute = path.resolve(__dirname, '..', relativePath);
      const raw = fs.readFileSync(absolute, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function getGlobalConfig(key) {
    if (typeof globalScope !== 'undefined' && globalScope && globalScope.TerraMidiConfigs) {
      return globalScope.TerraMidiConfigs[key] || null;
    }
    return null;
  }

  const BUILT_IN_CATALOG = buildBuiltInCatalog();
  const BUILT_IN_MAPPING = buildBuiltInInstrumentMapping();
  const BUILT_IN_MIDI_CONFIG = {
    mappingPreset: 'banked',
    fallbackInstrument: '_tone_0000_FluidR3_GM_sf2_file',
    drumChannel: 9,
    allowDrumProgramChange: false,
    hardKillOnAllNotesOff: false,
    verboseLogging: false
  };

  function hydrateConfigs() {
    if (runtime.catalog && runtime.instrumentMapping && runtime.midiConfig) {
      return;
    }

    const catalog = loadJson('config/catalog.json') || getGlobalConfig('catalog') || BUILT_IN_CATALOG;
    const mapping = loadJson('config/instrumentMapping.json') || getGlobalConfig('instrumentMapping') || BUILT_IN_MAPPING;
    const midiCfg = loadJson('config/midi.json') || getGlobalConfig('midi') || BUILT_IN_MIDI_CONFIG;

    runtime.catalog = normalizeCatalog(catalog);
    runtime.instrumentMapping = mapping;
    runtime.midiConfig = midiCfg;
    runtime.lastPreset = midiCfg.mappingPreset || mapping.defaultPreset || DEFAULT_PRESET;
    runtime.roundRobinCache = null;
  }

  function normalizeCatalog(catalog) {
    const fallback = catalog.fallback || {};
    const entries = Array.isArray(catalog.entries) ? catalog.entries.slice() : [];
  const collections = catalog.collections || {};

  const byId = new Map();
  const gmIndex = [];
  runtime.collections = new Map();

    entries.forEach(entry => {
      if (!entry || !entry.id) {
        return;
      }
      const normalized = {
        id: entry.id,
        gmIndex: typeof entry.gmIndex === 'number' ? clamp(entry.gmIndex, 0, 127) : null,
        name: entry.name || entry.id,
        tags: Array.isArray(entry.tags) ? entry.tags.slice() : [],
        bank: typeof entry.bank === 'number' ? entry.bank : null
      };
      byId.set(normalized.id, normalized);
      if (normalized.gmIndex !== null && typeof gmIndex[normalized.gmIndex] === 'undefined') {
        gmIndex[normalized.gmIndex] = normalized;
      }
    });

    Object.entries(collections).forEach(([collectionId, descriptor]) => {
      if (!descriptor || !Array.isArray(descriptor.ids)) {
        return;
      }
      const ids = descriptor.ids.filter(Boolean);
      runtime.collections.set(collectionId, {
        id: collectionId,
        label: descriptor.label || collectionId,
        description: descriptor.description || '',
        ids,
        rotate: descriptor.mode === 'rotate' || descriptor.rotate === true
      });
      ids.forEach(id => {
        if (!byId.has(id)) {
          byId.set(id, {
            id,
            gmIndex: null,
            name: descriptor.label ? `${descriptor.label}: ${id}` : id,
            tags: [],
            bank: null
          });
        }
      });
    });

    if (fallback.id && !byId.has(fallback.id)) {
      byId.set(fallback.id, {
        id: fallback.id,
        gmIndex: typeof fallback.gmIndex === 'number' ? clamp(fallback.gmIndex, 0, 127) : null,
        name: fallback.name || fallback.id,
        tags: Array.isArray(fallback.tags) ? fallback.tags.slice() : [],
        bank: typeof fallback.bank === 'number' ? fallback.bank : null
      });
    }

    runtime.catalogById = byId;
    runtime.gmIndex = gmIndex;
    return {
      fallback: fallback.id ? byId.get(fallback.id) : null,
      entries: byId,
      collections: runtime.collections
    };
  }

  function buildBuiltInCatalog() {
    try {
      if (typeof maybeRequire === 'function') {
        return maybeRequire('../config/catalog.json');
      }
    } catch (error) {
      /* ignore */
    }
    if (typeof globalScope !== 'undefined' && globalScope && globalScope.TerraMidiCatalogFallback) {
      return globalScope.TerraMidiCatalogFallback;
    }
    return {
      fallback: {
        id: '_tone_0000_FluidR3_GM_sf2_file',
        gmIndex: 0,
        name: 'Acoustic Grand Piano',
        tags: ['gm', 'piano', 'acoustic'],
        bank: 0
      },
      entries: []
    };
  }

  function buildBuiltInInstrumentMapping() {
    try {
      if (typeof maybeRequire === 'function') {
        return maybeRequire('../config/instrumentMapping.json');
      }
    } catch (error) {
      /* ignore */
    }
    if (typeof globalScope !== 'undefined' && globalScope && globalScope.TerraMidiInstrumentMappingFallback) {
      return globalScope.TerraMidiInstrumentMappingFallback;
    }
    return {
      defaultPreset: DEFAULT_PRESET,
      presets: {
        gm_strict: { strategy: 'gm_strict' }
      }
    };
  }

  function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  function normalizeProgram(program) {
    if (program === null || typeof program === 'undefined') {
      return 0;
    }
    const num = Number(program);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return clamp(Math.round(num), 0, 127);
  }

  function normalizeChannel(channel) {
    const num = Number(channel);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return clamp(Math.floor(num), 0, 15);
  }

  function normalizeBank(bank) {
    if (!bank) {
      return { msb: null, lsb: null };
    }
    if (typeof bank === 'number') {
      return { msb: bank, lsb: null };
    }
    const msb = bank.msb !== undefined ? Number(bank.msb) : null;
    const lsb = bank.lsb !== undefined ? Number(bank.lsb) : null;
    return {
      msb: Number.isFinite(msb) ? clamp(Math.round(msb), 0, 127) : null,
      lsb: Number.isFinite(lsb) ? clamp(Math.round(lsb), 0, 127) : null
    };
  }

  function resolvePresetName(requestedPreset) {
    hydrateConfigs();
    const presets = runtime.instrumentMapping?.presets || {};
    const explicit = requestedPreset || runtime.midiConfig?.mappingPreset;
    if (explicit && presets[explicit]) {
      runtime.lastPreset = explicit;
      return explicit;
    }
    const defaultPreset = runtime.instrumentMapping?.defaultPreset;
    if (defaultPreset && presets[defaultPreset]) {
      runtime.lastPreset = defaultPreset;
      return defaultPreset;
    }
    runtime.lastPreset = DEFAULT_PRESET;
    if (!presets[DEFAULT_PRESET]) {
      presets[DEFAULT_PRESET] = { strategy: 'gm_strict' };
    }
    return runtime.lastPreset;
  }

  function getEntryById(catalogId) {
    hydrateConfigs();
    if (!catalogId) {
      return null;
    }
    return runtime.catalogById.get(catalogId) || null;
  }

  function getEntryByGmIndex(index) {
    hydrateConfigs();
    return runtime.gmIndex[index] || null;
  }

  function getCollectionEntries(collectionId) {
    hydrateConfigs();
    const descriptor = runtime.collections.get(collectionId);
    if (!descriptor) {
      return [];
    }
    return descriptor.ids
      .map(getEntryById)
      .filter(Boolean);
  }

  function buildRoundRobinPool() {
    if (runtime.roundRobinCache) {
      return runtime.roundRobinCache;
    }
    const unique = new Map();
    runtime.catalogById.forEach((entry, id) => {
      unique.set(id, entry);
    });
    runtime.collections.forEach(descriptor => {
      descriptor.ids.forEach(id => {
        const entry = getEntryById(id);
        if (entry) unique.set(id, entry);
      });
    });
    runtime.roundRobinCache = Array.from(unique.values());
    return runtime.roundRobinCache;
  }

  function mapProgramToCatalog(program, channel = 0, bankInfo = null, options = {}) {
    hydrateConfigs();
    const normalizedProgram = normalizeProgram(program);
    const normalizedChannel = normalizeChannel(channel);
    const normalizedBank = normalizeBank(bankInfo);
    const presetName = resolvePresetName(options.preset || runtime.lastPreset);
    const presets = runtime.instrumentMapping?.presets || {};
    const preset = presets[presetName] || { strategy: 'gm_strict' };

    if (!runtime.midiConfig.allowDrumProgramChange && normalizedChannel === runtime.midiConfig.drumChannel) {
      return {
        catalogId: null,
        name: 'Drum channel - program change ignored',
        preset: presetName,
        ignored: true,
        reason: 'drum-channel'
      };
    }

    const result =
      (preset.strategy === 'gm_strict' && resolveGmStrict(normalizedProgram)) ||
      (preset.strategy === 'banked' && resolveBanked(normalizedProgram, normalizedBank, preset)) ||
      (preset.strategy === 'round_robin' && resolveRoundRobin(normalizedProgram, preset)) ||
      (preset.strategy === 'table' && resolveTable(normalizedProgram, normalizedChannel, normalizedBank, preset)) ||
      resolveGmStrict(normalizedProgram);

    if (result) {
      return {
        catalogId: result.id,
        name: result.name,
        preset: presetName,
        strategy: preset.strategy,
        fallback: false
      };
    }

    const fallback = resolveFallback(normalizedProgram);
    return {
      catalogId: fallback.id,
      name: fallback.name,
      preset: presetName,
      strategy: 'fallback',
      fallback: true
    };
  }

  function resolveGmStrict(program) {
    const entry = getEntryByGmIndex(program);
    return entry || null;
  }

  function resolveBanked(program, bank, preset) {
    const banks = preset.banks || {};
    const bankKey = computeBankKey(bank, banks);
    const descriptor = bankKey ? banks[bankKey] : null;
    const collectionId = descriptor?.collection || preset.defaultCollection || 'gm';
    const collectionEntries = getCollectionEntries(collectionId);

    if (!collectionEntries.length) {
      return resolveGmStrict(program);
    }

    if (descriptor?.mode === 'rotate' || runtime.collections.get(collectionId)?.rotate) {
      const index = program % collectionEntries.length;
      return collectionEntries[index];
    }

    if (program < collectionEntries.length) {
      return collectionEntries[program];
    }

    return collectionEntries[program % collectionEntries.length];
  }

  function computeBankKey(bank, banks) {
    if (!bank) {
      return null;
    }
    const keys = Object.keys(banks || {});
    if (!keys.length) {
      return null;
    }

    const msbKey = String(bank.msb ?? '');
    const lsbKey = bank.lsb !== null && bank.lsb !== undefined ? `${msbKey}:${bank.lsb}` : null;

    if (lsbKey && banks[lsbKey]) return lsbKey;
    if (banks[msbKey]) return msbKey;

    const msbHex = bank.msb !== null ? bank.msb.toString(16) : null;
    if (msbHex && banks[msbHex]) return msbHex;

    return null;
  }

  function resolveRoundRobin(program, preset) {
    const pool = buildRoundRobinPool();
    if (!pool.length) {
      return null;
    }

    const offset = program % pool.length;
    return pool[offset];
  }

  function resolveTable(program, channel, bank, preset) {
    const channels = preset.channels || {};
    const channelDescriptor = channels[String(channel)] || channels[channel];
    if (channelDescriptor) {
      if (channelDescriptor.mode === 'ignore') {
        return null;
      }
      if (channelDescriptor.map && channelDescriptor.map.hasOwnProperty(String(program))) {
        const mappedId = channelDescriptor.map[String(program)];
        const entry = getEntryById(mappedId);
        if (entry) {
          return entry;
        }
      }
      if (channelDescriptor.collection) {
        const entries = getCollectionEntries(channelDescriptor.collection);
        if (entries.length) {
          if (channelDescriptor.mode === 'rotate') {
            return entries[program % entries.length];
          }
          if (program < entries.length) {
            return entries[program];
          }
          return entries[program % entries.length];
        }
      }
      if (channelDescriptor.fallbackCollection) {
        const entries = getCollectionEntries(channelDescriptor.fallbackCollection);
        if (entries.length) {
          return entries[program % entries.length];
        }
      }
    }

    if (preset.defaultCollection) {
      const entries = getCollectionEntries(preset.defaultCollection);
      if (entries.length) {
        return entries[program % entries.length];
      }
    }

    return resolveGmStrict(program);
  }

  function resolveFallback(program) {
    const midiFallback = runtime.midiConfig?.fallbackInstrument;
    if (typeof midiFallback === 'string') {
      if (midiFallback.startsWith('gm:')) {
        const index = normalizeProgram(Number(midiFallback.split(':')[1]));
        const entry = getEntryByGmIndex(index);
        if (entry) {
          return entry;
        }
      } else {
        const entry = getEntryById(midiFallback);
        if (entry) {
          return entry;
        }
      }
    }

    const catalogFallback = runtime.catalog?.fallback;
    if (catalogFallback) {
      return catalogFallback;
    }

    return {
      id: '_tone_0000_FluidR3_GM_sf2_file',
      name: 'Acoustic Grand Piano (fallback)'
    };
  }

  function setRuntimeConfigs(config) {
    if (!config || typeof config !== 'object') {
      return;
    }

    if (config.catalog) {
      runtime.catalog = normalizeCatalog(config.catalog);
    }
    if (config.instrumentMapping) {
      runtime.instrumentMapping = config.instrumentMapping;
      runtime.roundRobinCache = null;
    }
    if (config.midiConfig) {
      runtime.midiConfig = {
        ...runtime.midiConfig,
        ...config.midiConfig
      };
    }
  }

  function getState() {
    hydrateConfigs();
    return {
      preset: runtime.lastPreset,
      catalogSize: runtime.catalogById.size,
      gmCoverage: runtime.gmIndex.filter(Boolean).length
    };
  }

  exports.mapProgramToCatalog = mapProgramToCatalog;
  exports.setRuntimeConfigs = setRuntimeConfigs;
  exports.getState = getState;
  exports.resolveFallback = resolveFallback;
  exports.getEntryById = getEntryById;
  exports.getEntryByGmIndex = getEntryByGmIndex;
  exports.getCollectionEntries = getCollectionEntries;

  return exports;
});
