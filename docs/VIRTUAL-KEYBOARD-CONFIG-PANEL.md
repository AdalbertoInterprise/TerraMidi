# 🎹 Virtual Keyboard - Painel de Configuração por Clique

## 📋 Visão Geral

A partir desta versão, o **Virtual Keyboard** possui um novo comportamento:

- **👆 Clique/Toque nas teclas** → Abre o painel de configuração (`vk-config-panel`)
- **🎛️ Comando MIDI (Board Bells)** → Toca a nota normalmente (sem abrir painel)

---

## 🎯 Motivação

Anteriormente, clicar nas teclas do Virtual Keyboard acionava o som diretamente. Com a integração do Board Bells e outros dispositivos MIDI, surgiu a necessidade de:

1. **Facilitar a configuração de instrumentos individuais** - Permitir que usuários cliquem nas teclas para configurá-las rapidamente
2. **Preservar funcionalidade MIDI** - Garantir que dispositivos MIDI continuem tocando as teclas normalmente

---

## ⚙️ Como Funciona

### **1. Interação com Mouse/Toque**

Quando o usuário **clica ou toca** em uma tecla do teclado virtual:

```javascript
// Handler de clique
const openConfig = (event) => {
    event.preventDefault();
    this.openConfigPanel(note, keyEl); // Abre o painel de configuração
};

keyEl.addEventListener('mousedown', openConfig);
keyEl.addEventListener('touchstart', openConfig);
```

**Resultado:**
- ✅ Painel `vk-config-panel` é exibido
- ✅ Usuário pode escolher um instrumento personalizado para a tecla
- ✅ Nota **NÃO é tocada** durante o clique

---

### **2. Interação via MIDI (Board Bells)**

Quando um dispositivo MIDI (como o Board Bells) aciona uma tecla:

```javascript
// Método público para MIDI
pressKey(noteName, velocity = 1.0, source = 'board-bells') {
    // Tocar áudio SEM abrir painel de configuração
    this.app.startNote(noteName, keyEl, instrumentKey, velocity);
    
    // Feedback visual diferenciado
    keyEl.classList.add('is-active');
    keyEl.classList.add('from-midi'); // 🆕 Classe para identificar origem MIDI
}
```

**Resultado:**
- ✅ Nota é tocada normalmente
- ✅ Feedback visual com estilo diferenciado (laranja/dourado)
- ✅ Painel **NÃO é aberto**

---

## 🎨 Feedback Visual

### **Tecla Acionada por Clique**
- Painel de configuração aparece
- Tecla não muda de cor

### **Tecla Acionada via MIDI**
```css
.virtual-keyboard .key.from-midi.is-active {
    box-shadow: 0 8px 22px rgba(255, 165, 0, 0.5);
    border-color: rgba(255, 165, 0, 0.6);
}
```

- **Cor:** Laranja/Dourado (distingue de cliques normais)
- **Animação:** Pulso suave (`boardBellsPulse`)
- **Indicador:** Classe `.from-midi` aplicada

---

## 🔧 API Pública

### **`pressKey(noteName, velocity, source)`**

Aciona uma tecla programaticamente (usado por dispositivos MIDI).

**Parâmetros:**
- `noteName` (string) - Nome da nota (ex: `'C4'`, `'D#3'`)
- `velocity` (number) - Velocity normalizado (0.0 a 1.0)
- `source` (string) - Identificador da origem (ex: `'board-bells'`, `'midi-controller'`)

**Exemplo:**
```javascript
// Board Bells aciona tecla C
window.virtualKeyboardInstance.pressKey('C', 0.8, 'board-bells');
```

**Comportamento:**
- ✅ Toca a nota com o instrumento configurado (ou global)
- ✅ Aplica feedback visual MIDI
- ❌ **NÃO** abre o painel de configuração

---

### **`releaseKey(noteName, source)`**

Libera uma tecla programaticamente.

**Parâmetros:**
- `noteName` (string) - Nome da nota
- `source` (string) - Identificador da origem

**Exemplo:**
```javascript
// Board Bells libera tecla C
window.virtualKeyboardInstance.releaseKey('C', 'board-bells');
```

**Comportamento:**
- ✅ Para o áudio da nota
- ✅ Remove feedback visual (incluindo classe `.from-midi`)

---

## 🎛️ Painel de Configuração

### **Abertura**
- Clique/toque em qualquer tecla do Virtual Keyboard
- Painel aparece próximo à tecla clicada

### **Funcionalidades**
1. **Escolher instrumento personalizado** - Dropdown com 861 soundfonts
2. **Pré-visualizar** - Botão para testar o som antes de aplicar
3. **Remover personalização** - Voltar para instrumento global
4. **Fechar** - Botão `×` ou tecla `ESC`

### **Numeração Sincronizada**
O dropdown do painel usa **globalIndex** do `instrumentSelector`, garantindo que:
- Clavinet é #76 (não #66)
- Todos os 861 soundfonts estão em ordem correta
- Numeração idêntica em todos os componentes

---

## 🧪 Testes

### **Cenário 1: Usuário Clica na Tecla DÓ**
1. ✅ Painel de configuração abre
2. ✅ Dropdown mostra 861 soundfonts
3. ✅ Usuário seleciona "76. 🎹 Clavinet"
4. ✅ Instrumento é atribuído à tecla
5. ✅ Painel fecha automaticamente

### **Cenário 2: Board Bells Aciona Tecla DÓ**
1. ✅ Nota DÓ toca com instrumento configurado (Clavinet)
2. ✅ Tecla exibe feedback visual laranja
3. ❌ Painel de configuração **NÃO** abre
4. ✅ Classe `.from-midi` aplicada

### **Cenário 3: Usuário Toca no Celular**
1. ✅ Toque abre painel de configuração
2. ✅ Interface responsiva (mobile-friendly)
3. ✅ Dropdown scrollável
4. ✅ Botões grandes e acessíveis

---

## 🔍 Diagnóstico

### **Como Identificar a Origem do Acionamento**

```javascript
// No DevTools Console
const keyEl = document.querySelector('.key[data-note="C"]');

// Se acionada por MIDI
keyEl.classList.contains('from-midi'); // true
keyEl.getAttribute('data-source'); // 'board-bells'

// Se acionada por clique
keyEl.classList.contains('from-midi'); // false
```

### **Logs no Console**

**Clique/Toque:**
```
🎹 Virtual Keyboard: openConfigPanel('C')
✅ Painel de configuração aberto para nota C
```

**MIDI:**
```
🎹 Virtual Keyboard: pressKey('C', 0.8, 'board-bells')
   ↳ Instrumento personalizado: _tone_0760_Chaos_sf2_file
✅ pressKey: nota C acionada via board-bells com sucesso
```

---

## 📚 Integração com Board Bells

O Board Bells usa os métodos públicos do Virtual Keyboard:

```javascript
// boardBellsDevice.js

handleNoteOn(midiNote, velocity) {
    const noteName = this.midiNoteToNoteName(midiNote);
    
    // Acionar tecla no Virtual Keyboard
    if (window.virtualKeyboardInstance) {
        window.virtualKeyboardInstance.pressKey(noteName, velocity, 'board-bells');
    }
}

handleNoteOff(midiNote) {
    const noteName = this.midiNoteToNoteName(midiNote);
    
    // Liberar tecla no Virtual Keyboard
    if (window.virtualKeyboardInstance) {
        window.virtualKeyboardInstance.releaseKey(noteName, 'board-bells');
    }
}
```

---

## 🛠️ Configuração Avançada

### **Desabilitar Painel no Clique (Reverter ao Comportamento Antigo)**

Se preferir que as teclas toquem ao clicar (como antes):

```javascript
// Modificar bindKeyEvents() em virtual-keyboard.js

bindKeyEvents(keyEl, note) {
    const start = (event) => {
        event.preventDefault();
        this.startNote(note); // Tocar ao invés de abrir painel
    };

    keyEl.addEventListener('mousedown', start);
    keyEl.addEventListener('touchstart', start);
}
```

### **Customizar Feedback Visual MIDI**

```css
/* Mudar cor do feedback MIDI */
.virtual-keyboard .key.from-midi.is-active {
    box-shadow: 0 8px 22px rgba(0, 255, 0, 0.5); /* Verde */
    border-color: rgba(0, 255, 0, 0.6);
}
```

---

## ✅ Checklist de Validação

- [x] Clique/toque abre painel de configuração
- [x] Comandos MIDI tocam notas sem abrir painel
- [x] Feedback visual diferenciado para MIDI
- [x] Classe `.from-midi` aplicada corretamente
- [x] Método `pressKey()` funciona programaticamente
- [x] Método `releaseKey()` funciona programaticamente
- [x] Painel fecha com `ESC` ou clique fora
- [x] Dropdown sincronizado com `instrumentSelector`
- [x] Numeração correta (1-861)
- [x] Responsivo em mobile/tablet

---

## 🎉 Resultado Final

### **Antes:**
- Clique na tecla → ❌ Toca som (dificulta configuração)
- MIDI → ✅ Toca som

### **Depois:**
- 👆 Clique na tecla → ✅ Abre painel de configuração
- 🎛️ MIDI → ✅ Toca som (sem abrir painel)
- 🎨 Feedback visual diferenciado por origem

---

**🎵 Terra MIDI - Workflow otimizado para configuração de instrumentos individuais!**

*Última atualização: 21/10/2025*
