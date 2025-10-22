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

            <h4>1. Conformidade com LGPD</h4>
            <p>
                TerraMidi está em conformidade total com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> 
                - Lei nº 13.709/2018. Proteção de seus dados pessoais é nossa prioridade máxima.
            </p>

            <h4>2. Dados Coletados</h4>
            <p>Coletamos apenas dados essenciais:</p>
            <ul>
                <li>📱 <strong>Dados de Navegação:</strong> URL acessada, tipo de navegador, idioma</li>
                <li>🎵 <strong>Dados de Uso:</strong> Instrumentos usados, sessões de prática</li>
                <li>💾 <strong>Dados Armazenados Localmente:</strong> Preferências, melodies salvas (tudo em seu dispositivo)</li>
                <li>❌ <strong>Dados NÃO Coletados:</strong> Locação, câmera, microfone, contatos, calendário</li>
            </ul>

            <h4>3. Armazenamento e Segurança</h4>
            <p>
                <strong>✅ 95% dos dados são armazenados localmente em seu dispositivo</strong> através de:
            </p>
            <ul>
                <li>🔐 <strong>OPFS (Origin Private File System)</strong> - Encriptado pelo navegador</li>
                <li>📦 <strong>IndexedDB</strong> - Isolado por origin, sem acesso de terceiros</li>
                <li>💾 <strong>Cache Storage</strong> - Controlado apenas pelo navegador</li>
            </ul>
            <p>
                <strong>✅ Nenhum dado pessoal é enviado para servidores externos</strong> sem seu consentimento explícito.
            </p>

            <h4>4. Cookies</h4>
            <p>
                TerraMidi <strong>não usa cookies de rastreamento</strong>. Utilizamos apenas:
            </p>
            <ul>
                <li>📍 <strong>Cookies Funcionais:</strong> Preferências de idioma, tema</li>
                <li>🎵 <strong>localStorage:</strong> Dados de aplicativo essenciais</li>
            </ul>

            <h4>5. Compartilhamento de Dados</h4>
            <p>
                <strong>❌ Seus dados NUNCA são compartilhados com terceiros</strong>, exceto quando:
            </p>
            <ul>
                <li>✅ Legalmente obrigado (com aviso prévio)</li>
                <li>✅ Você forneceu consentimento explícito</li>
            </ul>

            <h4>6. Seus Direitos (LGPD)</h4>
            <p>Você tem direito a:</p>
            <ul>
                <li>📋 <strong>Acessar</strong> - Solicitar seus dados</li>
                <li>✏️ <strong>Corrigir</strong> - Atualizar informações incorretas</li>
                <li>🗑️ <strong>Deletar</strong> - Remover dados (direito ao esquecimento)</li>
                <li>📤 <strong>Portabilidade</strong> - Exportar seus dados</li>
                <li>🚫 <strong>Revogar</strong> - Retirar consentimento</li>
            </ul>

            <h4>7. Retenção de Dados</h4>
            <ul>
                <li>📱 <strong>Dados de Uso:</strong> Até 30 dias</li>
                <li>🎵 <strong>Melodies Salvas:</strong> Armazenadas localmente indefinidamente (você controla)</li>
                <li>🗑️ <strong>Dados Deletados:</strong> Removidos imediatamente de todos os sistemas</li>
            </ul>

            <h4>8. Segurança</h4>
            <ul>
                <li>🔒 <strong>HTTPS Obrigatório</strong> para todas as conexões</li>
                <li>🔐 <strong>Encriptação End-to-End</strong> para dados sensíveis</li>
                <li>🛡️ <strong>Isolamento de Origem</strong> pelo navegador</li>
                <li>👁️ <strong>Sem Rastreamento</strong> entre sites</li>
            </ul>

            <h4>9. Contato</h4>
            <p>
                Para dúvidas sobre privacidade ou exercer seus direitos LGPD, entre em contato:
            </p>
            <p>📧 <strong>privacy@terraaudio.com.br</strong></p>
            <p>⏱️ <strong>Resposta em até 10 dias úteis</strong></p>
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

            <h4>1. Aceitação dos Termos</h4>
            <p>
                Ao acessar TerraMidi, você concorda com estes termos. Se não concordar, não use o serviço.
            </p>

            <h4>2. Uso Aceitável</h4>
            <p>Você concorda em usar TerraMidi apenas para fins legítimos e não:</p>
            <ul>
                <li>❌ Violar leis aplicáveis</li>
                <li>❌ Prejudicar a plataforma ou outros usuários</li>
                <li>❌ Tentar obter acesso não autorizado</li>
                <li>❌ Reproduzir ou distribuir conteúdo sem permissão</li>
            </ul>

            <h4>3. Responsabilidades do Usuário</h4>
            <ul>
                <li>🔐 Você é responsável por manter sua senha segura</li>
                <li>👤 Você é responsável por todas as atividades em sua conta</li>
                <li>⚠️ Você se responsabiliza por seu uso do serviço</li>
            </ul>

            <h4>4. Isenção de Responsabilidade Médica</h4>
            <p>
                <strong>⚠️ IMPORTANTE:</strong> TerraMidi é <strong>exclusivamente educacional</strong>. 
                <strong>Não fornece diagnósticos, tratamento ou conselho médico</strong>.
            </p>
            <p>
                Para questões de saúde, consulte sempre um profissional de saúde qualificado.
            </p>

            <h4>5. Limitação de Responsabilidade</h4>
            <p>
                TerraMidi é fornecido "como está". Não garantimos:
            </p>
            <ul>
                <li>✗ Disponibilidade contínua (24/7)</li>
                <li>✗ Ausência de erros ou bugs</li>
                <li>✗ Compatibilidade com todos os dispositivos</li>
                <li>✗ Resultados terapêuticos específicos</li>
            </ul>

            <h4>6. Propriedade Intelectual</h4>
            <ul>
                <li>🎵 Soundfonts: Licenciados de acordo com suas respectivas licenças</li>
                <li>💻 Código: Licenciado sob termos específicos do repositório</li>
                <li>📄 Conteúdo: © 2025 Terra Eletrônica</li>
            </ul>

            <h4>7. Suspensão de Conta</h4>
            <p>
                Terra Eletrônica pode suspender sua conta se você violar estes termos ou as políticas de uso aceitável.
            </p>

            <h4>8. Modificações</h4>
            <p>
                Reservamos o direito de modificar estes termos a qualquer momento. Mudanças significativas 
                serão comunicadas com antecedência.
            </p>

            <h4>9. Jurisdição</h4>
            <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil.
            </p>

            <h4>10. Contato</h4>
            <p>📧 <strong>legal@terraaudio.com.br</strong></p>
        `;

        this.showModal('📜 Termos de Serviço', content);
    }

    /**
     * Mostra Política de Cookies
     */
    showCookiePolicy() {
        const content = `
            <h3>🍪 Política de Cookies</h3>
            <p><strong>Última atualização: 21 de outubro de 2025</strong></p>

            <h4>1. O que são Cookies?</h4>
            <p>
                Cookies são pequenos arquivos de texto armazenados em seu dispositivo que ajudam 
                a melhorar sua experiência.
            </p>

            <h4>2. Tipos de Cookies que Usamos</h4>

            <h5>🔧 Cookies Essenciais/Funcionais</h5>
            <ul>
                <li>🎨 <strong>Preferências de Tema:</strong> Modo claro/escuro</li>
                <li>🌐 <strong>Idioma:</strong> Idioma preferido da interface</li>
                <li>🔐 <strong>Segurança:</strong> Proteção contra CSRF</li>
            </ul>

            <h5>❌ Cookies NÃO Usados</h5>
            <ul>
                <li>❌ <strong>Rastreamento:</strong> Nenhum cookie de rastreamento</li>
                <li>❌ <strong>Analytics:</strong> Sem cookies de terceiros para analytics</li>
                <li>❌ <strong>Publicidade:</strong> Nenhum cookie de publicidade</li>
                <li>❌ <strong>Perfil:</strong> Sem construção de perfil de usuário</li>
            </ul>

            <h4>3. localStorage e sessionStorage</h4>
            <p>
                Além de cookies, usamos armazenamento local do navegador para:
            </p>
            <ul>
                <li>📊 <strong>Dados de Prática:</strong> Seu progresso em sessões</li>
                <li>🎵 <strong>Melodies:</strong> Sequências musicais que você cria</li>
                <li>🔧 <strong>Configurações:</strong> Ajustes de volume, velocidade</li>
            </ul>

            <h4>4. Seu Controle</h4>
            <p>Você pode controlar cookies em suas configurações de navegador:</p>
            <ul>
                <li>📋 Chrome: ⚙️ Configurações → Privacidade → Cookies e outros dados do site</li>
                <li>📋 Firefox: ≡ Menu → Configurações → Privacidade e Segurança</li>
                <li>📋 Safari: ⚙️ Preferências → Privacidade → Gerenciar dados do site</li>
            </ul>

            <h4>5. Serviços de Terceiros</h4>
            <p>
                <strong>✅ TerraMidi não integra serviços de terceiros que usem cookies de rastreamento</strong>
            </p>
            <p>
                Se no futuro integrarmos qualquer serviço de terceiros, você será notificado.
            </p>

            <h4>6. Consentimento</h4>
            <p>
                Usamos apenas cookies essenciais sem necessidade de consentimento prévio. 
                Cookies adicionais (se houver) requerem seu consentimento explícito.
            </p>

            <h4>7. Contato</h4>
            <p>📧 <strong>privacy@terraaudio.com.br</strong></p>
        `;

        this.showModal('🍪 Política de Cookies', content);
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

            <h5>👂 Compatibilidade com Leitores de Tela</h5>
            <ul>
                <li>♿ NVDA (Windows) - Suportado</li>
                <li>♿ JAWS (Windows) - Suportado</li>
                <li>♿ VoiceOver (macOS/iOS) - Suportado</li>
                <li>♿ TalkBack (Android) - Suportado</li>
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
                <li>🎮 <strong>Gamepad:</strong> Suporte para MIDI controllers</li>
            </ul>

            <h4>6. Problemas Conhecidos e Soluções</h4>
            <ul>
                <li>🎵 <strong>Soundfonts Web Audio:</strong> Compatível com leitores de tela via labels</li>
                <li>🔄 <strong>Atualizações Dinâmicas:</strong> Uso de ARIA live regions</li>
                <li>⚙️ <strong>Controles Complexos:</strong> Instruções e atalhos documentados</li>
            </ul>

            <h4>7. Melhorias Futuras</h4>
            <ul>
                <li>📍 Subtítulos para todo conteúdo de vídeo</li>
                <li>🎯 Transcrições de áudio para guias</li>
                <li>📖 Melhor documentação em Braille-ready format</li>
                <li>🌐 Suporte multilíngue expandido</li>
            </ul>

            <h4>8. Feedback e Reportar Problemas</h4>
            <p>
                Se você encontrou um problema de acessibilidade, por favor nos informe:
            </p>
            <p>📧 <strong>accessibility@terraaudio.com.br</strong></p>
            <p>⏱️ <strong>Resposta em até 5 dias úteis</strong></p>

            <h4>9. Recursos Adicionais</h4>
            <ul>
                <li>🔗 <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener">WCAG 2.1 Guidelines</a></li>
                <li>🔗 <a href="https://www.acessibilidade.gov.br/" target="_blank" rel="noopener">eMAC - Modelo de Acessibilidade</a></li>
                <li>🔗 <a href="https://www.rnp.br/rnp-no-instagram" target="_blank" rel="noopener">Acessibilidade Brasil</a></li>
            </ul>
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
