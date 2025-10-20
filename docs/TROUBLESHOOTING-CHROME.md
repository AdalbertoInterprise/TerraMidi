# 🔧 Guia de Troubleshooting - Midi-Terra no Chrome

## 📋 Índice
- [Visão Geral do Problema](#visão-geral-do-problema)
- [Soluções Rápidas](#soluções-rápidas)
- [Diagnóstico Detalhado](#diagnóstico-detalhado)
- [Problemas Específicos](#problemas-específicos)
- [Servidor HTTPS Local](#servidor-https-local)
- [Debugging Avançado](#debugging-avançado)

---

## 🎯 Visão Geral do Problema

O dispositivo **Midi-Terra** funciona perfeitamente no **Microsoft Edge**, mas apresenta problemas de conexão no **Google Chrome**. Este guia fornece soluções completas para resolver essa incompatibilidade.

### Diferenças entre Chrome e Edge

| Característica | Chrome | Edge |
|---|---|---|
| **Requisitos HTTPS** | Muito restritivo | Mais permissivo |
| **Timeout de Permissão** | ~30 segundos | ~60 segundos |
| **Detecção de Dispositivos** | Nomes genéricos | Nomes detalhados |
| **Permissões** | Requer explícita | Mais tolerante |

---

## ⚡ Soluções Rápidas

### 1️⃣ Verificação Básica (2 minutos)

```bash
✓ Dispositivo conectado na porta USB
✓ LED do Midi-Terra aceso
✓ Chrome atualizado (versão 115+)
✓ Site acessado via HTTPS ou localhost
```

### 2️⃣ Fechar Conflitos (1 minuto)

```bash
# Feche COMPLETAMENTE:
✓ Microsoft Edge
✓ Outros navegadores
✓ DAWs (Ableton, FL Studio, etc.)
✓ Aplicativos MIDI
```

### 3️⃣ Reconectar Dispositivo (30 segundos)

```bash
1. Desconecte o cabo USB
2. Aguarde 5 segundos
3. Reconecte o cabo USB
4. Aguarde o LED acender
5. Recarregue a página (F5)
```

---

## 🔍 Diagnóstico Detalhado

### Verificar Versão do Chrome

**Passo 1:** Abra o Chrome e digite na barra de endereços:
```
chrome://settings/help
```

**Passo 2:** Verifique se está na versão **115 ou superior**

**Se desatualizado:**
- Clique em "Verificar atualizações"
- Aguarde download e instalação
- Reinicie o Chrome
- Retorne ao aplicativo

### Verificar Contexto Seguro

O Chrome **EXIGE** que o site seja acessado via:
- `https://` (certificado SSL válido)
- `http://localhost` ou `http://127.0.0.1`

**Como verificar:**
1. Olhe a barra de endereços
2. Deve ter um cadeado 🔒 (HTTPS) ou indicar localhost

**Se não estiver em contexto seguro:**
- **Desenvolvimento:** Use `localhost` ou configure HTTPS local (veja seção abaixo)
- **Produção:** Configure certificado SSL no servidor

### Verificar Permissões MIDI

**Passo 1:** Acesse as configurações de dispositivos MIDI:
```
chrome://settings/content/midiDevices
```

**Passo 2:** Verifique se o site está em "Permitir"

**Passo 3:** Se estiver em "Bloquear", mova para "Permitir"

**Passo 4:** Recarregue a página (F5)

---

## 🚨 Problemas Específicos

### Problema 1: "Dispositivo não detectado"

**Sintomas:**
- Chrome mostra "Nenhum dispositivo MIDI encontrado"
- Dispositivo funciona no Edge

**Soluções:**

1. **Verificar Conflitos**
   ```powershell
   # No Gerenciador de Tarefas (Ctrl+Shift+Esc):
   # Finalize processos:
   - msedge.exe (Edge)
   - chrome.exe (outros Chromes)
   - Aplicativos MIDI/DAW
   ```

2. **Resetar Dispositivo**
   - Desconecte USB
   - Aguarde 10 segundos
   - Reconecte USB
   - Aguarde LED acender
   - Recarregue página no Chrome

3. **Verificar no Gerenciador de Dispositivos**
   ```
   Win + X → Gerenciador de Dispositivos
   └─ Controladores de som, vídeo e jogos
      └─ Procurar "Arduino Leonardo" ou "MIDI"
   ```

### Problema 2: "Permissão MIDI Negada"

**Sintomas:**
- Prompt de permissão não aparece
- Ou aparece mas foi negado anteriormente

**Solução Completa:**

1. **Limpar permissões anteriores**
   ```
   chrome://settings/content/midiDevices
   ```
   - Remova o site da lista "Bloquear"
   - Adicione na lista "Permitir" se necessário

2. **Limpar cache e cookies**
   ```
   Ctrl + Shift + Delete
   └─ Selecione "Cookies e dados do site"
   └─ Clique em "Limpar dados"
   ```

3. **Recarregar e aceitar prompt**
   - Pressione F5
   - Quando aparecer o prompt
   - Clique em "Permitir" RAPIDAMENTE (< 30 segundos)

### Problema 3: "Site em HTTP (não HTTPS)"

**Sintomas:**
- Console mostra: "Web MIDI requer contexto seguro"
- Chrome bloqueia acesso à API

**Soluções:**

**Para Desenvolvimento Local:**

Use o script fornecido para iniciar servidor HTTPS:

```powershell
# No PowerShell, na pasta do projeto:
.\start-https-server.ps1
```

Ou manualmente:

```powershell
# Instalar mkcert
choco install mkcert
# ou: scoop install mkcert

# Gerar certificados
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Iniciar servidor HTTPS
npx http-server -S -C localhost+2.pem -K localhost+2-key.pem -p 8443
```

Acesse: `https://localhost:8443`

**Para Produção:**

Configure SSL no seu servidor web:

- **Nginx:**
  ```nginx
  server {
      listen 443 ssl;
      ssl_certificate /path/to/cert.pem;
      ssl_certificate_key /path/to/key.pem;
      # ... resto da configuração
  }
  ```

- **Apache:**
  ```apache
  <VirtualHost *:443>
      SSLEngine on
      SSLCertificateFile /path/to/cert.pem
      SSLCertificateKeyFile /path/to/key.pem
      # ... resto da configuração
  </VirtualHost>
  ```

- **Netlify/Vercel/GitHub Pages:**
  HTTPS automático, sem configuração necessária

---

## 🖥️ Servidor HTTPS Local

### Opção 1: Script Automatizado (Recomendado)

**Windows:**

```batch
# Execute o arquivo batch:
start-https-server.bat
```

Ou diretamente no PowerShell:

```powershell
.\start-https-server.ps1
```

O script irá:
1. ✅ Verificar Node.js instalado
2. ✅ Instalar mkcert (se necessário)
3. ✅ Gerar certificados SSL locais
4. ✅ Iniciar servidor HTTPS na porta 8443

### Opção 2: Manual

**Requisitos:**
- Node.js instalado
- mkcert instalado

**Passo 1: Instalar mkcert**

Via Chocolatey:
```powershell
choco install mkcert
```

Via Scoop:
```powershell
scoop install mkcert
```

Download direto:
https://github.com/FiloSottile/mkcert/releases

**Passo 2: Configurar Certificados**

```powershell
# Instalar CA raiz (executar como administrador)
mkcert -install

# Gerar certificados para localhost
mkcert localhost 127.0.0.1 ::1
```

**Passo 3: Iniciar Servidor**

```powershell
# Instalar http-server globalmente (opcional)
npm install -g http-server

# Iniciar com HTTPS
npx http-server -S -C localhost+2.pem -K localhost+2-key.pem -p 8443 --cors
```

**Passo 4: Acessar**

Abra o Chrome e acesse:
```
https://localhost:8443
```

---

## 🐛 Debugging Avançado

### Console do Navegador

**Abrir Console:**
```
Pressione F12 ou Ctrl + Shift + J
```

**Comandos úteis:**

```javascript
// Verificar suporte MIDI
console.log('MIDI suportado:', 'requestMIDIAccess' in navigator);

// Verificar contexto seguro
console.log('Contexto seguro:', window.isSecureContext);

// Listar dispositivos MIDI
navigator.requestMIDIAccess().then(access => {
    console.log('Inputs:', Array.from(access.inputs.values()));
    console.log('Outputs:', Array.from(access.outputs.values()));
}).catch(err => {
    console.error('Erro MIDI:', err);
});
```

### Verificar Permissões

```javascript
// Consultar estado da permissão MIDI
navigator.permissions.query({ name: 'midi' }).then(status => {
    console.log('Permissão MIDI:', status.state);
    // Resultado: 'granted', 'denied' ou 'prompt'
});
```

### Logs Detalhados

O sistema já inclui logs detalhados no console. Procure por:

```
🎹 MIDIDeviceManager
🔍 VERIFICANDO DISPONIBILIDADE WEB MIDI
📊 RESULTADO DO ESCANEAMENTO
⚠️ Avisos de compatibilidade
```

### Ferramenta de Diagnóstico Web MIDI

Use a ferramenta online para testar:
```
https://www.midi-test-tool.com/
```

Ou:
```
https://studiocode.dev/resources/midi-monitor/
```

---

## 📞 Suporte Adicional

### Checklist Final

Antes de reportar um problema, verifique:

- [ ] Chrome versão 115 ou superior
- [ ] Site acessado via HTTPS ou localhost
- [ ] Permissões MIDI concedidas
- [ ] Edge e outros apps MIDI fechados
- [ ] Dispositivo desconectado e reconectado
- [ ] Página recarregada após cada mudança
- [ ] Console verificado para erros
- [ ] Testado em outra máquina (se possível)

### Informações para Reportar

Se o problema persistir, forneça:

1. **Versão do Chrome:**
   ```
   Acesse: chrome://version
   ```

2. **Sistema Operacional:**
   ```
   Windows 10/11, versão específica
   ```

3. **URL acessada:**
   ```
   https://... ou http://localhost:...
   ```

4. **Erros do Console:**
   ```
   Copie todos os erros em vermelho do console (F12)
   ```

5. **Estado das Permissões:**
   ```
   chrome://settings/content/midiDevices
   ```

---

## 🎓 Recursos Adicionais

### Documentação Oficial

- [Web MIDI API - W3C](https://www.w3.org/TR/webmidi/)
- [Chrome Web MIDI](https://developer.chrome.com/articles/midi/)
- [MDN Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)

### Ferramentas

- [mkcert - Certificados locais](https://github.com/FiloSottile/mkcert)
- [http-server - Servidor HTTP](https://www.npmjs.com/package/http-server)
- [MIDI Monitor Online](https://www.midi-test-tool.com/)

### Comunidade

- [Stack Overflow - Web MIDI](https://stackoverflow.com/questions/tagged/web-midi)
- [Web Audio/MIDI Forum](https://github.com/WebAudio/web-midi-api/issues)

---

## ✅ Resumo Executivo

### Para fazer o Midi-Terra funcionar no Chrome:

1. **Atualize o Chrome** para versão 115+
2. **Use HTTPS** ou `localhost`
3. **Feche o Edge** completamente
4. **Permita acesso MIDI** quando solicitado
5. **Reconecte o dispositivo** se necessário

### Comandos Rápidos:

```powershell
# Verificar Chrome
chrome://version

# Ajustar permissões MIDI
chrome://settings/content/midiDevices

# Iniciar servidor HTTPS local
.\start-https-server.ps1
```

---

**Última atualização:** 17 de outubro de 2025
**Versão:** 1.0.0
**Autor:** Terra MIDI System
