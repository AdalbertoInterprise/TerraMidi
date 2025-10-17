// MIDI Status Panel - Painel de Status MIDI
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Painel visual para monitoramento de dispositivos MIDI conectados

/**
 * Painel de status para monitoramento MIDI
 * Exibe dispositivos conectados, notas ativas, programas e estado de conexão
 */
class MIDIStatusPanel {
    constructor(containerId = 'midi-status-panel') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`⚠️ Container ${containerId} não encontrado - criando dinamicamente`);
            this.createContainer(containerId);
        }
        
        // Estado
        this.state = {
            devices: new Map(), // deviceId -> device info
            activeNotes: new Map(), // deviceId -> Set of active notes
            programs: new Map(), // deviceId -> current program
            lastActivity: new Map() // deviceId -> timestamp
        };
        
        // Configurações
        this.config = {
            maxNotesToShow: 8,
            activityTimeout: 5000, // ms para considerar dispositivo inativo
            updateInterval: 100, // ms entre atualizações de UI
            deviceIcons: {
                'Board Bells': '🔔',
                'Giro Som': '🌀',
                'Board Som': '🎛️',
                'Big KeyBoard': '🎹',
                'Musical Beam': '📡',
                'default': '🎵'
            }
        };
        
        // Timer de atualização
        this.updateTimer = null;
        
        this.initialize();
        console.log('✅ MIDIStatusPanel inicializado');
    }

    /**
     * Cria container dinamicamente se não existir
     * @param {string} containerId - ID do container
     */
    createContainer(containerId) {
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = 'midi-status-panel';
        
        console.log(`ℹ️ Container criado mas não anexado ao DOM. Use panel.container para anexar.`);
    }

    /**
     * Inicializa o painel
     */
    initialize() {
        this.render();
        this.startUpdateLoop();
    }

    /**
     * Adiciona dispositivo
     * @param {Object} deviceInfo - Informações do dispositivo
     */
    addDevice(deviceInfo) {
        const deviceId = deviceInfo.id || deviceInfo.name;
        
        this.state.devices.set(deviceId, {
            id: deviceId,
            name: deviceInfo.name || 'Dispositivo Desconhecido',
            type: deviceInfo.type || 'unknown',
            manufacturer: deviceInfo.manufacturer || '',
            connected: true,
            connectedAt: Date.now()
        });
        
        this.state.activeNotes.set(deviceId, new Set());
        this.state.programs.set(deviceId, null);
        this.state.lastActivity.set(deviceId, Date.now());
        
        this.render();
        console.log(`✅ Dispositivo adicionado ao painel: ${deviceInfo.name}`);
    }

    /**
     * Remove dispositivo
     * @param {string} deviceId - ID do dispositivo
     */
    removeDevice(deviceId) {
        const device = this.state.devices.get(deviceId);
        if (device) {
            device.connected = false;
            this.state.activeNotes.get(deviceId)?.clear();
            
            this.render();
            console.log(`❌ Dispositivo removido do painel: ${device.name}`);
            
            // Remover completamente após 5 segundos
            setTimeout(() => {
                this.state.devices.delete(deviceId);
                this.state.activeNotes.delete(deviceId);
                this.state.programs.delete(deviceId);
                this.state.lastActivity.delete(deviceId);
                this.render();
            }, 5000);
        }
    }

    /**
     * Atualiza nota ativa
     * @param {string} deviceId - ID do dispositivo
     * @param {number} note - Número da nota MIDI
     * @param {boolean} isOn - Se nota está ativa
     */
    updateNote(deviceId, note, isOn) {
        const notes = this.state.activeNotes.get(deviceId);
        if (!notes) return;
        
        if (isOn) {
            notes.add(note);
        } else {
            notes.delete(note);
        }
        
        this.state.lastActivity.set(deviceId, Date.now());
        this.render();
    }

    /**
     * Atualiza programa atual
     * @param {string} deviceId - ID do dispositivo
     * @param {number} program - Número do programa
     * @param {string} instrumentName - Nome do instrumento
     */
    updateProgram(deviceId, program, instrumentName) {
        this.state.programs.set(deviceId, {
            number: program,
            name: instrumentName
        });
        
        this.state.lastActivity.set(deviceId, Date.now());
        this.render();
    }

    /**
     * Renderiza o painel completo
     */
    render() {
        if (!this.container) return;
        
        const html = `
            <div class="midi-panel-header">
                <h3>🎹 Status MIDI</h3>
                <span class="device-count">${this.state.devices.size} dispositivo(s)</span>
            </div>
            <div class="midi-devices-list">
                ${this.renderDevices()}
            </div>
        `;
        
        this.container.innerHTML = html;
    }

    /**
     * Renderiza lista de dispositivos
     * @returns {string} HTML dos dispositivos
     */
    renderDevices() {
        if (this.state.devices.size === 0) {
            return `
                <div class="no-devices">
                    <p>Nenhum dispositivo MIDI conectado</p>
                    <small>Conecte um dispositivo Terra para começar</small>
                </div>
            `;
        }
        
        const devicesHtml = Array.from(this.state.devices.values())
            .map(device => this.renderDevice(device))
            .join('');
        
        return devicesHtml;
    }

    /**
     * Renderiza um dispositivo
     * @param {Object} device - Informações do dispositivo
     * @returns {string} HTML do dispositivo
     */
    renderDevice(device) {
        const icon = this.config.deviceIcons[device.name] || this.config.deviceIcons.default;
        const activeNotes = this.state.activeNotes.get(device.id) || new Set();
        const program = this.state.programs.get(device.id);
        const lastActivity = this.state.lastActivity.get(device.id) || 0;
        const isActive = (Date.now() - lastActivity) < this.config.activityTimeout;
        
        const statusClass = device.connected 
            ? (isActive ? 'active' : 'idle')
            : 'disconnected';
        
        return `
            <div class="midi-device ${statusClass}">
                <div class="device-header">
                    <span class="device-icon">${icon}</span>
                    <div class="device-info">
                        <strong class="device-name">${device.name}</strong>
                        <small class="device-manufacturer">${device.manufacturer || 'Terra Eletrônica'}</small>
                    </div>
                    <span class="connection-indicator ${device.connected ? 'connected' : 'disconnected'}">
                        ${device.connected ? '●' : '○'}
                    </span>
                </div>
                
                ${program ? this.renderProgram(program) : ''}
                
                <div class="active-notes">
                    <label>Notas Ativas:</label>
                    ${this.renderActiveNotes(activeNotes)}
                </div>
                
                <div class="device-stats">
                    <small>Total de notas: ${activeNotes.size}</small>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza informação do programa
     * @param {Object} program - Programa atual
     * @returns {string} HTML do programa
     */
    renderProgram(program) {
        return `
            <div class="current-program">
                <label>Instrumento:</label>
                <span class="program-name">${program.name}</span>
                <span class="program-number">(${program.number})</span>
            </div>
        `;
    }

    /**
     * Renderiza notas ativas
     * @param {Set} notes - Set de notas ativas
     * @returns {string} HTML das notas
     */
    renderActiveNotes(notes) {
        if (notes.size === 0) {
            return '<span class="no-notes">-</span>';
        }
        
        const notesArray = Array.from(notes);
        const displayNotes = notesArray.slice(0, this.config.maxNotesToShow);
        const remaining = notesArray.length - displayNotes.length;
        
        const notesHtml = displayNotes
            .map(note => `<span class="note-badge">${this.midiNoteToName(note)}</span>`)
            .join('');
        
        const remainingHtml = remaining > 0 
            ? `<span class="note-badge more">+${remaining}</span>` 
            : '';
        
        return notesHtml + remainingHtml;
    }

    /**
     * Converte número MIDI para nome de nota
     * @param {number} midiNote - Número da nota MIDI (0-127)
     * @returns {string} Nome da nota (ex: "C4", "A#5")
     */
    midiNoteToName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }

    /**
     * Inicia loop de atualização automática
     */
    startUpdateLoop() {
        if (this.updateTimer) return;
        
        this.updateTimer = setInterval(() => {
            // Verificar dispositivos inativos
            const now = Date.now();
            let needsUpdate = false;
            
            this.state.lastActivity.forEach((timestamp, deviceId) => {
                const wasActive = (now - timestamp) < this.config.activityTimeout;
                const isNowActive = (now - timestamp) < this.config.activityTimeout;
                
                if (wasActive !== isNowActive) {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                this.render();
            }
        }, this.config.updateInterval);
        
        console.log('✅ Loop de atualização do painel iniciado');
    }

    /**
     * Para loop de atualização
     */
    stopUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('⏸️ Loop de atualização do painel parado');
        }
    }

    /**
     * Limpa todos os dispositivos
     */
    clear() {
        this.state.devices.clear();
        this.state.activeNotes.clear();
        this.state.programs.clear();
        this.state.lastActivity.clear();
        this.render();
        console.log('🧹 Painel limpo');
    }

    /**
     * Obtém estatísticas
     * @returns {Object} Estatísticas
     */
    getStats() {
        const totalActiveNotes = Array.from(this.state.activeNotes.values())
            .reduce((sum, notes) => sum + notes.size, 0);
        
        return {
            totalDevices: this.state.devices.size,
            connectedDevices: Array.from(this.state.devices.values())
                .filter(d => d.connected).length,
            totalActiveNotes: totalActiveNotes,
            devices: Array.from(this.state.devices.values())
        };
    }

    /**
     * Destrói o painel
     */
    destroy() {
        this.stopUpdateLoop();
        this.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
        console.log('💥 MIDIStatusPanel destruído');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIStatusPanel = MIDIStatusPanel;
}
