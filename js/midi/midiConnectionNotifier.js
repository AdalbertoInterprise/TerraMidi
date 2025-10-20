// MIDI Connection Notifier - Sistema de notificações silenciosas
// Autor: Terra MIDI System
// Data: 19/10/2025
// Descrição: Sistema silencioso para ambientes terapêuticos - registra eventos sem notificações visuais

/**
 * 🔇 MODO TERAPÊUTICO ATIVADO
 * Notificações MIDI desabilitadas para não interferir na experiência do paciente
 * Todos os eventos são registrados no SystemLogger para consulta posterior
 */
class MIDIConnectionNotifier {
    constructor() {
        this.container = null;
        this.activeNotifications = new Map();
        this.config = {
            duration: 5000,
            position: 'top-right',
            maxNotifications: 3,
            silentMode: true // 🔇 Modo silencioso ATIVO
        };
        
        // Não criar container visual em modo silencioso
        console.log('🔇 MIDIConnectionNotifier inicializado em MODO SILENCIOSO');
        this.ensureLegacyAPICompatibility();
    }

    /**
     * Restabelece a API legada usada pelo MIDIDeviceManager
     *
     * Correção 16/10/2025: showDeviceConnected/showDeviceDisconnected foram
     * renomeadas para showConnected/showDisconnected na refatoração visual, o que
     * quebrou a integração. Este helper recria as assinaturas antigas mantendo o
     * novo comportamento e garante que window.midiNotifier exponha todos os
     * métodos esperados.
     */
    ensureLegacyAPICompatibility() {
        if (this._legacyApiReady) {
            return;
        }

        this._legacyApiReady = true;

        if (typeof this.showDeviceConnected !== 'function') {
            this.showDeviceConnected = (deviceNames) => {
                const isObjectPayload = deviceNames && typeof deviceNames === 'object' && !Array.isArray(deviceNames);
                const namesArray = Array.isArray(deviceNames)
                    ? deviceNames
                        .filter(Boolean)
                        .map(item => typeof item === 'string' ? item : item?.name)
                        .filter(Boolean)
                    : isObjectPayload
                        ? [deviceNames.name || 'Dispositivo Terra']
                        : (deviceNames ? [deviceNames] : []);
                const label = namesArray.length > 0
                    ? namesArray.join(', ')
                    : 'Dispositivo Terra';

                const payload = isObjectPayload
                    ? { ...deviceNames }
                    : {
                        name: label,
                        id: `terra-device-${Date.now()}`,
                        manufacturer: 'Terra Eletrônica'
                    };

                payload.name = payload.name || label;
                payload.id = payload.id || `terra-device-${Date.now()}`;
                payload.manufacturer = payload.manufacturer || 'Terra Eletrônica';

                this.showConnected(payload);
            };
        }

        if (typeof this.showDeviceDisconnected !== 'function') {
            this.showDeviceDisconnected = (deviceId, deviceName) => {
                this.showDisconnected(
                    deviceId || 'terra-device',
                    deviceName || 'Dispositivo Terra'
                );
            };
        }

        if (typeof this.showDeviceRejected !== 'function') {
            this.showDeviceRejected = (deviceName) => {
                this.showRejected(deviceName || 'Dispositivo não identificado');
            };
        }

        if (typeof this.showDeviceError !== 'function') {
            this.showDeviceError = (message) => {
                this.showError(message || 'Erro desconhecido no dispositivo MIDI');
            };
        }

        if (typeof this.showAutoReconnected !== 'function') {
            this.showAutoReconnected = (detail) => {
                const payload = typeof detail === 'string' ? { name: detail } : detail || {};
                this.showConnected({
                    name: payload.name || 'Midi-Terra',
                    id: payload.id || `terra-device-${Date.now()}`,
                    manufacturer: payload.manufacturer || 'Terra Eletrônica'
                });
            };
        }

        if (typeof this.showAutoReconnectAttempt !== 'function') {
            this.showAutoReconnectAttempt = (detail = {}) => {
                const message = reason || 'Reconecte o dispositivo Midi-Terra e autorize novamente, se necessário.';
                this.show(message, 'warning', '⚠️', 7000);
            };
        }
    }

    /**
     * Cria container para notificações
     */
    createContainer() {
        // Verificar se já existe
        let existing = document.getElementById('midi-notifications-container');
        if (existing) {
            this.container = existing;
            return;
        }

        // Criar novo container
        this.container = document.createElement('div');
        this.container.id = 'midi-notifications-container';
        this.container.className = 'midi-notifications-container';
        
        // Aplicar estilos inline para garantir funcionamento
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.container);
    }

    /**
     * Exibe notificação de dispositivo conectado
     * @param {Object} device - Informações do dispositivo
     */
    showConnected(device) {
        const message = `🎹 Dispositivo conectado: <strong>${device.name}</strong>`;
        const type = 'success';
        const icon = '✅';
        
        this.show(message, type, icon);
        
        // Log detalhado no console
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║       🎉 DISPOSITIVO TERRA CONECTADO!                ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  Nome: ${device.name.padEnd(44)} ║`);
        console.log(`║  ID: ${device.id.padEnd(46)} ║`);
        console.log(`║  Fabricante: ${(device.manufacturer || 'N/A').padEnd(38)} ║`);
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║  ✓ Dispositivo pronto para uso                       ║');
        console.log('║  ✓ Mensagens MIDI sendo recebidas                    ║');
        console.log('║  ✓ Integração com áudio ativa                        ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('');
    }

    /**
     * Exibe notificação de dispositivo desconectado
     * @param {string} deviceId - ID do dispositivo
     * @param {string} deviceName - Nome do dispositivo
     */
    showDisconnected(deviceId, deviceName = 'Dispositivo desconhecido') {
        const message = `🔌 Dispositivo desconectado: <strong>${deviceName}</strong>`;
        const type = 'warning';
        const icon = '⚠️';
        
        this.show(message, type, icon);
        
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║       ⚠️  DISPOSITIVO DESCONECTADO                   ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  Nome: ${deviceName.padEnd(44)} ║`);
        console.log(`║  ID: ${deviceId.padEnd(46)} ║`);
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║  ✗ Dispositivo removido                              ║');
        console.log('║  ℹ️  Reconecte para continuar usando                  ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('');
    }

    /**
     * Exibe notificação de erro
     * @param {string} errorMessage - Mensagem de erro
     */
    showError(errorMessage) {
        const message = `❌ Erro MIDI: <strong>${errorMessage}</strong>`;
        const type = 'error';
        const icon = '❌';
        
        this.show(message, type, icon, 8000); // Erros ficam mais tempo
    }

    /**
     * Exibe notificação de Web MIDI não suportado
     */
    showUnsupported() {
        const message = `⚠️ <strong>Web MIDI API não suportada</strong><br>
                        <small>Use Chrome, Edge ou Opera</small>`;
        const type = 'error';
        const icon = '⚠️';
        
        this.show(message, type, icon, 10000);
    }

    /**
     * Exibe notificação de nenhum dispositivo detectado
     */
    showNoDevices() {
        const message = `🔍 <strong>Nenhum dispositivo Terra detectado</strong><br>
                        <small>Conecte seu Midi-Terra via USB</small>`;
        const type = 'info';
        const icon = '💡';
        
        this.show(message, type, icon, 7000);
    }

    showInsecureContext(details = {}) {
        const message = `🔒 <strong>Contexto inseguro detectado</strong><br>
                        <small>O Chrome exige HTTPS ou <code>https://127.0.0.1</code> para liberar o acesso MIDI.</small><br>
                        <small>Execute um servidor HTTPS local ou adapte a URL do projeto.</small>`;
        this.show(message, 'error', '🔒', 12000);

        console.warn('⚠️ Contexto inseguro bloqueando Web MIDI.', details);
        console.warn('💡 Solução rápida: rode `npx http-server -S` ou utilize extensões do VS Code com HTTPS habilitado.');
    }

    showPermissionInstructions(state = 'prompt') {
        const denied = state === 'denied';
        const title = denied ? 'Permissão MIDI negada' : 'Conceda permissão MIDI no Chrome';
        const message = `🔐 <strong>${title}</strong><br>
                        <small>Abra <code>chrome://settings/content/midiDevices</code>, remova bloqueios e recarregue a página.</small><br>
                        <small>Depois, clique em "Permitir" quando o Chrome solicitar acesso MIDI.</small>`;
        this.show(message, denied ? 'error' : 'warning', denied ? '⛔' : '🔐', 10000);

        console.warn('⚠️ Revise as permissões em chrome://settings/content/midiDevices e libere este site.');
    }

    showExclusiveUseWarning() {
        const message = `� <strong>Dispositivo MIDI em uso exclusivo</strong><br>
                        <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 8px 0;">
                            <strong style="color: #856404;">⚠️ Acesso bloqueado por outro navegador/aplicativo</strong>
                        </div>
                        <small><strong>Soluções:</strong></small><br>
                        <small>1️⃣ Feche <strong>Microsoft Edge</strong> (causa mais comum)</small><br>
                        <small>2️⃣ Feche DAWs ou sintetizadores MIDI</small><br>
                        <small>3️⃣ Feche outras abas do Chrome usando MIDI</small><br>
                        <small>4️⃣ Reconecte o cabo USB do Midi-Terra</small><br>
                        <div style="margin-top: 8px; padding: 6px; background: #d1ecf1; border-radius: 3px;">
                            <small>💡 <strong>Dica:</strong> Apenas 1 aplicativo por vez pode usar o Midi-Terra</small>
                        </div>`;
        this.show(message, 'warning', '�', 12000);

        console.warn('⚠️ ❌ ACESSO EXCLUSIVO: Outro aplicativo está usando o Midi-Terra');
        console.warn('   Causas comuns:');
        console.warn('   1. Microsoft Edge aberto com site usando MIDI');
        console.warn('   2. DAW (Ableton, FL Studio, etc.) conectada ao dispositivo');
        console.warn('   3. Outra aba do Chrome com acesso MIDI ativo');
        console.warn('   4. Aplicativo de teste MIDI (MIDI-OX, MIDIberry, etc.)');
        console.warn('   ');
        console.warn('   ✅ SOLUÇÃO: Feche todos esses aplicativos e recarregue esta página');
    }

    showChromeUpdateWarning(currentVersion, minimumVersion) {
        const message = `⬆️ <strong>Atualize o Chrome</strong><br>
                        <small>Versão detectada: ${currentVersion ? currentVersion : 'desconhecida'}.</small><br>
                        <small>Atualize para ${minimumVersion}+ em <code>chrome://settings/help</code> e reinicie o navegador.</small>`;
        this.show(message, 'warning', '⬆️', 10000);

        console.warn(`⚠️ Chrome desatualizado (${currentVersion || 'desconhecido'}) — recomendado atualizar para ${minimumVersion}+ para suporte Web MIDI.`);
    }

    showDebugChecklist() {
        const message = `🧪 <strong>Checklist de Depuração</strong><br>
                        <small>1) Abra o Console (F12) e filtre por "MIDI".</small><br>
                        <small>2) Execute <code>window.midiManager?.debugMidi?.()</code> ou pressione uma tecla no Midi-Terra.</small><br>
                        <small>3) Verifique se eventos "noteon" aparecem e se o áudio foi habilitado.</small>`;
        this.show(message, 'info', '🧰', 11000);
    }

    /**
     * Exibe notificação de aguardando permissão MIDI
     * Retorna ID para poder cancelar depois
     * @param {string} browser - Nome do navegador
     * @param {number} timeoutSeconds - Tempo de timeout em segundos
     * @returns {string} ID da notificação
     */
    showWaitingPermission(browser = 'navegador', timeoutSeconds = 30) {
        const isChrome = browser.toLowerCase().includes('chrome');
        const urgency = isChrome ? '⚡ AÇÃO RÁPIDA NECESSÁRIA!' : 'Aguarde...';
        
        let message = `
            <div style="text-align: center;">
                <div style="font-size: 1.2em; margin-bottom: 8px;">
                    ⏱️ <strong>Aguardando Permissão MIDI</strong>
                </div>
                <div style="font-size: 0.9em; color: #333; margin-bottom: 10px;">
                    ${urgency}
                </div>
                <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                    ${isChrome ? 
                        `<strong>⚠️ Chrome timeout: ${timeoutSeconds}s</strong><br>
                         <small>Clique em "Permitir" RAPIDAMENTE</small>` :
                        `<small>Clique em "Permitir" no popup do navegador</small>`
                    }
                </div>
                <div style="font-size: 0.85em; color: #666;">
                    <div class="permission-countdown" style="font-weight: bold; font-size: 1.5em; color: ${isChrome ? '#dc3545' : '#28a745'};">
                        ${timeoutSeconds}s
                    </div>
                </div>
            </div>
        `;
        
        // Criar notificação persistente (não fecha automaticamente)
        const notificationId = 'midi-permission-waiting';
        const notification = this.createNotification(message, 'warning', '⏱️', 0, notificationId);
        
        // Adicionar classe especial para permissão
        notification.classList.add('midi-permission-notification');
        notification.style.cssText += `
            pointer-events: auto;
            animation: pulse 2s ease-in-out infinite;
            border: 3px solid ${isChrome ? '#dc3545' : '#ffc107'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Adicionar animação de pulso
        if (!document.getElementById('midi-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'midi-pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                    50% { transform: scale(1.02); box-shadow: 0 6px 16px rgba(220,53,69,0.5); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return notificationId;
    }

    /**
     * Atualiza o contador da notificação de permissão
     * @param {string} notificationId - ID da notificação
     * @param {number} secondsRemaining - Segundos restantes
     */
    updatePermissionCountdown(notificationId, secondsRemaining) {
        const notification = document.getElementById(notificationId);
        if (!notification) return;
        
        const countdown = notification.querySelector('.permission-countdown');
        if (countdown) {
            countdown.textContent = `${secondsRemaining}s`;
            
            // Mudar cor conforme tempo restante
            if (secondsRemaining <= 10) {
                countdown.style.color = '#dc3545'; // Vermelho
                countdown.style.animation = 'blink 0.5s ease-in-out infinite';
            } else if (secondsRemaining <= 20) {
                countdown.style.color = '#ffc107'; // Amarelo
            }
        }
        
        // Adicionar animação de piscar quando crítico
        if (secondsRemaining <= 10 && !document.getElementById('midi-blink-animation')) {
            const style = document.createElement('style');
            style.id = 'midi-blink-animation';
            style.textContent = `
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Remove notificação de permissão
     * @param {string} notificationId - ID da notificação
     */
    hidePermissionNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                this.remove(notificationId);
            }, 300);
        }
    }

    /**
     * Exibe notificação de permissão concedida
     */
    showPermissionGranted() {
        const message = `✅ <strong>Permissão MIDI Concedida!</strong><br>
                        <small>Escaneando dispositivos...</small>`;
        this.show(message, 'success', '✅', 3000);
    }

    /**
     * Exibe notificação de timeout de permissão
     * @param {string} browser - Nome do navegador
     */
    showPermissionTimeout(browser = 'navegador') {
        const isChrome = browser.toLowerCase().includes('chrome');
        const message = `⏱️ <strong>Tempo Esgotado</strong><br>
                        <small>${isChrome ? 
                            'Chrome: Clique novamente e autorize RAPIDAMENTE' :
                            'Tente novamente e clique em "Permitir"'
                        }</small>`;
        this.show(message, 'error', '⏱️', 8000);
    }

    /**
     * Exibe notificação de dispositivo rejeitado
     * @param {string} deviceName - Nome do dispositivo rejeitado
     */
    showRejected(deviceName) {
        const message = `⛔ Dispositivo rejeitado: <strong>${deviceName}</strong><br>
                        <small>Apenas dispositivos Terra são aceitos</small>`;
        const type = 'warning';
        const icon = '⛔';
        
        this.show(message, type, icon);
    }

    showAutoReconnectAttempt(detail = {}) {
        const reason = detail.reason ? this.formatAutoReconnectReason(detail.reason) : 'Rearmando comunicação com o dispositivo.';
        const extra = reason ? `<br><small>${reason}</small>` : '';
        const message = `🔄 <strong>Reconexão automática iniciada</strong>${extra}`;

        this.show(message, 'info', '🔄', 5000);

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║       🔄  TENTATIVA DE RECONEXÃO AUTOMÁTICA          ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  Motivo: ${(detail.reason || 'desconhecido').padEnd(42)} ║`);
        console.log('║  ✓ Eventos e timers rearmados                         ║');
        console.log('║  ✓ Aguardando resposta do navegador                   ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('');
    }

    /**
     * Exibe notificação de reconexão automática bem-sucedida
     * @param {Object} detail - Informações do dispositivo reconectado
     */
    showAutoReconnected(detail = {}) {
        const deviceName = detail.name || 'Midi-Terra';
        const reason = detail.reason ? this.formatAutoReconnectReason(detail.reason) : '';
        const extra = reason ? `<br><small>${reason}</small>` : '';

        const message = `🔄 <strong>${deviceName}</strong> reconectado com sucesso!${extra}`;
        this.show(message, 'success', '🔄', 6000);
    }

    /**
     * Exibe notificação de reconexão automática que não encontrou dispositivos
     * @param {Object} detail - Dados sobre a tentativa
     */
    showAutoReconnectFailed(detail = {}) {
        const reason = detail.reason ? this.formatAutoReconnectReason(detail.reason) : 'Verifique se o dispositivo está conectado e autorizado.';
        const message = `⚠️ <strong>Reconexão MIDI pendente</strong><br><small>${reason}</small>`;
        this.show(message, 'warning', '⚠️', 7000);
    }

    formatAutoReconnectReason(reason) {
        const reasons = {
            'window-load': 'Reconexão após atualizar a página',
            'stored-devices': 'Reconhecido a partir da última sessão',
            'usb-connect': 'Dispositivo USB reconectado',
            'window-focus': 'Reconexão ao voltar para a aba ativa',
            'visibilitychange': 'Reconexão retomada ao reabrir a aba',
            'midi-initialized': 'Sistema MIDI reinicializado automaticamente',
            'retry-after-failure': 'Nova tentativa automática em andamento',
            'auto-reconnect': 'Reconexão automática em andamento',
            'manager-registered': 'Reconexão após recarregar o gerenciador MIDI',
            'page-reload': 'Reconexão após recarregar a página'
        };

        if (typeof reason === 'string') {
            if (reason.includes(':')) {
                const [base] = reason.split(':');
                if (reasons[base]) {
                    return reasons[base];
                }
            }
            return reasons[reason] || `Reconexão automática (${reason})`;
        }

        return 'Reconexão automática em andamento';
    }

    /**
     * 🔇 Cria notificação silenciosa (apenas registra no log)
     * @param {string} message - Mensagem HTML
     * @param {string} type - Tipo (success, warning, error, info)
     * @param {string} icon - Ícone emoji
     * @param {number} duration - Duração em ms (0 = persistente)
     * @param {string} customId - ID customizado (opcional)
     * @returns {HTMLElement} Elemento fictício para compatibilidade
     */
    createNotification(message, type = 'info', icon = 'ℹ️', duration = this.config.duration, customId = null) {
        // Modo silencioso: apenas registrar no SystemLogger
        if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
            const logType = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
            const cleanMessage = message.replace(/<[^>]*>/g, ''); // Remover HTML
            SystemLogger.log(logType, `${icon} ${cleanMessage}`);
        }
        
        console.log(`🔇 [MIDI] ${icon} ${message.replace(/<[^>]*>/g, '')}`);
        
        // Retornar elemento fictício para compatibilidade
        return document.createElement('div');
    }

    /**
     * 🔇 Exibe notificação silenciosa
     */
    show(message, type = 'info', icon = 'ℹ️', duration = this.config.duration) {
        return this.createNotification(message, type, icon, duration);
    }

    /**
     * 🔇 Métodos desabilitados em modo silencioso
     */
    applyNotificationStyles(notification, type) {
        // Desabilitado em modo silencioso
    }

    /**
     * 🔇 Remove notificação (compatibilidade)
     */
    remove(id) {
        // Desabilitado em modo silencioso
        this.activeNotifications.delete(id);
    }

    /**
     * 🔇 Remove todas as notificações (compatibilidade)
     */
    clear() {
        // Desabilitado em modo silencioso
        this.activeNotifications.clear();
    }

    /**
     * Obtém estatísticas
     */
    getStats() {
        return {
            activeCount: 0,
            maxNotifications: this.config.maxNotifications
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDIConnectionNotifier = MIDIConnectionNotifier;
}
