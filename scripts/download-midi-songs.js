/**
 * Script para baixar e converter músicas MIDI para o Terra Game
 * Busca músicas de repositórios públicos e converte para formato JSON
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { Midi } = require('@tonejs/midi');

// Mapeamento de notas MIDI (60-72) para notação do jogo (C-C2)
const MIDI_TO_GAME_NOTE = {
    60: 'C',   // C4
    62: 'D',   // D4
    64: 'E',   // E4
    65: 'F',   // F4
    67: 'G',   // G4
    69: 'A',   // A4
    71: 'B',   // B4
    72: 'C2'   // C5
};

// Catálogo de músicas por dificuldade
const MUSIC_CATALOG = {
    easy: [
        {
            name: 'Twinkle Twinkle Little Star',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/twinkletwinklelittlestar/twinkletwinklelittlestar.ino',
            bpm: 60
        },
        {
            name: 'Happy Birthday',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/happybirthday/happybirthday.ino',
            bpm: 70
        },
        {
            name: 'Jingle Bells',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/jinglebells/jinglebells.ino',
            bpm: 75
        },
        {
            name: 'Ode to Joy',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/odetojoy/odetojoy.ino',
            bpm: 70
        },
        {
            name: 'The Godfather',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/thegodfather/thegodfather.ino',
            bpm: 65
        }
    ],
    medium: [
        {
            name: 'Super Mario Bros',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/supermariobros/supermariobros.ino',
            bpm: 90
        },
        {
            name: 'The Simpsons',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/thesimpsons/thesimpsons.ino',
            bpm: 100
        },
        {
            name: 'Take On Me',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/takeonme/takeonme.ino',
            bpm: 95
        },
        {
            name: 'Tetris',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/tetris/tetris.ino',
            bpm: 105
        },
        {
            name: 'Pink Panther',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/pinkpanther/pinkpanther.ino',
            bpm: 90
        }
    ],
    hard: [
        {
            name: 'Star Wars',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/starwars/starwars.ino',
            bpm: 120
        },
        {
            name: 'Game of Thrones',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/gameofthrones/gameofthrones.ino',
            bpm: 130
        },
        {
            name: 'Pirates of the Caribbean',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/piratesofthecaribbean/piratesofthecaribbean.ino',
            bpm: 140
        },
        {
            name: 'Harry Potter',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/harrypotter/harrypotter.ino',
            bpm: 125
        },
        {
            name: 'Nokia Tune',
            source: 'arduino',
            url: 'https://raw.githubusercontent.com/robsoncouto/arduino-songs/master/nokiatune/nokiatune.ino',
            bpm: 150
        }
    ]
};

// Mapeamento de frequências do Arduino para notas MIDI
const ARDUINO_NOTE_TO_MIDI = {
    'NOTE_C4': 60, 'NOTE_CS4': 61, 'NOTE_D4': 62, 'NOTE_DS4': 63,
    'NOTE_E4': 64, 'NOTE_F4': 65, 'NOTE_FS4': 66, 'NOTE_G4': 67,
    'NOTE_GS4': 68, 'NOTE_A4': 69, 'NOTE_AS4': 70, 'NOTE_B4': 71,
    'NOTE_C5': 72, 'NOTE_CS5': 73, 'NOTE_D5': 74, 'NOTE_DS5': 75,
    'NOTE_E5': 76, 'NOTE_F5': 77, 'NOTE_FS5': 78, 'NOTE_G5': 79,
    'NOTE_GS5': 80, 'NOTE_A5': 81, 'NOTE_AS5': 82, 'NOTE_B5': 83,
    'NOTE_C6': 84
};

/**
 * Parseia arquivo .ino do Arduino e extrai melody/durations
 */
function parseArduinoSong(content, bpm) {
    const melodyMatch = content.match(/int\s+melody\[\]\s*=\s*\{([^}]+)\}/);
    const durationsMatch = content.match(/int\s+durations\[\]\s*=\s*\{([^}]+)\}/);
    
    if (!melodyMatch || !durationsMatch) {
        throw new Error('Formato Arduino inválido: melody/durations não encontrados');
    }

    const melodyStr = melodyMatch[1];
    const durationsStr = durationsMatch[1];

    // Extrair notas (remover comentários)
    const melodyLines = melodyStr.split('\n').map(line => line.split('//')[0].trim()).join(' ');
    const notes = melodyLines.split(',').map(n => n.trim()).filter(n => n);

    // Extrair durações
    const durationsLines = durationsStr.split('\n').map(line => line.split('//')[0].trim()).join(' ');
    const durations = durationsLines.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));

    if (notes.length !== durations.length) {
        console.warn(`Mismatch: ${notes.length} notas vs ${durations.length} durações. Ajustando...`);
    }

    // Converter para formato JSON com timestamps
    const sequence = [];
    let cumulativeTime = 0;
    const quarterNoteDuration = (60 / bpm) * 1000; // ms por quarter note

    for (let i = 0; i < Math.min(notes.length, durations.length); i++) {
        const noteName = notes[i];
        const durationValue = durations[i];

        // Ignorar pausas (NOTE_REST, 0, etc)
        if (noteName === '0' || noteName.includes('REST')) {
            const pauseDuration = quarterNoteDuration / (durationValue || 4);
            cumulativeTime += pauseDuration;
            continue;
        }

        // Converter nota Arduino para MIDI
        const midiNote = ARDUINO_NOTE_TO_MIDI[noteName];
        if (!midiNote || midiNote < 60 || midiNote > 72) {
            // Ignorar notas fora do range C4-C5
            const noteDuration = quarterNoteDuration / (durationValue || 4);
            cumulativeTime += noteDuration;
            continue;
        }

        // Converter MIDI para notação do jogo
        const gameNote = MIDI_TO_GAME_NOTE[midiNote];
        if (!gameNote) {
            const noteDuration = quarterNoteDuration / (durationValue || 4);
            cumulativeTime += noteDuration;
            continue;
        }

        // Calcular duração em ms (4 = quarter note, 8 = eighth note, etc)
        const noteDuration = quarterNoteDuration / (durationValue || 4);

        sequence.push({
            note: gameNote,
            time: Math.round(cumulativeTime),
            duration: Math.round(noteDuration)
        });

        cumulativeTime += noteDuration;
    }

    return sequence;
}

/**
 * Baixa e processa uma música
 */
async function downloadAndConvertSong(songInfo, difficulty) {
    try {
        console.log(`📥 Baixando: ${songInfo.name} (${difficulty})...`);
        
        const response = await axios.get(songInfo.url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'TerraMidi/1.0'
            }
        });

        let sequence;
        if (songInfo.source === 'arduino') {
            sequence = parseArduinoSong(response.data, songInfo.bpm);
        } else {
            throw new Error(`Fonte não suportada: ${songInfo.source}`);
        }

        // Validar duração mínima (≥2min = 120000ms)
        const totalDuration = sequence.length > 0 
            ? sequence[sequence.length - 1].time + sequence[sequence.length - 1].duration 
            : 0;

        if (totalDuration < 120000) {
            console.warn(`⚠️  ${songInfo.name}: duração ${(totalDuration/1000).toFixed(1)}s < 2min. Duplicando sequência...`);
            // Duplicar sequência para atingir 2min
            const originalSequence = [...sequence];
            let offset = totalDuration;
            while (offset < 120000) {
                originalSequence.forEach(note => {
                    sequence.push({
                        note: note.note,
                        time: note.time + offset,
                        duration: note.duration
                    });
                });
                offset += totalDuration;
            }
        }

        const finalDuration = sequence[sequence.length - 1].time + sequence[sequence.length - 1].duration;

        const output = {
            name: songInfo.name,
            difficulty: difficulty,
            bpm: songInfo.bpm,
            duration: finalDuration,
            noteCount: sequence.length,
            notes: sequence
        };

        // Salvar arquivo JSON
        const filename = songInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
        const outputPath = path.join(__dirname, '..', 'src', 'assets', 'musics', difficulty, filename);
        
        await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
        
        console.log(`✅ ${songInfo.name}: ${sequence.length} notas, ${(finalDuration/1000/60).toFixed(1)}min → ${filename}`);
        
        return { 
            success: true, 
            file: filename,
            duration: finalDuration,
            noteCount: sequence.length
        };
    } catch (error) {
        console.error(`❌ Erro ao processar ${songInfo.name}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Processa todas as músicas do catálogo
 */
async function downloadAllSongs() {
    console.log('🎵 Iniciando download de músicas MIDI...\n');
    
    const results = {
        easy: [],
        medium: [],
        hard: []
    };

    for (const difficulty of ['easy', 'medium', 'hard']) {
        console.log(`\n📂 Processando nível: ${difficulty.toUpperCase()}`);
        console.log('─'.repeat(50));
        
        const songs = MUSIC_CATALOG[difficulty];
        const successfulFiles = [];
        
        for (const song of songs) {
            const result = await downloadAndConvertSong(song, difficulty);
            results[difficulty].push(result);
            
            if (result.success) {
                successfulFiles.push({
                    file: result.file,
                    name: song.name,
                    bpm: song.bpm,
                    duration: result.duration || 0,
                    noteCount: result.noteCount || 0
                });
            }
            
            // Aguardar 500ms entre requisições para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Criar arquivo index.json para cada dificuldade
        if (successfulFiles.length > 0) {
            const indexPath = path.join(__dirname, '..', 'src', 'assets', 'musics', difficulty, 'index.json');
            const indexData = {
                generated: new Date().toISOString(),
                difficulty: difficulty,
                count: successfulFiles.length,
                files: successfulFiles
            };
            await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
            console.log(`📄 index.json criado: ${successfulFiles.length} músicas`);
        }
    }

    // Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DO DOWNLOAD');
    console.log('='.repeat(50));
    
    for (const difficulty of ['easy', 'medium', 'hard']) {
        const successful = results[difficulty].filter(r => r.success).length;
        const total = results[difficulty].length;
        console.log(`${difficulty.padEnd(8)}: ${successful}/${total} músicas baixadas`);
    }
    
    console.log('\n✨ Download concluído!');
}

// Executar
if (require.main === module) {
    downloadAllSongs().catch(error => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { downloadAndConvertSong, parseArduinoSong };
