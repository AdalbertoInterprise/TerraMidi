/**
 * Legal Modals - Avisos e Políticas Legais
 * Compatível com LGPD, Marco Civil e GDPR
 * @version 1.0.0.0.0
 * 
 * Exibe modais com informações legais obrigatórias:
 * - Política de Privacidade (LGPD)
 * - Termos de Serviço
 * - Política de Cookies
 * - Declaração de Acessibilidade
 */

class LegalModals {
    constructor() {
        this.currentModal = null;
    }

    /**
     * Mostra modal genérico
     */
    showModal(title, content) {
        // Remover modal anterior se existir
        const existingModal = document.getElementById('legal-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Criar overlay
        const overlay = document.createElement('div');
        overlay.id = 'legal-modal-overlay';
        overlay.className = 'legal-modal-overlay';

        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'legal-modal';

        // Criar header
        const header = document.createElement('div');
        header.className = 'legal-modal-header';
        header.innerHTML = `
            <h2>${title}</h2>
            <button class="legal-modal-close" onclick="document.getElementById('legal-modal-overlay').remove()">✕</button>
        `;

        // Criar conteúdo
        const contentDiv = document.createElement('div');
        contentDiv.className = 'legal-modal-content';
        contentDiv.innerHTML = content;

        // Criar footer com botão de fechar
        const footer = document.createElement('div');
        footer.className = 'legal-modal-footer';
        footer.innerHTML = `
            <button onclick="document.getElementById('legal-modal-overlay').remove()" class="btn-legal-close">
                ✓ Entendido
            </button>
        `;

        // Montar modal
        modal.appendChild(header);
        modal.appendChild(contentDiv);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        // Adicionar ao body
        document.body.appendChild(overlay);

        // Fechar ao clicar no overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Fechar com ESC
        const closeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', closeHandler);
            }
        };
        document.addEventListener('keydown', closeHandler);

        this.currentModal = overlay;
    }

    /**
     * Mostra Política de Privacidade (LGPD)
     */
    showPrivacyPolicy() {
        const content = `
            <h3>📋 Política de Privacidade</h3>
            <p><strong>Última atualização: 21 de outubro de 2025</strong></p>

            <h4 style="background: rgba(128, 255, 128, 0.1); padding: 12px; border-left: 4px solid #80ff80; border-radius: 4px;">
                ⚡ PRIVACIDADE 100% LOCAL - Nenhum dado sai da sua máquina!
            </h4>
            <ul style="background: rgba(128, 255, 128, 0.05); padding: 12px; border-radius: 4px;">
                <li><strong>✅ TerraMidi é ferramenta ONLINE-FIRST com modo OFFLINE-COMPLETE</strong></li>
                <li><strong>✅ TODOS seus dados armazenados EXCLUSIVAMENTE na sua máquina</strong></li>
                <li><strong>✅ NENHUM servidor remoto armazena dados</strong></li>
                <li><strong>✅ Você tem controle total de cada byte</strong></li>
            </ul>

            <h4>1. Conformidade com LGPD</h4>
            <p>
                TerraMidi está em conformidade total com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> 
                - Lei nº 13.709/2018. Como ferramenta 100% local, sua privacidade é garantida pelo próprio navegador.
            </p>

            <h4>2. Como Funciona a Privacidade</h4>
            <p><strong>Fluxo de Dados:</strong></p>
            <ol>
                <li>Você acessa TerraMidi.com → Baixa aplicativo (500KB)</li>
                <li>Todos dados armazenados LOCALMENTE via 3 camadas:
                    <ul>
                        <li>🔐 <strong>OPFS</strong> (Origin Private File System) - Encriptado pelo navegador</li>
                        <li>📦 <strong>IndexedDB</strong> - Banco de dados local isolado por origem</li>
                        <li>💾 <strong>Filesystem API</strong> (Desktop) - Sua pasta de escolha</li>
                    </ul>
                </li>
                <li>NENHUM dado volta para internet (exceto novo acesso ao site)</li>
            </ol>

            <h4>3. O que NÃO fazemos</h4>
            <ul>
                <li>❌ Não armazenamos dados em servidores</li>
                <li>❌ Não enviamos telemetria ou analytics</li>
                <li>❌ Não rastreamos sua localização</li>
                <li>❌ Não acessamos câmera, microfone ou contatos</li>
                <li>❌ Não usamos cookies de rastreamento</li>
                <li>❌ Não compartilhamos dados com terceiros (zero exceções)</li>
                <li>❌ Não fazemos profiling ou publicidade direcionada</li>
            </ul>

            <h4>4. Seus Direitos (LGPD)</h4>
            <ul>
                <li>📋 <strong>Acessar:</strong> Inspecionar dados via DevTools do navegador</li>
                <li>✏️ <strong>Corrigir:</strong> Editar qualquer preferência</li>
                <li>🗑️ <strong>Deletar:</strong> Limpar cache com 1 clique</li>
                <li>📤 <strong>Portabilidade:</strong> Exportar dados via aplicativo</li>
                <li>🚫 <strong>Revogar:</strong> Desinstalar e remover tudo</li>
            </ul>

            <h4>5. Contato e Suporte</h4>
            <p>Para dúvidas sobre privacidade ou LGPD:</p>
            <p>📧 <strong>terra@terraeletronica.com.br</strong></p>
            <p>💬 WhatsApp: <strong>+55 12 99165-3176</strong></p>
            <p>⏱️ Resposta em até 24 horas</p>
        `;

        this.showModal('📋 Política de Privacidade (LGPD)', content);
    }

    /**
     * Mostra Termos de Serviço
     */
    showTermsOfService() {
        const content = `
            <h3>📜 Termos de Serviço</h3>
            <p><strong>Última atualização: 21 de outubro de 2025</strong></p>

            <h4 style="background: rgba(102, 126, 234, 0.1); padding: 12px; border-left: 4px solid #667eea; border-radius: 4px;">
                O que é TerraMidi?
            </h4>
            <p>
                <strong>TerraMidi é uma FERRAMENTA ONLINE de musicoterapia educacional.</strong><br>
                Não é serviço com servidor ou conta de usuário.<br>
                Você acessa via navegador e todos dados ficam no seu computador.
            </p>

            <h4>1. Como TerraMidi Funciona</h4>
            <ul>
                <li>📲 <strong>Acesso Online:</strong> Via navegador (Chrome, Firefox, Safari, Edge)</li>
                <li>💾 <strong>Dados Locais:</strong> Tudo armazenado na sua máquina (OPFS, IndexedDB, Filesystem)</li>
                <li>⚡ <strong>Modo Offline:</strong> Após primeiro acesso, funciona sem internet</li>
                <li>🔄 <strong>Zero Sincronização:</strong> Nenhum servidor envolvido</li>
            </ul>

            <h4>2. Uso Aceitável</h4>
            <p>Você concorda em usar TerraMidi apenas para fins legítimos e educacionais, e não:</p>
            <ul>
                <li>❌ Violar leis brasileiras (LGPD, Marco Civil, Lei de Acessibilidade)</li>
                <li>❌ Injetar código malicioso ou ataques</li>
                <li>❌ Tentar acesso não autorizado a sistemas</li>
                <li>❌ Distribuir conteúdo protegido por copyright</li>
            </ul>

            <h4>3. Responsabilidades do Usuário</h4>
            <ul>
                <li>⚙️ Manter seu navegador atualizado</li>
                <li>📱 Proteger seu dispositivo</li>
                <li>💾 Fazer backup de dados importantes</li>
            </ul>

            <h4 style="background: rgba(255, 152, 0, 0.1); padding: 12px; border-left: 4px solid #ff9800; border-radius: 4px;">
                ⚠️ Isenção de Responsabilidade Médica
            </h4>
            <ul style="background: rgba(255, 152, 0, 0.05); padding: 12px; border-radius: 4px;">
                <li>❌ TerraMidi <strong>NÃO fornece diagnósticos médicos</strong></li>
                <li>❌ TerraMidi <strong>NÃO substitui consulta com profissional</strong></li>
                <li>❌ TerraMidi <strong>NÃO é tratamento</strong></li>
                <li>✅ TerraMidi é apenas <strong>ferramenta educacional</strong></li>
            </ul>
            <p><strong>Se tem problemas de saúde, consulte profissional qualificado.</strong></p>

            <h4>4. Propriedade Intelectual</h4>
            <ul>
                <li>🎵 <strong>SoundFonts:</strong> Licenciados conforme suas licenças (Open Source)</li>
                <li>💻 <strong>Código:</strong> Disponível em GitHub (AdalbertoBI/TerraMidi)</li>
                <li>📄 <strong>Conteúdo:</strong> © 2025 Terra Eletrônica</li>
            </ul>

            <h4>5. Dados Locais e Backup</h4>
            <ul>
                <li>💾 <strong>Propriedade:</strong> Você possui seus dados (armazenados localmente)</li>
                <li>🗑️ <strong>Controle:</strong> Você pode deletar tudo com 1 clique</li>
                <li>🚨 <strong>Perda:</strong> Terra Eletrônica não é responsável por perda acidental</li>
            </ul>

            <h4>6. Contato e Suporte</h4>
            <p>📧 <strong>terra@terraeletronica.com.br</strong></p>
            <p>💬 WhatsApp: <strong>+55 12 99165-3176</strong></p>
        `;

        this.showModal('📜 Termos de Serviço', content);
    }

    /**
     * Mostra Política de Cookies
     */
    showCookiePolicy() {
        const content = `
            <h3>🍪 Política de Cookies & Armazenamento</h3>
            <p><strong>Última atualização: 21 de outubro de 2025</strong></p>

            <h4 style="background: rgba(128, 255, 128, 0.1); padding: 12px; border-left: 4px solid #80ff80; border-radius: 4px;">
                Resposta Curta: NÓS NÃO RASTREAMOS
            </h4>
            <ul style="background: rgba(128, 255, 128, 0.05); padding: 12px; border-radius: 4px;">
                <li>✅ Zero cookies de rastreamento</li>
                <li>✅ Zero analytics externo</li>
                <li>✅ Zero publicidade</li>
                <li>✅ Zero perfis de usuário</li>
            </ul>

            <h4>1. Cookies que USAMOS (apenas funcionais)</h4>
            <ul>
                <li>🎨 <strong>Tema:</strong> Modo claro/escuro (local)</li>
                <li>🌐 <strong>Idioma:</strong> Idioma preferido (local)</li>
                <li>🔐 <strong>Segurança:</strong> Token CSRF local</li>
            </ul>
            <p><strong>Todos 100% locais. Nenhum enviado para servidor.</strong></p>

            <h4>2. Cookies que NÃO USAMOS</h4>
            <ul>
                <li>❌ <strong>Rastreamento:</strong> Nenhum entre sites</li>
                <li>❌ <strong>Analytics:</strong> Google Analytics, Hotjar, etc. (NÃO USAMOS)</li>
                <li>❌ <strong>Publicidade:</strong> Facebook Pixel, Google Ads (NÃO USAMOS)</li>
                <li>❌ <strong>Profiling:</strong> Sem construção de perfil</li>
                <li>❌ <strong>Terceiros:</strong> Nenhum cookie externo</li>
            </ul>

            <h4>3. localStorage e sessionStorage (Armazenamento Local)</h4>
            <p>Usamos armazenamento local EXCLUSIVAMENTE para dados funcionais:</p>
            <ul>
                <li>📊 Sessão atual (não envia para servidor)</li>
                <li>🎵 Instrumentos baixados</li>
                <li>🔧 Configurações (volume, velocidade, teclado)</li>
                <li>📈 Histórico local (não é analytics)</li>
            </ul>
            <p><strong>Tudo armazenado na sua máquina. Você tem controle total.</strong></p>

            <h4>4. IndexedDB e Cache Storage</h4>
            <ul>
                <li>📦 <strong>IndexedDB:</strong> Banco de dados local (SoundFonts, melodies)</li>
                <li>💾 <strong>Cache Storage:</strong> Service Worker (arquivos do app)</li>
                <li>🔐 <strong>OPFS:</strong> Sistema privado de arquivos (encriptado)</li>
            </ul>
            <p><strong>Tudo 100% local e isolado pelo navegador.</strong></p>

            <h4>5. Seu Controle Completo</h4>
            <p>Você pode limpar TUDO facilmente:</p>
            <ul>
                <li>Chrome: ⚙️ Configurações → Privacidade → Limpar dados de navegação</li>
                <li>Firefox: Menu → Configurações → Privacidade → Cookies e dados</li>
                <li>Safari: Preferências → Privacidade → Gerenciar dados</li>
                <li>Edge: Configurações → Privacidade → Escolher o que limpar</li>
            </ul>

            <h4>6. Transparência Total</h4>
            <p>Você pode inspecionar o que armazenamos:</p>
            <ol>
                <li>Abra F12 (DevTools) no navegador</li>
                <li>Vá para "Application" ou "Storage"</li>
                <li>Veja "Cookies", "localStorage", "IndexedDB", "Cache Storage"</li>
                <li>Você pode deletar cada item individualmente</li>
            </ol>

            <h4>7. Conformidade Legal</h4>
            <ul>
                <li>✅ <strong>LGPD:</strong> Todas cookies são funcionais (consentimento automático)</li>
                <li>✅ <strong>GDPR:</strong> Sem rastreamento ou profiling</li>
                <li>✅ <strong>ePrivacy:</strong> Apenas cookies essenciais</li>
            </ul>

            <h4>8. Dúvidas?</h4>
            <p>📧 <strong>terra@terraeletronica.com.br</strong></p>
            <p>💬 WhatsApp: <strong>+55 12 99165-3176</strong></p>
        `;

        this.showModal('🍪 Política de Cookies & Armazenamento', content);
    }

    /**
     * Mostra Declaração de Acessibilidade (Lei 13.146/2015)
     */
    showAccessibilityStatement() {
        const content = `
            <h3>♿ Declaração de Acessibilidade</h3>
            <p><strong>Última atualização: 21 de outubro de 2025</strong></p>

            <h4>1. Conformidade Legal</h4>
            <p>
                TerraMidi está em conformidade com a <strong>Lei Brasileira de Inclusão (Lei nº 13.146/2015)</strong> 
                e segue os padrões WCAG 2.1 (Web Content Accessibility Guidelines).
            </p>

            <h4>2. Recursos de Acessibilidade</h4>

            <h5>🎹 Interface Musical</h5>
            <ul>
                <li>⌨️ <strong>Teclado Completo:</strong> Todas as funções acessíveis por teclado</li>
                <li>🎵 <strong>Nomes Descritivos:</strong> Todos os botões têm labels claros</li>
                <li>🎨 <strong>Contraste Alto:</strong> Textos com contraste >= 4.5:1</li>
                <li>🔤 <strong>Fontes Legíveis:</strong> Tamanho mínimo de 14px</li>
            </ul>

            <h5>👂 Leitores de Tela (Compatíveis)</h5>
            <ul>
                <li>♿ NVDA (Windows)</li>
                <li>♿ JAWS (Windows)</li>
                <li>♿ VoiceOver (macOS/iOS)</li>
                <li>♿ TalkBack (Android)</li>
            </ul>

            <h5>⌨️ Navegação por Teclado</h5>
            <ul>
                <li><strong>Tab:</strong> Navegar entre elementos</li>
                <li><strong>Shift+Tab:</strong> Navegar para trás</li>
                <li><strong>Enter:</strong> Ativar botões/links</li>
                <li><strong>Espaço:</strong> Ativar/alternar</li>
                <li><strong>Setas:</strong> Navegar dentro de grupos</li>
            </ul>

            <h4>3. Recursos de Acessibilidade Auditiva</h4>
            <ul>
                <li>🔊 <strong>Controle de Volume:</strong> Slider visível</li>
                <li>📊 <strong>Visualizador de Frequência:</strong> Feedback visual para sons</li>
                <li>⏱️ <strong>Duração Visível:</strong> Mostrada em números</li>
            </ul>

            <h4>4. Recursos de Acessibilidade Visual</h4>
            <ul>
                <li>🌙 <strong>Modo Escuro/Claro:</strong> Toggle fácil</li>
                <li>🔍 <strong>Zoom do Navegador:</strong> 100-200% suportado</li>
                <li>⚫ <strong>Alto Contraste:</strong> Cores cuidadosamente selecionadas</li>
                <li>🎨 <strong>Sem Dependência de Cor:</strong> Significado transmitido por símbolos</li>
            </ul>

            <h4>5. Recursos de Mobilidade</h4>
            <ul>
                <li>🖱️ <strong>Mouse:</strong> Totalmente suportado</li>
                <li>⌨️ <strong>Teclado:</strong> Totalmente suportado</li>
                <li>👆 <strong>Toque:</strong> Áreas tocáveis >= 44x44px</li>
                <li>🎮 <strong>MIDI Controllers:</strong> Suporte para gamepad</li>
            </ul>

            <h4>6. Melhorias Futuras</h4>
            <ul>
                <li>📍 Subtítulos para conteúdo de vídeo</li>
                <li>🎯 Transcrições de áudio para guias</li>
                <li>📖 Suporte para Braille-ready format</li>
                <li>🌐 Suporte multilíngue expandido</li>
            </ul>

            <h4>7. Reportar Problemas de Acessibilidade</h4>
            <p>Se você encontrou um problema de acessibilidade, por favor nos informe:</p>
            <p>📧 <strong>terra@terraeletronica.com.br</strong></p>
            <p>💬 WhatsApp: <strong>+55 12 99165-3176</strong></p>
            <p>⏱️ Resposta em até 5 dias úteis</p>
        `;

        this.showModal('♿ Declaração de Acessibilidade', content);
    }
}

// Criar instância global
const legalModals = new LegalModals();

// Funções globais para chamadas no HTML
function showPrivacyPolicy() {
    legalModals.showPrivacyPolicy();
}

function showTermsOfService() {
    legalModals.showTermsOfService();
}

function showCookiePolicy() {
    legalModals.showCookiePolicy();
}

function showAccessibilityStatement() {
    legalModals.showAccessibilityStatement();
}
