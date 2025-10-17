// Dispositivos Terra Eletrônica - Templates Base
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Classes base para dispositivos futuros da linha Terra

/**
 * Classe base para dispositivos Terra Eletrônica
 * Fornece estrutura comum para todos os dispositivos
 */
class TerraDevice {
    constructor(midiInput, manager, deviceType) {
        this.midiInput = midiInput;
        this.manager = manager;
        this.deviceId = midiInput.id;
        this.deviceName = midiInput.name;
        this.deviceType = deviceType;
        
        this.state = {
            isConnected: true,
            lastActivity: Date.now()
        };
        
        this.audioEngine = null;
        this.soundfontManager = null;
    }

    setAudioIntegration(audioEngine, soundfontManager) {
        this.audioEngine = audioEngine;
        this.soundfontManager = soundfontManager;
    }

    handleMessage(message) {
        this.state.lastActivity = Date.now();
        // Implementar em subclasse
    }

    disconnect() {
        this.state.isConnected = false;
    }

    getState() {
        return {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            deviceType: this.deviceType,
            isConnected: this.state.isConnected,
            lastActivity: this.state.lastActivity
        };
    }
}

/**
 * Giro Som Device - TEMPLATE
 * Dispositivo rotativo com sensores de movimento
 */
class GiroSomDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'GiroSom');
        
        this.config = {
            // Configurações específicas do Giro Som
            rotationSensitivity: 50,
            defaultChannel: 1
        };
        
        this.state = {
            ...this.state,
            rotation: 0,
            speed: 0
        };
        
        console.log(`✅ GiroSomDevice inicializado: ${this.deviceName} (TEMPLATE)`);
        console.warn('⚠️ GiroSom é um template - implementação completa necessária');
    }

    handleMessage(message) {
        super.handleMessage(message);
        
        // TODO: Implementar lógica específica do Giro Som
        console.log(`🔄 GiroSom: ${message.type}`, message);
    }

    handleRotation(rotationData) {
        // TODO: Implementar controle de rotação
        console.log('🔄 Rotação detectada:', rotationData);
    }
}

/**
 * Board Som Device - TEMPLATE
 * Placa com múltiplos sensores sonoros
 */
class BoardSomDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'BoardSom');
        
        this.config = {
            // Configurações específicas do Board Som
            sensorsCount: 8,
            defaultChannel: 1
        };
        
        this.state = {
            ...this.state,
            activeSensors: new Set()
        };
        
        console.log(`✅ BoardSomDevice inicializado: ${this.deviceName} (TEMPLATE)`);
        console.warn('⚠️ BoardSom é um template - implementação completa necessária');
    }

    handleMessage(message) {
        super.handleMessage(message);
        
        // TODO: Implementar lógica específica do Board Som
        console.log(`🎛️ BoardSom: ${message.type}`, message);
    }

    handleSensor(sensorId, value) {
        // TODO: Implementar controle de sensores
        console.log(`🎛️ Sensor ${sensorId}:`, value);
    }
}

/**
 * Big Key Board Device - TEMPLATE
 * Teclado de grandes dimensões
 */
class BigKeyBoardDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'BigKeyBoard');
        
        this.config = {
            // Configurações específicas do Big Key Board
            keysCount: 12,
            defaultChannel: 1
        };
        
        this.state = {
            ...this.state,
            activeKeys: new Set()
        };
        
        console.log(`✅ BigKeyBoardDevice inicializado: ${this.deviceName} (TEMPLATE)`);
        console.warn('⚠️ BigKeyBoard é um template - implementação completa necessária');
    }

    handleMessage(message) {
        super.handleMessage(message);
        
        // TODO: Implementar lógica específica do Big Key Board
        console.log(`⌨️ BigKeyBoard: ${message.type}`, message);
    }

    handleKeyPress(keyId, velocity) {
        // TODO: Implementar controle de teclas grandes
        console.log(`⌨️ Tecla ${keyId} pressionada:`, velocity);
    }
}

/**
 * Musical Beam Device - TEMPLATE
 * Feixe musical com sensores infravermelhos
 */
class MusicalBeamDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager, 'MusicalBeam');
        
        this.config = {
            // Configurações específicas do Musical Beam
            beamsCount: 8,
            defaultChannel: 1,
            detectionThreshold: 30
        };
        
        this.state = {
            ...this.state,
            activeBeams: new Set(),
            detections: []
        };
        
        console.log(`✅ MusicalBeamDevice inicializado: ${this.deviceName} (TEMPLATE)`);
        console.warn('⚠️ MusicalBeam é um template - implementação completa necessária');
    }

    handleMessage(message) {
        super.handleMessage(message);
        
        // TODO: Implementar lógica específica do Musical Beam
        console.log(`📡 MusicalBeam: ${message.type}`, message);
    }

    handleBeamDetection(beamId, distance) {
        // TODO: Implementar detecção de feixes
        console.log(`📡 Feixe ${beamId} detectou objeto a ${distance}cm`);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TerraDevice = TerraDevice;
    window.GiroSomDevice = GiroSomDevice;
    window.BoardSomDevice = BoardSomDevice;
    window.BigKeyBoardDevice = BigKeyBoardDevice;
    window.MusicalBeamDevice = MusicalBeamDevice;
}
