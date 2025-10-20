# 🔒 Problema: Acesso Exclusivo ao Dispositivo MIDI

## ⚠️ Sintoma

```
❌ NENHUM DISPOSITIVO TERRA ELETRÔNICA DETECTADO
⚠️ Possível uso exclusivo do Midi-Terra por outro aplicativo
```

O navegador mostra que tem permissão MIDI, mas nenhum dispositivo é detectado.

---

## 🔍 Causa Raiz

**Dispositivos MIDI USB só podem ser acessados por UM aplicativo por vez.**

Quando um navegador ou aplicativo abre uma conexão com o dispositivo MIDI, ele obtém acesso **exclusivo**. Outros aplicativos ficam bloqueados até que o primeiro libere o dispositivo.

### Comportamento no Windows

O sistema operacional Windows gerencia o acesso aos dispositivos MIDI USB através de drivers. Quando um aplicativo (navegador, DAW, etc.) solicita acesso ao dispositivo:

1. O driver verifica se o dispositivo já está em uso
2. Se **SIM** → Novo acesso é **NEGADO** silenciosamente
3. Se **NÃO** → Acesso é concedido e o dispositivo fica **BLOQUEADO** para outros

**Resultado:** O segundo aplicativo consegue solicitar permissão MIDI, mas quando tenta listar os dispositivos, a lista vem **vazia** porque o dispositivo está bloqueado.

---

## 🔴 Culpados Mais Comuns

### 1. **Microsoft Edge** (95% dos casos)

O Edge usa o mesmo motor Chromium do Chrome. Se você:
- Abriu o Terra MIDI no Edge anteriormente
- Não fechou completamente o Edge (fica em background)
- Tem outra aba do Edge aberta

**O Edge mantém o acesso ao dispositivo mesmo em background!**

#### ✅ Como Verificar:

1. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)
2. Procure por processos do **Microsoft Edge**
3. Se encontrar, clique com botão direito → **Finalizar tarefa**

#### ✅ Solução Definitiva:

```
1. Feche TODAS as janelas do Edge
2. Abra o Gerenciador de Tarefas
3. Finalize TODOS os processos do Edge
4. Aguarde 5 segundos
5. Reconecte o cabo USB do Midi-Terra
6. Recarregue a página no Chrome
```

---

### 2. **DAWs (Digital Audio Workstations)**

Programas como:
- Ableton Live
- FL Studio
- Cubase
- Logic Pro
- Reaper
- Pro Tools

Esses softwares mantêm conexão MIDI ativa em background, mesmo quando minimizados.

#### ✅ Solução:

1. Feche completamente a DAW
2. Não apenas minimize - **feche o programa**
3. Aguarde 5 segundos
4. Reconecte o dispositivo USB

---

### 3. **Outras Abas do Chrome**

Se você tem **múltiplas abas** abertas com sites que usam MIDI:
- Outra instância do Terra MIDI
- Sites de teste MIDI
- Aplicações Web MIDI

A **primeira aba** que solicitou acesso mantém o bloqueio.

#### ✅ Solução:

1. Feche todas as abas do Chrome
2. Abra apenas UMA nova aba
3. Acesse o Terra MIDI
4. Conceda permissão MIDI

---

### 4. **Aplicativos de Teste MIDI**

Software de diagnóstico/teste:
- MIDI-OX
- MIDIberry
- MIDI Monitor
- Virtual MIDI Piano Keyboard

#### ✅ Solução:

1. Feche esses programas
2. Verifique na bandeja do sistema (systray)
3. Se ainda estiverem rodando, finalize pelo Gerenciador de Tarefas

---

## 🛠️ Procedimento de Diagnóstico Completo

### Passo 1: Verificar Navegadores Abertos

```powershell
# No PowerShell (executar como Administrador)
Get-Process | Where-Object {$_.ProcessName -like "*edge*" -or $_.ProcessName -like "*chrome*"}
```

Se retornar processos, finalize-os:

```powershell
Stop-Process -Name "msedge" -Force
Stop-Process -Name "chrome" -Force
```

### Passo 2: Verificar DAWs

Verifique se algum desses processos está rodando:
- Ableton Live.exe
- FL.exe / FL64.exe
- Cubase*.exe
- Reaper.exe

### Passo 3: Reconectar Dispositivo USB

1. Desconecte o cabo USB do Midi-Terra
2. Aguarde 10 segundos
3. Reconecte o cabo USB
4. Aguarde o Windows reconhecer o dispositivo (ouve som de conexão USB)

### Passo 4: Verificar no Gerenciador de Dispositivos

1. Pressione `Win + X` → Gerenciador de Dispositivos
2. Expanda **Controladores de som, vídeo e jogos**
3. Procure por **Arduino Leonardo** ou **Midi-Terra**
4. Se tiver um ⚠️ amarelo → clique com botão direito → **Atualizar driver**

### Passo 5: Testar no Chrome

1. Abra o Chrome (APENAS Chrome, feche Edge)
2. Acesse https://adalbertobi.github.io/TerraMidi/
3. Clique em "Ativar Terra Midi"
4. **Clique em "Permitir"** no popup do navegador
5. Aguarde detecção automática

---

## 🔬 Diagnóstico Via Console

Abra o Console do navegador (F12) e execute:

```javascript
// 1. Verificar permissões
const permission = await navigator.permissions.query({ name: 'midi', sysex: false });
console.log('Permissão MIDI:', permission.state);

// 2. Listar dispositivos
const access = await navigator.requestMIDIAccess();
console.log('Dispositivos de entrada:', access.inputs.size);
console.log('Dispositivos de saída:', access.outputs.size);

// 3. Detalhar dispositivos
access.inputs.forEach(input => {
    console.log('→', input.name, '|', input.manufacturer, '| Estado:', input.state);
});

// 4. Diagnóstico completo do Terra MIDI
await window.midiDiagnostics.runFullDiagnostic();
```

### Interpretação dos Resultados

#### ✅ Cenário Normal (Funcionando)

```
Permissão MIDI: granted
Dispositivos de entrada: 1
Dispositivos de saída: 1
→ Midi-Terra | Arduino LLC | Estado: connected
```

#### ❌ Cenário de Acesso Exclusivo

```
Permissão MIDI: granted
Dispositivos de entrada: 0    ← PROBLEMA!
Dispositivos de saída: 0      ← PROBLEMA!
```

**Interpretação:** Permissão concedida, mas lista vazia = **dispositivo bloqueado por outro app**.

#### ❌ Cenário de Permissão Bloqueada

```
Permissão MIDI: denied        ← PROBLEMA!
```

**Solução:** Desbloqueie em `chrome://settings/content/midiDevices`

---

## 📋 Checklist de Resolução

Use este checklist para resolver o problema:

- [ ] ✅ Fechar Microsoft Edge completamente
- [ ] ✅ Verificar Gerenciador de Tarefas (sem processos Edge)
- [ ] ✅ Fechar DAWs (Ableton, FL Studio, etc.)
- [ ] ✅ Fechar aplicativos MIDI (MIDI-OX, etc.)
- [ ] ✅ Fechar outras abas do Chrome
- [ ] ✅ Desconectar cabo USB do Midi-Terra
- [ ] ✅ Aguardar 10 segundos
- [ ] ✅ Reconectar cabo USB
- [ ] ✅ Aguardar som de conexão USB do Windows
- [ ] ✅ Abrir Chrome (apenas Chrome)
- [ ] ✅ Acessar Terra MIDI
- [ ] ✅ Conceder permissão MIDI
- [ ] ✅ Verificar detecção do dispositivo

---

## 🎯 Prevenção

Para evitar este problema no futuro:

### 1. **Use Apenas UM Navegador por Vez**

- Se usar Chrome → Feche Edge completamente
- Se usar Edge → Feche Chrome completamente
- Não deixe navegadores em background

### 2. **Feche DAWs Antes de Usar Terra MIDI**

- DAWs mantêm conexão MIDI ativa
- Sempre feche completamente (não minimize)

### 3. **Evite Múltiplas Abas com MIDI**

- Use apenas UMA aba do Terra MIDI
- Feche outras abas com sites MIDI

### 4. **Marque como Favorito a Aba Terra MIDI**

- Evite reabrir múltiplas vezes
- Use sempre a mesma aba

### 5. **Configure Permissões Permanentes**

1. Acesse `chrome://settings/content/midiDevices`
2. Em **Permitir**, adicione `https://adalbertobi.github.io`
3. Salve

---

## 🆘 Ainda Não Funciona?

Se após seguir todos os passos o problema persistir:

### Solução Extrema: Reiniciar Serviço USB do Windows

```powershell
# No PowerShell como Administrador
Restart-Service -Name "usbhub"
```

### Solução Última Instância: Reiniciar o PC

1. Salve seu trabalho
2. Reinicie o computador
3. Após reiniciar, abra APENAS o Chrome
4. Acesse Terra MIDI
5. Conecte o dispositivo USB

---

## 📞 Suporte Técnico

Se o problema persistir após todas as tentativas:

1. 📧 **Email:** suporte@terraeletronica.com.br
2. 🐛 **GitHub Issues:** https://github.com/AdalbertoBI/TerraMidi/issues
3. **Inclua na mensagem:**
   - Sistema Operacional (Windows 10/11)
   - Versão do Chrome (`chrome://version`)
   - Resultado do comando: `await window.midiDiagnostics.runFullDiagnostic()`
   - Screenshot do Gerenciador de Tarefas

---

**Atualizado em:** 20/10/2025  
**Versão:** 1.0
