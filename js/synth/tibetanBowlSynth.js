/**
 * Tibetan Bowl Synthesizer
 * Gera sons de tigelas tibetanas sintéticas usando Web Audio API
 * Implementa frequências Solfeggio terapêuticas sem downloads externos
 * 
 * Baseado em síntese aditiva com múltiplos harmônicos + filtro passa-baixa
 * Algoritmo inspirado em Tone.js MetalSynth e técnicas Karplus-Strong
 */

class TibetanBowlSynth {
    constructor(audioContext) {
        this.audioContext = audioContext;
        
        // Frequências Solfeggio (Hz) - propriedades terapêuticas
        this.solfeggioFrequencies = {
            'UT': 396,   // Liberação do medo
            'RE': 417,   // Desfazendo situações e facilitando mudança
            'MI': 528,   // Transformação e milagres (reparo DNA)
            'FA': 639,   // Conexão e relacionamentos
            'SOL': 741,  // Despertar intuição
            'LA': 852,   // Retorno à ordem espiritual
            'SI': 963    // Sistema nervoso
        };
        
        // Configurações padrão do envelope ADSR
        this.envelope = {
            attack: 0.01,    // Ataque muito rápido (10ms)
            decay: 0.5,      // Decay médio (500ms)
            sustain: 0.7,    // Sustain alto (70% do volume)
            release: 4.0     // Release muito longo (4 segundos) - característico de tigelas
        };
        
        // Configurações de harmônicos (séries de overtones)
        this.harmonics = {
            count: 8,                           // 8 harmônicos
            amplitudes: [1.0, 0.5, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08], // Decaimento
            ratios: [1, 2, 3, 4, 5, 6, 7, 8]   // Série harmônica natural
        };
        
        // Filtro passa-baixa para suavizar o som
        this.filterSettings = {
            frequency: 2000,  // Corta frequências acima de 2kHz
            Q: 1.0,           // Ressonância suave
            type: 'lowpass'
        };
    }
    
    /**
     * Converte número MIDI para frequência (Hz)
     * @param {number} midi - Nota MIDI (0-127)
     * @returns {number} Frequência em Hz
     */
    midiToFrequency(midi) {
        // Fórmula padrão: f = 440 * 2^((midi - 69) / 12)
        return 440 * Math.pow(2, (midi - 69) / 12);
    }
    
    /**
     * Encontra a frequência Solfeggio mais próxima
     * @param {number} targetFreq - Frequência alvo (Hz)
     * @returns {object} {name, frequency}
     */
    findClosestSolfeggio(targetFreq) {
        let closest = null;
        let minDiff = Infinity;
        
        for (const [name, freq] of Object.entries(this.solfeggioFrequencies)) {
            const diff = Math.abs(freq - targetFreq);
            if (diff < minDiff) {
                minDiff = diff;
                closest = { name, frequency: freq };
            }
        }
        
        return closest;
    }
    
    /**
     * Toca uma nota de tigela tibetana
     * @param {number} midi - Nota MIDI (0-127)
     * @param {number} velocity - Velocidade/volume (0.0-1.0)
     * @param {number} duration - Duração em segundos
     * @param {object} options - Opções adicionais
     * @returns {object} Nodes criados (para stop manual se necessário)
     */
    play(midi, velocity = 0.8, duration = 5.0, options = {}) {
        const now = this.audioContext.currentTime;
        
        // Configurações (permite override)
        const useSolfeggio = options.useSolfeggio !== false; // true por padrão
        const detuneAmount = options.detune || 0; // cents
        
        // Calcula frequência base
        let fundamentalFreq = this.midiToFrequency(midi);
        
        // Se usar Solfeggio, ajusta para a frequência mais próxima
        if (useSolfeggio) {
            const solfeggio = this.findClosestSolfeggio(fundamentalFreq);
            fundamentalFreq = solfeggio.frequency;
            console.log(`🎵 Solfeggio: ${solfeggio.name} (${solfeggio.frequency}Hz)`);
        }
        
        // Cria nó de ganho master (para envelope)
        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0, now);
        
        // Filtro passa-baixa (suaviza o som)
        const filter = this.audioContext.createBiquadFilter();
        filter.type = this.filterSettings.type;
        filter.frequency.setValueAtTime(this.filterSettings.frequency, now);
        filter.Q.setValueAtTime(this.filterSettings.Q, now);
        
        // Array para armazenar todos os osciladores
        const oscillators = [];
        
        // Cria osciladores para cada harmônico
        for (let i = 0; i < this.harmonics.count; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Frequência: fundamental * ratio do harmônico
            const harmonicFreq = fundamentalFreq * this.harmonics.ratios[i];
            osc.frequency.setValueAtTime(harmonicFreq, now);
            osc.type = 'sine'; // Ondas senoidais puras
            
            // Detune (se especificado)
            if (detuneAmount !== 0) {
                osc.detune.setValueAtTime(detuneAmount, now);
            }
            
            // Volume do harmônico (decresce com a ordem)
            const harmonicVolume = this.harmonics.amplitudes[i] * velocity;
            gain.gain.setValueAtTime(harmonicVolume, now);
            
            // Conexões: Oscillator → Gain → Filter
            osc.connect(gain);
            gain.connect(filter);
            
            oscillators.push({ osc, gain });
        }
        
        // Filtro → Master Gain → Destination
        filter.connect(masterGain);
        masterGain.connect(this.audioContext.destination);
        
        // Aplica envelope ADSR no master gain
        const attackTime = now + this.envelope.attack;
        const decayTime = attackTime + this.envelope.decay;
        const releaseStartTime = now + duration;
        const releaseEndTime = releaseStartTime + this.envelope.release;
        
        // Attack: 0 → velocity
        masterGain.gain.linearRampToValueAtTime(velocity, attackTime);
        
        // Decay: velocity → sustain level
        const sustainLevel = velocity * this.envelope.sustain;
        masterGain.gain.linearRampToValueAtTime(sustainLevel, decayTime);
        
        // Sustain: mantém o nível até o release
        masterGain.gain.setValueAtTime(sustainLevel, releaseStartTime);
        
        // Release: sustain → 0 (fade out longo)
        masterGain.gain.exponentialRampToValueAtTime(0.001, releaseEndTime);
        
        // Inicia todos os osciladores
        oscillators.forEach(({ osc }) => {
            osc.start(now);
            osc.stop(releaseEndTime);
        });
        
        // Cleanup automático
        setTimeout(() => {
            oscillators.forEach(({ osc, gain }) => {
                osc.disconnect();
                gain.disconnect();
            });
            filter.disconnect();
            masterGain.disconnect();
        }, (duration + this.envelope.release + 0.1) * 1000);
        
        // Retorna referências (para controle manual se necessário)
        return {
            oscillators,
            filter,
            masterGain,
            fundamentalFreq,
            stopTime: releaseEndTime
        };
    }
    
    /**
     * Toca uma sequência de notas (arpejo)
     * @param {array} midiNotes - Array de notas MIDI
     * @param {number} velocity - Velocidade
     * @param {number} interval - Intervalo entre notas (segundos)
     */
    playSequence(midiNotes, velocity = 0.8, interval = 0.5) {
        midiNotes.forEach((midi, index) => {
            setTimeout(() => {
                this.play(midi, velocity, 5.0);
            }, index * interval * 1000);
        });
    }
    
    /**
     * Toca todas as frequências Solfeggio em sequência
     * @param {number} velocity - Velocidade
     * @param {number} interval - Intervalo entre notas (segundos)
     */
    playSolfeggioScale(velocity = 0.8, interval = 1.0) {
        const frequencies = Object.values(this.solfeggioFrequencies);
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                // Cria oscilador direto com frequência Solfeggio
                const now = this.audioContext.currentTime;
                
                const masterGain = this.audioContext.createGain();
                masterGain.gain.setValueAtTime(0, now);
                
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, now);
                filter.Q.setValueAtTime(1.0, now);
                
                const oscillators = [];
                
                for (let i = 0; i < this.harmonics.count; i++) {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    const harmonicFreq = freq * this.harmonics.ratios[i];
                    osc.frequency.setValueAtTime(harmonicFreq, now);
                    osc.type = 'sine';
                    
                    const harmonicVolume = this.harmonics.amplitudes[i] * velocity;
                    gain.gain.setValueAtTime(harmonicVolume, now);
                    
                    osc.connect(gain);
                    gain.connect(filter);
                    
                    oscillators.push({ osc, gain });
                }
                
                filter.connect(masterGain);
                masterGain.connect(this.audioContext.destination);
                
                const duration = 5.0;
                const attackTime = now + 0.01;
                const decayTime = attackTime + 0.5;
                const releaseStartTime = now + duration;
                const releaseEndTime = releaseStartTime + 4.0;
                
                masterGain.gain.linearRampToValueAtTime(velocity, attackTime);
                const sustainLevel = velocity * 0.7;
                masterGain.gain.linearRampToValueAtTime(sustainLevel, decayTime);
                masterGain.gain.setValueAtTime(sustainLevel, releaseStartTime);
                masterGain.gain.exponentialRampToValueAtTime(0.001, releaseEndTime);
                
                oscillators.forEach(({ osc }) => {
                    osc.start(now);
                    osc.stop(releaseEndTime);
                });
                
                setTimeout(() => {
                    oscillators.forEach(({ osc, gain }) => {
                        osc.disconnect();
                        gain.disconnect();
                    });
                    filter.disconnect();
                    masterGain.disconnect();
                }, (duration + 4.1) * 1000);
                
            }, index * interval * 1000);
        });
    }
    
    /**
     * Atualiza parâmetros do envelope
     */
    setEnvelope(attack, decay, sustain, release) {
        this.envelope = { attack, decay, sustain, release };
    }
    
    /**
     * Atualiza configuração do filtro
     */
    setFilter(frequency, Q) {
        this.filterSettings.frequency = frequency;
        this.filterSettings.Q = Q;
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TibetanBowlSynth;
}
