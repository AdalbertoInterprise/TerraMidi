# Arquitetura de Handlers MIDI Terra

## Visão Geral

O `MIDIDeviceManager` possui um registro interno de handlers específicos para cada dispositivo Terra Eletrônica. Esse registro é responsável por localizar o handler correto no momento em que um equipamento USB é conectado e por disponibilizar mecanismos de logging e telemetria que facilitam o diagnóstico em tempo real.

A arquitetura foi projetada para ser extensível, permitindo que novos handlers sejam adicionados sem alterar o núcleo do sistema. O fluxo de funcionamento é o seguinte:

1. **Detecção** – Ao conectar um dispositivo, o `MIDIDeviceManager` gera um *descriptor* normalizado com nome, fabricante e metadados da porta MIDI.
2. **Identificação** – O descriptor é comparado com o registro de handlers. Cada handler contém um *matcher* que determina se consegue atender aquele dispositivo.
3. **Instanciação** – Caso um handler seja encontrado, o manager executa a *factory* registrada para criar a instância do handler, aplicando integrações de áudio automaticamente quando disponíveis.
4. **Roteamento** – Todas as mensagens MIDI subsequentes são encaminhadas diretamente ao handler associado. Logs de ativação e telemetria sinalizam eventuais ausências de handler.

## Registro de Handlers

Handlers podem ser registrados em dois momentos diferentes:

- **Registro estático (built-in)**: realizado durante o bootstrap do `MIDIDeviceManager`, cobrindo os dispositivos oficiais (Midi-Terra, Board Bells, Giro Som, Board Som, Big Key Board e Musical Beam).
- **Registro dinâmico**: realizado em runtime por módulos externos antes ou depois da criação do manager.

### API de Registro

```javascript
// Registro dinâmico antes da instância do MIDIDeviceManager
MIDIDeviceManager.registerCustomHandler({
  id: 'novo-dispositivo',
  label: 'Novo Dispositivo Terra',
  priority: 90,
  match: (descriptor) => descriptor.nameLower.includes('novo terra'),
  factory: (input, manager, profile) => new NovoTerraDevice(input, manager)
});

// Alternativa global (exposta ao window)
window.registerTerraMidiHandler({ ...mesmo objeto... });
```

Quando o registro é feito antes da criação do manager, o perfil é enfileirado em `_pendingHandlerProfiles` e aplicado automaticamente durante o bootstrap. Após a instância estar disponível (`window.midiManager`), o handler é registrado imediatamente.

### Campos do Perfil

- `id`: identificador único do handler (obrigatório).
- `label`: nome exibido nos logs.
- `priority`: número inteiro; perfis com maior prioridade são avaliados primeiro.
- `match`: função que recebe o *descriptor* normalizado e retorna `true` quando o handler atende o dispositivo.
- `factory`: função responsável por instanciar o handler (`(input, manager, profile) => handler`).
- `metadata`: objeto opcional para armazenar dados auxiliares (categoria, fabricante, etc.).

Caso o handler já exista, é possível sobrescrevê-lo informando `allowOverride: true` no perfil.

## Descriptor Normalizado

O descriptor repassado ao matcher contém as seguintes propriedades:

- `id` e `idLower`
- `name` e `nameLower`
- `manufacturer` e `manufacturerLower`
- `type`, `state` e `connection`
- Referência à porta MIDI original em `port`

A verificação de pertencimento à linha Terra é feita por `isTerraDeviceDescriptor`, que confronta o descriptor com os filtros `terraDeviceFilters` (nomes e fabricantes conhecidos).

## Telemetria e Logs

- **Registro**: cada handler registrado produz um log `🧩` com ID, origem e prioridade.
- **Resumo**: durante o bootstrap, o manager imprime o inventário completo de handlers (`📚`).
- **Ativação**: ao roteamento da primeira mensagem, o manager registra `🚦 Handler 'X' ativo para <device>`.
- **Ausência**: quando não há handler, o sistema emite um aviso com a lista de handlers disponíveis e dispara o evento global `handler-missing`.
- **Falha de instância**: se a factory não retornar uma instância válida, o evento `handler-instantiation-failed` é emitido.

Esses logs permitem diagnosticar rapidamente se um dispositivo está corretamente associado ao seu handler e oferecem pontos de integração para dashboards futuros.

## Handlers Disponíveis

| ID              | Label                   | Prioridade | Categoria    |
|-----------------|-------------------------|------------|--------------|
| `midi-terra`    | Controlador Midi-Terra  | 100        | controller   |
| `board-bells`   | Board Bells             | 80         | percussion   |
| `giro-som`      | Giro Som                | 70         | motion       |
| `board-som`     | Board Som               | 60         | sensors      |
| `big-key-board` | Big Key Board           | 50         | keyboard     |
| `musical-beam`  | Musical Beam            | 40         | infrared     |

A lista é derivada automaticamente de `getStats().registeredHandlers`, permitindo que ferramentas externas visualizem o inventário em tempo real.

## Boas Práticas para Novos Handlers

1. **Herança**: utilize `TerraDevice` como classe base para manter estado padronizado e funções utilitárias.
2. **Integração de áudio**: implemente `setAudioIntegration(audioEngine, soundfontManager)` para integrar com os motores existentes.
3. **Logs**: registre mensagens relevantes (Note On/Off, Program Change, CCs sensíveis) com emojis para facilitar identificação rápida.
4. **Estado**: exponha `getState()` com dados úteis para diagnóstico (notas ativas, controles, instrumentos carregados).
5. **Eventos globais**: considere emitir eventos customizados no `window` quando o dispositivo fornecer dados adicionais.

Seguindo essa arquitetura, o ecossistema Terra MIDI pode evoluir com novos dispositivos sem exigir alterações estruturais no core do sistema.
