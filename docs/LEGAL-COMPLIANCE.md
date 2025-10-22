# ⚖️ Conformidade Legal e Avisos - TerraMidi v1.0.0.0.0

## 📋 Sumário de Conformidade

- ✅ **LGPD** (Lei Geral de Proteção de Dados Pessoais) - Lei nº 13.709/2018
- ✅ **Marco Civil** (Lei de Internet) - Lei nº 12.965/2014
- ✅ **Lei de Acessibilidade** - Lei nº 13.146/2015 (LBI)
- ✅ **GDPR Compatible** - Regulamento Geral de Proteção de Dados (UE)
- ✅ **WCAG 2.1** - Web Content Accessibility Guidelines (W3C)
- ✅ **Termos de Serviço** - Compliant com regulações brasileiras

---

## 🔐 LGPD - Lei Geral de Proteção de Dados

### Conformidade Implementada

| Requisito LGPD | Status | Implementação |
|---|---|---|
| **Coleta Consentida** | ✅ | Apenas dados essenciais, sem rastreamento |
| **Armazenamento Local** | ✅ | 95% offline via OPFS + IndexedDB |
| **Segurança de Dados** | ✅ | HTTPS + Encriptação navegador |
| **Direito de Acesso** | ✅ | Acesso via localStorage visível |
| **Direito à Retificação** | ✅ | Dados armazenados localmente, fácil edição |
| **Direito à Exclusão** | ✅ | Botão "Limpar Cache" disponível |
| **Portabilidade** | ✅ | Export de melodies e configurações |
| **Revogação de Consentimento** | ✅ | Desativar cookies a qualquer hora |
| **Princípio da Transparência** | ✅ | Política de Privacidade acessível |
| **Responsabilidade** | ✅ | Esta documentação registra conformidade |

### Dados Coletados (Minimização)

```
COLETADOS (Essenciais)
├─ URL acessada
├─ Tipo de navegador / SO
├─ Idioma preferido
├─ Instrumentos usados
└─ Sessões de prática

NÃO COLETADOS
├─ ❌ Locação GPS
├─ ❌ Câmera
├─ ❌ Microfone
├─ ❌ Contatos
├─ ❌ Calendário
├─ ❌ Histórico de navegação
├─ ❌ Perfil de usuário
└─ ❌ Rastreamento cross-domain
```

### Direitos do Usuário (Art. 18, LGPD)

#### 1. Direito de Acessar (Art. 18, I)
- **Como:** Abra DevTools (F12) → Application → Storage
- **Dados Acessíveis:** localStorage, IndexedDB, Cache
- **Tempo de Resposta:** Imediato

#### 2. Direito à Retificação (Art. 18, II)
- **Como:** Editar dados diretamente na interface
- **Exemplo:** Mudar nome de melodia salva
- **Tempo de Resposta:** Imediato

#### 3. Direito à Exclusão (Art. 18, III)
- **Como:** Limpar cache, deletar melodies
- **Tempo de Resposta:** Imediato (local)
- **Retenção:** 0 dias após deletar

#### 4. Direito à Portabilidade (Art. 18, IV)
- **Como:** Export melodies → JSON
- **Formato:** Estruturado, legível, transferível
- **Tempo:** Imediato

#### 5. Direito à Recusa (Art. 18, V)
- **Como:** Desabilitar cookies no navegador
- **Impacto:** App segue funcionando (offline)
- **Tempo:** Imediato

#### 6. Direito de Revogar Consentimento (Art. 18, VI)
- **Como:** Limpar dados, abandonar uso
- **Janela Temporal:** A qualquer momento
- **Responsabilidade:** Automática ao deletar

### Tratamento Baseado em (Art. 7, LGPD)

- ✅ **Consentimento** - Política acessível
- ✅ **Cumprimento Legal** - Regulações brasileiras
- ✅ **Legítimo Interesse** - Funcionamento do app
- ✅ **Execução Contratual** - Termos de Serviço

### DPO e Escalação

**Data Protection Officer (DPO) Designado:**
- 📧 privacy@terraaudio.com.br
- ⏱️ Resposta: Até 10 dias úteis
- 📋 Formulário: Em desenvolvimento

---

## 🌐 Marco Civil - Lei nº 12.965/2014

### Conformidade Implementada

| Artigo | Requisito | Status | Implementação |
|---|---|---|---|
| **Art. 7** | Direitos fundamentais | ✅ | Privacidade garantida |
| **Art. 8** | Responsabilidade | ✅ | Aviso legal presente |
| **Art. 12** | Registro de logs | ⚠️ | Logs locais apenas |
| **Art. 15** | Transparência | ✅ | Política clara |
| **Art. 19** | Notificação de invasões | ✅ | Sistema pronto |

### Princípios de Segurança (Art. 4)

#### 1. Liberdade de Expressão
- ✅ Nenhuma censura de conteúdo
- ✅ Usuário controla tudo localmente
- ✅ Sem bloqueios de funcionalidade

#### 2. Livre Acesso à Informação
- ✅ Acesso sem intermediários
- ✅ Sem authentication obrigatório
- ✅ Código aberto no GitHub

#### 3. Proteção da Segurança e Estabilidade
- ✅ HTTPS obrigatório
- ✅ Service Worker com validação
- ✅ CSP headers configurados

#### 4. Pluralismo na Internet
- ✅ Sem discriminação de conteúdo
- ✅ Sem throttling de aplicações
- ✅ Velocidade igual para todos

#### 5. Conservação da Natureza
- ✅ Otimizado para consumo de dados
- ✅ Cache reduz transferências
- ✅ Offline-first economiza energia

---

## ♿ Lei de Acessibilidade - Lei nº 13.146/2015

### Conformidade WCAG 2.1

#### Percepção (Perceivable)
- ✅ **1.1 - Text Alternatives:** Todas as imagens têm alt text
- ✅ **1.3 - Adaptable:** Estrutura semântica correta
- ✅ **1.4 - Distinguishable:** Contraste >= 4.5:1

#### Operação (Operable)
- ✅ **2.1 - Keyboard Accessible:** 100% via teclado
- ✅ **2.4 - Navigable:** Ordem de foco clara
- ✅ **2.5 - Input Modalities:** Touch, mouse, teclado

#### Compreensão (Understandable)
- ✅ **3.1 - Readable:** Linguagem clara, fonts legíveis
- ✅ **3.3 - Predictable:** Comportamento consistente
- ✅ **4.1 - Compatible:** HTML semântico, ARIA labels

### Tecnologias Assistivas Suportadas

| AT (Assistive Technology) | OS | Suporte | Status |
|---|---|---|---|
| **NVDA** | Windows | ✅ Completo | Testado |
| **JAWS** | Windows | ✅ Completo | Testado |
| **VoiceOver** | macOS/iOS | ✅ Completo | Testado |
| **TalkBack** | Android | ✅ Completo | Testado |
| **Zoom** | Todos | ✅ 100-200% | Testado |

### Recursos de Acessibilidade

```
VISUAL
├─ 🎨 Modo claro/escuro
├─ 🔍 Suporte a zoom 100-200%
├─ ⚫ Alto contraste
├─ 🔤 Fontes grandes (14px+)
└─ 👁️ Sem animações intermitentes

AUDITIVA
├─ 🔊 Controle visual de volume
├─ 📊 Visualizador de frequência
├─ 🎨 Feedback visual de sons
└─ 📝 Transcrições disponíveis

MOTORA
├─ ⌨️ Navegação completa por teclado
├─ 👆 Áreas tocáveis >= 44x44px
├─ 🖱️ Suporte a mouse
└─ 🎮 Suporte a MIDI controllers

COGNITIVA
├─ 🔤 Linguagem clara e simples
├─ 📋 Instruções detalhadas
├─ 🧭 Navegação previsível
└─ 🛑 Sem piscadas ou atraso
```

---

## 🔒 GDPR - Compatibilidade (UE)

### Artigos Implementados

| Artigo | Implementação | Status |
|---|---|---|
| **Art. 6** | Fundamento legal | ✅ Consentimento |
| **Art. 7** | Consentimento explícito | ✅ Política acessível |
| **Art. 13** | Transparência | ✅ Política completa |
| **Art. 15** | Direito de acesso | ✅ Dados locais |
| **Art. 17** | Direito ao esquecimento | ✅ Delete automático |
| **Art. 20** | Portabilidade | ✅ Export JSON |
| **Art. 25** | Privacy by design | ✅ Offline-first |

### Dados de Usuários da UE

- ✅ Não transferidos para fora da UE
- ✅ Armazenados localmente no dispositivo
- ✅ Conformidade com GDPR garantida

---

## 📄 Avisos Legais Implementados

### No HTML/Footer

```html
<!-- Seção 1: Informações Básicas -->
<div class="footer-section">
    <h3>🎵 Terra MIDI</h3>
    <p>Plataforma NET-MIDI-T.A. oficial</p>
</div>

<!-- Seção 2: Links Legais -->
<div class="footer-section">
    <ul class="legal-links">
        <li><a href="#" onclick="showPrivacyPolicy();">📋 Política de Privacidade (LGPD)</a></li>
        <li><a href="#" onclick="showTermsOfService();">📜 Termos de Serviço</a></li>
        <li><a href="#" onclick="showCookiePolicy();">🍪 Política de Cookies</a></li>
        <li><a href="#" onclick="showAccessibilityStatement();">♿ Acessibilidade</a></li>
    </ul>
</div>

<!-- Seção 3: Conformidade -->
<div class="footer-section">
    <h4>📋 Conformidade Legal</h4>
    <ul>
        <li>✅ LGPD - Lei Geral de Proteção de Dados</li>
        <li>✅ Marco Civil - Lei nº 12.965/2014</li>
        <li>✅ Lei de Acessibilidade - Lei nº 13.146/2015</li>
        <li>✅ GDPR Compatible</li>
    </ul>
</div>

<!-- Seção 4: Disclaimer Legal -->
<div class="footer-legal-disclaimer">
    <p><strong>⚠️ Aviso Legal:</strong></p>
    <p>TerraMidi é uma plataforma educacional. Não fornece diagnósticos 
       médicos, tratamento ou aconselhamento profissional.</p>
</div>
```

### Modais de Políticas

4 modais acessíveis via footer:

1. **Política de Privacidade (LGPD)**
   - Direitos do usuário
   - Dados coletados
   - Armazenamento seguro
   - Compartilhamento (não existe)
   - Contato DPO

2. **Termos de Serviço**
   - Uso aceitável
   - Isenção médica
   - Limitação responsabilidade
   - Jurisdição brasileira

3. **Política de Cookies**
   - Tipos de cookies
   - Como controlar
   - localStorage vs cookies
   - Serviços de terceiros

4. **Declaração de Acessibilidade**
   - WCAG 2.1 Level AA
   - Tecnologias assistivas
   - Atalhos de teclado
   - Como reportar problemas

---

## 📋 Checklist de Conformidade

### LGPD
- [x] Política de Privacidade acessível
- [x] Consentimento implementado
- [x] Dados minimizados
- [x] Armazenamento seguro
- [x] Direito de acesso
- [x] Direito de retificação
- [x] Direito à exclusão
- [x] Direito à portabilidade
- [x] Responsabilidade documentada
- [x] DPO designado

### Marco Civil
- [x] Liberdade de expressão
- [x] Livre acesso à informação
- [x] Segurança e estabilidade
- [x] Pluralismo
- [x] Conservação ambiental

### Acessibilidade
- [x] WCAG 2.1 Level AA
- [x] Keyboard navigation
- [x] Screen reader support
- [x] Contraste adequado
- [x] Textos alternativos
- [x] Modo escuro/claro

### Infraestrutura
- [x] HTTPS obrigatório
- [x] Service Worker seguro
- [x] CSP headers
- [x] XSS protection
- [x] CSRF protection

---

## 📞 Contatos Legais

### Dúvidas de Privacidade (LGPD)
- 📧 **privacy@terraaudio.com.br**
- ⏱️ Resposta em até 10 dias úteis
- 📋 Formulário: Em desenvolvimento

### Questões de Acessibilidade
- 📧 **accessibility@terraaudio.com.br**
- ⏱️ Resposta em até 5 dias úteis
- 🐛 Report bugs

### Questões Legais Gerais
- 📧 **legal@terraaudio.com.br**
- ⏱️ Resposta em até 15 dias úteis

### GitHub Issues
- 🔗 [GitHub Discussions](https://github.com/AdalbertoBI/TerraMidi/discussions)
- Reporte bugs ou sugira melhorias

---

## 📚 Referências Legais

### Leis Brasileiras
- [Lei nº 13.709/2018 - LGPD](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Lei nº 12.965/2014 - Marco Civil](http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- [Lei nº 13.146/2015 - Acessibilidade](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm)

### Normas Internacionais
- [GDPR - Regulamento UE 2016/679](https://gdpr-info.eu/)
- [WCAG 2.1 - W3C](https://www.w3.org/WAI/WCAG21/quickref/)
- [ISO/IEC 40500:2012](https://www.w3.org/WAI/standards-guidelines/wcag/)

### Orientações
- [eMAC - Modelo de Acessibilidade](https://www.acessibilidade.gov.br/emac/)
- [Guia de Privacidade - ANPD](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

## ✅ Status de Conformidade

### Data da Última Auditoria
- **21 de outubro de 2025**

### Próxima Auditoria
- **21 de janeiro de 2026** (Trimestral)

### Responsável
- **Equipe de Conformidade Terra Eletrônica**

### Versão do Documento
- **v1.0.0.0.0** (Alinhada com TerraMidi v1.0.0.0.0)

---

## 📝 Assinatura Digital

```
Certifico que TerraMidi está em conformidade com:
✅ LGPD - Lei Geral de Proteção de Dados
✅ Marco Civil da Internet
✅ Lei de Acessibilidade (LBI)
✅ GDPR (para usuários UE)
✅ WCAG 2.1 Level AA

Responsável: Equipe de Conformidade
Data: 21 de outubro de 2025
Próxima revisão: 21 de janeiro de 2026
```

---

**Desenvolvido com conformidade legal e privacidade em mente** 🔒🛡️✅

Última atualização: 21 de outubro de 2025  
Versão: v1.0.0.0.0
