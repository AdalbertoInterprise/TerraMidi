const fs = require('fs');
const path = require('path');

const BASE_OUTPUT = path.resolve(__dirname, '..', 'src', 'assets', 'musics');
const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
const DEFAULT_CREATED_AT = '2025-10-29T00:00:00.000Z';
const ARRANGER = 'Equipe Terra Game';

const SONGS = [
  {
    slug: 'ciranda-cirandinha',
    name: 'Ciranda Cirandinha',
    difficulty: 'easy',
    bpm: 82,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cancioneiro popular infantil brasileiro',
    tags: ['infantil', 'cantiga', 'brasil', 'ciranda'],
    summary: 'Ciranda tradicional com motivo descendente simples para trabalho motor em 2/4.',
    complexity: { melodic: 1, rhythmic: 1, syncopation: 0 },
    previewRangeHint: ['C', 'G'],
    pattern: ['C','D','E','D','C','E','D','C','E','F','G','F','E','D','C','C']
  },
  {
    slug: 'sapo-cururu',
    name: 'Sapo Cururu',
    difficulty: 'easy',
    bpm: 76,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Dominio público – tradição oral paulista',
    tags: ['infantil', 'cantiga', 'ribeirinho', 'brasil'],
    summary: 'Melodia baseada em graus conjuntos, ideal para pulsação lenta e articulação clara.',
    complexity: { melodic: 1, rhythmic: 1, syncopation: 0 },
    previewRangeHint: ['C', 'A'],
    pattern: ['G','G','A','G','E','G','G','A','G','E','G','E','D','C','D','C']
  },
  {
    slug: 'escravos-de-jo',
    name: 'Escravos de Jó',
    difficulty: 'easy',
    bpm: 84,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Brincadeira de roda brasileira',
    tags: ['infantil', 'cantiga', 'percussivo', 'brasil'],
    summary: 'Cantiga de roda com repetição cíclica para coordenação de movimentos em grupo.',
    complexity: { melodic: 2, rhythmic: 1, syncopation: 0 },
    previewRangeHint: ['C', 'A'],
    pattern: ['E','F','G','E','F','G','E','F','G','A','G','F','E','D','C','C']
  },
  {
    slug: 'boi-da-cara-preta',
    name: 'Boi da Cara Preta',
    difficulty: 'easy',
    bpm: 72,
    timeSignature: '3/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cancioneiro popular infantil brasileiro',
    tags: ['infantil', 'cantiga', 'ninar', 'brasil'],
    summary: 'Canção de ninar em 3/4 com movimento suave para respiração e relaxamento.',
    complexity: { melodic: 1, rhythmic: 1, syncopation: 0 },
    previewRangeHint: ['C', 'F'],
    pattern: ['C','D','E','F','E','D','C','E','D','C','D','C']
  },
  {
    slug: 'se-essa-rua-fosse-minha',
    name: 'Se Essa Rua Fosse Minha',
    difficulty: 'easy',
    bpm: 80,
    timeSignature: '3/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cancioneiro popular infantil brasileiro',
    tags: ['infantil', 'cantiga', 'lírica', 'brasil'],
    summary: 'Melodia expressiva em 3/4 com contorno ascendente e descendente moderado.',
    complexity: { melodic: 2, rhythmic: 1, syncopation: 0 },
    previewRangeHint: ['C', 'A'],
    pattern: ['E','F','G','A','G','F','E','G','F','E','D','C']
  },
  {
    slug: 'marcha-soldado',
    name: 'Marcha Soldado',
    difficulty: 'medium',
    bpm: 108,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cancioneiro militar infantil brasileiro',
    tags: ['infantil', 'cantiga', 'marcha', 'brasil'],
    summary: 'Motivo rítmico marcado em 2/4 para trabalhar marcha e acentuação binária.',
    complexity: { melodic: 2, rhythmic: 2, syncopation: 1 },
    previewRangeHint: ['C', 'A'],
    pattern: ['C','C','G','G','A','A','G','F','F','E','E','D','D','C','C','C']
  },
  {
    slug: 'o-cravo-e-a-rosa',
    name: 'O Cravo e a Rosa',
    difficulty: 'medium',
    bpm: 96,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cancioneiro infantil brasileiro',
    tags: ['infantil', 'cantiga', 'tradição', 'brasil'],
    summary: 'Melodia com saltos moderados e repetição temática para memória melódica.',
    complexity: { melodic: 3, rhythmic: 2, syncopation: 1 },
    previewRangeHint: ['C', 'A'],
    pattern: ['E','F','G','A','G','F','E','C','E','F','G','A','G','F','E','E']
  },
  {
    slug: 'peixe-vivo',
    name: 'Peixe Vivo',
    difficulty: 'medium',
    bpm: 102,
    timeSignature: '4/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Folclore brasileiro – região Sudeste',
    tags: ['infantil', 'cantiga', 'folclore', 'brasil'],
    summary: 'Canção em 4/4 com frases responsivas e extensão até C2.',
    complexity: { melodic: 3, rhythmic: 2, syncopation: 1 },
    previewRangeHint: ['E', 'C2'],
    pattern: ['G','G','A','B','C2','B','A','G','E','E','F','G','A','G','F','E']
  },
  {
    slug: 'samba-lele',
    name: 'Samba Lelê',
    difficulty: 'medium',
    bpm: 112,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cantiga popular baiana',
    tags: ['infantil', 'cantiga', 'percussivo', 'brasil'],
    summary: 'Linha melódica animada com repetição rítmica típica de samba de roda.',
    complexity: { melodic: 3, rhythmic: 3, syncopation: 2 },
    previewRangeHint: ['E', 'B'],
    pattern: ['E','G','A','G','E','G','A','G','E','F','G','A','B','G','A','G']
  },
  {
    slug: 'atirei-o-pau-no-gato',
    name: 'Atirei o Pau no Gato',
    difficulty: 'medium',
    bpm: 110,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Folclore brasileiro',
    tags: ['infantil', 'cantiga', 'parlenda', 'brasil'],
    summary: 'Melodia rápida com articulações em staccato para trabalhar reações motoras.',
    complexity: { melodic: 3, rhythmic: 3, syncopation: 2 },
    previewRangeHint: ['C', 'A'],
    pattern: ['G','E','G','A','G','F','E','D','C','E','G','A','G','F','E','C']
  },
  {
    slug: 'aquarela',
    name: 'Aquarela',
    difficulty: 'hard',
    bpm: 128,
    timeSignature: '4/4',
    key: 'C Major',
    composer: 'Toquinho e Vinícius de Moraes',
    license: 'Direitos reservados - uso educacional',
    source: 'Canção popular brasileira (1983)',
    tags: ['infantil', 'mpb', 'melódico', 'brasil'],
    summary: 'Tema de MPB com extensão ampla e condução melódica ascendente-descendente.',
    complexity: { melodic: 4, rhythmic: 3, syncopation: 2 },
    previewRangeHint: ['C', 'C2'],
    pattern: ['C','D','E','F','G','A','B','C2','B','A','G','F','E','D','C','C2']
  },
  {
    slug: 'asa-branca',
    name: 'Asa Branca',
    difficulty: 'hard',
    bpm: 132,
    timeSignature: '4/4',
    key: 'C Major',
    composer: 'Luiz Gonzaga e Humberto Teixeira',
    license: 'Direitos reservados - uso educacional',
    source: 'Canção nordestina (1947)',
    tags: ['infantil', 'forró', 'regional', 'brasil'],
    summary: 'Melodia nordestina com arpejos rápidos e desenho melódico amplo.',
    complexity: { melodic: 4, rhythmic: 4, syncopation: 3 },
    previewRangeHint: ['E', 'C2'],
    pattern: ['G','A','B','C2','B','A','G','E','F','G','A','B','A','G','F','E']
  },
  {
    slug: 'a-canoa-virou',
    name: 'A Canoa Virou',
    difficulty: 'hard',
    bpm: 140,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cantiga popular amazônica',
    tags: ['infantil', 'cantiga', 'regional', 'brasil'],
    summary: 'Frases curtas e aceleradas com saltos e retomadas rápidas.',
    complexity: { melodic: 4, rhythmic: 4, syncopation: 3 },
    previewRangeHint: ['E', 'C2'],
    pattern: ['E','F','G','A','G','F','E','G','A','B','C2','B','A','G','F','E']
  },
  {
    slug: 'tumbalacatumba',
    name: 'Tumbalacatumba',
    difficulty: 'hard',
    bpm: 138,
    timeSignature: '2/4',
    key: 'C Minor',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cantiga popular brasileira',
    tags: ['infantil', 'cantiga', 'ritual', 'brasil'],
    summary: 'Figura rítmica insistente com saltos dramáticos para estímulo motor intenso.',
    complexity: { melodic: 4, rhythmic: 4, syncopation: 3 },
    previewRangeHint: ['C', 'C2'],
    pattern: ['C','E','G','C2','B','A','G','F','E','G','B','C2','B','G','E','C']
  },
  {
    slug: 'cai-cai-balao',
    name: 'Cai Cai Balão',
    difficulty: 'hard',
    bpm: 150,
    timeSignature: '2/4',
    key: 'C Major',
    composer: 'Tradicional',
    license: 'Domínio público',
    source: 'Cantiga popular brasileira',
    tags: ['infantil', 'cantiga', 'festejo', 'brasil'],
    summary: 'Melodia veloz com padrão repetitivo e subida para oitava superior.',
    complexity: { melodic: 4, rhythmic: 4, syncopation: 3 },
    previewRangeHint: ['E', 'C2'],
    pattern: ['G','A','G','E','G','A','G','E','G','A','B','C2','B','A','G','E']
  }
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function computeNoteData(song) {
  const [beatsPerMeasure, beatUnit] = song.timeSignature.split('/').map(Number);
  const quarterDuration = 60000 / song.bpm;
  const beatDuration = quarterDuration * (4 / beatUnit);

  const notes = song.pattern.map((note, index) => ({
    time: Math.round(index * beatDuration),
    duration: Math.round(beatDuration * 0.9),
    note
  }));

  const noteIndices = notes
    .map((item) => NOTE_ORDER.indexOf(item.note))
    .filter((idx) => idx >= 0);

  const minIdx = noteIndices.length ? Math.min(...noteIndices) : 0;
  const maxIdx = noteIndices.length ? Math.max(...noteIndices) : 0;

  const previewRange = [
    song.previewRangeHint?.[0] || NOTE_ORDER[minIdx] || 'C',
    song.previewRangeHint?.[1] || NOTE_ORDER[maxIdx] || 'C'
  ];

  const measures = Math.max(1, Math.ceil(notes.length / beatsPerMeasure));
  const durationMs = Math.round(notes.length * beatDuration);

  return {
    notes,
    measures,
    durationMs,
    noteCount: notes.length,
    previewRange
  };
}

function buildSongPayload(song) {
  const { notes, measures, durationMs, noteCount, previewRange } = computeNoteData(song);

  const content = {
    name: song.name,
    slug: song.slug,
    difficulty: song.difficulty,
    bpm: song.bpm,
    timeSignature: song.timeSignature,
    key: song.key,
    composer: song.composer,
    arranger: ARRANGER,
    license: song.license,
    source: song.source,
    tags: song.tags,
    measures,
    duration: durationMs,
    noteCount,
    previewRange,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: new Date().toISOString(),
    notes
  };

  const indexMeta = {
    name: song.name,
    file: `${song.slug}.json`,
    composer: song.composer,
    arranger: ARRANGER,
    bpm: song.bpm,
    key: song.key,
    timeSignature: song.timeSignature,
    duration: durationMs,
    measures,
    noteCount,
    tags: song.tags,
    previewRange,
    summary: song.summary,
    complexity: song.complexity,
    source: song.source,
    license: song.license,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: new Date().toISOString()
  };

  return {
    data: content,
    index: indexMeta
  };
}

function main() {
  const songsByDifficulty = { easy: [], medium: [], hard: [] };

  SONGS.forEach((song) => {
    const diffDir = path.join(BASE_OUTPUT, song.difficulty);
    ensureDir(diffDir);

    const payload = buildSongPayload(song);
    const targetFile = path.join(diffDir, `${song.slug}.json`);

    fs.writeFileSync(targetFile, `${JSON.stringify(payload.data, null, 2)}\n`, 'utf8');
    songsByDifficulty[song.difficulty].push(payload.index);
  });

  Object.entries(songsByDifficulty).forEach(([difficulty, catalog]) => {
    catalog.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); 
    const indexPayload = {
      difficulty,
      generatedAt: new Date().toISOString(),
      files: catalog
    };

    const indexFile = path.join(BASE_OUTPUT, difficulty, 'index.json');
    fs.writeFileSync(indexFile, `${JSON.stringify(indexPayload, null, 2)}\n`, 'utf8');
  });

  console.log('✅ Catálogo infantil gerado com sucesso.');
}

if (require.main === module) {
  main();
}
