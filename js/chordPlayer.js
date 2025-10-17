// Chord Player - Sistema de acordes com efeitos de strum
// Implementa queueChord, queueStrumUp, queueStrumDown, queueSnap
// Baseado em: https://surikov.github.io/webaudiofont/examples/strum.html

class ChordPlayer {
    constructor(player, audioContext) {
        this.player = player; // WebAudioFontPlayer instance
        this.audioContext = audioContext;
        
        // Configurações de strum
        this.strumTime = 0.05; // 50ms entre notas no strum
        this.snapTime = 0.01;  // 10ms entre notas no snap (arpejo rápido)
        
        // Biblioteca de acordes pré-definidos (MIDI notes)
        this.chordLibrary = this.buildChordLibrary();
        
        console.log('🎸 ChordPlayer inicializado');
        console.log(`📚 ${Object.keys(this.chordLibrary).length} tipos de acordes disponíveis`);
    }
    
    /**
     * Toca acorde simultâneo (todas notas ao mesmo tempo)
     * @param {AudioNode} target - Nó de destino (channel ou masterGain)
     * @param {Object} preset - Preset do instrumento
     * @param {number} when - Momento de tocar (audioContext.currentTime)
     * @param {Array<number>} pitches - Array de MIDI pitches
     * @param {number} duration - Duração de cada nota
     * @param {number} volume - Volume (0.0 a 1.0)
     * @returns {Array} Envelopes das notas tocadas
     */
    queueChord(target, preset, when, pitches, duration, volume = 1.0) {
        const envelopes = [];
        
        pitches.forEach(pitch => {
            const envelope = this.player.queueWaveTable(
                this.audioContext,
                target,
                preset,
                when,
                pitch,
                duration,
                volume
            );
            envelopes.push(envelope);
        });
        
        console.log(`🎵 Chord (${pitches.length} notas) tocado em ${when.toFixed(2)}s`);
        return envelopes;
    }
    
    /**
     * Toca acorde com strum ascendente (grave para agudo)
     * @param {AudioNode} target - Nó de destino
     * @param {Object} preset - Preset do instrumento
     * @param {number} when - Momento de início
     * @param {Array<number>} pitches - Array de MIDI pitches (será ordenado)
     * @param {number} duration - Duração de cada nota
     * @param {number} volume - Volume (0.0 a 1.0)
     * @returns {Array} Envelopes das notas tocadas
     */
    queueStrumUp(target, preset, when, pitches, duration, volume = 1.0) {
        const envelopes = [];
        const sortedPitches = [...pitches].sort((a, b) => a - b); // Grave → Agudo
        
        sortedPitches.forEach((pitch, index) => {
            const noteTime = when + (index * this.strumTime);
            const envelope = this.player.queueWaveTable(
                this.audioContext,
                target,
                preset,
                noteTime,
                pitch,
                duration,
                volume
            );
            envelopes.push(envelope);
        });
        
        console.log(`🎸↗️ Strum Up (${pitches.length} notas) começando em ${when.toFixed(2)}s`);
        return envelopes;
    }
    
    /**
     * Toca acorde com strum descendente (agudo para grave)
     * @param {AudioNode} target - Nó de destino
     * @param {Object} preset - Preset do instrumento
     * @param {number} when - Momento de início
     * @param {Array<number>} pitches - Array de MIDI pitches (será ordenado)
     * @param {number} duration - Duração de cada nota
     * @param {number} volume - Volume (0.0 a 1.0)
     * @returns {Array} Envelopes das notas tocadas
     */
    queueStrumDown(target, preset, when, pitches, duration, volume = 1.0) {
        const envelopes = [];
        const sortedPitches = [...pitches].sort((a, b) => b - a); // Agudo → Grave
        
        sortedPitches.forEach((pitch, index) => {
            const noteTime = when + (index * this.strumTime);
            const envelope = this.player.queueWaveTable(
                this.audioContext,
                target,
                preset,
                noteTime,
                pitch,
                duration,
                volume
            );
            envelopes.push(envelope);
        });
        
        console.log(`🎸↘️ Strum Down (${pitches.length} notas) começando em ${when.toFixed(2)}s`);
        return envelopes;
    }
    
    /**
     * Toca acorde com snap (arpejo rápido)
     * @param {AudioNode} target - Nó de destino
     * @param {Object} preset - Preset do instrumento
     * @param {number} when - Momento de início
     * @param {Array<number>} pitches - Array de MIDI pitches
     * @param {number} duration - Duração de cada nota
     * @param {number} volume - Volume (0.0 a 1.0)
     * @returns {Array} Envelopes das notas tocadas
     */
    queueSnap(target, preset, when, pitches, duration, volume = 1.0) {
        const envelopes = [];
        const sortedPitches = [...pitches].sort((a, b) => a - b);
        
        sortedPitches.forEach((pitch, index) => {
            const noteTime = when + (index * this.snapTime);
            const envelope = this.player.queueWaveTable(
                this.audioContext,
                target,
                preset,
                noteTime,
                pitch,
                duration,
                volume
            );
            envelopes.push(envelope);
        });
        
        console.log(`⚡ Snap (${pitches.length} notas) começando em ${when.toFixed(2)}s`);
        return envelopes;
    }
    
    /**
     * Constrói biblioteca de acordes
     */
    buildChordLibrary() {
        const library = {};
        
        // Função auxiliar para construir acorde a partir de intervalos
        const buildChord = (root, intervals) => intervals.map(i => root + i);
        
        // Tríades básicas
        library.major = (root) => buildChord(root, [0, 4, 7]);
        library.minor = (root) => buildChord(root, [0, 3, 7]);
        library.diminished = (root) => buildChord(root, [0, 3, 6]);
        library.augmented = (root) => buildChord(root, [0, 4, 8]);
        library.sus2 = (root) => buildChord(root, [0, 2, 7]);
        library.sus4 = (root) => buildChord(root, [0, 5, 7]);
        
        // Tétrades (4 notas)
        library.major7 = (root) => buildChord(root, [0, 4, 7, 11]);
        library.minor7 = (root) => buildChord(root, [0, 3, 7, 10]);
        library.dominant7 = (root) => buildChord(root, [0, 4, 7, 10]);
        library.diminished7 = (root) => buildChord(root, [0, 3, 6, 9]);
        library.halfDiminished7 = (root) => buildChord(root, [0, 3, 6, 10]);
        library.augmented7 = (root) => buildChord(root, [0, 4, 8, 10]);
        library.minor7b5 = (root) => buildChord(root, [0, 3, 6, 10]);
        
        // Extensões
        library.major9 = (root) => buildChord(root, [0, 4, 7, 11, 14]);
        library.minor9 = (root) => buildChord(root, [0, 3, 7, 10, 14]);
        library.dominant9 = (root) => buildChord(root, [0, 4, 7, 10, 14]);
        library.major11 = (root) => buildChord(root, [0, 4, 7, 11, 14, 17]);
        library.dominant13 = (root) => buildChord(root, [0, 4, 7, 10, 14, 21]);
        
        // Acordes de power chord (rock)
        library.power = (root) => buildChord(root, [0, 7]);
        library.powerOctave = (root) => buildChord(root, [0, 7, 12]);
        
        // Acordes abertos (voicings)
        library.majorOpen = (root) => buildChord(root, [0, 7, 12, 16, 19]);
        library.minorOpen = (root) => buildChord(root, [0, 7, 12, 15, 19]);
        
        return library;
    }
    
    /**
     * Obtém acorde da biblioteca
     * @param {string} type - Tipo do acorde (ex: 'major', 'minor7', etc)
     * @param {number} root - Nota raiz (MIDI number)
     * @returns {Array<number>} Array de pitches
     */
    getChord(type, root) {
        const chordFn = this.chordLibrary[type];
        if (!chordFn) {
            console.warn(`⚠️ Tipo de acorde desconhecido: ${type}`);
            return this.chordLibrary.major(root); // Fallback para maior
        }
        return chordFn(root);
    }
    
    /**
     * Toca progressão de acordes
     * @param {AudioNode} target - Nó de destino
     * @param {Object} preset - Preset do instrumento
     * @param {number} startTime - Tempo de início
     * @param {Array} progression - Array de {type, root, duration}
     * @param {string} strumStyle - 'chord', 'up', 'down', 'snap'
     * @param {number} volume - Volume
     * @returns {Array} Todos os envelopes
     */
    queueProgression(target, preset, startTime, progression, strumStyle = 'chord', volume = 1.0) {
        let currentTime = startTime;
        const allEnvelopes = [];
        
        progression.forEach(({type, root, duration}) => {
            const pitches = this.getChord(type, root);
            let envelopes;
            
            switch(strumStyle) {
                case 'up':
                    envelopes = this.queueStrumUp(target, preset, currentTime, pitches, duration, volume);
                    break;
                case 'down':
                    envelopes = this.queueStrumDown(target, preset, currentTime, pitches, duration, volume);
                    break;
                case 'snap':
                    envelopes = this.queueSnap(target, preset, currentTime, pitches, duration, volume);
                    break;
                default:
                    envelopes = this.queueChord(target, preset, currentTime, pitches, duration, volume);
            }
            
            allEnvelopes.push(...envelopes);
            currentTime += duration;
        });
        
        console.log(`🎼 Progressão tocada: ${progression.length} acordes`);
        return allEnvelopes;
    }
    
    /**
     * Toca acorde por nome (ex: "C major", "Dm7", "G7")
     * @param {AudioNode} target - Nó de destino
     * @param {Object} preset - Preset do instrumento
     * @param {number} when - Tempo
     * @param {string} chordName - Nome do acorde (ex: "C major", "Dm7")
     * @param {number} duration - Duração
     * @param {string} style - Estilo de strum
     * @param {number} volume - Volume
     */
    playChordByName(target, preset, when, chordName, duration, style = 'chord', volume = 1.0) {
        const parsed = this.parseChordName(chordName);
        if (!parsed) {
            console.error(`❌ Acorde inválido: ${chordName}`);
            return [];
        }
        
        const pitches = this.getChord(parsed.type, parsed.root);
        
        switch(style) {
            case 'up': return this.queueStrumUp(target, preset, when, pitches, duration, volume);
            case 'down': return this.queueStrumDown(target, preset, when, pitches, duration, volume);
            case 'snap': return this.queueSnap(target, preset, when, pitches, duration, volume);
            default: return this.queueChord(target, preset, when, pitches, duration, volume);
        }
    }
    
    /**
     * Parse nome de acorde (ex: "Cm7" → {root: 60, type: 'minor7'})
     */
    parseChordName(chordName) {
        const noteMap = {
            'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
            'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
            'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
        };
        
        const typeMap = {
            'major': 'major', 'M': 'major', '': 'major',
            'minor': 'minor', 'm': 'minor',
            'dim': 'diminished', '°': 'diminished',
            'aug': 'augmented', '+': 'augmented',
            'sus2': 'sus2', 'sus4': 'sus4',
            '7': 'dominant7', 'maj7': 'major7', 'M7': 'major7',
            'm7': 'minor7', 'dim7': 'diminished7', 'm7b5': 'halfDiminished7'
        };
        
        // Tentar extrair nota e tipo
        for (const [noteName, midiNote] of Object.entries(noteMap)) {
            if (chordName.startsWith(noteName)) {
                const typeStr = chordName.slice(noteName.length).trim();
                const type = typeMap[typeStr] || 'major';
                return { root: midiNote, type };
            }
        }
        
        return null;
    }
    
    /**
     * Define tempo de strum
     */
    setStrumTime(seconds) {
        this.strumTime = Math.max(0.01, Math.min(0.2, seconds));
    }
    
    /**
     * Define tempo de snap
     */
    setSnapTime(seconds) {
        this.snapTime = Math.max(0.001, Math.min(0.05, seconds));
    }
    
    /**
     * Lista todos os tipos de acordes disponíveis
     */
    listAvailableChords() {
        return Object.keys(this.chordLibrary);
    }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordPlayer;
}
