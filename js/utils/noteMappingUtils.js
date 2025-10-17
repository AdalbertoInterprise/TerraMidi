// Note Mapping Utilities - Conversão entre notação musical e MIDI
class NoteMappingUtils {
    constructor() {
        this.defaultOctave = 4;
        this.noteOffsets = Object.freeze({
            'C': 0,
            'C#': 1,
            'D': 2,
            'D#': 3,
            'E': 4,
            'F': 5,
            'F#': 6,
            'G': 7,
            'G#': 8,
            'A': 9,
            'A#': 10,
            'B': 11
        });

        this.flatToSharp = Object.freeze({
            'CB': 'B',
            'DB': 'C#',
            'EB': 'D#',
            'FB': 'E',
            'GB': 'F#',
            'AB': 'G#',
            'BB': 'A#'
        });

        this.legacyBaseNotes = Object.freeze({
            'C': 60,
            'C#': 61,
            'D': 62,
            'D#': 63,
            'E': 64,
            'F': 65,
            'F#': 66,
            'G': 67,
            'G#': 68,
            'A': 69,
            'A#': 70,
            'B': 71
        });

        this.warnedNotes = new Set();
    }
    
    /**
     * Converte nota musical para número MIDI
     * @param {string} note - Nota musical (ex: 'C', 'C#', 'D', 'C2')
     * @returns {number} Número MIDI (0-127)
     */
    noteToMidi(note) {
        if (typeof note === 'number' && Number.isFinite(note)) {
            return this.clampMidi(Math.round(note));
        }

        const raw = typeof note === 'string' ? note.trim() : '';
        if (!raw) {
            return this.warnAndFallback(note);
        }

        const upper = raw.toUpperCase();

        if (this.legacyBaseNotes[upper] !== undefined) {
            return this.legacyBaseNotes[upper];
        }

        const match = upper.match(/^([A-G])([#B]?)(-?\d+)?$/);
        if (!match) {
            return this.warnAndFallback(note);
        }

        let [, letter, accidental = '', octaveStr] = match;
        let normalizedKey = letter;

        if (accidental === '#') {
            normalizedKey = `${letter}#`;
        } else if (accidental === 'B') {
            const flatKey = `${letter}B`;
            normalizedKey = this.flatToSharp[flatKey] || letter;
        }

        const pitchClass = this.noteOffsets[normalizedKey];

        if (pitchClass === undefined) {
            return this.warnAndFallback(note);
        }

        let octave = this.defaultOctave;
        if (octaveStr !== undefined) {
            const parsed = parseInt(octaveStr, 10);
            if (Number.isFinite(parsed)) {
                octave = parsed;
            }
        }

        const midi = pitchClass + (octave + 1) * 12;

        if (!Number.isFinite(midi) || midi < 0 || midi > 127) {
            return this.warnAndFallback(note, midi);
        }

        return midi;
    }
    
    /**
     * Converte número MIDI para nota musical
     * @param {number} midi - Número MIDI (0-127)
     * @returns {string} Nota musical
     */
    midiToNote(midi) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return `${noteNames[noteIndex]}${octave}`;
    }

    clampMidi(value) {
        if (!Number.isFinite(value)) {
            return 60;
        }
        return Math.min(127, Math.max(0, value));
    }

    warnAndFallback(note, computedValue) {
        const cacheKey = `${note ?? 'undefined'}`;
        if (!this.warnedNotes.has(cacheKey)) {
            const extra = Number.isFinite(computedValue) ? ` (calculado: ${computedValue})` : '';
            console.warn(`⚠️ Nota desconhecida: ${note}, usando C4 (60)${extra}`);
            this.warnedNotes.add(cacheKey);
        }
        return 60;
    }
    
    /**
     * Converte frequência em Hz para número MIDI
     * @param {number} frequency - Frequência em Hz
     * @returns {number} Número MIDI aproximado
     */
    frequencyToMidi(frequency) {
        // Fórmula: MIDI = 69 + 12 * log2(f / 440)
        return Math.round(69 + 12 * Math.log2(frequency / 440));
    }
    
    /**
     * Converte número MIDI para frequência em Hz
     * @param {number} midi - Número MIDI
     * @returns {number} Frequência em Hz
     */
    midiToFrequency(midi) {
        // Fórmula: f = 440 * 2^((MIDI - 69) / 12)
        return 440 * Math.pow(2, (midi - 69) / 12);
    }
}

// Exportar instância única
if (typeof window !== 'undefined') {
    window.NoteMappingUtils = NoteMappingUtils;
}
