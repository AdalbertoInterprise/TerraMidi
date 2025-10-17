// Effects Manager - Sistema completo de efeitos de áudio
// Implementa WebAudioFontChannel (equalizer) e WebAudioFontReverberator (reverb)
// Baseado em: https://surikov.github.io/webaudiofont/examples/mixer.html

class EffectsManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        
        // Nós de áudio principais
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.8;
        
        // Sistema de canais com equalizador de 10 bandas
        this.channels = new Map();
        
        // Reverberador global
        this.reverb = this.createReverb();
        this.reverbGain = audioContext.createGain();
        this.reverbGain.gain.value = 0.3; // 30% de reverb por padrão
        
        // Compressor dinâmico
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -50;
        this.compressor.knee.value = 40;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Flanger (chorus effect)
        this.flanger = this.createFlanger();
        
        // Conectar cadeia de efeitos
        this.setupEffectChain();
        
        console.log('🎛️ EffectsManager inicializado');
        console.log('✅ Reverb, Compressor, Equalizer, Flanger ativos');
    }
    
    /**
     * Configura a cadeia de efeitos
     * Fluxo: Input → Channel EQ → Reverb → Compressor → Master → Output
     */
    setupEffectChain() {
        // Reverb send/return
        this.reverb.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);
        
        // Master chain
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);
    }
    
    /**
     * Cria canal de áudio com equalizador de 10 bandas
     * @param {string} channelName - Nome do canal
     * @returns {Object} Canal com ganho e equalizador
     */
    createChannel(channelName) {
        if (this.channels.has(channelName)) {
            return this.channels.get(channelName);
        }
        
        const channel = {
            name: channelName,
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            eq: this.createEqualizer(),
            reverbSend: this.audioContext.createGain(),
            panNode: this.audioContext.createStereoPanner()
        };
        
        // Conectar cadeia do canal
        // Input → EQ → Pan → Output → Master
        //              └→ Reverb Send
        channel.input.connect(channel.eq.input);
        channel.eq.output.connect(channel.panNode);
        channel.panNode.connect(channel.output);
        channel.output.connect(this.masterGain);
        
        // Reverb send (parallel)
        channel.eq.output.connect(channel.reverbSend);
        channel.reverbSend.gain.value = 0.3;
        channel.reverbSend.connect(this.reverb.convolver);
        
        // Volume padrão
        channel.input.gain.value = 1.0;
        channel.output.gain.value = 1.0;
        channel.panNode.pan.value = 0; // Centro
        
        this.channels.set(channelName, channel);
        console.log(`🎚️ Canal criado: ${channelName}`);
        
        return channel;
    }
    
    /**
     * Cria equalizador de 10 bandas
     * Frequências: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz
     */
    createEqualizer() {
        const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const filters = [];
        
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();
        
        let previousNode = input;
        
        frequencies.forEach((freq, index) => {
            const filter = this.audioContext.createBiquadFilter();
            
            if (index === 0) {
                filter.type = 'lowshelf';
            } else if (index === frequencies.length - 1) {
                filter.type = 'highshelf';
            } else {
                filter.type = 'peaking';
                filter.Q.value = 1.0;
            }
            
            filter.frequency.value = freq;
            filter.gain.value = 0; // 0 dB (flat)
            
            previousNode.connect(filter);
            previousNode = filter;
            filters.push(filter);
        });
        
        previousNode.connect(output);
        
        return {
            input,
            output,
            filters,
            frequencies,
            
            // Helpers
            setBand(index, gainDB) {
                if (filters[index]) {
                    filters[index].gain.value = gainDB;
                }
            },
            
            getBand(index) {
                return filters[index] ? filters[index].gain.value : 0;
            },
            
            reset() {
                filters.forEach(f => f.gain.value = 0);
            },
            
            // Presets
            preset(name) {
                this.reset();
                switch(name) {
                    case 'bass-boost':
                        this.setBand(0, 8);
                        this.setBand(1, 6);
                        this.setBand(2, 3);
                        break;
                    case 'treble-boost':
                        this.setBand(7, 4);
                        this.setBand(8, 6);
                        this.setBand(9, 8);
                        break;
                    case 'vocal':
                        this.setBand(3, 4);
                        this.setBand(4, 5);
                        this.setBand(5, 4);
                        break;
                    case 'warm':
                        this.setBand(0, 3);
                        this.setBand(1, 2);
                        this.setBand(8, -2);
                        this.setBand(9, -3);
                        break;
                    case 'bright':
                        this.setBand(0, -2);
                        this.setBand(1, -1);
                        this.setBand(7, 2);
                        this.setBand(8, 4);
                        this.setBand(9, 3);
                        break;
                }
            }
        };
    }
    
    /**
     * Cria reverberador (convolution reverb)
     */
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        
        // Gerar impulse response para reverb
        const sampleRate = this.audioContext.sampleRate;
        const reverbTime = 2.0; // 2 segundos
        const length = sampleRate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Decaimento exponencial com ruído
                const decay = Math.exp(-(i / length) * 5);
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        convolver.buffer = impulse;
        
        return {
            convolver,
            
            // Ajustar tempo de reverb
            setTime(seconds) {
                const newLength = sampleRate * seconds;
                const newImpulse = this.audioContext.createBuffer(2, newLength, sampleRate);
                
                for (let channel = 0; channel < 2; channel++) {
                    const channelData = newImpulse.getChannelData(channel);
                    for (let i = 0; i < newLength; i++) {
                        const decay = Math.exp(-(i / newLength) * 5);
                        channelData[i] = (Math.random() * 2 - 1) * decay;
                    }
                }
                
                convolver.buffer = newImpulse;
            }
        };
    }
    
    /**
     * Cria efeito flanger (modulação de delay)
     */
    createFlanger() {
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();
        const delay = this.audioContext.createDelay();
        const feedback = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        // Configuração
        delay.delayTime.value = 0.005; // 5ms base delay
        feedback.gain.value = 0.5;
        lfo.frequency.value = 0.5; // 0.5 Hz LFO
        lfoGain.gain.value = 0.002; // 2ms depth
        
        // Conexões
        input.connect(delay);
        input.connect(output); // Dry signal
        delay.connect(output);
        delay.connect(feedback);
        feedback.connect(delay);
        
        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        lfo.start();
        
        return {
            input,
            output,
            delay,
            feedback,
            lfo,
            lfoGain,
            enabled: false,
            
            enable() {
                if (!this.enabled) {
                    input.connect(output);
                    this.enabled = true;
                }
            },
            
            disable() {
                if (this.enabled) {
                    input.disconnect();
                    input.connect(output); // Apenas dry signal
                    this.enabled = false;
                }
            },
            
            setDepth(depth) {
                lfoGain.gain.value = depth * 0.002;
            },
            
            setSpeed(speed) {
                lfo.frequency.value = speed;
            },
            
            setFeedback(fb) {
                feedback.gain.value = fb;
            }
        };
    }
    
    /**
     * Obtém canal (cria se não existir)
     */
    getChannel(channelName) {
        return this.channels.get(channelName) || this.createChannel(channelName);
    }
    
    /**
     * Define volume do master
     */
    setMasterVolume(volume) {
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Define volume de um canal
     */
    setChannelVolume(channelName, volume) {
        const channel = this.getChannel(channelName);
        channel.output.gain.value = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Define pan de um canal (-1 = esquerda, 0 = centro, 1 = direita)
     */
    setChannelPan(channelName, pan) {
        const channel = this.getChannel(channelName);
        channel.panNode.pan.value = Math.max(-1, Math.min(1, pan));
    }
    
    /**
     * Define reverb send de um canal
     */
    setChannelReverb(channelName, amount) {
        const channel = this.getChannel(channelName);
        channel.reverbSend.gain.value = Math.max(0, Math.min(1, amount));
    }
    
    /**
     * Define reverb global
     */
    setReverbAmount(amount) {
        this.reverbGain.gain.value = Math.max(0, Math.min(1, amount));
    }
    
    /**
     * Define tempo de reverb
     */
    setReverbTime(seconds) {
        this.reverb.setTime(seconds);
    }
    
    /**
     * Configurar compressor
     */
    setCompressor(settings) {
        if (settings.threshold !== undefined) {
            this.compressor.threshold.value = settings.threshold;
        }
        if (settings.knee !== undefined) {
            this.compressor.knee.value = settings.knee;
        }
        if (settings.ratio !== undefined) {
            this.compressor.ratio.value = settings.ratio;
        }
        if (settings.attack !== undefined) {
            this.compressor.attack.value = settings.attack;
        }
        if (settings.release !== undefined) {
            this.compressor.release.value = settings.release;
        }
    }
    
    /**
     * Liga/desliga flanger
     */
    toggleFlanger(enabled) {
        if (enabled) {
            this.flanger.enable();
        } else {
            this.flanger.disable();
        }
    }
    
    /**
     * Retorna estatísticas
     */
    getStats() {
        return {
            channels: this.channels.size,
            masterVolume: this.masterGain.gain.value,
            reverbAmount: this.reverbGain.gain.value,
            compressorReduction: this.compressor.reduction,
            flangerEnabled: this.flanger.enabled
        };
    }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffectsManager;
}
