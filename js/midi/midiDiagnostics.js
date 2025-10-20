// MIDI Diagnostics - Sistema de diagnóstico avançado para problemas MIDI
// Autor: Terra MIDI System
// Data: 20/10/2025

/**
 * Sistema de diagnóstico para detecção de problemas comuns com dispositivos MIDI
 */
class MIDIDiagnostics {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        this.diagnosticHistory = [];
        this.lastDiagnosticTime = null;
    }

    /**
     * Executa diagnóstico completo do sistema MIDI
     * @returns {Object} Resultado do diagnóstico
     */
    async runFullDiagnostic() {
        console.log('🔬 Iniciando diagnóstico completo do sistema MIDI...');
        
        const diagnostic = {
            timestamp: new Date().toISOString(),
            browser: this.detectBrowser(),
            permissions: await this.checkPermissions(),
            midiAccess: this.checkMIDIAccess(),
            devices: this.analyzeDevices(),
            exclusiveAccess: this.detectExclusiveAccess(),
            recommendations: []
        };

        // Gerar recomendações baseadas nos resultados
        diagnostic.recommendations = this.generateRecommendations(diagnostic);

        // Salvar no histórico
        this.diagnosticHistory.push(diagnostic);
        this.lastDiagnosticTime = Date.now();

        // Exibir relatório no console
        this.printDiagnosticReport(diagnostic);

        return diagnostic;
    }

    /**
     * Detecta informações do navegador
     */
    detectBrowser() {
        const ua = navigator.userAgent;
        const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
        const isEdge = /Edg/.test(ua);
        const isOpera = /OPR/.test(ua);
        const isFirefox = /Firefox/.test(ua);

        let name = 'Unknown';
        if (isChrome) name = 'Chrome';
        else if (isEdge) name = 'Edge';
        else if (isOpera) name = 'Opera';
        else if (isFirefox) name = 'Firefox';

        const versionMatch = ua.match(/Chrome\/(\d+)/);
        const version = versionMatch ? parseInt(versionMatch[1]) : null;

        return {
            name,
            version,
            userAgent: ua,
            isChrome,
            isEdge,
            isSupported: isChrome || isEdge || isOpera
        };
    }

    /**
     * Verifica permissões MIDI
     */
    async checkPermissions() {
        const result = {
            apiAvailable: !!navigator.requestMIDIAccess,
            permissionAPI: 'permissions' in navigator,
            state: 'unknown',
            secureContext: window.isSecureContext
        };

        if (result.permissionAPI) {
            try {
                const permission = await navigator.permissions.query({ name: 'midi', sysex: false });
                result.state = permission.state;
            } catch (error) {
                console.warn('⚠️ Erro ao verificar permissões MIDI:', error);
                result.error = error.message;
            }
        }

        return result;
    }

    /**
     * Verifica estado do MIDI Access
     */
    checkMIDIAccess() {
        const midiAccess = this.deviceManager?.midiAccess;
        
        return {
            available: !!midiAccess,
            inputs: midiAccess ? midiAccess.inputs.size : 0,
            outputs: midiAccess ? midiAccess.outputs.size : 0,
            sysexEnabled: midiAccess?.sysexEnabled || false
        };
    }

    /**
     * Analisa dispositivos conectados
     */
    analyzeDevices() {
        const midiAccess = this.deviceManager?.midiAccess;
        if (!midiAccess) {
            return {
                total: 0,
                terraDevices: 0,
                otherDevices: 0,
                list: []
            };
        }

        const inputs = Array.from(midiAccess.inputs.values());
        const terraDevices = [];
        const otherDevices = [];

        inputs.forEach(input => {
            const deviceInfo = {
                name: input.name,
                id: input.id,
                manufacturer: input.manufacturer || 'N/A',
                state: input.state,
                type: input.type
            };

            const isTerra = this.deviceManager.isTerraDevice(input);
            if (isTerra) {
                terraDevices.push(deviceInfo);
            } else {
                otherDevices.push(deviceInfo);
            }
        });

        return {
            total: inputs.length,
            terraDevices: terraDevices.length,
            otherDevices: otherDevices.length,
            terraList: terraDevices,
            otherList: otherDevices
        };
    }

    /**
     * Detecta possível acesso exclusivo ao dispositivo
     */
    detectExclusiveAccess() {
        const devices = this.analyzeDevices();
        const permissions = this.deviceManager?.lastPermissionStatus;
        
        const result = {
            likely: false,
            reasons: [],
            suggestions: []
        };

        // Cenário 1: Permissão concedida mas nenhum dispositivo detectado
        if (permissions?.state === 'granted' && devices.total === 0) {
            result.likely = true;
            result.reasons.push('Permissão MIDI concedida mas nenhum dispositivo detectado');
            result.suggestions.push('Verifique se outro navegador está usando o dispositivo');
            result.suggestions.push('Feche Microsoft Edge, Brave, Opera ou outras abas do Chrome');
        }

        // Cenário 2: Dispositivos não-Terra detectados mas nenhum Terra
        if (devices.otherDevices > 0 && devices.terraDevices === 0) {
            result.likely = true;
            result.reasons.push('Dispositivos MIDI detectados mas nenhum identificado como Midi-Terra');
            result.suggestions.push('Verifique se o dispositivo está corretamente identificado como "Midi-Terra"');
            result.suggestions.push('Reconecte o cabo USB do dispositivo');
        }

        // Cenário 3: Histórico de dispositivos Terra mas agora zerado
        const lastSnapshot = this.deviceManager?.lastKnownSnapshot;
        if (lastSnapshot?.devices?.length > 0 && devices.terraDevices === 0) {
            result.likely = true;
            result.reasons.push('Dispositivo estava conectado anteriormente mas não está mais');
            result.suggestions.push('Feche qualquer aplicativo que possa estar usando o dispositivo');
            result.suggestions.push('DAWs (Ableton, FL Studio), MIDI-OX, ou outros navegadores');
        }

        return result;
    }

    /**
     * Gera recomendações baseadas no diagnóstico
     */
    generateRecommendations(diagnostic) {
        const recommendations = [];

        // Verificar navegador
        if (!diagnostic.browser.isSupported) {
            recommendations.push({
                priority: 'high',
                category: 'browser',
                message: `Navegador não suportado: ${diagnostic.browser.name}. Use Chrome, Edge ou Opera.`,
                action: 'Abra este site no Google Chrome ou Microsoft Edge'
            });
        }

        // Verificar contexto seguro
        if (!diagnostic.permissions.secureContext) {
            recommendations.push({
                priority: 'critical',
                category: 'security',
                message: 'Contexto inseguro detectado. Web MIDI API requer HTTPS.',
                action: 'Acesse o site via HTTPS ou localhost'
            });
        }

        // Verificar permissões
        if (diagnostic.permissions.state === 'denied') {
            recommendations.push({
                priority: 'critical',
                category: 'permissions',
                message: 'Permissão MIDI bloqueada pelo navegador',
                action: 'Acesse chrome://settings/content/midiDevices e desbloqueie este site'
            });
        }

        // Verificar acesso exclusivo
        if (diagnostic.exclusiveAccess.likely) {
            recommendations.push({
                priority: 'high',
                category: 'exclusive-access',
                message: 'Possível acesso exclusivo ao dispositivo por outro aplicativo',
                action: 'Feche Edge, DAWs, e outros aplicativos MIDI',
                details: diagnostic.exclusiveAccess.suggestions
            });
        }

        // Verificar dispositivos
        if (diagnostic.devices.total === 0 && diagnostic.permissions.state === 'granted') {
            recommendations.push({
                priority: 'high',
                category: 'device-connection',
                message: 'Nenhum dispositivo MIDI detectado',
                action: 'Conecte o Midi-Terra via USB e verifique se está ligado'
            });
        }

        return recommendations;
    }

    /**
     * Exibe relatório formatado no console
     */
    printDiagnosticReport(diagnostic) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔬 RELATÓRIO DE DIAGNÓSTICO MIDI');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`⏰ Data/Hora: ${diagnostic.timestamp}`);
        console.log('');
        
        // Navegador
        console.log('🌐 NAVEGADOR:');
        console.log(`   ├─ Nome: ${diagnostic.browser.name} ${diagnostic.browser.version || ''}`);
        console.log(`   ├─ Suportado: ${diagnostic.browser.isSupported ? '✅ Sim' : '❌ Não'}`);
        console.log(`   └─ User Agent: ${diagnostic.browser.userAgent}`);
        console.log('');

        // Permissões
        console.log('🔐 PERMISSÕES:');
        console.log(`   ├─ API Disponível: ${diagnostic.permissions.apiAvailable ? '✅ Sim' : '❌ Não'}`);
        console.log(`   ├─ Contexto Seguro: ${diagnostic.permissions.secureContext ? '✅ Sim' : '❌ Não'}`);
        console.log(`   └─ Estado: ${this.getPermissionStateEmoji(diagnostic.permissions.state)} ${diagnostic.permissions.state}`);
        console.log('');

        // MIDI Access
        console.log('🎹 MIDI ACCESS:');
        console.log(`   ├─ Disponível: ${diagnostic.midiAccess.available ? '✅ Sim' : '❌ Não'}`);
        console.log(`   ├─ Entradas: ${diagnostic.midiAccess.inputs}`);
        console.log(`   ├─ Saídas: ${diagnostic.midiAccess.outputs}`);
        console.log(`   └─ SysEx: ${diagnostic.midiAccess.sysexEnabled ? '✅ Habilitado' : '❌ Desabilitado'}`);
        console.log('');

        // Dispositivos
        console.log('🔌 DISPOSITIVOS:');
        console.log(`   ├─ Total: ${diagnostic.devices.total}`);
        console.log(`   ├─ Terra Eletrônica: ${diagnostic.devices.terraDevices} ${diagnostic.devices.terraDevices > 0 ? '✅' : '❌'}`);
        console.log(`   └─ Outros: ${diagnostic.devices.otherDevices}`);
        
        if (diagnostic.devices.terraList.length > 0) {
            console.log('   ');
            console.log('   ✅ Dispositivos Terra detectados:');
            diagnostic.devices.terraList.forEach((device, i) => {
                console.log(`      ${i + 1}. ${device.name}`);
                console.log(`         ├─ ID: ${device.id}`);
                console.log(`         ├─ Fabricante: ${device.manufacturer}`);
                console.log(`         └─ Estado: ${device.state}`);
            });
        }

        if (diagnostic.devices.otherList.length > 0) {
            console.log('   ');
            console.log('   ℹ️ Outros dispositivos MIDI:');
            diagnostic.devices.otherList.forEach((device, i) => {
                console.log(`      ${i + 1}. ${device.name}`);
            });
        }
        console.log('');

        // Acesso Exclusivo
        if (diagnostic.exclusiveAccess.likely) {
            console.log('🔒 ACESSO EXCLUSIVO DETECTADO:');
            console.log('   ⚠️ Possível conflito com outro aplicativo');
            console.log('   ');
            console.log('   Razões:');
            diagnostic.exclusiveAccess.reasons.forEach(reason => {
                console.log(`   • ${reason}`);
            });
            console.log('   ');
            console.log('   Sugestões:');
            diagnostic.exclusiveAccess.suggestions.forEach(suggestion => {
                console.log(`   ✅ ${suggestion}`);
            });
            console.log('');
        }

        // Recomendações
        if (diagnostic.recommendations.length > 0) {
            console.log('💡 RECOMENDAÇÕES:');
            diagnostic.recommendations.forEach((rec, i) => {
                const priority = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟡' : '🟢';
                console.log(`   ${priority} ${i + 1}. ${rec.message}`);
                console.log(`      Ação: ${rec.action}`);
                if (rec.details) {
                    rec.details.forEach(detail => {
                        console.log(`      • ${detail}`);
                    });
                }
                console.log('');
            });
        } else {
            console.log('✅ Nenhum problema detectado!');
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Retorna emoji baseado no estado da permissão
     */
    getPermissionStateEmoji(state) {
        switch (state) {
            case 'granted': return '✅';
            case 'denied': return '❌';
            case 'prompt': return '⏳';
            default: return '❓';
        }
    }

    /**
     * Exporta diagnóstico como JSON
     */
    exportDiagnostic(diagnostic) {
        return JSON.stringify(diagnostic || this.diagnosticHistory[this.diagnosticHistory.length - 1], null, 2);
    }

    /**
     * Cria relatório HTML visual
     */
    createHTMLReport(diagnostic) {
        const data = diagnostic || this.diagnosticHistory[this.diagnosticHistory.length - 1];
        if (!data) return null;

        const html = `
            <div class="midi-diagnostic-report" style="font-family: monospace; padding: 20px; background: #f5f5f5; border-radius: 8px; max-width: 800px;">
                <h2 style="margin-top: 0;">🔬 Diagnóstico MIDI - Terra Eletrônica</h2>
                <p><small>${data.timestamp}</small></p>
                
                <h3>🌐 Navegador</h3>
                <ul>
                    <li><strong>Nome:</strong> ${data.browser.name} ${data.browser.version || ''}</li>
                    <li><strong>Suportado:</strong> ${data.browser.isSupported ? '✅ Sim' : '❌ Não'}</li>
                </ul>

                <h3>🔐 Permissões</h3>
                <ul>
                    <li><strong>Web MIDI API:</strong> ${data.permissions.apiAvailable ? '✅ Disponível' : '❌ Indisponível'}</li>
                    <li><strong>Contexto Seguro:</strong> ${data.permissions.secureContext ? '✅ Sim (HTTPS)' : '❌ Não'}</li>
                    <li><strong>Estado:</strong> ${this.getPermissionStateEmoji(data.permissions.state)} ${data.permissions.state}</li>
                </ul>

                <h3>🎹 Dispositivos MIDI</h3>
                <ul>
                    <li><strong>Total:</strong> ${data.devices.total}</li>
                    <li><strong>Terra Eletrônica:</strong> ${data.devices.terraDevices} ${data.devices.terraDevices > 0 ? '✅' : '❌'}</li>
                    <li><strong>Outros:</strong> ${data.devices.otherDevices}</li>
                </ul>

                ${data.recommendations.length > 0 ? `
                    <h3>💡 Recomendações</h3>
                    <ol>
                        ${data.recommendations.map(rec => `
                            <li style="margin-bottom: 10px;">
                                <strong>${rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟡' : '🟢'} ${rec.message}</strong><br>
                                <small>Ação: ${rec.action}</small>
                            </li>
                        `).join('')}
                    </ol>
                ` : '<p>✅ <strong>Nenhum problema detectado!</strong></p>'}
            </div>
        `;

        return html;
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.MIDIDiagnostics = MIDIDiagnostics;
}
