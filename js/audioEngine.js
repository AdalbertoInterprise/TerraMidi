// Audio Engine - Sistema de reprodução de áudio Web Audio API
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = new Map();
        this.noteFrequencies = {
            'C': 261.63,   // Dó
            'D': 293.66,   // Ré
            'E': 329.63,   // Mi
            'F': 349.23,   // Fá
            'G': 392.00,   // Sol
            'A': 440.00,   // Lá
            'B': 493.88,   // Si
            'C2': 523.25   // Dó oitava
        };

        this._noteMappingUtils = null;
        
        // Cores baseadas no Board Bells-08 da Terra Eletrônica
        this.noteColors = {
            'C': '#d32f2f',   // Vermelho - Dó (exato do Board Bells)
            'D': '#ef6c00',   // Laranja - Ré (exato do Board Bells)
            'E': '#fbc02d',   // Amarelo - Mi (exato do Board Bells)
            'F': '#388e3c',   // Verde - Fá (exato do Board Bells)
            'G': '#0288d1',   // Azul - Sol (exato do Board Bells)
            'A': '#303f9f',   // Azul escuro - Lá (exato do Board Bells)
            'B': '#9575cd',   // Roxo - Si (exato do Board Bells)
            'C2': '#d32f2f'   // Vermelho - Dó oitava (igual ao primeiro Dó)
        };

        this.isUnlocked = false;
        this.unlockEvents = ['pointerdown', 'touchstart', 'keydown'];
        this.unlockHandler = this.unlockAudioContext.bind(this);
        this.unlockCallbacks = [];
        this.setupUnlockHandlers();
    }

    setupUnlockHandlers() {
        this.unlockEvents.forEach(eventName => {
            document.addEventListener(eventName, this.unlockHandler, { once: true, capture: true });
        });
    }

    ensureNoteMappingUtils() {
        if (this._noteMappingUtils) {
            return this._noteMappingUtils;
        }

        const NoteMappingUtilsClass = (typeof window !== 'undefined' && window.NoteMappingUtils)
            ? window.NoteMappingUtils
            : (typeof NoteMappingUtils === 'function' ? NoteMappingUtils : null);

        if (NoteMappingUtilsClass) {
            this._noteMappingUtils = new NoteMappingUtilsClass();
        }

        return this._noteMappingUtils;
    }

    resolveMidiValue(note) {
        const utils = this.ensureNoteMappingUtils();

        if (utils) {
            const midi = utils.noteToMidi(note);
            if (Number.isFinite(midi)) {
                return midi;
            }
        }

        if (typeof note === 'number' && Number.isFinite(note)) {
            return Math.min(127, Math.max(0, Math.round(note)));
        }

        return null;
    }

    resolveFrequency(note) {
        const midi = this.resolveMidiValue(note);
        const utils = this.ensureNoteMappingUtils();

        if (Number.isFinite(midi) && utils) {
            return utils.midiToFrequency(midi);
        }

        if (typeof note === 'string' && this.noteFrequencies[note]) {
            return this.noteFrequencies[note];
        }

        if (typeof midi === 'number' && utils) {
            return utils.midiToFrequency(midi);
        }

        return undefined;
    }

    normalizeColorKey(note) {
        if (typeof note === 'number' && Number.isFinite(note)) {
            const utils = this.ensureNoteMappingUtils();
            if (utils) {
                const named = utils.midiToNote(note);
                return this.normalizeColorKey(named);
            }
            return null;
        }

        if (typeof note !== 'string') {
            return null;
        }

        const upper = note.toUpperCase();
        const match = upper.match(/^([A-G])/);
        return match ? match[1] : upper;
    }

    unlockAudioContext() {
        if (!this.ensureAudioContext()) {
            return;
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {
                console.warn('⚠️ AudioContext ainda suspenso após tentativa de desbloqueio.');
            });
        }

        this.unlockEvents.forEach(eventName => {
            document.removeEventListener(eventName, this.unlockHandler, true);
        });

        this.isUnlocked = true;
        console.log('🎧 Audio Engine ativado após gesto do usuário');

        if (this.unlockCallbacks.length) {
            const callbacks = [...this.unlockCallbacks];
            this.unlockCallbacks.length = 0;
            callbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('❌ Erro ao executar callback pós-desbloqueio:', error);
                }
            });
        }
    }

    onUnlock(callback) {
        if (typeof callback !== 'function') return;
        if (this.isUnlocked && this.ensureAudioContext()) {
            try {
                callback();
            } catch (error) {
                console.error('❌ Erro ao executar callback imediato:', error);
            }
            return;
        }

        this.unlockCallbacks.push(callback);
    }

    ensureAudioContext() {
        if (this.audioContext && this.masterGain) {
            return true;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.error('❌ Web Audio API não suportada neste navegador.');
                return false;
            }

            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            console.log('🎵 Audio Engine pronto para uso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar Audio Engine:', error);
            return false;
        }
    }
    
    // INICIAR NOTA SUSTENTADA (como sintetizador real - latência zero)
    startSustainedNote(note, waveType = 'sine') {
        if (!this.ensureAudioContext()) {
            console.warn('⚠️ Contexto de áudio não inicializado ou nota inválida:', note);
            return null;
        }

        const frequency = this.resolveFrequency(note);
        if (!Number.isFinite(frequency)) {
            console.warn('⚠️ Nota sem frequência associada:', note);
            return null;
        }

        try {
            // Retomar contexto se suspenso
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const currentTime = this.audioContext.currentTime;
            
            // Criar oscilador
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Conectar: Oscillator -> Gain -> Master Gain -> Destination
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Configurar oscilador
            oscillator.frequency.setValueAtTime(frequency, currentTime);
            oscillator.type = waveType;
            
            // Attack rápido (latência zero percebida)
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.6, currentTime + 0.01); // Attack instantâneo
            gainNode.gain.exponentialRampToValueAtTime(0.5, currentTime + 0.05); // Decay rápido
            // Sustain mantido até stopSustainedNote ser chamado
            
            // Iniciar oscilador (SEM definir stop - sustenta até parar manualmente)
            oscillator.start(currentTime);
            
            // ID único para esta nota
            const noteId = `sustained_${note}_${Date.now()}_${Math.random()}`;
            
            // Armazenar referência
            this.oscillators.set(noteId, { 
                oscillator, 
                gainNode, 
                note,
                isSustained: true 
            });
            
            return noteId;
            
        } catch (error) {
            console.error('❌ Erro ao iniciar nota sustentada:', error);
            return null;
        }
    }
    
    // PARAR NOTA SUSTENTADA (release suave como teclado real)
    stopSustainedNote(noteId) {
        if (!noteId || !this.oscillators.has(noteId)) return;
        
        try {
            const { oscillator, gainNode } = this.oscillators.get(noteId);
            const currentTime = this.audioContext.currentTime;
            
            // Release suave (como ao soltar tecla de piano)
            const currentGain = gainNode.gain.value;
            gainNode.gain.cancelScheduledValues(currentTime);
            gainNode.gain.setValueAtTime(currentGain, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.15); // Release suave
            
            // Parar oscilador após release
            oscillator.stop(currentTime + 0.15);
            
            // Limpar referência
            oscillator.onended = () => {
                this.oscillators.delete(noteId);
            };
            
        } catch (error) {
            console.error('❌ Erro ao parar nota sustentada:', error);
        }
    }
    
    // Reproduzir uma nota específica (versão curta - para melodias)
    async playNote(note, duration = 0.5, waveType = 'sine') {
        if (!this.ensureAudioContext()) {
            console.warn('⚠️ Contexto de áudio não inicializado ou nota inválida:', note);
            return;
        }

        const frequency = this.resolveFrequency(note);
        if (!Number.isFinite(frequency)) {
            console.warn('⚠️ Nota sem frequência associada:', note);
            return;
        }

        try {
            // Retomar contexto se suspenso
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const currentTime = this.audioContext.currentTime;
            
            // Criar oscilador
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Conectar: Oscillator -> Gain -> Master Gain -> Destination
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Configurar oscilador
            oscillator.frequency.setValueAtTime(frequency, currentTime);
            oscillator.type = waveType;
            
            // Envelope ADSR suave
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.6, currentTime + 0.01); // Attack rápido
            gainNode.gain.exponentialRampToValueAtTime(0.4, currentTime + 0.05); // Decay
            gainNode.gain.setValueAtTime(0.4, currentTime + duration - 0.1); // Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration); // Release
            
            // Iniciar e parar
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            // Armazenar referência
            const noteId = `${note}_${Date.now()}`;
            this.oscillators.set(noteId, { oscillator, gainNode });
            
            // Limpar quando terminar
            oscillator.onended = () => {
                this.oscillators.delete(noteId);
            };
            
            return noteId;
        } catch (error) {
            console.error('❌ Erro ao reproduzir nota:', error);
        }
    }
    
    // Reproduzir sequência de notas (melodia)
    async playMelody(melody, tempo = 120) {
        const beatDuration = 60 / tempo; // Duração de cada batida em segundos
        let currentTime = 0;
        
        for (const { note, duration, pause = 0 } of melody) {
            setTimeout(() => {
                this.playNote(note, duration * beatDuration);
            }, currentTime * 1000);
            
            currentTime += (duration + pause) * beatDuration;
        }
        
        return currentTime; // Duração total da melodia
    }
    
    // Reproduzir acorde
    async playChord(notes, duration = 1.0) {
        const promises = notes.map(note => this.playNote(note, duration));
        return Promise.all(promises);
    }
    
    // Parar todas as notas
    stopAllNotes() {
        this.oscillators.forEach(({ oscillator }) => {
            try {
                oscillator.stop();
            } catch (error) {
                // Ignorar erro se já parou
            }
        });
        this.oscillators.clear();
    }
    
    // Definir volume master
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                Math.max(0, Math.min(1, volume)), 
                this.audioContext.currentTime
            );
        }
    }
    
    // Obter cor da nota
    getNoteColor(note) {
        const key = this.normalizeColorKey(note);
        if (key && this.noteColors[key]) {
            return this.noteColors[key];
        }
        return '#FFFFFF';
    }
    
    // Obter frequência da nota
    getNoteFrequency(note) {
        const frequency = this.resolveFrequency(note);
        if (Number.isFinite(frequency)) {
            return frequency;
        }
        return 440;
    }
    
    // Criar efeito sonoro de feedback
    async playFeedbackSound(type) {
        const feedbackSounds = {
            perfect: { frequency: 880, duration: 0.2, type: 'sine' },
            good: { frequency: 660, duration: 0.15, type: 'triangle' },
            miss: { frequency: 220, duration: 0.3, type: 'sawtooth' }
        };
        
        const sound = feedbackSounds[type];
        if (!sound) return;
        
        try {
            if (!this.ensureAudioContext()) {
                return;
            }

            const currentTime = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.frequency.setValueAtTime(sound.frequency, currentTime);
            oscillator.type = sound.type;
            
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + sound.duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + sound.duration);
        } catch (error) {
            console.error('❌ Erro ao reproduzir som de feedback:', error);
        }
    }
    
    // Criar ambiente sonoro relaxante
    async createAmbientSound(type = 'nature') {
        const ambientConfigs = {
            nature: {
                frequencies: [110, 165, 220, 330],
                waveType: 'sine',
                volume: 0.1
            },
            ocean: {
                frequencies: [80, 120, 160, 240],
                waveType: 'sawtooth',
                volume: 0.08
            },
            forest: {
                frequencies: [130, 195, 260, 390],
                waveType: 'triangle',
                volume: 0.12
            }
        };
        
        const config = ambientConfigs[type];
        if (!config) return;
        
        try {
            if (!this.ensureAudioContext()) {
                return;
            }

            const currentTime = this.audioContext.currentTime;
            
            config.frequencies.forEach((frequency, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();
                
                oscillator.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.frequency.setValueAtTime(frequency, currentTime);
                oscillator.type = config.waveType;
                
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(800, currentTime);
                
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(
                    config.volume * (1 - index * 0.2), 
                    currentTime + 2
                );
                
                oscillator.start(currentTime);
                
                // Adicionar variação lenta no volume para efeito natural
                setInterval(() => {
                    if (this.audioContext && gainNode.gain) {
                        const variation = 0.3 + 0.7 * Math.sin(Date.now() * 0.001 * (index + 1));
                        gainNode.gain.setValueAtTime(
                            config.volume * variation,
                            this.audioContext.currentTime
                        );
                    }
                }, 2000 + index * 500);
            });
        } catch (error) {
            console.error('❌ Erro ao criar som ambiente:', error);
        }
    }
    
    // Integração com Soundfont Manager
    setSoundfontManager(soundfontManager) {
        this.soundfontManager = soundfontManager;
        console.log('🎼 Soundfont Manager conectado ao Audio Engine');
    }
    
    // Reproduzir nota usando soundfont se disponível
    async playNoteWithInstrument(note, duration = 0.5, velocity = 0.8) {
        if (this.soundfontManager) {
            return await this.soundfontManager.playNote(note, duration, velocity);
        } else {
            return await this.playNote(note, duration);
        }
    }
}

// Inicializar instância global
window.audioEngine = new AudioEngine();