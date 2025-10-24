# Base Sistema TerraMidi – Guia para Agentes de Programação

> **Objetivo:** condensar os conhecimentos imprescindíveis para qualquer agente de programação que vá evoluir ou manter o TerraMidi, garantindo domínio técnico sobre MIDI, áudio web, UI musical e a arquitetura progressiva da plataforma.

---

## 1. Competências Essenciais

| Domínio | Por que é crítico | Principais artefatos de referência |
| --- | --- | --- |
| **Desenvolvimento Web (JavaScript ES6+)** | Toda a lógica do TerraMidi é modularizada em JavaScript (sem frameworks). É necessário compreender closures, modules, async/await e padrão publisher/subscriber utilizado em diversas partes do código. | `js/app.js`, `js/utils/dependencyLoader.js`, `js/ui/` |
| **Web MIDI API** | Responsável por negociar permissões, conectar controladores físicos e tratar mensagens `noteOn`, `noteOff`, `controlChange`, entre outras. | `js/midi/midiDeviceManager.js`, `js/midi/midiPermissionManager.js`, `docs/PROTOCOLO_MIDI_COMPLETO_IMPLEMENTADO.md` |
| **Web Audio API & Soundfonts** | Criação de contexto de áudio, síntese e carregamento de soundfonts pesadas. Inclui envelopes, polifonia e otimizações de memória. | `js/audioEngine.js`, `js/soundfontManager.js`, `js/synth/tibetanBowlSynth.js`, `soundfonts/` |
| **UI/UX Musical** | Interfaces adaptadas a músicos (teclados virtuais, seletor de instrumentos, feedback visual por nota). | `js/ui/virtual-keyboard.js`, `css/midi-ui.css`, `docs/GALERIA_SOUNDFONTS_INTERFACE_APP.md` |
| **Integração Hardware MIDI (WebMIDI/WebUSB)** | Filtra dispositivos Terra, gerencia reconexões, mantém exclusividade de canal. | `js/midi/midiAutoReconnect.js`, `js/midi/midiInitializationFlowManager.js`, `js/midi/devices/` |
| **Desenvolvimento Modular & Arquitetura** | Organização em camadas para permitir extensões (Board Bells, Giro Som etc.). | `js/` (estrutura modular), `docs/IMPLEMENTATION-COMPLETE.md` |
| **Tratamento de Erros & Observabilidade** | Logs ricos em cada fase (MIDI, áudio, cache, soundfonts) e mecanismos de fallback. | `js/midi/midiDiagnostics.js`, `js/midi/midiStatusPanel.js`, `js/logging/` (se aplicável), `docs/CORRECAO_RECONEXAO_RELOAD.md` |
| **PWA & Caching Avançado** | Sistema multilayer de cache, instalador agressivo e suporte offline completo. | `sw.js`, `js/advancedInstaller.js`, `js/advancedInstallerUI.js`, `docs/ADVANCED-INSTALLER-GUIDE.md` |

> **Dica:** trate cada módulo como um subsistema isolado com contratos claros (métodos públicos e eventos). Isso facilita simulações durante o desenvolvimento.

---

## 2. Visão Geral da Arquitetura

```text
TerraMidi/
├─ index.html             # Shell principal
├─ styles.css             # Entrada CSS global
├─ js/
│  ├─ app.js              # Orquestração e bootstrap
│  ├─ audioEngine.js      # Contexto Web Audio & roteamento DSP
│  ├─ soundfontManager.js # Carregamento de bancos SF2/SF3
│  ├─ instrumentLoader.js # Empacotamento de instrumentos
│  ├─ midi/               # Stack de dispositivos e protocolo MIDI
│  ├─ ui/                 # Componentes de interface musical
│  ├─ utils/              # Helpers (mapeamentos, loaders, sustain)
│  ├─ synth/              # Sintetizadores proprietários
│  └─ ...
├─ css/                   # Camadas temáticas e layouts
├─ soundfonts/            # Manifestos e pacotes de instrumentos
├─ docs/                  # Base de conhecimento técnico
├─ scripts/               # Ferramentas Node (build/validação)
└─ sw.js                  # Service worker com cache offline
```

### Fluxo de Inicialização

1. `index.html` carrega assets críticos (`styles.css`, `js/app.js`).
2. `MusicTherapyApp.init()` (em `js/app.js`) registra listeners, inicializa cache e prepara módulos MIDI/áudio.
3. `setupAdvancedInstaller()` habilita o instalador PWA (ver `docs/IMPLEMENTATION-COMPLETE.md`).
4. Dispositivos MIDI são negociados via `midiPermissionManager` e `midiDeviceManager`.
5. `audioEngine` cria o `AudioContext`, injeta nodes auxiliares (chorus, reverb, MIDI mixers).
6. UI é sincronizada com estado musical (selectors, teclado virtual, painéis de status).

### Responsabilidades por Camada

- **Camada Core (`js/app.js`)**: gerencia ciclo de vida, inicialização modular e eventos globais.
- **Camada de Dispositivos (`js/midi/`)**: abstrai drivers, reconexão e roteamento de mensagens.
- **Camada Sonora (`js/audioEngine.js`, `js/soundfontManager.js`)**: traduz mensagens MIDI em áudio.
- **Camada de Interface (`js/ui/`, `css/`)**: exibe instrumentos, progresso de instalação e diagnósticos.
- **Camada Offline (`sw.js`, `js/advancedInstaller*.js`)**: garante uso offline e sincronização de ativos grandes.

---

## 3. Subsistemas Críticos

### 3.1 MIDI Pipeline

- **Permissões & Inicialização**: `midiPermissionManager` lida com `navigator.requestMIDIAccess`, timeouts e re-prompts. `midiInitializationFlowManager` coordena a ordem correta (gesto do usuário → requisição → binding de eventos).
- **Gerenciamento de Dispositivos**: `midiDeviceManager` mapeia entradas/saídas, priorizando o Midi-Terra. A pasta `js/midi/devices/` contém handlers específicos (ex.: `boardBellsDevice`).
- **Reconexão & Diagnósticos**: `midiAutoReconnect` tenta recuperar sessões perdidas, enquanto `midiStatusPanel` e `midiDiagnostics` exibem informações em tempo real no UI.
- **Protocolo Completo**: veja `docs/PROTOCOLO_MIDI_COMPLETO_IMPLEMENTADO.md` para o contrato de cada mensagem (`noteOn`, `pitchBend`, `controlChange`, `aftertouch`).
- **Gestão polifônica**: o driver mantém um *mapa de notas ativas* por canal, emitindo um `noteOn` independente para cada nota recebida (mesmo em acordes) e finalizando-as apenas quando o `noteOff` correspondente chega ou quando o `controlChange` **CC123** (All Notes Off) é disparado.

#### Fluxo polifônico dos instrumentos Terra

1. **Escuta**: cada handler (`boardBellsDevice`, `midiTerraDevice`, etc.) observa eventos `noteOn` pelo canal configurado (ex.: canal 5 para Board Bells).
2. **Disparo individual**: para acordes enviados por instrumentos de oito teclas, o sistema cria mensagens `noteOn` autônomas para cada nota do acorde, preservando a `velocity` e repassando-as ao `virtual-keyboard` e ao `audioEngine`.
3. **Estado ativo**: `midiPerformanceEngine` e os drivers armazenam as notas em coleções por canal para controlar sustain, aftertouch e reenvio para o sintetizador virtual.
4. **Encerramento**: cada `noteOff` encerra a nota específica; se o hardware enviar CC123, o driver chama `stopAllNotes()` para encerrar todas as notas do canal com debounce seguro.
5. **Encaminhamento**: o pipeline encaminha as notas ao mecanismo de síntese configurado (soundfonts ou sintetizadores custom) garantindo polifonia ilimitada dentro dos limites do `audioEngine`.

> **Atualização 2025-10:** os drivers MidiTerra, Board Bells e Board Bella agora registram cada `noteOn` em pilhas por nota (Map → Array) com identificadores únicos. Isso evita que disparos rápidos substituam vozes ainda sustentadas, garante flush correto do pedal de sustain (CC64) e permite que o painel de status reflita exatamente quantas instâncias ativas/pedentes existem por nota.

> **Boas práticas:** mantenha testes de acordes em conjunto com o `virtual-keyboard` para garantir que o tratamento polifônico continue consistente após refactors.

##### Checklist da correção de emissão de acordes

- **Agrupamento temporal**: confirme que dispositivos como `boardBellsDevice` utilizam janelas curtas (ex.: `BOARD_BELLA_CHORD_WINDOW_MS`) para capturar várias teclas físicas e expandir o acorde em múltiplos `noteOn` lógicos.
- **Encaminhamento virtual**: os `noteOn` gerados precisam ser enviados tanto ao `virtual-keyboard` (para feedback visual) quanto ao `midiPerformanceEngine`/`audioEngine` (para síntese real), preservando `velocity` e canal.
- **Matriz de notas ativas**: mantenha estruturas (`Map`/`Set`) por canal e por instrumento para liberar cada nota com seu `noteOff` correspondente e permitir auditoria de notas pendentes.
- **Pânico com CC123**: implemente `handleControlChange` para interceptar o **CC123** em todos os drivers Terra, acionando `stopAllNotes()` e limpando a matriz de notas ativas antes de encaminhar o evento ao `midiPerformanceEngine`.
- **Canal dedicado**: valide que cada instrumento interligado (ex.: Board Bells no canal 5) roteia acordes completos para o canal correto, evitando colisões com outros dispositivos ou camadas de arranjo.

#### Perfis de dispositivos Board Terra

- **Board Bells (canal 5)**
  - Emite até 8 teclas físicas mas, via modo acorde, dispara coleções de `noteOn` sobrepostas. O driver converte cada tecla em múltiplas notas lógicas respeitando o `chordWindow` configurado.
  - Mantém pilhas por nota (`activeNotes` + `pendingSustainNotes`) com IDs únicos, suportando múltiplos disparos consecutivos da mesma tecla, liberando sustain de forma determinística e atualizando o painel de status com base nas contagens reais.
  - Navegação de soundfonts usa `programChange` incremental: compara o valor MIDI anterior com o atual (0-127) para decidir rotação em carrossel de 811 instrumentos. A lógica inclui *wrap-around* (127→0 e 0→127) e atualiza a UI simulando cliques nos botões `SPIN-UP`/`SPIN-DOWN`.
  - Precisa manter cache do último `programChange` e sincronizar com `virtualKeyboard` assignments para garantir que alterações instantâneas reflitam na camada visual/sonora.

- **Board Bella (canal 1)**
  - Agrupa cinco slots por grupo e suporta modos especiais (`OITV`, `ACORDE`, `MODO_BAT`). Cada modo altera o roteamento das mensagens e o contexto do acorde que será expandido no Board Bells.
  - Cada tecla física agora empilha entradas independentes, preservando `velocity`/oitava e só liberando HID/MIDI quando a pilha zera; isso elimina notas presas em acordes rápidos e mantém o `virtualKeyboard` sincronizado.
  - Requer integração com `boardBellaCatalog` para fornecer favoritos e grupos; o catálogo contém 811 soundfonts e deve ser carregado antes de aceitar comandos físicos. Use `ensureCatalog()` para validar o estado.
  - Usa o mesmo `BOARD_BELLA_CHORD_WINDOW_MS` para agrupar teclas e gerar acordes que, posteriormente, são redistribuídos ao Board Bells ou ao `virtualKeyboard` conforme configuração de canal.

- **Midi-Terra Controller**
  - Funciona como *hub* primário e, quando `setVirtualKeyboard()` é chamado, propaga automaticamente a instância para o Board Bells. O método `initializeBoardBellsHandler()` garante que mensagens do canal 5 sejam roteadas, mantendo acordes consistentes entre dispositivos.
  - `routeToBoardBells()` aceita mensagens `noteOn`, `noteOff`, `controlChange` (incluindo CC123 e sustain) e `programChange`, permitindo que o Midi-Terra sirva como proxy quando o Board Bells estiver conectado via rede.

### 3.2 Engine de Áudio & Soundfonts

- **`audioEngine.js`**: instancia `AudioContext`, cria mixers por canal e gerencia envelopes ADSR.
- **`soundfontManager.js`**: cuida do carregamento on-demand de soundfonts pesadas com fallback progressivo.
- **`instrumentLoader.js`**: garante que cada instrumento virtual tenha os assets corretos (imagens, timbres, presets).
- **`tibetanBowlSynth.js`**: exemplo de sintetizador custom que mistura síntese aditiva com samples.
- **Manifestos**: `soundfonts-manifest.json` e `docs/RESUMO_SOUNDFONTS.md` explicam a taxonomia de bancos.

### 3.3 Interface Musical

- **Componentes**: `virtual-keyboard.js`, `instrumentSelector.js`, `catalogList.js` coordenam interação.
- **Estilos**: CSS modular com diretórios `css/0-settings`, `css/1-base` e arquivos temáticos (`midi-ui.css`, `virtual-keyboard.css`).
- **Acessibilidade**: teclas respondem a teclado físico e mouse/touch, com feedback visual e sonoro.
- **Indicadores de soundfont**: cada tecla exibe apenas o número do soundfont ativo através do `vk-key-indicator` (sem texto duplicado). O nome completo continua disponível via tooltip da tecla, mantendo UX limpa para o Board Bells. O indicador agora é centralizado em todas as teclas (padrão e personalizadas) e o número exibido é sempre sincronizado com o assignment realmente ativo no teclado virtual.
- **vk-soundfont-wrapper** *(Atualização 2025-10-30)*: a seleção de soundfont personalizada agora aplica o preset apenas à tecla aberta no painel, mesmo com o bloqueio rápido desativado. O evento global `virtual-keyboard-assignment-changed` passa a enviar `changedNote` e `instrumentKey` junto com um snapshot imutável dos assignments, evitando que listeners modifiquem o estado interno do teclado virtual.
- **Notas fora do layout** *(Atualização 2025-10-24)*: o `virtual-keyboard` agora dispara áudio mesmo quando a nota enviada pelo dispositivo não possui elemento visual correspondente. Os acordes completos enviados pelos controladores Terra são renderizados integralmente (via áudio e MIDI), garantindo que comandos de extensão/clusters soem mesmo fora do range físico do painel.

### 3.4 PWA & Offline

- **Instalador Avançado**: `advancedInstaller.js` + `advancedInstallerUI.js` organizam cache em 4 camadas (Cache Storage, OPFS, File System Access, IndexedDB).
- **Service Worker (`sw.js`)**: aplica estratégias de `stale-while-revalidate` e pré-cache.
- **Scripts de manutenção**: `scripts/verify-security.js` e `scripts/validate-no-duplicates.js` previnem builds inconsistentes.

### 3.5 Segurança & API

- **`secureAPIClient.js`**: abstrai chamadas autenticadas à rede Terra.
- **Proteções**: tokens e endereços sensíveis são isolados; logs devem mascarar dados de instrumentos proprietários.

---

## 4. Ambiente de Desenvolvimento

1. **Pré-requisitos**
   - Node.js >= 18
   - Python 3 (para servidor HTTP simples)
   - Navegador Chromium/Firefox com suporte Web MIDI

1. **Instalação de dependências**

```cmd
cd TerraMidi
npm install
```

1. **Servir em ambiente local**

```cmd
npm run dev:python
```

> Alternativa com Netlify: `npm run dev`

1. **Scripts úteis**
   - `npm run verify-duplicates`: impede duplicação de classes CSS/JS
   - `npm run verify-security`: varre tokens e endpoints sensíveis
   - `npm run sync-soundfonts`: sincroniza manifestos de soundfonts

1. **Build & Deploy**
   - Build estático: `npm run build`
   - Deploy produção (Netlify): `npm run deploy`

---

## 5. Processos Operacionais Essenciais

### 5.1 Adicionar um novo instrumento virtual

1. Registrar soundfonts no `soundfonts-manifest.json` e criar assets em `soundfonts/`.
2. Atualizar `instrumentLoader.js` com metadados (nome, categoria, presets disponíveis).
3. Mapear notas/pads em `js/utils/noteMappingUtils.js`.
4. Ajustar UI (`js/ui/instrumentSelector.js`) para expor o instrumento.
5. Validar áudio em `audioEngine` garantindo polifonia e envelopes.
6. Atualizar documentação (`docs/GALERIA_SOUNDFONTS_INTERFACE_APP.md`).

### 5.2 Integrar um novo dispositivo MIDI físico

1. Criar driver em `js/midi/devices/<nomeDevice>.js` extendendo o contrato padrão (`handleMessage`, `stopAllNotes`).
2. Registrar no `midiDeviceManager` com filtros de vendor/product ID.
3. Garantir que o driver trate acordes disparando múltiplos `noteOn` sequenciais, persista notas em estruturas por canal e respeite `velocity`/`aftertouch`.
4. Implementar estratégias de reconexão (`midiAutoReconnect`).
5. Validar mensagens críticas: `noteOn` simultâneas, `noteOff` correspondentes, `controlChange` CC64 (sustain) e **CC123** (All Notes Off) para prevenir notas presas.
6. Atualizar painel de status (`midiStatusPanel`) registrando canais ativos e contagem de notas em execução.

### 5.3 Garantir experiência offline completa

1. Testar fluxo do `advancedInstallerUI` clicando em "📲 Instalar App".
2. Monitorar eventos `terra-installation-progress` no console.
3. Confirmar presença de assets em Cache Storage, OPFS e IndexedDB.
4. Simular falta de rede (`DevTools > Network > Offline`) e validar funcionamento geral.

---

## 6. Boas Práticas de Código

- **Modularidade**: cada arquivo exporta uma classe ou função principal. Evite globais exceto os já definidos (`window.MusicTherapyApp` etc.).
- **Assíncrono seguro**: todos os carregamentos de soundfonts utilizam `async/await` com `try/catch` e logs significativos.
- **Logs padronizados**: use prefixos `[MIDI]`, `[AUDIO]`, `[CACHE]` para facilitar filtros.
- **Fallbacks obrigatórios**: sempre prever navegadores sem WebMIDI/WebUSB, ativando modo legado (`docs/PROTOCOLO_MIDI_COMPLETO_IMPLEMENTADO.md`).
- **UX responsiva**: atualize elementos visuais a partir de `requestAnimationFrame` quando possível para evitar jank.
- **Config centralizada**: mantenha constantes e selectors em objetos únicos (`js/utils/initializationChecker.js`, `docs/IMPLEMENTATION-COMPLETE.md`).
- **Controle de notas ativas**: normalize o uso de estruturas (`Map`, `Set`) por canal para garantir `stopAllNotes()` consistente e facilitar auditoria de acordes complexos.

---

## 7. Testes, Debug & Observabilidade

| Situação | Ação Recomendada | Ferramentas |
| --- | --- | --- |
| Verificar permissões MIDI | Inspecionar `navigator.permissions.query({name: "midi"})` e logs do `midiPermissionManager`. | DevTools Console |
| Diagnóstico de latência | Ativar `midiOscilloscope.js` e monitorar tempo entre `noteOn` e áudio. | Painel oculto em UI |
| Falhas de soundfont | Conferir `soundfontManager` (promessas rejeitadas) e verificar cache em IndexedDB. | DevTools Application |
| Erros de cache | Usar `window.advancedInstallerUI.clearCache()` e reinstalar. | Console após ctrl+shift+R |
| Consistência de classes | `npm run verify-duplicates`. | Terminal |

> **Logs críticos** ficam disponíveis em `NOTAS_TECNICAS_MODIFICACOES.js` e nos arquivos de correção em `docs/`.

---

## 8. Troubleshooting Rápido

1. **Sem áudio após reconexão**: chamar `audioEngine.reset()` (exposição pública em `app.js`) e reprocessar soundfonts.
2. **CC123 não desliga notas**: verificar drivers específicos (`js/midi/devices/boardBellsDevice.js`) e confirmar merge com implementação mais recente do protocolo completo.
3. **Notas duplicadas ou faltando em acordes**: validar que o driver mantém estado por canal, investigar tratamentos de `noteOn` repetidos com mesma `noteNumber`, revisar a ordem de `noteOff` enviados pelo hardware e ajustar a janela de agrupamento (`BOARD_BELLA_CHORD_WINDOW_MS` ou similar) quando necessário.
4. **Instalador PWA não exibe modal**: checar se `beforeinstallprompt` foi capturado (`window.deferredPrompt`), além de garantir HTTPS/localhost.
5. **Atrasos no carregamento offline**: validar que OPFS e IndexedDB receberam os blocos (DevTools > Application > Storage).
6. **Instrumento não aparece no catálogo**: confirmar inclusão no array base de `catalogManager` e correspondência com CSS (`css/instrument-grid.css`).

---

## 9. Referências Internas

- `docs/IMPLEMENTATION-COMPLETE.md`: detalhes do instalador avançado.
- `docs/PROTOCOLO_MIDI_COMPLETO_IMPLEMENTADO.md`: manual definitivo das mensagens MIDI tratadas.
- `docs/GUIA_FLUXO_MIDI_OTIMIZADO.md`: foco em performance e debouncing.
- `docs/GALERIA_SOUNDFONTS_INTERFACE_APP.md`: visão geral visual dos instrumentos.
- `docs/GUIA-INSTALACAO-PWA.md`: passos para publicação como app instalável.
- `docs/RESUMO_IMPLEMENTACAO_MIDI_ROBUSTO.md`: histórico de correções críticas.

---

## 10. Checklists Essenciais para PRs

- [ ] Atualizar documentação relevante ao mexer em MIDI, soundfonts ou instalador.
- [ ] Rodar `npm run verify-duplicates` e `npm run verify-security`.
- [ ] Testar em pelo menos um navegador com WebMIDI (Chrome/Edge) e um fallback (Firefox/Safari).
- [ ] Validar cache offline após mudanças em soundfonts ou `sw.js`.
- [ ] Garantir que novos logs sigam o padrão de prefixos.
- [ ] Adicionar notas em `NOTAS_TECNICAS_MODIFICACOES.js` quando pertinente.

---

### Conclusão

Dominar o TerraMidi exige visão multidisciplinar – unir protocolos MIDI, DSP, UI musical e engenharia de PWAs. Este guia concentra os pontos de partida para que agentes de programação naveguem a base com segurança, evoluam funcionalidades e mantenham a experiência estável em qualquer cenário (online ou offline, hardware proprietário ou controlador genérico).
