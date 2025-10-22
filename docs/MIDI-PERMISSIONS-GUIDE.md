# 🎹 Guia Completo: Web MIDI API - Permissões, Segurança e Troubleshooting

**Data:** 22 de outubro de 2025  
**Versão:** 2.0  
**Aplicação:** Terra MIDI Online - Musicoterapia

---

## 📋 Índice

1. [Requisitos Essenciais](#requisitos-essenciais)
2. [Fluxo de Inicialização Robusto](#fluxo-de-inicialização-robusto)
3. [Estados de Permissão](#estados-de-permissão)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Timeout e Reconexão](#timeout-e-reconexão)
6. [Event Listeners (onstatechange)](#event-listeners-onstatechange)
7. [Troubleshooting](#troubleshooting)
8. [Configuração para Desenvolvimento](#configuração-para-desenvolvimento)

---

## 🔒 Requisitos Essenciais

### 1. **HTTPS é Obrigatório**

Web MIDI API **exige um contexto seguro (Secure Context)**:

- ✅ **HTTPS** em qualquer domínio
- ✅ **http://localhost** (exceção especial do Chrome)
- ✅ **http://127.0.0.1** (exceção especial do Chrome)
- ❌ **http://meusite.com** (bloqueado)
- ❌ **IP remoto via HTTP** (bloqueado)

```javascript
// Verificar se está em contexto seguro
console.log('Contexto seguro?', window.isSecureContext);
// true = seguro ✅
// false = inseguro ❌
```

### 2. **Gesto Explícito do Usuário**

Todos os navegadores Chromium **exigem** uma ação do usuário ANTES de solicitar permissão MIDI:

```javascript
// ❌ INCORRETO: Chamar no carregamento da página
window.addEventListener('load', () => {
    navigator.requestMIDIAccess(); // Vai falhar!
});

// ✅ CORRETO: Chamar após clique
document.addEventListener('click', async () => {
    const access = await navigator.requestMIDIAccess();
});
```

### 3. **Compatibilidade de Navegadores**

| Navegador | Suporte | Versão Mín. |
|-----------|---------|------------|
| Chrome | ✅ Completo | 43+ |
| Chromium | ✅ Completo | Qualquer |
| Edge | ✅ Completo | 79+ |
| Opera | ✅ Completo | 30+ |
| Firefox | ⚠️ Experimental | 108+ (flag habilitada) |
| Safari | ❌ Não | - |

---

## 🚀 Fluxo de Inicialização Robusto

### Sequência Recomendada

```
1. Verificar HTTPS/Secure Context
   ↓
2. Aguardar gesto do usuário (clique, toque, tecla)
   ↓
3. Consultar estado de permissão (navigator.permissions.query)
   ↓
4. Chamar navigator.requestMIDIAccess()
   ↓
5. Configurar listeners (onstatechange, onmidimessage)
   ↓
6. Escanear dispositivos conectados
   ↓
7. Configurar reconexão automática
```

### Implementação na Terra MIDI

```javascript
// PASSO 1: Inicializar somente após gesto do usuário
const midiManager = new MIDIDeviceManager();
midiManager.setupUserGestureListeners();

// Ou manualmente:
document.getElementById('connect-button').addEventListener('click', async () => {
    await midiManager.initializeOnUserGesture('click');
});

// PASSO 2: Gerenciador de permissões monitora mudanças
const permManager = new MIDIPermissionManager({
    onGranted: () => console.log('✅ Permissão concedida'),
    onDenied: () => console.log('⛔ Permissão negada'),
    onPrompt: () => console.log('🔔 Será exibido prompt')
});
```

---

## 🔐 Estados de Permissão

A Permissions API expõe 3 estados possíveis:

### ✅ `'granted'` - Permissão Concedida

**O que significa:**
- Usuário já autorizou MIDI anteriormente
- Não será exibido prompt novamente
- `requestMIDIAccess()` será resolvido imediatamente

**Código:**
```javascript
const status = await navigator.permissions.query({ name: 'midi' });
if (status.state === 'granted') {
    // Pode chamar requestMIDIAccess() sem hesitação
    const access = await navigator.requestMIDIAccess();
}
```

### 🔔 `'prompt'` - Necessário Mostrar Prompt

**O que significa:**
- Primeira vez que o site solicita MIDI
- Um popup será exibido pedindo "Permitir" ou "Bloquear"
- Usuário tem ~15 segundos para responder

**Código:**
```javascript
if (status.state === 'prompt') {
    console.log('Mostrando instrução: clique rapidamente em "Permitir"');
    // showUIInstruction('Clique em Permitir quando o prompt aparecer');
    const access = await navigator.requestMIDIAccess();
}
```

### ⛔ `'denied'` - Permissão Negada

**O que significa:**
- Usuário clicou "Bloquear" explicitamente
- `requestMIDIAccess()` será rejeitado com `NotAllowedError`
- Bloqueio pode ser removido manualmente nas configurações

**Solução:**
```javascript
if (status.state === 'denied') {
    alert('🚫 Permissão MIDI negada.\n\n' +
          'Abra chrome://settings/content/midiDevices\n' +
          'Remova este site do bloqueio e tente novamente.');
}
```

---

## ❌ Tratamento de Erros

### Tipos de Erro da Web MIDI API

#### 🔒 **SecurityError**

```javascript
try {
    const access = await navigator.requestMIDIAccess();
} catch (error) {
    if (error.name === 'SecurityError') {
        // Causa: Contexto inseguro (HTTP em domínio remoto)
        console.error('❌ HTTPS obrigatório ou use localhost');
        // Solução: Configure HTTPS ou use localhost
    }
}
```

**Soluções:**
1. Use HTTPS em produção
2. Use `localhost` ou `127.0.0.1` para desenvolvimento
3. Use `ngrok http 5500` para HTTPS local temporário
4. Configure VS Code com HTTPS habilitado

---

#### 🚫 **NotAllowedError**

```javascript
if (error.name === 'NotAllowedError') {
    // Causa 1: Usuário clicou "Bloquear"
    // Causa 2: Permissão foi revogada anteriormente
    // Causa 3: Outro aplicativo monopoliza o MIDI
    
    console.error('⛔ Permissão MIDI bloqueada');
}
```

**Soluções:**
1. Chrome/Edge: `chrome://settings/content/midiDevices`
   - Remover este site do bloqueio
2. Firefox: `about:permissions` → buscar "MIDI"
3. Verificar se outro app (Edge, DAW) usa o MIDI

---

#### ⚠️ **NotSupportedError**

```javascript
if (error.name === 'NotSupportedError') {
    // Navegador não suporta Web MIDI API
    console.error('❌ Navegador não suportado. Use Chrome, Edge ou Opera.');
}
```

**Soluções:**
- Usar Chrome, Chromium, Edge, ou Opera
- Atualizar navegador para versão recente

---

#### ⏱️ **TimeoutError**

```javascript
if (error.name === 'TimeoutError') {
    // Chrome expirou a solicitação de permissão (~15 segundos)
    console.error('⏱️ Timeout. Clique rapidamente em "Permitir".');
}
```

**Soluções:**
1. Tentar novamente imediatamente
2. Clique em "Permitir" com precisão
3. Verificar se há notificações do SO bloqueando o prompt
4. Reconectar dispositivo USB

---

#### 🚫 **AbortError**

```javascript
if (error.name === 'AbortError') {
    // Requisição foi cancelada (outro app monopoliza MIDI)
    console.error('🚫 Acesso MIDI bloqueado por outro aplicativo');
}
```

**Soluções:**
1. Fechar Microsoft Edge (monopoliza MIDI)
2. Fechar DAWs: Ableton, FL Studio, Reaper, etc.
3. Fechar outras abas do Chrome com MIDI ativo
4. Reconectar cabo USB do dispositivo

---

## ⏱️ Timeout e Reconexão

### Sistema de Timeout Inteligente

A Terra MIDI implementa timeout adaptativo com reconexão automática:

```javascript
// Configuração
const MIDI_PERMISSION_TIMEOUT_MS = 15000; // 15 segundos

// Comportamento:
// 1. Aguardar por até 15s
// 2. Se timeout, exibir mensagem "clique rapidamente"
// 3. Se falhar, agendar nova tentativa com backoff
// 4. Máximo 3 tentativas com delays: 1s → 1.5s → 2.25s
```

### Implementação

```javascript
// Em midiDeviceManager.js
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('Timeout ao solicitar permissão MIDI'));
    }, MIDI_PERMISSION_TIMEOUT_MS);
});

try {
    const access = await Promise.race([
        navigator.requestMIDIAccess(options),
        timeoutPromise
    ]);
} catch (error) {
    if (error.message.includes('Timeout')) {
        // Agendar reconexão automática
        setTimeout(() => {
            midiManager.autoReconnect('timeout-retry');
        }, 1000);
    }
}
```

### Retry Automático com Backoff Exponencial

```javascript
class MIDIAutoReconnector {
    async attemptReconnect(reason) {
        const baseDelay = 1000;
        const backoff = Math.pow(1.5, this.recoveryStrategy.attempts);
        const delay = Math.min(baseDelay * backoff, 10000);
        
        console.log(`🔄 Tentativa ${this.retryCount + 1}/${this.maxRetries} em ${delay}ms`);
        
        setTimeout(() => {
            this.midiManager.autoReconnect(reason);
        }, delay);
    }
}
```

---

## 👂 Event Listeners (onstatechange)

### Detectar Conexão/Desconexão USB

O listener `onstatechange` é crítico para reconectar automaticamente:

```javascript
// Configurar listener para mudanças de estado MIDI
midiAccess.onstatechange = (event) => {
    const port = event.port;
    
    console.log(`Port: ${port.name}, State: ${port.state}`);
    
    if (port.state === 'connected') {
        // Dispositivo foi plugado
        console.log('✅ Dispositivo conectado:', port.name);
        midiManager.connectDevice(port);
    } else if (port.state === 'disconnected') {
        // Dispositivo foi desplugado
        console.log('🔌 Dispositivo desconectado:', port.name);
        midiManager.disconnectDevice(port.id);
        
        // Agendar reconexão automática
        midiManager.autoReconnect('device-disconnected');
    }
};
```

### Listener para Mensagens MIDI

```javascript
port.onmidimessage = (event) => {
    const [status, note, velocity] = event.data;
    
    // Processar mensagem MIDI
    console.log(`Note: ${note}, Velocity: ${velocity}`);
    
    // Tocar som, atualizar UI, etc.
    audioEngine.playNote(note, velocity);
};
```

### Teste: Verificar se Listeners Funcionam

```javascript
// Abra o Console (F12)
// Pressione uma tecla no Midi-Terra
// Você deve ver:
// "Note: 60, Velocity: 100"
// Não vendo? Volte ao Troubleshooting abaixo
```

---

## 🔧 Troubleshooting

### Problema 1: "SecurityError: access denied for origin"

**Causa:** Contexto inseguro (HTTP em domínio remoto)

**Solução:**
```bash
# Opção 1: Usar localhost com servidor HTTP-Server
npx http-server -p 5500

# Opção 2: HTTPS local com http-server
npx http-server -S -p 5500

# Opção 3: ngrok para HTTPS temporário
npx ngrok http 5500

# Opção 4: VS Code Live Server com HTTPS
# Extensão: Live Server
# Settings: "liveServer.settings.useHttps": true
```

Verificar:
```javascript
console.log('isSecureContext:', window.isSecureContext);
console.log('URL:', window.location.href);
// Ambos devem indicar segurança ✅
```

---

### Problema 2: "NotAllowedError: MIDI access denied"

**Causa:** Permissão foi negada nas configurações do navegador

**Solução Chrome/Edge:**
1. Abra `chrome://settings/content/midiDevices`
2. Procure pelo seu domínio (pode estar em "Bloqueados")
3. Remova o domínio do bloqueio
4. Recarregue a página

**Teste:**
```javascript
const status = await navigator.permissions.query({ name: 'midi' });
console.log('Estado:', status.state);
// granted = permissão OK ✅
// denied = precisa limpar bloqueio ⛔
// prompt = será exibido popup 🔔
```

---

### Problema 3: "TimeoutError" ao solicitar permissão

**Causa:** Você demorou demais para clicar "Permitir"

**Solução:**
1. Clique no botão da aplicação para tentar novamente
2. **Quando o prompt do navegador aparecer, clique RAPIDAMENTE** em "Permitir"
3. Não feche o popup, apenas clique
4. Se for touchpad, use clique duplo/preciso

**Debug:**
```javascript
// Verificar estado antes de solicitar
const status = await navigator.permissions.query({ name: 'midi' });
if (status.state === 'granted') {
    console.log('✅ Já autorizado, sem prompt');
} else if (status.state === 'prompt') {
    console.log('⏱️ Prepare-se para clique rápido');
}
```

---

### Problema 4: Dispositivo não aparece (nenhum "noteon" detectado)

**Causa mais comum:** Outro aplicativo monopoliza o MIDI

**Solução:**
1. Feche **Microsoft Edge** completamente (causa #1)
2. Feche **DAWs**: Ableton, FL Studio, Reaper, Bitwig, etc.
3. Feche **aplicativos MIDI**: MIDI-OX, MIDIberry, QMidi
4. Feche outras **abas do Chrome** com este site
5. **Desconecte e reconecte** o cabo USB do Midi-Terra
6. Recarregue a página (F5)

**Debug:**
```javascript
// Abra console (F12) e execute:
window.midiManager?.debugMidi?.();

// Você verá:
// 🎛️ midiAccess disponível: true/false
// 🎹 Dispositivos conectados: 0/1/2...
// Se 0: dispositivo não detectado → siga Solução acima
```

---

### Problema 5: "Exclusive use" - Dispositivo em uso exclusivo

**Mensagem:** "Dispositivo MIDI em uso exclusivo"

**Causa:** O Midi-Terra está sendo usado por outro aplicativo

**Solução:**
```
1. ❌ Feche Microsoft Edge (SEMPRE!)
2. ❌ Feche DAWs (Ableton, etc.)
3. ❌ Feche apps de teste MIDI
4. ✅ Reconecte o cabo USB
5. ✅ Recarregue a página
```

**Teste de exclusividade:**
```bash
# Windows: Abra o Gerenciador de Dispositivos
# Procure por "Arduino" ou "Midi-Terra"
# Se não aparecer: problema de driver USB
```

---

### Problema 6: Dispositivo desconecta frequentemente

**Causa:** Possível defeito no cabo ou conflito de driver

**Solução:**
1. Tente outro **cabo USB**
2. Tente outra **porta USB**
3. Atualize **drivers do chip FTDI** (se aplicável)
4. Verifique se o dispositivo fica quente (problema eletrônico)

**Debug:**
```javascript
// Ativar logs de estado
midiAccess.onstatechange = (event) => {
    console.log(`Estado mudou: ${event.port.state}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
};

// Deixar aberto enquanto desconecta/reconecta
// Observe os logs de mudança de estado
```

---

## 💻 Configuração para Desenvolvimento

### Setup VS Code + Chrome + HTTPS Local

```bash
# 1. Instalar extensão Live Server
# Extensions → buscar "Live Server" → instalar

# 2. Clicar em Settings da extensão
# Settings → Workspace Settings

# 3. Adicionar ao settings.json:
{
    "liveServer.settings.useHttps": true,
    "liveServer.settings.port": 5500
}

# 4. Abrir o arquivo index.html
# Clicar em "Go Live" no canto inferior direito

# 5. Browser abrir em https://localhost:5500
```

### Setup ngrok para Teste Remoto

```bash
# 1. Instalar ngrok
npm install -g ngrok

# 2. Iniciar servidor local
npx http-server -p 5500

# 3. Em outro terminal:
ngrok http 5500

# 4. Copiar URL HTTPS gerada
# https://xxxx-xx-xxx-xxx-xx.ngrok.io

# 5. Compartilhar URL com equipe
# Todos acessam em HTTPS automaticamente!
```

### Validação Final

```javascript
// No console da página (F12), execute:

console.log('=== DIAGNÓSTICO TERRA MIDI ===');
console.log('1. Secure Context:', window.isSecureContext ? '✅' : '❌');
console.log('2. URL:', window.location.href);
console.log('3. MIDI Suportado:', !!navigator.requestMIDIAccess ? '✅' : '❌');
console.log('4. MIDIDeviceManager:', typeof window.midiManager ? '✅' : '❌');

// Se todos com ✅, sistema está pronto!
```

---

## 📚 Referências

- **Web MIDI API Spec:** https://www.w3.org/TR/webmidi/
- **MDN Web MIDI API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
- **Chrome MIDI Status:** chrome://settings/content/midiDevices
- **Permissions API:** https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API

---

## 📞 Suporte

Se o problema persistir:

1. Abra o Console (F12) e copie TODOS os logs
2. Execute `window.midiManager?.debugMidi?.()`
3. Tire screenshot da página
4. Descreva exatamente o que tentou fazer
5. Mencione: navegador, versão, SO, tipo de dispositivo

**Exemplo de relatório:**
```
Navegador: Chrome 120.0
SO: Windows 11
Dispositivo: Midi-Terra (Arduino Leonardo)
Problema: "TimeoutError ao clicar conectar"
Ações tomadas: 
  - Verifiquei que é HTTPS ✅
  - Cliquei em "Permitir" na permissão ✅
  - Dispositivo está conectado via USB ✅
  - Mas ainda recebo timeout após 15s
```

---

**Última atualização:** 22 de outubro de 2025  
**Versão:** 2.0 - Web MIDI Robusto com Permissões
