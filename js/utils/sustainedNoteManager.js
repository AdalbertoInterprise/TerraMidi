// Sustained Note Manager - Gerenciamento de notas sustentadas (como teclado real)
class SustainedNoteManager {
    constructor(audioEngine, player) {
        this.audioEngine = audioEngine;
        this.player = player;
        this.sustainedNotes = new Map(); // Notas ativas
        this.activeEnvelopes = []; // Envelopes ativos
        
        console.log('🎹 SustainedNoteManager inicializado');
    }
    
    /**
     * Inicia uma nota sustentada (pressionar tecla)
     * @param {string} note - Nota musical
     * @param {Object} soundfont - Preset do instrumento
     * @param {AudioNode} targetNode - Nó de destino (com efeitos)
     * @param {number} velocity - Intensidade (0-1)
     * @returns {string} ID da nota
     */
    startNote(note, soundfont, targetNode, velocity = 0.8, noteMappingUtils) {
        if (!this.audioEngine.audioContext) {
            console.error('❌ Audio Context não inicializado');
            return null;
        }
        
        if (!soundfont || !this.player) {
            console.warn(`⚠️ Soundfont não disponível para ${note}`);
            return null;
        }
        
        try {
            // Mapear nota para MIDI
            const midiNote = noteMappingUtils.noteToMidi(note);
            
            // ID único para esta nota
            const noteId = `sf_${note}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Array para envelopes desta nota
            const noteEnvelopes = [];
            
            // Tocar nota com duração muito longa (sustentada)
            const envelope = this.player.queueWaveTable(
                this.audioEngine.audioContext,
                targetNode,
                soundfont,
                this.audioEngine.audioContext.currentTime, // Latência zero
                midiNote,
                99999, // Duração infinita até release
                velocity,
                noteEnvelopes
            );
            
            // Adicionar ao array global
            this.activeEnvelopes.push(...noteEnvelopes);
            
            // Armazenar referência
            this.sustainedNotes.set(noteId, {
                envelope,
                envelopes: noteEnvelopes,
                note,
                midiNote,
                velocity,
                startTime: this.audioEngine.audioContext.currentTime
            });
            
            console.log(`🎹 Nota iniciada: ${note} [${noteId}] - ${noteEnvelopes.length} envelopes`);
            
            return noteId;
            
        } catch (error) {
            console.error('❌ Erro ao iniciar nota sustentada:', error);
            return null;
        }
    }
    
    /**
     * Para uma nota sustentada (soltar tecla) com release suave
     * @param {string} noteId - ID da nota
     * @param {number} releaseDuration - Duração do release em segundos
     */
    stopNote(noteId, releaseDuration = 0.12) {
        if (!noteId || !noteId.startsWith('sf_')) {
            return;
        }
        
        const noteData = this.sustainedNotes.get(noteId);
        if (!noteData) {
            console.warn(`⚠️ Nota ${noteId} não encontrada nos sustentados`);
            return;
        }
        
        try {
            const currentTime = this.audioEngine.audioContext.currentTime;
            
            console.log(`🎹 Release em ${noteData.note} - ${noteData.envelopes.length} envelopes`);
            
            // Aplicar release em todos os envelopes
            if (noteData.envelopes && noteData.envelopes.length > 0) {
                noteData.envelopes.forEach((env, index) => {
                    if (env && env.audioBufferSourceNode) {
                        try {
                            // Fade out suave
                            if (env.gainNode && env.gainNode.gain) {
                                const currentGain = env.gainNode.gain.value || 0.5;
                                env.gainNode.gain.cancelScheduledValues(currentTime);
                                env.gainNode.gain.setValueAtTime(currentGain, currentTime);
                                env.gainNode.gain.linearRampToValueAtTime(0.001, currentTime + releaseDuration);
                            }
                            
                            // Parar source após release
                            const stopTime = currentTime + releaseDuration + 0.05;
                            env.audioBufferSourceNode.stop(stopTime);
                            
                            console.log(`  ✓ Envelope ${index} - release aplicado`);
                        } catch (e) {
                            console.log(`  ⚠️ Envelope ${index} - ${e.message}`);
                        }
                    }
                });
                
                // Remover do array global
                this.activeEnvelopes = this.activeEnvelopes.filter(env =>
                    !noteData.envelopes.includes(env)
                );
            }
            
            // Remover da lista de sustentados
            this.sustainedNotes.delete(noteId);
            
            console.log(`✅ Nota ${noteData.note} parada (release ${releaseDuration}s)`);
            
        } catch (error) {
            console.error('❌ Erro ao parar nota sustentada:', error);
            this.sustainedNotes.delete(noteId);
        }
    }
    
    /**
     * Para todas as notas ativas
     */
    stopAllNotes() {
        console.log(`🛑 Parando ${this.sustainedNotes.size} notas ativas`);
        
        const noteIds = Array.from(this.sustainedNotes.keys());
        noteIds.forEach(noteId => this.stopNote(noteId));
    }
    
    /**
     * Obtém quantidade de notas ativas
     * @returns {number}
     */
    getActiveNotesCount() {
        return this.sustainedNotes.size;
    }
    
    /**
     * Verifica se uma nota está ativa
     * @param {string} noteId - ID da nota
     * @returns {boolean}
     */
    isNoteActive(noteId) {
        return this.sustainedNotes.has(noteId);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.SustainedNoteManager = SustainedNoteManager;
}
