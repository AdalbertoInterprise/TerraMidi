#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseMidi } = require('midi-file');
const MidiPlayer = require('midi-player-js');

const SUPPORTED_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
const NOTE_NAME_LOOKUP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const DEFAULT_CONFIG = {
  outputDir: path.resolve(__dirname, '..', 'src', 'assets', 'musics'),
  arranger: 'Equipe Terra Game',
  defaultLicense: 'Domínio público',
  defaultCreatedAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
  targetRange: {
    min: 'C4',
    max: 'C5'
  }
};

const DEFAULT_CURATOR_TAGS = ['infantil', 'cantiga', 'brasil'];
const SIMPLE_TIME_SIGNATURES = new Set(['2/4', '3/4', '4/4', '2/2', '3/2', '4/2']);

function mergeCuratorTags(existing) {
  const normalized = new Map();

  DEFAULT_CURATOR_TAGS.forEach((tag) => {
    const value = String(tag).trim();
    if (value) {
      normalized.set(value.toLowerCase(), value);
    }
  });

  if (Array.isArray(existing)) {
    existing.forEach((tag) => {
      const value = String(tag || '').trim();
      if (value) {
        const key = value.toLowerCase();
        if (!normalized.has(key)) {
          normalized.set(key, value);
        }
      }
    });
  }

  return Array.from(normalized.values());
}

function normalizeTimeSignatureValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.replace(/\s+/g, '');
  }

  if (Array.isArray(value) && value.length >= 2) {
    return `${value[0]}/${value[1]}`;
  }

  if (typeof value === 'object' && value.numerator && value.denominator) {
    return `${value.numerator}/${value.denominator}`;
  }

  return null;
}

function computeDifficultyMetrics(notes, bpmInput, timeSignatureInput) {
  const bpm = Math.max(1, Number(bpmInput) || 120);
  const timeSignature = normalizeTimeSignatureValue(timeSignatureInput) || '4/4';
  const [numeratorRaw, denominatorRaw] = timeSignature.split('/');
  const numerator = parseInt(numeratorRaw, 10) || 4;
  const denominator = parseInt(denominatorRaw, 10) || 4;
  const beatDurationMs = 60000 / bpm;
  const syncToleranceMs = beatDurationMs * 0.15;

  const beatMap = new Map();
  let syncopatedNotes = 0;
  let fastNotes = 0;
  let previousNoteNumber = null;
  let maxInterval = 0;
  let shortestDuration = Number.POSITIVE_INFINITY;

  if (!Array.isArray(notes) || notes.length === 0) {
    return {
      bpm,
      timeSignature,
      meterSimple: SIMPLE_TIME_SIGNATURES.has(`${numerator}/${denominator}`),
      averageNotesPerBeat: 0,
      syncopationRatio: 0,
      fastNoteRatio: 0,
      multiNoteRatio: 0,
      fixedTargetRatio: 1,
      maxInterval: 0,
      shortestDuration,
      beatDurationMs,
      noteCount: 0
    };
  }

  notes.forEach((note) => {
    const beatFloat = note.time / beatDurationMs;
    const beatIndex = Math.round(beatFloat);
    const beatStart = beatIndex * beatDurationMs;
    const offset = Math.abs(note.time - beatStart);

    if (offset > syncToleranceMs) {
      syncopatedNotes += 1;
    }

    if (!beatMap.has(beatIndex)) {
      beatMap.set(beatIndex, {
        notes: [],
        uniqueNotes: new Set()
      });
    }

    const bucket = beatMap.get(beatIndex);
    bucket.notes.push(note);
    bucket.uniqueNotes.add(note.note);

    if (note.duration < beatDurationMs * 0.75) {
      fastNotes += 1;
    }

    shortestDuration = Math.min(shortestDuration, note.duration);

    if (Number.isFinite(note.noteNumber)) {
      if (previousNoteNumber !== null) {
        maxInterval = Math.max(maxInterval, Math.abs(note.noteNumber - previousNoteNumber));
      }
      previousNoteNumber = note.noteNumber;
    }
  });

  const beatCount = beatMap.size || 1;
  let beatsWithMultipleNotes = 0;
  let beatsWithFixedTarget = 0;

  beatMap.forEach((bucket) => {
    if (bucket.notes.length > 1) {
      beatsWithMultipleNotes += 1;
    }
    if (bucket.uniqueNotes.size <= 1) {
      beatsWithFixedTarget += 1;
    }
  });

  const averageNotesPerBeat = beatCount ? notes.length / beatCount : notes.length;
  const syncopationRatio = notes.length ? syncopatedNotes / notes.length : 0;
  const fastNoteRatio = notes.length ? fastNotes / notes.length : 0;
  const multiNoteRatio = beatCount ? beatsWithMultipleNotes / beatCount : 0;
  const fixedTargetRatio = beatCount ? beatsWithFixedTarget / beatCount : 1;

  return {
    bpm,
    timeSignature,
    meterSimple: SIMPLE_TIME_SIGNATURES.has(`${numerator}/${denominator}`),
    averageNotesPerBeat,
    syncopationRatio,
    fastNoteRatio,
    multiNoteRatio,
    fixedTargetRatio,
    maxInterval,
    shortestDuration,
    beatDurationMs,
    noteCount: notes.length
  };
}

function classifySongDifficulty(notes, metadata = {}) {
  const metrics = computeDifficultyMetrics(notes, metadata.bpm, metadata.timeSignature);

  if (!metrics.noteCount) {
    return {
      difficulty: 'easy',
      summary: 'Sem notas mapeadas · classificação padrão Fácil',
      metrics
    };
  }

  let difficulty = 'medium';

  if (
    metrics.meterSimple &&
    metrics.bpm < 90 &&
    metrics.averageNotesPerBeat <= 1.2 &&
    metrics.fixedTargetRatio >= 0.85 &&
    metrics.syncopationRatio <= 0.12 &&
    metrics.fastNoteRatio <= 0.25 &&
    metrics.maxInterval <= 7
  ) {
    difficulty = 'easy';
  } else if (
    metrics.bpm > 120 ||
    metrics.fastNoteRatio > 0.35 ||
    metrics.syncopationRatio > 0.3 ||
    metrics.multiNoteRatio > 0.35 ||
    metrics.maxInterval >= 12
  ) {
    difficulty = 'hard';
  }

  const summaryParts = [
    `${metrics.timeSignature}${metrics.meterSimple ? ' simples' : ''}`,
    `BPM ${metrics.bpm}`,
    `notas/batida ${metrics.averageNotesPerBeat.toFixed(2)}`,
    `síncopas ${(metrics.syncopationRatio * 100).toFixed(0)}%`,
    `intervalo máx ${Math.round(metrics.maxInterval)}st`
  ];

  return {
    difficulty,
    summary: summaryParts.join(' · '),
    metrics
  };
}

function sanitizeDifficultyHint(analysis, overrides = {}) {
  if (!analysis) {
    return null;
  }

  const metrics = analysis.metrics || {};
  const safeNumber = (value, digits) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (typeof digits === 'number') {
      return Number(value.toFixed(digits));
    }
    return value;
  };

  return {
    computed: analysis.difficulty,
    summary: analysis.summary,
    metrics: {
      bpm: safeNumber(metrics.bpm),
      timeSignature: metrics.timeSignature,
      meterSimple: Boolean(metrics.meterSimple),
      averageNotesPerBeat: safeNumber(metrics.averageNotesPerBeat, 2),
      syncopationRatio: safeNumber(metrics.syncopationRatio, 3),
      fastNoteRatio: safeNumber(metrics.fastNoteRatio, 3),
      multiNoteRatio: safeNumber(metrics.multiNoteRatio, 3),
      fixedTargetRatio: safeNumber(metrics.fixedTargetRatio, 3),
      maxInterval: safeNumber(metrics.maxInterval, 0),
      noteCount: safeNumber(metrics.noteCount)
    },
    ...overrides
  };
}

function printHelp() {
  console.log(`Usage: node scripts/import-midi.js --config <file> [--dry-run] [--validate-only]\n\n` +
    `Options:\n` +
    `  -c, --config <file>   Caminho para arquivo JSON com metadados e lista de arquivos MIDI.\n` +
    `  --dry-run           Executa sem escrever arquivos gerados.\n` +
    `  --validate-only     Apenas valida alcance das notas usando midi-player-js.\n` +
    `  -h, --help          Exibe esta ajuda.\n`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    validateOnly: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    switch (current) {
      case '--config':
      case '-c':
        args.config = argv[i + 1];
        i += 1;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--validate-only':
        args.validateOnly = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!current.startsWith('--')) {
          console.warn(`Ignorando argumento desconhecido: ${current}`);
        }
        break;
    }
  }

  if (!args.config) {
    console.error('Erro: é necessário informar um arquivo de configuração com --config.');
    printHelp();
    process.exit(1);
  }

  return args;
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
}

function readConfig(configPath) {
  const absolutePath = path.resolve(process.cwd(), configPath);
  ensureFileExists(absolutePath);

  const raw = fs.readFileSync(absolutePath, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Não foi possível interpretar o arquivo de configuração ${configPath}: ${error.message}`);
  }

  if (!Array.isArray(parsed.songs) || parsed.songs.length === 0) {
    throw new Error('O arquivo de configuração precisa conter um array "songs" com pelo menos uma entrada.');
  }

  const baseDir = path.dirname(absolutePath);
  const config = {
    ...DEFAULT_CONFIG,
    ...parsed,
    outputDir: path.resolve(baseDir, parsed.outputDir || DEFAULT_CONFIG.outputDir)
  };

  config.songs = parsed.songs.map((song) => ({
    ...song,
    input: path.resolve(baseDir, song.input),
    difficulty: song.difficulty || 'easy'
  }));

  return config;
}

function parseNoteSymbol(symbol) {
  const match = /^([A-Ga-g])(#|b)?(\d+)$/.exec(symbol.trim());
  if (!match) {
    throw new Error(`Símbolo de nota inválido: ${symbol}`);
  }

  const [, letterRaw, accidental, octaveRaw] = match;
  const letter = letterRaw.toUpperCase();
  const octave = parseInt(octaveRaw, 10);
  const accidentalValue = accidental === '#' ? 1 : (accidental === 'b' ? -1 : 0);

  const noteIndex = NOTE_NAME_LOOKUP.indexOf(letter);
  if (noteIndex === -1) {
    throw new Error(`Nota desconhecida: ${symbol}`);
  }

  const midiNumber = (octave + 1) * 12 + noteIndex;
  const offset = accidentalValue;

  return midiNumber + offset;
}

function parseRange(rangeConfig) {
  const config = rangeConfig || {};
  try {
    const min = parseNoteSymbol(config.min || DEFAULT_CONFIG.targetRange.min);
    const max = parseNoteSymbol(config.max || DEFAULT_CONFIG.targetRange.max);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      throw new Error('Intervalo inválido.');
    }
    return { min, max };
  } catch (error) {
    console.warn(`⚠️  Intervalo alvo inválido, usando padrão C4-C5. Motivo: ${error.message}`);
    return {
      min: parseNoteSymbol(DEFAULT_CONFIG.targetRange.min),
      max: parseNoteSymbol(DEFAULT_CONFIG.targetRange.max)
    };
  }
}

function midiNumberToInfo(noteNumber) {
  const pitchClassIndex = ((noteNumber % 12) + 12) % 12;
  const pitchClass = NOTE_NAME_LOOKUP[pitchClassIndex];
  const octave = Math.floor(noteNumber / 12) - 1;
  return { pitchClass, octave };
}

function sanitizeNoteName(noteNumber, range, warnings, context) {
  const { pitchClass, octave } = midiNumberToInfo(noteNumber);

  if (noteNumber < range.min || noteNumber > range.max) {
    warnings.push(`Nota fora do alcance (${pitchClass}${octave}) na música "${context.name}". Ajuste ou use transpose.`);
  }

  if (pitchClass.includes('#') || pitchClass.includes('b')) {
    warnings.push(`Acidental (${pitchClass}${octave}) detectado na música "${context.name}". Recomendado ajustar arquivo MIDI.`);
    return null;
  }

  if (pitchClass === 'C' && octave >= 5) {
    return 'C2';
  }

  return pitchClass;
}

function collectEvents(parsedMidi) {
  const events = [];

  parsedMidi.tracks.forEach((track, trackIndex) => {
    let absoluteTick = 0;
    track.forEach((event) => {
      absoluteTick += event.deltaTime;
      events.push({
        trackIndex,
        tick: absoluteTick,
        event
      });
    });
  });

  events.sort((a, b) => {
    if (a.tick === b.tick) {
      return a.trackIndex - b.trackIndex;
    }
    return a.tick - b.tick;
  });

  return events;
}

function buildTempoMap(events) {
  const tempoMap = [];
  let currentTempo = 500000; // 120 bpm padrão

  tempoMap.push({ tick: 0, microsecondsPerBeat: currentTempo });

  events.forEach(({ tick, event }) => {
    if (event.type === 'meta' && event.subtype === 'setTempo') {
      currentTempo = event.microsecondsPerBeat || currentTempo;
      tempoMap.push({ tick, microsecondsPerBeat: currentTempo });
    }
  });

  tempoMap.sort((a, b) => a.tick - b.tick);

  return tempoMap;
}

function createTickToMsConverter(tempoMap, ticksPerBeat) {
  return (tick) => {
    let prevTick = 0;
    let elapsedMs = 0;
    let currentTempo = tempoMap[0]?.microsecondsPerBeat || 500000;

    for (let i = 1; i < tempoMap.length; i += 1) {
      const entry = tempoMap[i];
      if (tick <= entry.tick) {
        break;
      }
      const deltaTicks = entry.tick - prevTick;
      elapsedMs += (deltaTicks * currentTempo) / ticksPerBeat / 1000;
      prevTick = entry.tick;
      currentTempo = entry.microsecondsPerBeat;
    }

    const remainingTicks = tick - prevTick;
    elapsedMs += (remainingTicks * currentTempo) / ticksPerBeat / 1000;

    return elapsedMs;
  };
}

function detectTimeSignature(events) {
  const signatureEvent = events.find(({ event }) => event.type === 'meta' && event.subtype === 'timeSignature');
  if (!signatureEvent) {
    return null;
  }
  const { numerator, denominator } = signatureEvent.event;
  return `${numerator}/${Math.pow(2, denominator)}`;
}

function detectBpm(tempoMap) {
  const first = tempoMap[0];
  if (!first) {
    return 120;
  }
  return Math.round(60000000 / first.microsecondsPerBeat);
}

function extractNotes(parsedMidi, songConfig, range, warnings) {
  const events = collectEvents(parsedMidi);
  const tempoMap = buildTempoMap(events);
  const tickToMs = createTickToMsConverter(tempoMap, parsedMidi.header.ticksPerBeat || 480);
  const activeNotes = new Map();
  const notes = [];
  const trackFilter = Array.isArray(songConfig.trackIndexes) && songConfig.trackIndexes.length > 0
    ? new Set(songConfig.trackIndexes)
    : null;
  const transpose = songConfig.transpose || 0;

  events.forEach(({ event, trackIndex, tick }) => {
    if (trackFilter && !trackFilter.has(trackIndex)) {
      return;
    }

    if (event.type === 'channel') {
      const key = `${trackIndex}:${event.channel}:${event.noteNumber}`;
      const isNoteOn = event.subtype === 'noteOn' && event.velocity > 0;
      const isNoteOff = event.subtype === 'noteOff' || (event.subtype === 'noteOn' && event.velocity === 0);

      if (isNoteOn) {
        activeNotes.set(key, {
          startTick: tick,
          noteNumber: event.noteNumber
        });
      } else if (isNoteOff) {
        const start = activeNotes.get(key);
        if (!start) {
          return;
        }

        const startTick = start.startTick;
        const endTick = tick;
        const startMs = tickToMs(startTick);
        const endMs = tickToMs(endTick);
        const durationMs = Math.max(1, Math.round(endMs - startMs));
        const adjustedNoteNumber = start.noteNumber + transpose;
        const sanitized = sanitizeNoteName(adjustedNoteNumber, range, warnings, songConfig);

        if (sanitized) {
          notes.push({
            time: Math.round(startMs),
            duration: durationMs,
            note: sanitized,
            noteNumber: adjustedNoteNumber
          });
        }

        activeNotes.delete(key);
      }
    }
  });

  notes.sort((a, b) => {
    if (a.time === b.time) {
      return a.noteNumber - b.noteNumber;
    }
    return a.time - b.time;
  });

  return {
    notes,
    tempoMap,
    timeSignature: detectTimeSignature(events)
  };
}

function computeMeasures(totalDurationMs, timeSignature, bpm) {
  const [beatsPerMeasure, beatUnit] = (timeSignature || '4/4').split('/')
    .map((value, index) => (index === 1 ? parseInt(value, 10) : parseInt(value, 10)));

  if (!beatsPerMeasure || !beatUnit) {
    return Math.max(1, Math.round((totalDurationMs / 1000) / (60 / bpm)));
  }

  const beatDurationMs = (60000 / bpm) * (4 / beatUnit);
  return Math.max(1, Math.ceil(totalDurationMs / (beatDurationMs * beatsPerMeasure)));
}

function ensureDifficultyDir(baseDir, difficulty) {
  const dir = path.join(baseDir, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function readIndex(indexPath, difficulty) {
  if (!fs.existsSync(indexPath)) {
    return {
      difficulty,
      generatedAt: new Date().toISOString(),
      files: []
    };
  }
  const raw = fs.readFileSync(indexPath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.files)) {
      parsed.files = [];
    }
    parsed.difficulty = parsed.difficulty || difficulty;
    return parsed;
  } catch (error) {
    throw new Error(`Falha ao ler ${indexPath}: ${error.message}`);
  }
}

function writeIndex(indexPath, data, dryRun) {
  const payload = {
    ...data,
    generatedAt: new Date().toISOString(),
    files: [...data.files].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  };

  if (dryRun) {
    console.log(`(dry-run) Atualização de index.json (${indexPath}):`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  fs.writeFileSync(indexPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeSongFile(songPath, content, dryRun) {
  if (dryRun) {
    console.log(`(dry-run) Escrita de ${songPath}`);
    console.log(JSON.stringify(content, null, 2));
    return;
  }

  fs.writeFileSync(songPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

function buildSongJson(songConfig, notes, metadata, globalConfig, difficultyHint) {
  const createdAt = songConfig.createdAt || globalConfig.defaultCreatedAt;
  const updatedAt = new Date().toISOString();
  const bpm = songConfig.bpm || metadata.bpm;
  const timeSignature = songConfig.timeSignature || metadata.timeSignature || '4/4';
  const totalDuration = notes.length ? Math.max(...notes.map((note) => note.time + note.duration)) : 0;
  const measures = computeMeasures(totalDuration, timeSignature, bpm || 120);
  const noteCount = notes.length;
  const allowedOrder = SUPPORTED_NOTES.reduce((acc, note, index) => ({ ...acc, [note]: index }), {});
  const noteNames = notes.map((note) => note.note);
  const minNote = noteNames.reduce((prev, curr) => (
    allowedOrder[curr] < allowedOrder[prev] ? curr : prev
  ), noteNames[0] || 'C');
  const maxNote = noteNames.reduce((prev, curr) => (
    allowedOrder[curr] > allowedOrder[prev] ? curr : prev
  ), noteNames[0] || 'C');
  const tags = mergeCuratorTags(songConfig.tags || []);

  return {
    songJson: {
      name: songConfig.name,
      slug: songConfig.slug,
      difficulty: songConfig.difficulty,
      bpm,
      timeSignature,
      key: songConfig.key || 'C Major',
      composer: songConfig.composer || 'Tradicional',
      arranger: songConfig.arranger || globalConfig.arranger,
      license: songConfig.license || globalConfig.defaultLicense,
      source: songConfig.source || 'Origem não especificada',
      tags,
      measures,
      duration: totalDuration,
      noteCount,
      previewRange: [minNote, maxNote],
      createdAt,
      updatedAt,
      notes: notes.map(({ note, time, duration }) => ({ note, time, duration })),
      difficultyHint: difficultyHint || null
    },
    indexEntry: {
      name: songConfig.name,
      file: `${songConfig.slug}.json`,
      composer: songConfig.composer || 'Tradicional',
      arranger: songConfig.arranger || globalConfig.arranger,
      bpm,
      key: songConfig.key || 'C Major',
      timeSignature,
      duration: totalDuration,
      measures,
      noteCount,
      tags,
      previewRange: [minNote, maxNote],
      summary: songConfig.summary || '',
      complexity: songConfig.complexity || { melodic: 1, rhythmic: 1, syncopation: 0 },
      source: songConfig.source || 'Origem não especificada',
      license: songConfig.license || globalConfig.defaultLicense,
      createdAt,
      updatedAt,
      difficulty: songConfig.difficulty,
      difficultyHint: difficultyHint || null
    }
  };
}

function updateIndex(baseDir, difficulty, indexEntry, dryRun) {
  const difficultyDir = ensureDifficultyDir(baseDir, difficulty);
  const indexPath = path.join(difficultyDir, 'index.json');
  const current = readIndex(indexPath, difficulty);
  const filtered = current.files.filter((file) => file.file !== indexEntry.file);
  filtered.push(indexEntry);
  writeIndex(indexPath, { ...current, files: filtered }, dryRun);
}

function runValidation(buffer, songName, range) {
  const warnings = [];

  try {
    const player = new MidiPlayer.Player();
    player.loadArrayBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

    const events = Array.isArray(player.events) ? player.events : [];

    events.forEach((trackEvents) => {
      trackEvents.forEach((event) => {
        if (event.name === 'Note on' && event.velocity > 0) {
          const noteNumber = event.noteNumber;
          if (noteNumber < range.min || noteNumber > range.max) {
            const info = midiNumberToInfo(noteNumber);
            warnings.push(`Notas fora do alcance detectadas por midi-player-js (${info.pitchClass}${info.octave}) em "${songName}".`);
          }
        }
      });
    });
  } catch (error) {
    warnings.push(`Validação midi-player-js falhou para "${songName}": ${error.message}`);
  }

  return warnings;
}

async function processSong(songConfig, globalConfig, options) {
  ensureFileExists(songConfig.input);
  const buffer = fs.readFileSync(songConfig.input);
  const parsedMidi = parseMidi(buffer);
  const range = parseRange(songConfig.targetRange || globalConfig.targetRange || DEFAULT_CONFIG.targetRange);
  const warnings = [];

  const { notes, tempoMap, timeSignature } = extractNotes(parsedMidi, songConfig, range, warnings);
  if (notes.length === 0) {
    warnings.push(`Nenhuma nota mapeada para "${songConfig.name}". Verifique trackIndexes ou arquivo MIDI.`);
  }

  const bpm = songConfig.bpm || detectBpm(tempoMap);
  const metadata = {
    bpm,
    timeSignature
  };
  const providedDifficulty = songConfig.difficulty;
  const classification = classifySongDifficulty(notes, metadata);
  const computedDifficulty = classification.difficulty || providedDifficulty || 'easy';
  const finalDifficulty = songConfig.forceDifficulty === true && providedDifficulty
    ? providedDifficulty
    : computedDifficulty;

  if (
    songConfig.forceDifficulty !== true &&
    providedDifficulty &&
    providedDifficulty !== 'auto' &&
    providedDifficulty !== finalDifficulty
  ) {
    warnings.push(`Dificuldade ajustada de "${providedDifficulty}" para "${finalDifficulty}" com base nas regras automáticas.`);
  }

  const difficultyHint = sanitizeDifficultyHint(classification, {
    provided: providedDifficulty || null,
    applied: finalDifficulty
  });

  const mergedTags = mergeCuratorTags(songConfig.tags || []);
  const finalSongConfig = {
    ...songConfig,
    difficulty: finalDifficulty,
    tags: mergedTags,
    difficultyHint
  };

  const { songJson, indexEntry } = buildSongJson(finalSongConfig, notes, metadata, globalConfig, difficultyHint);
  const songDir = ensureDifficultyDir(globalConfig.outputDir, finalSongConfig.difficulty);
  const songPath = path.join(songDir, `${finalSongConfig.slug}.json`);

  if (!options.validateOnly) {
    writeSongFile(songPath, songJson, options.dryRun);
    updateIndex(globalConfig.outputDir, finalSongConfig.difficulty, indexEntry, options.dryRun);
  }

  const validationWarnings = runValidation(buffer, songConfig.name, range);
  validationWarnings.forEach((warning) => warnings.push(warning));

  return {
    song: songConfig,
    warnings
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = readConfig(args.config);
  const results = [];

  for (const song of config.songs) {
    try {
      const outcome = await processSong(song, config, {
        dryRun: args.dryRun,
        validateOnly: args.validateOnly
      });
      results.push(outcome);
      const status = args.validateOnly ? 'validado' : 'gerado';
      console.log(`✅ ${song.name} (${song.difficulty}) ${status} com sucesso.`);
      if (outcome.warnings.length > 0) {
        outcome.warnings.forEach((warning) => console.warn(`   ⚠️  ${warning}`));
      }
    } catch (error) {
      console.error(`❌ Falha ao processar ${song.name}: ${error.message}`);
    }
  }

  const aggregatedWarnings = results.flatMap((result) => result.warnings || []);
  if (aggregatedWarnings.length > 0) {
    console.warn('\nResumo de alertas:');
    aggregatedWarnings.forEach((warning) => console.warn(` - ${warning}`));
  } else {
    console.log('\nTodas as músicas foram processadas sem alertas de alcance.');
  }
}

main().catch((error) => {
  console.error(`Erro inesperado: ${error.message}`);
  process.exit(1);
});
