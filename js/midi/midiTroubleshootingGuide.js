/**
 * ============================================================
 * GUIA DE TROUBLESHOOTING MIDI PARA CHROME
 * ============================================================
 * 
 * Componente visual que fornece instruções passo-a-passo para
 * resolver problemas de conexão MIDI no Google Chrome.
 * 
 * @version 1.0.0
 * @date 2025-10-17
 */

class MIDITroubleshootingGuide {
    constructor(browserCompat) {
        this.browserCompat = browserCompat;
        this.guideElement = null;
        this.isVisible = false;
    }

    /**
     * Cria o elemento HTML do guia de troubleshooting
     */
    createGuideElement() {
        const guide = document.createElement('div');
        guide.id = 'midi-troubleshooting-guide';
        guide.className = 'midi-troubleshooting-guide';
        guide.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 600px;
            max-height: 80vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;

        guide.innerHTML = `
            <div class="guide-header" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
                    🔧 Guia de Solução - Dispositivo MIDI
                </h2>
                <button id="midi-guide-close" style="
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                   onmouseout="this.style.background='transparent'">×</button>
            </div>
            
            <div class="guide-content" style="
                padding: 24px;
                overflow-y: auto;
                max-height: calc(80vh - 80px);
            ">
                <div id="guide-sections"></div>
            </div>
        `;

        return guide;
    }

    /**
     * Exibe o guia com instruções específicas para o problema detectado
     * @param {string} issueType - Tipo do problema ('no-device', 'permission-denied', 'insecure-context', 'conflict')
     */
    show(issueType = 'no-device') {
        if (!this.guideElement) {
            this.guideElement = this.createGuideElement();
            document.body.appendChild(this.guideElement);

            // Adicionar evento de fechar
            document.getElementById('midi-guide-close').addEventListener('click', () => {
                this.hide();
            });

            // Fechar ao clicar fora
            this.guideElement.addEventListener('click', (e) => {
                if (e.target === this.guideElement) {
                    this.hide();
                }
            });
        }

        // Preencher conteúdo baseado no tipo de problema
        const sectionsContainer = document.getElementById('guide-sections');
        sectionsContainer.innerHTML = this.getContentForIssue(issueType);

        // Mostrar o guia
        this.guideElement.style.display = 'block';
        this.isVisible = true;

        // Adicionar backdrop
        this.showBackdrop();
    }

    /**
     * Esconde o guia
     */
    hide() {
        if (this.guideElement) {
            this.guideElement.style.display = 'none';
            this.isVisible = false;
            this.hideBackdrop();
        }
    }

    /**
     * Adiciona um backdrop escuro atrás do guia
     */
    showBackdrop() {
        let backdrop = document.getElementById('midi-guide-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'midi-guide-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: none;
            `;
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', () => this.hide());
        }
        backdrop.style.display = 'block';
    }

    /**
     * Remove o backdrop
     */
    hideBackdrop() {
        const backdrop = document.getElementById('midi-guide-backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
        }
    }

    /**
     * Retorna o conteúdo HTML baseado no tipo de problema
     * @param {string} issueType - Tipo do problema
     * @returns {string} HTML do conteúdo
     */
    getContentForIssue(issueType) {
        const browserName = this.browserCompat?.browser?.name || 'Chrome';
        const isChrome = browserName === 'Chrome';

        const baseStyle = `
            margin-bottom: 24px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid;
        `;

        switch (issueType) {
            case 'no-device':
                return `
                    <div style="${baseStyle} border-left-color: #ffc107;">
                        <h3 style="margin: 0 0 12px 0; color: #f57c00; font-size: 18px;">
                            ⚠️ Dispositivo Midi-Terra não detectado
                        </h3>
                        <p style="margin: 0 0 12px 0; line-height: 1.6;">
                            O sistema não conseguiu detectar o dispositivo <strong>Midi-Terra</strong>. 
                            Siga as etapas abaixo para resolver:
                        </p>
                    </div>

                    ${this.createChecklist([
                        'Verifique se o dispositivo está conectado fisicamente à porta USB',
                        'Confirme se o LED do dispositivo está aceso (indicando energia)',
                        'Feche completamente o Microsoft Edge (se estiver aberto)',
                        'Feche qualquer outro software que possa estar usando MIDI',
                        'Desconecte o cabo USB e reconecte após 5 segundos',
                        'Pressione F5 para recarregar esta página',
                        'Clique em "Permitir" quando o prompt de permissão aparecer'
                    ])}

                    ${isChrome ? this.getChromePermissionSection() : ''}
                    ${this.getConflictSection()}
                `;

            case 'permission-denied':
                return `
                    <div style="${baseStyle} border-left-color: #dc3545;">
                        <h3 style="margin: 0 0 12px 0; color: #c82333; font-size: 18px;">
                            ⛔ Permissão MIDI Negada
                        </h3>
                        <p style="margin: 0 0 12px 0; line-height: 1.6;">
                            Você negou a permissão para acessar dispositivos MIDI. 
                            É necessário conceder permissão para o dispositivo funcionar.
                        </p>
                    </div>

                    ${this.getChromePermissionSection()}
                    
                    <div style="margin-top: 16px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
                        <strong>💡 Dica:</strong> Após ajustar as permissões, recarregue a página (F5) 
                        e clique em "Permitir" no prompt que aparecer.
                    </div>
                `;

            case 'insecure-context':
                return `
                    <div style="${baseStyle} border-left-color: #dc3545;">
                        <h3 style="margin: 0 0 12px 0; color: #c82333; font-size: 18px;">
                            🔒 Contexto Inseguro Detectado
                        </h3>
                        <p style="margin: 0 0 12px 0; line-height: 1.6;">
                            ${browserName} requer que o site seja acessado via <strong>HTTPS</strong> 
                            ou <strong>localhost</strong> para habilitar a Web MIDI API.
                        </p>
                    </div>

                    <h4 style="margin: 20px 0 12px 0;">Soluções:</h4>
                    
                    <div style="${baseStyle} border-left-color: #28a745;">
                        <h5 style="margin: 0 0 8px 0;">Para Desenvolvimento Local:</h5>
                        <ol style="margin: 8px 0 0 20px; line-height: 1.8;">
                            <li>Acesse via: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">http://localhost</code> 
                                ou <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">http://127.0.0.1</code></li>
                            <li>Ou use um servidor HTTPS local (veja script abaixo)</li>
                        </ol>
                    </div>

                    <div style="${baseStyle} border-left-color: #007bff;">
                        <h5 style="margin: 0 0 8px 0;">Para Produção:</h5>
                        <p style="margin: 8px 0 0 0; line-height: 1.6;">
                            Configure um certificado SSL/TLS válido no seu servidor web 
                            (Apache, Nginx, IIS) ou use serviços como Netlify, Vercel, 
                            GitHub Pages que fornecem HTTPS automaticamente.
                        </p>
                    </div>

                    ${this.getHTTPSServerSection()}
                `;

            case 'conflict':
                return `
                    <div style="${baseStyle} border-left-color: #ff6b6b;">
                        <h3 style="margin: 0 0 12px 0; color: #d63031; font-size: 18px;">
                            ⚡ Conflito de Dispositivo Detectado
                        </h3>
                        <p style="margin: 0 0 12px 0; line-height: 1.6;">
                            Outro aplicativo pode estar mantendo acesso exclusivo ao dispositivo MIDI.
                        </p>
                    </div>

                    ${this.getConflictSection()}
                `;

            case 'outdated-chrome':
                return `
                    <div style="${baseStyle} border-left-color: #ff9800;">
                        <h3 style="margin: 0 0 12px 0; color: #e65100; font-size: 18px;">
                            📦 Chrome Desatualizado
                        </h3>
                        <p style="margin: 0 0 12px 0; line-height: 1.6;">
                            Seu Chrome pode estar desatualizado. Recomenda-se atualizar para 
                            garantir suporte completo à Web MIDI API.
                        </p>
                    </div>

                    ${this.createChecklist([
                        'Acesse: chrome://settings/help',
                        'Clique em "Verificar atualizações"',
                        'Aguarde o download e instalação',
                        'Reinicie o Chrome quando solicitado',
                        'Retorne a esta página após reiniciar'
                    ])}
                `;

            default:
                return `
                    <div style="${baseStyle} border-left-color: #6c757d;">
                        <h3 style="margin: 0 0 12px 0; color: #495057; font-size: 18px;">
                            🔍 Diagnóstico Geral
                        </h3>
                        <p style="margin: 0;">
                            Use o console do navegador (F12) para mais informações de diagnóstico.
                        </p>
                    </div>
                `;
        }
    }

    /**
     * Cria uma lista de verificação com checkboxes
     * @param {string[]} items - Itens da lista
     * @returns {string} HTML da checklist
     */
    createChecklist(items) {
        const checklistItems = items.map((item, index) => `
            <label style="
                display: flex;
                align-items: flex-start;
                padding: 12px;
                margin: 8px 0;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
                border: 1px solid #dee2e6;
            " onmouseover="this.style.background='#f8f9fa'" 
               onmouseout="this.style.background='white'">
                <input type="checkbox" id="checklist-${index}" style="
                    margin: 4px 12px 0 0;
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                ">
                <span style="flex: 1; line-height: 1.6;">${item}</span>
            </label>
        `).join('');

        return `
            <div style="margin: 20px 0;">
                <h4 style="margin: 0 0 12px 0;">📋 Lista de Verificação:</h4>
                <div class="checklist">${checklistItems}</div>
            </div>
        `;
    }

    /**
     * Retorna seção com instruções de permissão do Chrome
     * @returns {string} HTML da seção
     */
    getChromePermissionSection() {
        return `
            <div style="
                margin: 20px 0;
                padding: 16px;
                background: #fff3cd;
                border-radius: 8px;
                border: 1px solid #ffc107;
            ">
                <h4 style="margin: 0 0 12px 0; color: #856404;">
                    🔐 Ajustar Permissões MIDI no Chrome
                </h4>
                <ol style="margin: 12px 0 0 20px; line-height: 1.8;">
                    <li>Copie este endereço: <code style="
                        background: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 13px;
                        user-select: all;
                    ">chrome://settings/content/midiDevices</code></li>
                    <li>Cole na barra de endereços do Chrome e pressione Enter</li>
                    <li>Verifique se este site está em "Bloquear"</li>
                    <li>Mova para "Permitir" ou adicione manualmente</li>
                    <li>Recarregue esta página (F5)</li>
                </ol>
            </div>
        `;
    }

    /**
     * Retorna seção sobre conflitos de dispositivos
     * @returns {string} HTML da seção
     */
    getConflictSection() {
        return `
            <div style="
                margin: 20px 0;
                padding: 16px;
                background: #ffe5e5;
                border-radius: 8px;
                border: 1px solid #ff6b6b;
            ">
                <h4 style="margin: 0 0 12px 0; color: #c92a2a;">
                    ⚡ Resolver Conflitos de Dispositivo
                </h4>
                <p style="margin: 0 0 12px 0; line-height: 1.6;">
                    Apenas um aplicativo pode ter acesso ao dispositivo MIDI por vez:
                </p>
                <ul style="margin: 8px 0 0 20px; line-height: 1.8;">
                    <li><strong>Feche o Microsoft Edge</strong> completamente (não apenas minimize)</li>
                    <li>Feche DAWs ou softwares de música (Ableton, FL Studio, etc.)</li>
                    <li>Feche outros navegadores que possam estar usando MIDI</li>
                    <li>Desconecte e reconecte o cabo USB do dispositivo</li>
                    <li>Aguarde 5 segundos antes de reconectar</li>
                </ul>
            </div>
        `;
    }

    /**
     * Retorna seção com script para servidor HTTPS local
     * @returns {string} HTML da seção
     */
    getHTTPSServerSection() {
        return `
            <div style="
                margin: 20px 0;
                padding: 16px;
                background: #e7f3ff;
                border-radius: 8px;
                border: 1px solid #2196f3;
            ">
                <h4 style="margin: 0 0 12px 0; color: #0d47a1;">
                    🚀 Script para Servidor HTTPS Local
                </h4>
                <p style="margin: 0 0 12px 0; line-height: 1.6;">
                    Execute estes comandos no PowerShell/Terminal na pasta do projeto:
                </p>
                <pre style="
                    background: #263238;
                    color: #aed581;
                    padding: 16px;
                    border-radius: 6px;
                    overflow-x: auto;
                    font-size: 13px;
                    line-height: 1.6;
                "><code># Instalar mkcert (apenas uma vez)
choco install mkcert
# ou: scoop install mkcert

# Gerar certificados locais
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Iniciar servidor HTTPS
npx http-server -S -C localhost+2.pem -K localhost+2-key.pem -p 8443</code></pre>
                <p style="margin: 12px 0 0 0; line-height: 1.6;">
                    Após iniciar, acesse: <code style="background: white; padding: 2px 6px; border-radius: 3px;">https://localhost:8443</code>
                </p>
            </div>
        `;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MIDITroubleshootingGuide = MIDITroubleshootingGuide;
}
