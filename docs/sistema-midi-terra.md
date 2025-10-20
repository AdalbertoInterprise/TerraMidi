# Sistema MIDI Terra - Documentação Completa

**Data**: 16/10/2025  
**Versão**: 1.0.0  
**Autor**: Terra MIDI System

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Dispositivos Suportados](#dispositivos-suportados)
4. [Instalação e Configuração](#instalação-e-configuração)
5. [Uso do Sistema](#uso-do-sistema)
6. [Integração com Web Audio](#integração-com-web-audio)
7. [Testes e Validação](#testes-e-validação)
8. [Desenvolvimento de Novos Dispositivos](#desenvolvimento-de-novos-dispositivos)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Sistema MIDI Terra** é uma arquitetura modular para integração de dispositivos MIDI USB da Terra Eletrônica com a plataforma MusicoTerapia AI. O sistema utiliza a Web MIDI API do navegador para detectar automaticamente dispositivos conectados e rotear mensagens MIDI para handlers específicos de cada hardware.

### Características Principais

- ✅ **Auto-detecção** de dispositivos MIDI USB
- ✅ **Arquitetura modular** com device handlers independentes
- ✅ **Pitch Bend com deadzone** de 2% para evitar movimentos não intencionais
- ✅ **Osciloscópio virtual** para visualização em tempo real
- ✅ **Painel de status** com informações de dispositivos e notas ativas
- ✅ **Integração completa** com soundfontManager e audioEngine
- ✅ **Extensível** para futuros dispositivos Terra

---

## 🏗️ Arquitetura do Sistema

### Camadas da Arquitetura

```
┌─────────────────────────────────────────┐
│         Web MIDI API (Browser)          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       MIDIDeviceManager (Core)          │
│  - Detecção de dispositivos             │
│  - Decodificação de mensagens           │
│  - Roteamento de eventos                │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼──────┐      ┌────────▼────────┐
│BoardBells   │      │  Device         │
│Device       │      │  Templates      │
│(Completo)   │      │  (4 futuros)    │
└──────┬──────┘      └────────┬────────┘
       │                      │
       └──────────┬───────────┘
                  │
┌─────────────────▼─────────────────────┐
│  soundfontManager + audioEngine       │
│  - Reprodução de áudio                │
│  - Seleção de instrumentos            │
│  - Efeitos e processamento            │
└───────────────────────────────────────┘
```

### Componentes Principais

#### 1. **MIDIDeviceManager** (`js/midi/midiDeviceManager.js`)

Gerenciador central do sistema MIDI:

- **initialize()**: Inicializa Web MIDI API e escaneia dispositivos
- **scanForDevices()**: Detecta dispositivos MIDI conectados
- **connectDevice(input)**: Cria listener para dispositivo específico
- **handleMIDIMessage(event, input)**: Decodifica e roteia mensagens MIDI
- **createDeviceHandler(input)**: Identifica e instancia handler apropriado

#### 2. **BoardBellaDevice + Catalog** (`js/midi/devices/boardBellaDevice.js`, `js/midi/devices/boardBellaCatalog.js`)

Handler avançado que une controle físico (pads + knob + LED) com um catálogo dedicado de 811 instrumentos.

**Destaques:**

- Extende `TerraDevice` e aplica regras de acordes/oitavas do Board Bella
- Alterna dinamicamente entre modos **MIDI** e **HID** (com `boardBellaHIDClient` opcional)
- Usa `BoardBellaCatalog` para resolver programas, favoritos, grupos e fallback offline
- Envia broadcasts MIDI/CC globais (grupo/slot) e garante *All Notes Off* na troca de modos
- Integra-se automaticamente ao `soundfontManager` / `audioEngine` quando disponíveis

**Arquitetura interna:**

- `handleKnobRotation()` com acumulador incremental (threshold adaptativo)
- `handleKnobWithModifier()` interpreta teclas especiais (OITV, FAVOR, ACORDE, etc.)
- `clearAllNotes({ forceMidi })` garante liberação segura ao alternar para HID
- `broadcastGroupSelection()` sincroniza slots com hosts externos (CC `0x53`/`0x54`)
- `emitHIDKey()` traduz notas para códigos padrão (`Digit1` … `Digit8`)

#### 3. **BoardBellsDevice** (`js/midi/devices/boardBellsDevice.js`)

Handler completo para o dispositivo Board Bells:

**Especificações:**

- 8 notas mapeadas (C4 a C5: C, D, E, F, G, A, B, C2)
- 5 programas MIDI (0-4) para troca de instrumento
- Pitch Bend com deadzone de 2%
- Integração com soundfontManager, audioEngine, e UI

**Mensagens Suportadas:**

- **Note On/Off**: Inicia/para reprodução de notas
- **Program Change**: Troca instrumento (piano, violino, flauta, violão, harpa)
- **Pitch Bend**: Modula altura da nota (com filtragem de margem)

#### 4. **Terra Device Templates** (`js/midi/devices/terraDevicesTemplates.js`)

Classes base para futuros dispositivos:

- **TerraDevice**: Classe base com estrutura comum
- **GiroSomDevice**: Template para sensor giroscópio
- **BoardSomDevice**: Template para placa multi-sensor
- **BigKeyBoardDevice**: Template para teclado grande (12 teclas)
- **MusicalBeamDevice**: Template para feixe infravermelho

#### 5. **MIDIOscilloscope** (`js/midi/midiOscilloscope.js`)

Visualizador de pitch bend em tempo real:

- Canvas HTML5 com renderização a 60 FPS
- Indicador visual de deadzone (±2%)
- Histórico de 200 pontos
- Cores diferenciadas para valores ativos vs deadzone

#### 6. **MIDIStatusPanel** (`js/midi/midiStatusPanel.js`)

Painel de status visual:

- Lista de dispositivos conectados
- Notas ativas por dispositivo
- Programa/instrumento atual
- Indicador de conexão e atividade

---

## 🎹 Dispositivos Suportados

### 1. Board Bella ✅ (NOVO)

**Descrição**: Controlador híbrido com 8 pads capacitivos, knob incremental de alta resolução, LEDs status MIDI/HID e firmware otimizado para navegar pelo catálogo completo (811 soundfonts) sem depender de elementos extras na UI.

**Características Principais:**

- 8 pads sensíveis: DÓ, RÉ, MI, FÁ, SOL, LÁ, SI, DÓ (oitava configurável)
- Knob com leitura contínua e threshold adaptativo (detecção de passo a cada ~15% de deslocamento)
- Combinação tecla + knob para acionar modos especiais (oitava, grupos, favoritos, etc.)
- Catálogo dedicado (`BoardBellaCatalog`) com favoritos, 4 grupos x 5 slots e fallback offline
- Modo **Battery** com 3 perfis, toggle de **MIDI ↔ HID**, reinicialização rápida e limpeza de notas via knob
- Saída simultânea para **audioEngine**, **soundfontManager** e broadcast MIDI global
- Cliente HID opcional (`window.boardBellaHIDClient`) com mapeamento padrão para teclas numéricas

**Mapeamento de Notas (padrão):**

| Pad | Nota MIDI | Nome | HID padrão |
|-----|-----------|------|------------|
| 1   | 60        | C4   | Digit1     |
| 2   | 62        | D4   | Digit2     |
| 3   | 64        | E4   | Digit3     |
| 4   | 65        | F4   | Digit4     |
| 5   | 67        | G4   | Digit5     |
| 6   | 69        | A4   | Digit6     |
| 7   | 71        | B4   | Digit7     |
| 8   | 72        | C5   | Digit8     |

**Funções Especiais (tecla de referência + giro do knob):**

| Tecla pressionada | Rótulo impresso | Ação knob ↻ | Ação knob ↺ |
|-------------------|-----------------|-------------|-------------|
| Pad 1             | `OITV`          | +1 oitava   | −1 oitava   |
| Pad 2             | `8 INSTR`       | Avança 8 instrumentos | Volta 8 instrumentos |
| Pad 3             | `1 INSTR`       | Avança 1 instrumento  | Volta 1 instrumento  |
| Pad 4             | `FAVOR`         | Próximo favorito      | Favorito anterior    |
| Pad 5             | `ACORDE`        | Habilita acordes completos | Desabilita (nota raiz) |
| Pad 6             | `MODO BAT`      | Próximo modo (Off → Híbrido → Percussivo) | Modo anterior |
| Pad 7             | `MIDI/HID`      | Alterna para HID (envia release MIDI forçado) | Alterna para MIDI |
| Pad 8             | `REINIT`        | Recarrega preset inicial, zera estados | Limpa notas ativas |

> **Importante:** O hardware gerencia o modo acorde, portanto **não exibir checkboxes adicionais na UI** para o Board Bella. A UI global mantém o toggle geral, mas o handler sobrescreve dinamicamente o estado de acordes conforme o knob.

**Integração com Catálogo:**

- **Favoritos**: 10 posições (configuráveis) rotacionadas pelo knob com `FAVOR`
- **Grupos**: 4 grupos × 5 slots; sincronizados via CC `0x53` (grupo) e `0x54` (slot)
- **Program Change**: Broadcast apenas no modo MIDI, garantindo sincronismo com hosts externos
- **Fallback offline**: Se `soundfontManager` ou manifest não estiverem disponíveis, utiliza `soundfonts-manifest.json`

**Modo HID:**

- Quando ativo, envia eventos `{ type: 'key', action: 'down'/'up', code: DigitN }`
- Recebe `mode` updates via `window.boardBellaHIDClient.send({ type: 'mode', ... })`
- Notas MIDI são silenciadas, mas CC críticos (LEDs, grupo/slot) continuam sendo transmitidos
- Transição MIDI → HID dispara `All Notes Off` forçado para evitar notas presas no host

### 2. Board Bells ✅ (IMPLEMENTADO)

**Descrição**: Placa com 8 sensores de toque capacitivo em formato de sinos.

**Características:**

- 8 notas: DÓ, RÉ, MI, FÁ, SOL, LÁ, SI, DÓ (oitava superior)
- Mapeamento MIDI: Notas 60-72 (C4-C5)
- Velocity: 0-127 (normalizado para 0-1)
- Pitch Bend: ±8192 steps (±100%)
- Deadzone: 2% (±164 steps)

**Program Change:**

| Programa | Instrumento        | Key                 |
|----------|--------------------|---------------------|
| 0        | Piano de Cauda     | `piano_grand`       |
| 1        | Violino Ensemble   | `violin_ensemble`   |
| 2        | Flauta Concerto    | `flute_concert`     |
| 3        | Violão Nylon       | `guitar_nylon`      |
| 4        | Harpa Orquestral   | `harp_orchestral`   |

### 3. Giro Som 📝 (TEMPLATE)

**Descrição**: Dispositivo com sensor giroscópio para controle por movimento.

**Planejamento:**

- Rotação: Controle de parâmetros contínuos
- Velocidade: Intensity/velocity
- Eixos X/Y/Z: Múltiplos parâmetros simultâneos

### 4. Board Som 📝 (TEMPLATE)

**Descrição**: Placa multi-sensor com diferentes tipos de entrada.

**Planejamento:**

- Múltiplos sensores: Touch, pressure, proximity
- Mapeamento flexível de notas/parâmetros
- Suporte a polifonia

### 5. Big KeyBoard 📝 (TEMPLATE)

**Descrição**: Teclado grande com 12 teclas.

**Planejamento:**

- 12 teclas: Escala cromática completa
- Tamanho aumentado: Acessibilidade
- Velocity sensitiva

### 6. Musical Beam 📝 (TEMPLATE)

**Descrição**: Sensor de feixe infravermelho para controle por distância.

**Planejamento:**
 
- Detecção de distância: Controle contínuo
- Múltiplos feixes: Polifonia ou parâmetros
- Modo laser harp

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- Navegador com suporte a Web MIDI API:
  - Google Chrome 43+ ✅
  - Microsoft Edge 79+ ✅
  - Opera 30+ ✅
  - Safari 15+ (macOS) ✅
  - Firefox (via extensão) ⚠️

- Dispositivo MIDI USB conectado

### Estrutura de Arquivos

```
js/
├── midi/
│   ├── midiDeviceManager.js         # Core manager
│   ├── midiAutoReconnect.js         # Reconexão automática
│   ├── midiOscilloscope.js          # Visualizador
│   ├── midiStatusPanel.js           # Painel de status
│   └── devices/
│       ├── terraDevicesTemplates.js # Classe base TerraDevice + templates
│       ├── boardBellaCatalog.js     # Catálogo dedicado do Board Bella
│       ├── boardBellaDevice.js      # Handler Board Bella (MIDI/HID)
│       ├── boardBellsDevice.js      # Handler Board Bells
│       └── midiTerraDevice.js       # Handler Midi-Terra

css/
└── midi-ui.css                      # Estilos do sistema MIDI

index.html                           # Importação de scripts
```

### Inclusão no HTML

**CSS:**
```html
<link rel="stylesheet" href="css/midi-ui.css">
```

**Scripts (ordem crítica):**

```html
<!-- Sistema MIDI -->
<script src="js/midi/midiDeviceManager.js"></script>
<script src="js/midi/midiAutoReconnect.js"></script>
<script src="js/midi/devices/boardBellsDevice.js"></script>
<script src="js/midi/devices/terraDevicesTemplates.js"></script>
<script src="js/midi/devices/boardBellaCatalog.js"></script>
<script src="js/midi/devices/boardBellaDevice.js"></script>
<script src="js/midi/devices/midiTerraDevice.js"></script>
<script src="js/midi/midiOscilloscope.js"></script>
<script src="js/midi/midiStatusPanel.js"></script>
```

**Elementos HTML:**
```html
<!-- Painel de Status -->
<div id="midi-status-panel"></div>

<!-- Osciloscópio -->
<div class="oscilloscope-container">
    <canvas id="midi-oscilloscope" width="800" height="200"></canvas>
</div>
```

### Inicialização no app.js

O sistema é inicializado automaticamente após o audioEngine e soundfontManager:

```javascript
// Inicializar sistema MIDI
if (window.MIDIDeviceManager && window.soundfontManager && window.audioEngine) {
    window.midiManager = new MIDIDeviceManager();
    window.midiManager.initialize().then(() => {
        // Configurar callbacks
        window.midiManager.onDeviceConnected = (device) => {
            window.midiStatusPanel?.addDevice(device);
        };
        
        window.midiManager.onDeviceDisconnected = (deviceId) => {
            window.midiStatusPanel?.removeDevice(deviceId);
        };
    });
}

// Inicializar painel e osciloscópio
window.midiStatusPanel = new MIDIStatusPanel('midi-status-panel');
window.midiOscilloscope = new MIDIOscilloscope('midi-oscilloscope');
```

---

## 🎮 Uso do Sistema

### Auto-detecção de Dispositivos

1. **Conecte o dispositivo Terra via USB**
2. **Abra a aplicação no navegador**
3. **Sistema detecta automaticamente** e exibe no painel

### Monitoramento em Tempo Real

**Painel de Status:**
- 🟢 **Dispositivos conectados**: Lista com ícones
- 🎵 **Notas ativas**: Badges coloridos por nota
- 🎼 **Instrumento atual**: Nome e número do programa
- 📊 **Estatísticas**: Total de notas tocadas

**Osciloscópio:**
- 📈 **Forma de onda**: Histórico de pitch bend
- 🎯 **Indicador de deadzone**: Zona amarela (±2%)
- 🔢 **Valores numéricos**: Percentual em tempo real
- 🎨 **Cores**: Verde = ativo, Cinza = deadzone

### Troca de Instrumentos (Board Bells)

**Via MIDI Program Change:**
1. Dispositivo envia Program Change (0-4)
2. Sistema mapeia para instrumento correspondente
3. soundfontManager carrega novo preset
4. Painel atualiza exibição

**Tabela de Programas:**
```
P0 → Piano de Cauda
P1 → Violino Ensemble
P2 → Flauta Concerto
P3 → Violão Nylon
P4 → Harpa Orquestral
```

### Pitch Bend com Deadzone

**Deadzone de 2%:**
- **Centro**: 8192 (0%)
- **Deadzone**: 8028 - 8356 (±2%)
- **Range completo**: 0 - 16383 (±100%)

**Comportamento:**
- Movimentos dentro da deadzone → ignorados
- Movimentos fora da deadzone → aplicados
- Reduz tremor e movimentos não intencionais

---

## 🔊 Integração com Web Audio

### Fluxo de Reprodução

```
MIDI Device → Note On Message
     ↓
BoardBellsDevice.handleNoteOn()
     ↓
soundfontManager.startSustainedNote(noteName, velocity)
     ↓
WebAudioFontPlayer.queueWaveTable()
     ↓
audioEngine.audioContext.destination
     ↓
Alto-falantes 🔊
```

### Integração com soundfontManager

**Board Bells → soundfontManager:**

```javascript
// Note On
const normalizedVelocity = message.velocity / 127;
this.soundfontManager.startSustainedNote(noteName, normalizedVelocity);

// Note Off
this.soundfontManager.stopSustainedNote(message.note);

// Program Change
this.soundfontManager.loadInstrument(instrumentKey, {
    setCurrent: true,
    clearKit: false
});
```

### Passagem de Referências

**No app.js:**

```javascript
// Dispositivos recebem referências via setAudioIntegration
if (window.midiManager.connectedDevices) {
    window.midiManager.connectedDevices.forEach(device => {
        if (device.handler) {
            device.handler.setAudioIntegration(
                window.soundfontManager,
                window.audioEngine
            );
        }
    });
}
```

---

## 🧪 Testes e Validação

### Testes com Board Bells

#### 1. Teste de Notas

**Objetivo**: Verificar mapeamento correto de notas.

**Procedimento:**
1. Conectar Board Bells via USB
2. Abrir Console do navegador (F12)
3. Tocar cada nota sequencialmente
4. Verificar logs no console:
   ```
   🎵 Board Bells: Note ON - C (MIDI 60) | Velocity: 64
   ✅ Áudio iniciado para C
   ```
5. Verificar painel mostra nota ativa
6. Soltar nota e verificar Note OFF:
   ```
   🎵 Board Bells: Note OFF - C (MIDI 60)
   ✅ Áudio parado para C
   ```

**Resultado Esperado:**
- ✅ Todas as 8 notas reproduzem áudio
- ✅ Notas aparecem/desaparecem do painel
- ✅ Sem erros no console

#### 2. Teste de Program Change

**Objetivo**: Validar troca de instrumentos.

**Procedimento:**
1. Com Board Bells conectado
2. Enviar Program Change 0-4 via dispositivo ou MIDI tool
3. Verificar console:
   ```
   🎼 Board Bells: Program Change - 1
   🎹 Trocando para instrumento: violin_ensemble
   ✅ Instrumento violin_ensemble carregado
   ```
4. Tocar nota e confirmar timbre mudou
5. Verificar painel mostra instrumento correto

**Resultado Esperado:**
- ✅ Instrumento troca corretamente
- ✅ Painel atualiza nome do instrumento
- ✅ Áudio usa novo preset

#### 3. Teste de Pitch Bend

**Objetivo**: Validar deadzone e visualização.

**Procedimento:**
1. Abrir osciloscópio visual
2. Mover pitch bend wheel/slider sutilmente (< 2%)
3. Verificar:
   - Console NÃO mostra logs
   - Osciloscópio mostra linha cinza na deadzone
   - Valor efetivo permanece em 0%
4. Mover pitch bend > 2%
5. Verificar:
   ```
   🎚️ Board Bells: Pitch Bend - 5.23% (raw: 8620)
   ```
   - Osciloscópio mostra linha verde
   - Valor efetivo muda

**Resultado Esperado:**
- ✅ Movimentos < 2% ignorados
- ✅ Movimentos > 2% processados
- ✅ Visualização correta no osciloscópio

### Simulação MIDI (Sem Hardware)

**Ferramenta Recomendada**: [MIDI-OX](http://www.midiox.com/) (Windows) ou [MIDI Monitor](https://www.snoize.com/MIDIMonitor/) (macOS)

**Criar dispositivo virtual:**

1. **Windows** (loopMIDI):
   - Instalar [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
   - Criar porta virtual: "Terra Board Bells"
   - Enviar mensagens MIDI via MIDI-OX

2. **macOS** (IAC Driver):
   - Abrir Audio MIDI Setup
   - Habilitar IAC Driver
   - Criar porta: "Terra Board Bells"
   - Enviar via MIDI Monitor

**Mensagens de Teste:**

```
Note On:  90 3C 64  (Canal 1, Nota 60 (C4), Velocity 100)
Note Off: 80 3C 40  (Canal 1, Nota 60, Velocity 64)
Program:  C0 01     (Canal 1, Programa 1)
PitchBend: E0 00 50 (Canal 1, Valor 10240 = +25%)
```

---

## 🛠️ Desenvolvimento de Novos Dispositivos

### Template Base

Todos os dispositivos herdam de `TerraDevice`:

```javascript
class NovoDispositivo extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager);
        
        // Configurações específicas
        this.config = {
            // ... parâmetros
        };
        
        // Estado específico
        this.state = {
            // ... variáveis
        };
    }
    
    handleMessage(message) {
        // Processar mensagens MIDI
        switch (message.type) {
            case 'noteOn':
                this.handleNoteOn(message);
                break;
            // ...
        }
    }
    
    handleNoteOn(message) {
        // Lógica específica
    }
    
    // Outros handlers...
}
```

### Checklist de Implementação

#### 1. Criar Classe do Dispositivo

- [ ] Estender `TerraDevice`
- [ ] Definir `config` com parâmetros
- [ ] Inicializar `state` com variáveis
- [ ] Implementar `handleMessage()`
- [ ] Criar handlers para cada tipo de mensagem

#### 2. Mapeamento MIDI

- [ ] Definir notas/parâmetros MIDI
- [ ] Criar tabela de mapeamento
- [ ] Documentar ranges e escalas

#### 3. Integração com Áudio

- [ ] Implementar `setAudioIntegration()`
- [ ] Chamar `soundfontManager.startSustainedNote()`
- [ ] Chamar `soundfontManager.stopSustainedNote()`
- [ ] (Opcional) Carregar instrumentos via `loadInstrument()`

#### 4. Integração com UI

- [ ] Atualizar `window.midiStatusPanel` (notas ativas)
- [ ] (Opcional) Atualizar osciloscópio ou visualizador customizado
- [ ] Callbacks customizados (onNoteOn, onProgramChange, etc.)

#### 5. Registro no Manager

Adicionar no `createDeviceHandler()` de `midiDeviceManager.js`:

```javascript
createDeviceHandler(input) {
    const deviceName = input.name.toLowerCase();
    
    if (deviceName.includes('novo dispositivo')) {
        console.log('✅ Criando handler para Novo Dispositivo');
        const handler = new NovoDispositivo(input, this);
        handler.setAudioIntegration(this.soundfontManager, this.audioEngine);
        return handler;
    }
    
    // ...
}
```

#### 6. Testes

- [ ] Conectar dispositivo físico
- [ ] Verificar auto-detecção
- [ ] Testar todas as mensagens MIDI
- [ ] Validar reprodução de áudio
- [ ] Confirmar atualização de UI
- [ ] Documentar comportamento

### Exemplo Completo: Giro Som

```javascript
class GiroSomDevice extends TerraDevice {
    constructor(midiInput, manager) {
        super(midiInput, manager);
        
        this.config = {
            name: 'Giro Som',
            rotationCC: 1,  // CC#1 para rotação
            speedCC: 2,     // CC#2 para velocidade
        };
        
        this.state = {
            rotation: 0,
            speed: 0,
            isActive: false
        };
    }
    
    handleMessage(message) {
        if (message.type === 'controlChange') {
            this.handleControlChange(message);
        }
    }
    
    handleControlChange(message) {
        if (message.controller === this.config.rotationCC) {
            this.state.rotation = message.value;
            this.updateRotation();
        } else if (message.controller === this.config.speedCC) {
            this.state.speed = message.value;
            this.updateSpeed();
        }
    }
    
    updateRotation() {
        const angle = (this.state.rotation / 127) * 360;
        console.log(`🌀 Giro Som: Rotação ${angle.toFixed(1)}°`);
        
        // Mapear rotação para parâmetro musical
        // Exemplo: controlar panning
        if (this.audioEngine) {
            const panValue = (this.state.rotation / 127) * 2 - 1; // -1 a +1
            // this.audioEngine.setPan(panValue);
        }
    }
    
    updateSpeed() {
        const velocity = this.state.speed / 127;
        console.log(`💨 Giro Som: Velocidade ${(velocity * 100).toFixed(1)}%`);
        
        // Mapear velocidade para intensidade
        // Exemplo: controlar volume ou efeitos
    }
}
```

---

## 🐛 Troubleshooting

### Dispositivo Não Detectado

**Sintoma**: Board Bells conectado mas não aparece no painel.

**Diagnóstico:**
1. Verificar se navegador suporta Web MIDI API:
   ```javascript
   if (navigator.requestMIDIAccess) {
       console.log('✅ Web MIDI API suportada');
   } else {
       console.log('❌ Web MIDI API NÃO suportada');
   }
   ```

2. Verificar permissões MIDI (Chrome requer permissão explícita)

3. Inspecionar dispositivos detectados:
   ```javascript
   window.midiManager.connectedDevices.forEach(device => {
       console.log(device.name, device.id);
   });
   ```

**Soluções:**
- ✅ Usar navegador compatível (Chrome, Edge)
- ✅ Conceder permissão MIDI quando solicitado
- ✅ Reconectar dispositivo USB
- ✅ Verificar nome do dispositivo contém "board bells" (case-insensitive)

### Áudio Não Reproduz

**Sintoma**: Notas aparecem no painel mas não há som.

**Diagnóstico:**
1. Verificar soundfontManager iniciado:
   ```javascript
   console.log(window.soundfontManager);
   ```

2. Verificar audioContext desbloqueado:
   ```javascript
   console.log(window.audioEngine.audioContext.state);
   // Deve ser 'running', não 'suspended'
   ```

3. Verificar preset carregado:
   ```javascript
   console.log(window.soundfontManager.currentPreset);
   ```

**Soluções:**
- ✅ Clicar em qualquer lugar da página para desbloquear áudio
- ✅ Aguardar carregamento completo dos presets
- ✅ Verificar volume do sistema operacional
- ✅ Trocar instrumento via Program Change

### Pitch Bend Não Funciona

**Sintoma**: Movimentos de pitch bend não têm efeito.

**Diagnóstico:**
1. Verificar mensagens recebidas:
   ```javascript
   window.debugMode = true; // Habilitar logs
   ```

2. Verificar osciloscópio atualiza:
   ```javascript
   console.log(window.midiOscilloscope.getStats());
   ```

**Soluções:**
- ✅ Mover pitch bend > 2% (fora da deadzone)
- ✅ Verificar se dispositivo envia mensagens Pitch Bend (0xE0)
- ✅ Conferir se osciloscópio foi inicializado

### Console Cheio de Warnings

**Sintoma**: Muitos warnings de "nota não mapeada" ou similares.

**Diagnóstico:**
1. Verificar range de notas MIDI enviadas:
   ```javascript
   // Board Bells espera notas 60-72
   ```

2. Conferir se dispositivo está enviando messages inesperadas

**Soluções:**
- ✅ Ajustar mapeamento de notas no handler
- ✅ Filtrar mensagens não suportadas
- ✅ Adicionar suporte para novas mensagens

---

## 📚 Referências

### Web MIDI API
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [W3C Specification](https://www.w3.org/TR/webmidi/)

### MIDI Protocol
- [MIDI 1.0 Specification](https://www.midi.org/specifications/midi-1-0)
- [MIDI Message Types](https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message)

### Web Audio API
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio Specification](https://www.w3.org/TR/webaudio/)

---

## 📝 Notas de Versão

### v1.0.0 (16/10/2025)

**Implementado:**
- ✅ MIDIDeviceManager com auto-detecção
- ✅ BoardBellsDevice completo
- ✅ Templates para 4 dispositivos futuros
- ✅ MIDIOscilloscope com deadzone visual
- ✅ MIDIStatusPanel com UI completa
- ✅ Integração com soundfontManager e audioEngine
- ✅ CSS moderno com dark theme
- ✅ Documentação completa

**Próximos Passos:**
- 📝 Implementar GiroSomDevice
- 📝 Implementar BoardSomDevice
- 📝 Implementar BigKeyBoardDevice
- 📝 Implementar MusicalBeamDevice
- 📝 Adicionar suporte a MIDI 2.0
- 📝 Implementar gravação de sessões MIDI

---

## 🤝 Contribuindo

Para adicionar suporte a novos dispositivos Terra:

1. **Clone o template** de `terraDevicesTemplates.js`
2. **Implemente os handlers** de mensagens MIDI
3. **Teste com dispositivo físico**
4. **Documente** mapeamento e características
5. **Adicione ao manager** em `createDeviceHandler()`

---

## 📧 Suporte

Para questões e suporte técnico:
- **GitHub Issues**: [repositório do projeto]
- **Email**: suporte@terraeletronica.com.br
- **Documentação**: Este arquivo

---

**Desenvolvido com ❤️ para MusicoTerapia AI**  
Terra Eletrônica © 2025
