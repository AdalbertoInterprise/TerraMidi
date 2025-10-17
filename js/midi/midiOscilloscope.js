// Oscilloscope - Visualizador de Pitch Bend
// Autor: Terra MIDI System
// Data: 16/10/2025
// Descrição: Osciloscópio virtual para monitoramento de pitch bend com margem de segurança

/**
 * Osciloscópio virtual para visualização de pitch bend
 * Implementa margem de segurança de 2% do centro
 */
class MIDIOscilloscope {
    constructor(canvasId = 'midi-oscilloscope') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`⚠️ Canvas ${canvasId} não encontrado - criando dinamicamente`);
            this.createCanvas(canvasId);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Configurações
        this.config = {
            deadzone: 2, // Margem de segurança de 2%
            updateRate: 60, // FPS
            historyLength: 200, // Pontos no histórico
            colors: {
                background: '#1a1a2e',
                grid: '#2a2a3e',
                centerLine: '#4a4a6e',
                deadzone: 'rgba(255, 255, 0, 0.1)',
                signal: '#00ff88',
                signalDeadzone: '#666666',
                text: '#ffffff'
            }
        };
        
        // Estado
        this.state = {
            currentValue: 0,
            effectiveValue: 0,
            inDeadzone: true,
            history: [],
            isRunning: false,
            lastUpdate: Date.now()
        };
        
        // Iniciar renderização
        this.start();
        
        console.log('✅ MIDIOscilloscope inicializado');
    }

    /**
     * Cria canvas dinamicamente se não existir
     * @param {string} canvasId - ID do canvas
     */
    createCanvas(canvasId) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = canvasId;
        this.canvas.width = 800;
        this.canvas.height = 200;
        this.canvas.style.border = '1px solid #333';
        this.canvas.style.borderRadius = '8px';
        
        // Não anexar automaticamente - deixar para o usuário decidir onde colocar
        console.log(`ℹ️ Canvas criado mas não anexado ao DOM. Use oscilloscope.canvas para anexar.`);
    }

    /**
     * Atualiza valor do pitch bend
     * @param {number} value - Valor do pitch bend (-100 a +100)
     */
    updatePitchBend(value) {
        this.state.currentValue = value;
        
        // Aplicar deadzone
        if (Math.abs(value) < this.config.deadzone) {
            this.state.effectiveValue = 0;
            this.state.inDeadzone = true;
        } else {
            this.state.effectiveValue = value;
            this.state.inDeadzone = false;
        }
        
        // Adicionar ao histórico
        this.state.history.push({
            value: this.state.effectiveValue,
            inDeadzone: this.state.inDeadzone,
            timestamp: Date.now()
        });
        
        // Limitar tamanho do histórico
        if (this.state.history.length > this.config.historyLength) {
            this.state.history.shift();
        }
    }

    /**
     * Renderiza o osciloscópio
     */
    render() {
        if (!this.ctx) return;
        
        const { width, height } = this;
        const centerY = height / 2;
        
        // Limpar canvas
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, width, height);
        
        // Desenhar grade
        this.drawGrid();
        
        // Desenhar zona morta (deadzone)
        this.drawDeadzone(centerY);
        
        // Desenhar linha central
        this.ctx.strokeStyle = this.config.colors.centerLine;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
        
        // Desenhar histórico de valores
        this.drawWaveform(centerY);
        
        // Desenhar indicador de valor atual
        this.drawCurrentValue(centerY);
        
        // Desenhar informações textuais
        this.drawInfo();
    }

    /**
     * Desenha a grade de fundo
     */
    drawGrid() {
        const { width, height } = this;
        
        this.ctx.strokeStyle = this.config.colors.grid;
        this.ctx.lineWidth = 1;
        
        // Linhas horizontais
        for (let y = 0; y < height; y += height / 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        
        // Linhas verticais
        for (let x = 0; x < width; x += width / 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
    }

    /**
     * Desenha a zona morta (deadzone)
     * @param {number} centerY - Posição Y do centro
     */
    drawDeadzone(centerY) {
        const { width, height } = this;
        const deadzoneHeight = (this.config.deadzone / 100) * height;
        
        this.ctx.fillStyle = this.config.colors.deadzone;
        this.ctx.fillRect(0, centerY - deadzoneHeight, width, deadzoneHeight * 2);
    }

    /**
     * Desenha a forma de onda do histórico
     * @param {number} centerY - Posição Y do centro
     */
    drawWaveform(centerY) {
        if (this.state.history.length < 2) return;
        
        const { width, height } = this;
        const stepX = width / this.config.historyLength;
        
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        this.state.history.forEach((point, index) => {
            const x = index * stepX;
            const y = centerY - (point.value / 100) * (height / 2);
            
            // Cor diferente se estiver na deadzone
            this.ctx.strokeStyle = point.inDeadzone 
                ? this.config.colors.signalDeadzone 
                : this.config.colors.signal;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }

    /**
     * Desenha indicador de valor atual
     * @param {number} centerY - Posição Y do centro
     */
    drawCurrentValue(centerY) {
        const { width, height } = this;
        const y = centerY - (this.state.effectiveValue / 100) * (height / 2);
        
        // Círculo indicador
        this.ctx.fillStyle = this.state.inDeadzone 
            ? this.config.colors.signalDeadzone 
            : this.config.colors.signal;
        this.ctx.beginPath();
        this.ctx.arc(width - 20, y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Linha vertical até o valor
        this.ctx.strokeStyle = this.state.inDeadzone 
            ? this.config.colors.signalDeadzone 
            : this.config.colors.signal;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width - 30, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Desenha informações textuais
     */
    drawInfo() {
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.font = '14px monospace';
        
        // Valor atual
        const valueText = `Pitch Bend: ${this.state.currentValue.toFixed(2)}%`;
        this.ctx.fillText(valueText, 10, 20);
        
        // Valor efetivo (após deadzone)
        const effectiveText = `Efetivo: ${this.state.effectiveValue.toFixed(2)}%`;
        this.ctx.fillText(effectiveText, 10, 40);
        
        // Status da deadzone
        const deadzoneText = this.state.inDeadzone ? 'DEADZONE' : 'ATIVO';
        this.ctx.fillStyle = this.state.inDeadzone ? '#666666' : '#00ff88';
        this.ctx.fillText(deadzoneText, 10, 60);
        
        // Margem de segurança
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Margem: ±${this.config.deadzone}%`, 10, this.height - 10);
    }

    /**
     * Loop de animação
     */
    animate() {
        if (!this.state.isRunning) return;
        
        const now = Date.now();
        const deltaTime = now - this.state.lastUpdate;
        const targetDelta = 1000 / this.config.updateRate;
        
        if (deltaTime >= targetDelta) {
            this.render();
            this.state.lastUpdate = now;
        }
        
        requestAnimationFrame(() => this.animate());
    }

    /**
     * Inicia a renderização
     */
    start() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.lastUpdate = Date.now();
        this.animate();
        
        console.log('✅ Osciloscópio iniciado');
    }

    /**
     * Para a renderização
     */
    stop() {
        this.state.isRunning = false;
        console.log('⏸️ Osciloscópio parado');
    }

    /**
     * Reseta o osciloscópio
     */
    reset() {
        this.state.currentValue = 0;
        this.state.effectiveValue = 0;
        this.state.inDeadzone = true;
        this.state.history = [];
        console.log('🔄 Osciloscópio resetado');
    }

    /**
     * Redimensiona o canvas
     * @param {number} width - Nova largura
     * @param {number} height - Nova altura
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        console.log(`📏 Osciloscópio redimensionado: ${width}x${height}`);
    }

    /**
     * Obtém estatísticas
     * @returns {Object} Estatísticas
     */
    getStats() {
        return {
            currentValue: this.state.currentValue,
            effectiveValue: this.state.effectiveValue,
            inDeadzone: this.state.inDeadzone,
            historyLength: this.state.history.length,
            isRunning: this.state.isRunning
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIOscilloscope = MIDIOscilloscope;
}
