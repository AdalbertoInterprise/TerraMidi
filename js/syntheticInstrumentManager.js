/**
 * Synthetic Instrument Manager
 * Gerencia instrumentos sintéticos gerados via Web Audio API
 * Integração com soundfontManager existente
 */

class SyntheticInstrumentManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.instruments = new Map();
        this.activeNotes = new Map(); // Rastreia notas ativas
        
        // Inicializa instrumentos sintéticos disponíveis
        this.initInstruments();
    }
    
    /**
     * Inicializa todos os sintetizadores disponíveis
     */
    initInstruments() {
        // Tigela Tibetana
        if (typeof TibetanBowlSynth !== 'undefined') {
            this.instruments.set('tibetan-bowl', {
                name: 'Tigela Tibetana (Solfeggio)',
                synth: new TibetanBowlSynth(this.audioContext),
                category: 'therapeutic',
                type: 'synthetic',
                icon: '🎵',
                description: 'Sons de tigelas tibetanas com frequências Solfeggio terapêuticas'
            });
        }
        
        console.log(`✅ ${this.instruments.size} instrumentos sintéticos carregados`);
    }
    
    /**
     * Lista todos os instrumentos sintéticos disponíveis
     * @returns {array} Array de instrumentos
     */
    listInstruments() {
        const list = [];
        
        for (const [id, instrument] of this.instruments.entries()) {
            list.push({
                id,
                name: instrument.name,
                category: instrument.category,
                type: instrument.type,
                icon: instrument.icon,
                description: instrument.description
            });
        }
        
        return list;
    }
    
    /**
     * Obtém um instrumento sintético pelo ID
     * @param {string} instrumentId - ID do instrumento
     * @returns {object|null} Instrumento ou null
     */
    getInstrument(instrumentId) {
        const instrument = this.instruments.get(instrumentId);
        return instrument ? instrument.synth : null;
    }
    
    /**
     * Toca uma nota em um instrumento sintético
     * @param {string} instrumentId - ID do instrumento
     * @param {number} midi - Nota MIDI (0-127)
     * @param {number} velocity - Velocidade (0.0-1.0)
     * @param {number} duration - Duração em segundos
     * @param {object} options - Opções adicionais
     */
    playNote(instrumentId, midi, velocity = 0.8, duration = 2.0, options = {}) {
        const synth = this.getInstrument(instrumentId);
        
        if (!synth) {
            console.warn(`⚠️ Instrumento sintético não encontrado: ${instrumentId}`);
            return null;
        }
        
        // Toca a nota
        const noteData = synth.play(midi, velocity, duration, options);
        
        // Rastreia nota ativa
        const noteKey = `${instrumentId}-${midi}`;
        this.activeNotes.set(noteKey, {
            instrumentId,
            midi,
            startTime: this.audioContext.currentTime,
            noteData
        });
        
        // Remove do rastreamento após a duração
        setTimeout(() => {
            this.activeNotes.delete(noteKey);
        }, (duration + 5.0) * 1000); // +5s buffer para release
        
        return noteData;
    }
    
    /**
     * Para todas as notas ativas de um instrumento
     * @param {string} instrumentId - ID do instrumento (opcional)
     */
    stopAllNotes(instrumentId = null) {
        const now = this.audioContext.currentTime;
        
        for (const [noteKey, noteInfo] of this.activeNotes.entries()) {
            if (!instrumentId || noteInfo.instrumentId === instrumentId) {
                // Fade out rápido
                if (noteInfo.noteData && noteInfo.noteData.masterGain) {
                    noteInfo.noteData.masterGain.gain.cancelScheduledValues(now);
                    noteInfo.noteData.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                }
                
                this.activeNotes.delete(noteKey);
            }
        }
    }
    
    /**
     * Integração com WebAudioFontPlayer (para compatibilidade)
     * Converte chamada do player para sintetizador
     */
    createPlayerCompatibleMethod(instrumentId) {
        const self = this;
        
        return {
            queueWaveTable: function(audioContext, destination, preset, when, pitch, duration, volume) {
                // Converte parâmetros do WebAudioFont para nosso formato
                const midi = pitch;
                const velocity = Math.min(1.0, volume); // Normaliza volume
                const dur = duration;
                
                // Toca usando nosso sintetizador
                self.playNote(instrumentId, midi, velocity, dur);
                
                // Retorna objeto compatível (envelope)
                return {
                    cancel: function() {
                        self.stopAllNotes(instrumentId);
                    }
                };
            }
        };
    }
    
    /**
     * Registra instrumentos sintéticos no soundfontManager
     * Adiciona à lista de instrumentos disponíveis
     */
    registerWithSoundfontManager(soundfontManager) {
        if (!soundfontManager) {
            console.warn('⚠️ soundfontManager não disponível');
            return;
        }
        
        // Adiciona cada instrumento sintético ao catálogo
        for (const [id, instrument] of this.instruments.entries()) {
            const instrumentKey = `_synthetic_${id}`;
            
            // Cria preset falso para compatibilidade
            const syntheticPreset = {
                name: instrument.name,
                synthetic: true,
                instrumentId: id,
                category: instrument.category,
                icon: instrument.icon,
                description: instrument.description
            };
            
            // Registra no soundfont manager (se método existir)
            if (soundfontManager.instruments) {
                soundfontManager.instruments[instrumentKey] = syntheticPreset;
            }
            
            console.log(`✅ Registrado: ${instrument.name} (${instrumentKey})`);
        }
    }
    
    /**
     * Exporta informações para catálogo
     * @returns {object} Dados formatados para catalogManager
     */
    exportCatalogData() {
        const catalog = {
            synthetic: {
                name: 'Instrumentos Sintéticos (Terapêuticos)',
                count: this.instruments.size,
                sizeBytes: 0, // Sem tamanho - gerado em tempo real
                instruments: []
            }
        };
        
        for (const [id, instrument] of this.instruments.entries()) {
            catalog.synthetic.instruments.push({
                id: `_synthetic_${id}`,
                name: instrument.name,
                category: instrument.category,
                type: 'synthetic',
                icon: instrument.icon,
                description: instrument.description,
                sizeBytes: 0,
                sizeKB: 0
            });
        }
        
        return catalog;
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyntheticInstrumentManager;
}
