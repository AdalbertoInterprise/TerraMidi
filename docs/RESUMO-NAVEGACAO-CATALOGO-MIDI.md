# 🎼 Sistema de Navegação por Catálogo MIDI

## 📋 Resumo Executivo

Este documento descreve a implementação completa do sistema de navegação incremental através do catálogo de 811 soundfonts usando mensagens MIDI **Program Change (0-127)** como comandos de scroll (+1/-1).

---

## 🎯 Funcionalidade Implementada

### Requisito Original
**"Criar um sistema onde mensagens MIDI Program Change (valores 0-127) sejam interpretadas como comandos de navegação incremental (+1 ou -1) através de um catálogo de 811 soundfonts, com navegação circular (811→1, 1→811)."**

### Comportamento Implementado

1. **Interpretação de Valores MIDI**
   - Cada mudança de valor Program Change é analisada
   - Se valor aumentou (ex: 5→6): navega +1 (próximo soundfont)
   - Se valor diminuiu (ex: 6→5): navega -1 (soundfont anterior)
   - Exceções tratadas: 127→0 = +1, 0→127 = -1

2. **Navegação Circular**
   - Posição 811 + direção +1 = Posição 1
   - Posição 1 + direção -1 = Posição 811
   - Total de 811 soundfonts linearizados em array indexado

3. **Multi-canal**
   - Suporta 16 canais MIDI (0-15)
   - Cada canal mantém seu próprio estado de navegação
   - Canal 9 (percussão) pode ter comportamento diferenciado

4. **Feedback Visual e Sonoro**
   - Display visual mostra: índice atual, nome do soundfont, categoria
   - Barra de progresso indica posição no catálogo (0-100%)
   - Preview sonoro toca nota C4 quando novo soundfont é carregado

---

## 🏗️ Arquitetura

### Arquivos Criados

#### 1. `js/catalogNavigationManager.js` (454 linhas)
**Classe Principal: `CatalogNavigationManager`**

```javascript
class CatalogNavigationManager {
    constructor(catalogManager, soundfontManager)
    initializeFlatCatalog()          // Lineariza catálogo hierárquico
    handleProgramChange(message)      // Ponto de entrada MIDI
    calculateDirection(prev, curr)    // Calcula +1/-1/-0
    navigate(direction, channel)      // Executa navegação circular
    updateVisualSelector()            // Atualiza highlight na UI
    updateCustomUI()                  // Atualiza display personalizado
    loadAndPlaySoundfont(entry)       // Carrega e preview
}
```

**Estruturas de Dados:**
```javascript
this.flatCatalog = [
    { index: 1, category: "Pianos", instrumentName: "Piano Acústico de Cauda", ... },
    { index: 2, category: "Pianos", instrumentName: "Piano Elétrico Vintage", ... },
    // ... 811 entradas
]

this.channelState = {
    0: { lastProgramValue: null, currentIndex: 1 },
    1: { lastProgramValue: null, currentIndex: 1 },
    // ... 16 canais
}
```

#### 2. `css/catalog-navigation.css` (169 linhas)
**Estilos do Display Visual**

- `.catalog-navigation-display`: Container principal (gradiente roxo)
- `.catalog-nav-header`: Cabeçalho com título e badge de índice
- `.catalog-soundfont-name`: Nome do soundfont (18px, bold)
- `.catalog-category-path`: Caminho de categoria (13px, opacidade 0.9)
- `.catalog-progress-bar`: Barra animada de progresso
- Animações: `slideIn`, `pulse`
- Responsividade: breakpoint em 768px
- Acessibilidade: suporte a `prefers-reduced-motion`

---

## 🔌 Integrações

### HTML (`index.html`)

#### Script Tag Adicionado (linha 359)
```html
<script src="js/catalogManager.js"></script>
<script src="js/catalogNavigationManager.js"></script> <!-- NOVO -->
```

#### Link CSS Adicionado (linha 14)
```html
<link rel="stylesheet" href="css/catalog-navigation.css"> <!-- NOVO -->
```

#### Elementos UI (linhas 77-99)
```html
<div class="catalog-navigation-display" id="catalog-nav-display">
    <div class="catalog-nav-header">
        <h3 class="catalog-nav-title">🎼 Navegação por Catálogo</h3>
        <span id="catalog-index-display" class="catalog-index-badge">1 / 811</span>
    </div>
    
    <div class="catalog-info">
        <div id="catalog-soundfont-name" class="catalog-soundfont-name">Piano Acústico de Cauda</div>
        <div id="catalog-category-name" class="catalog-category-path">Pianos → Piano Acústico de Cauda</div>
    </div>
    
    <div class="catalog-progress-container">
        <div id="catalog-progress-bar" class="catalog-progress-bar" 
             role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="811"
             aria-label="Progresso no catálogo de soundfonts"></div>
    </div>
    
    <div class="catalog-hint">
        <span>💡</span>
        <span>Use Program Change no seu dispositivo MIDI para navegar</span>
    </div>
</div>
```

### Inicialização (`js/app.js`, linhas 1183-1192)

```javascript
// Inicializar navegação de catálogo MIDI
if (window.CatalogNavigationManager && window.catalogManager && window.soundfontManager) {
    window.catalogNavigationManager = new CatalogNavigationManager(
        window.catalogManager,
        window.soundfontManager
    );
    console.log('✅ Sistema de navegação por catálogo MIDI inicializado');
}
```

### Integração MIDI (`js/midi/devices/midiTerraDevice.js`)

#### Modificação em `handleProgramChange()` (linhas 356-480)

```javascript
handleProgramChange(message) {
    const channelIndex = (message.channel !== undefined) ? message.channel : 0;
    
    // PRIORIDADE 1: Sistema de navegação incremental por catálogo
    if (window.catalogNavigationManager && 
        typeof window.catalogNavigationManager.handleProgramChange === 'function') {
        
        window.catalogNavigationManager.handleProgramChange({
            program: message.program,
            channel: channelIndex
        });
        
        // Atualiza painel de status com formato especial
        if (window.midiStatusPanel) {
            const navManager = window.catalogNavigationManager;
            const currentIndex = navManager.channelState[channelIndex]?.currentIndex || 1;
            const totalSoundfonts = navManager.flatCatalog.length;
            const entry = navManager.flatCatalog.find(e => e.index === currentIndex);
            
            window.midiStatusPanel.updateProgramChange(
                channelIndex,
                message.program,
                entry ? `[${currentIndex}/${totalSoundfonts}] ${entry.instrumentName}` : 'Navegando...'
            );
        }
        
        return; // Sistema de navegação assumiu controle
    }
    
    // FALLBACK: Mapeamento tradicional Program Change → GM
    // ... código existente ...
}
```

---

## 🧮 Algoritmo de Direção

### Função `calculateDirection(previousValue, currentValue)`

```javascript
calculateDirection(previousValue, currentValue) {
    // Caso 1: Primeira mensagem (sem histórico)
    if (previousValue === null) return 0;
    
    // Caso 2: Valores idênticos (não navega)
    if (currentValue === previousValue) return 0;
    
    // Caso 3: Exceção wrap-around ascendente (127 → 0)
    if (previousValue === 127 && currentValue === 0) return +1;
    
    // Caso 4: Exceção wrap-around descendente (0 → 127)
    if (previousValue === 0 && currentValue === 127) return -1;
    
    // Caso 5: Navegação normal (compara valores)
    return (currentValue > previousValue) ? +1 : -1;
}
```

### Navegação Circular com Modulo

```javascript
navigate(direction, channel = 0) {
    const currentIndex = this.channelState[channel].currentIndex;
    const totalItems = this.flatCatalog.length; // 811
    
    // Cálculo circular: (current - 1 + direction + total) % total + 1
    // Subtrai 1: converte índice 1-based para 0-based
    // Adiciona direction: aplica movimento (+1 ou -1)
    // Adiciona total: garante resultado positivo antes do módulo
    // Aplica %: wrap-around circular
    // Adiciona 1: converte de volta para 1-based
    
    let newIndex = ((currentIndex - 1 + direction + totalItems) % totalItems) + 1;
    
    // Exemplos:
    // Posição 811 + direção +1 → ((811-1+1+811) % 811) + 1 = (1622 % 811) + 1 = 0 + 1 = 1 ✅
    // Posição 1 + direção -1 → ((1-1-1+811) % 811) + 1 = (810 % 811) + 1 = 810 + 1 = 811 ✅
    // Posição 405 + direção +1 → ((405-1+1+811) % 811) + 1 = (1216 % 811) + 1 = 405 + 1 = 406 ✅
    
    this.channelState[channel].currentIndex = newIndex;
    return this.flatCatalog.find(entry => entry.index === newIndex);
}
```

---

## 🎨 Interface Visual

### Estados do Display

1. **Oculto (padrão)**
   - CSS: `display: none`
   - Mostrado quando navegação é ativada

2. **Visível**
   - Classe: `.visible`
   - Animação: `slideIn` (0.3s)

3. **Navegando**
   - Classe: `.navigating`
   - Animação: `pulse` (0.3s)
   - Triggered durante mudança de soundfont

### Elementos Atualizados

```javascript
updateCustomUI() {
    // Badge de índice
    indexDisplay.textContent = `${currentIndex} / ${total}`;
    
    // Nome do soundfont
    soundfontName.textContent = entry.instrumentName;
    
    // Caminho de categoria
    categoryPath.textContent = `${entry.category} → ${entry.instrumentName}`;
    
    // Barra de progresso
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', currentIndex);
    
    // Mostrar display
    container.classList.add('visible');
    container.classList.add('navigating');
    
    // Remover classe 'navigating' após animação
    setTimeout(() => container.classList.remove('navigating'), 300);
}
```

---

## 🧪 Cenários de Teste

### Teste 1: Navegação Básica Ascendente
```
MIDI Input: Program Change 0 → 1 → 2 → 3
Expected: Soundfont 1 → 2 → 3 → 4
```

### Teste 2: Navegação Básica Descendente
```
MIDI Input: Program Change 10 → 9 → 8 → 7
Expected: Soundfont 10 → 9 → 8 → 7
```

### Teste 3: Wrap-around Ascendente (127→0)
```
MIDI Input: Program Change 127 → 0
Expected: Direção +1 (próximo soundfont)
```

### Teste 4: Wrap-around Descendente (0→127)
```
MIDI Input: Program Change 0 → 127
Expected: Direção -1 (soundfont anterior)
```

### Teste 5: Navegação Circular no Final do Catálogo
```
Estado: Posição 811 (última)
MIDI Input: Program Change aumenta (+1)
Expected: Volta para posição 1
```

### Teste 6: Navegação Circular no Início do Catálogo
```
Estado: Posição 1 (primeira)
MIDI Input: Program Change diminui (-1)
Expected: Vai para posição 811
```

### Teste 7: Multi-canal
```
Canal 0: Program Change 10
Canal 5: Program Change 50
Expected: Canal 0 na posição 11, Canal 5 na posição 51 (independentes)
```

### Teste 8: Valores Idênticos (sem navegação)
```
MIDI Input: Program Change 42 → 42 → 42
Expected: Permanece na mesma posição
```

---

## 🔧 Configuração e Uso

### Pré-requisitos

1. **Dispositivo MIDI conectado** com suporte a Program Change
2. **Navegador compatível**: Chrome 43+, Edge 79+, Firefox 108+
3. **Contexto seguro**: HTTPS ou localhost
4. **Permissões MIDI**: concedidas pelo usuário

### Ativação

O sistema é ativado **automaticamente** quando:
1. `window.catalogNavigationManager` está definido
2. Dispositivo MIDI envia mensagem Program Change
3. Canal MIDI (0-15) recebe a mensagem

### Controles MIDI

| Ação                          | MIDI Message               | Resultado                      |
|-------------------------------|----------------------------|--------------------------------|
| Próximo soundfont (+1)        | Program Change aumenta     | Navega para próximo na lista   |
| Soundfont anterior (-1)       | Program Change diminui     | Navega para anterior na lista  |
| Wrap 127→0                    | Program Change 127 → 0     | Interpretado como +1           |
| Wrap 0→127                    | Program Change 0 → 127     | Interpretado como -1           |
| Mantém valor                  | Program Change repetido    | Sem navegação                  |

---

## 📊 Estrutura do Catálogo

### Formato Hierárquico Original (`catalogManager.fullCatalog`)

```javascript
{
    "Pianos": {
        "Piano Acústico de Cauda": [
            { soundfontName: "0000_FluidR3_GM_sf2_file", variablePrefix: "_tone_0000_", ... }
        ],
        "Piano Elétrico Vintage": [...]
    },
    "Cordas": {...},
    "Sintetizadores": {...}
    // ... 20+ categorias
}
```

### Formato Linearizado (`flatCatalog`)

```javascript
[
    { 
        index: 1, 
        category: "Pianos", 
        instrumentName: "Piano Acústico de Cauda", 
        soundfont: "0000_FluidR3_GM_sf2_file",
        variablePrefix: "_tone_0000_",
        categoryPath: "Pianos → Piano Acústico de Cauda"
    },
    { 
        index: 2, 
        category: "Pianos", 
        instrumentName: "Piano Elétrico Vintage", 
        soundfont: "0040_FluidR3_GM_sf2_file",
        variablePrefix: "_tone_0040_",
        categoryPath: "Pianos → Piano Elétrico Vintage"
    },
    // ... até 811
]
```

---

## 🐛 Tratamento de Erros

### Cenários Cobertos

1. **Catálogo não inicializado**
   ```javascript
   if (!this.catalogManager?.fullCatalog) {
       console.error('❌ Catálogo não disponível');
       return;
   }
   ```

2. **Soundfont não encontrado**
   ```javascript
   if (!entry) {
       console.error(`❌ Entrada ${newIndex} não encontrada`);
       return;
   }
   ```

3. **Canal inválido**
   ```javascript
   if (channel < 0 || channel > 15) {
       console.warn(`⚠️ Canal ${channel} inválido, usando 0`);
       channel = 0;
   }
   ```

4. **Elementos UI ausentes**
   ```javascript
   if (!indexDisplay) {
       console.warn('⚠️ Elemento #catalog-index-display não encontrado');
       // continua execução sem UI
   }
   ```

5. **Falha no carregamento de soundfont**
   ```javascript
   try {
       await this.soundfontManager.loadSoundfont(entry.soundfont);
   } catch (error) {
       console.error(`❌ Erro ao carregar ${entry.soundfont}:`, error);
   }
   ```

---

## 🚀 Próximos Passos Sugeridos

### Melhorias Futuras

1. **Filtros de Categoria**
   - Permitir navegação apenas dentro de uma categoria específica
   - Tecla MIDI Control Change para alternar categorias

2. **Velocidade de Navegação**
   - Detecção de mudanças rápidas (ex: girar encoder)
   - Navegação em passos maiores (+5, +10) se velocidade alta

3. **Favoritos**
   - Marcar soundfonts favoritos
   - Tecla MIDI para pular diretamente para próximo favorito

4. **Histórico de Navegação**
   - Manter lista de últimos 10 soundfonts visitados
   - Tecla MIDI para voltar no histórico

5. **Busca por Nome**
   - Integração com teclado virtual na tela
   - Busca incremental enquanto digita

6. **Mapeamento Customizável**
   - Permitir usuário definir: Program Change como absoluto (0-127 → soundfonts específicos)
   - Ou manter incremental (padrão atual)

7. **Persistência de Estado**
   - Salvar última posição em localStorage
   - Restaurar ao recarregar página

8. **Integração com Instrumentos Físicos**
   - Modo "banco de sons" onde Program Change seleciona diretamente soundfont
   - Mapeamento 0-127 → 811 soundfonts (com agrupamento)

---

## 📝 Checklist de Implementação

- [x] Criar `CatalogNavigationManager` class
- [x] Implementar `initializeFlatCatalog()`
- [x] Implementar `calculateDirection(prev, curr)`
- [x] Implementar `navigate(direction, channel)`
- [x] Implementar `handleProgramChange(message)`
- [x] Implementar `updateVisualSelector()`
- [x] Implementar `updateCustomUI()`
- [x] Implementar `loadAndPlaySoundfont(entry)`
- [x] Criar `css/catalog-navigation.css`
- [x] Adicionar elementos HTML ao `index.html`
- [x] Adicionar script tag em `index.html`
- [x] Adicionar link CSS em `index.html`
- [x] Integrar em `midiTerraDevice.handleProgramChange()`
- [x] Inicializar em `app.js`
- [x] Adicionar suporte multi-canal (16 canais)
- [x] Adicionar navegação circular
- [x] Adicionar tratamento de exceções (127→0, 0→127)
- [x] Adicionar feedback visual (display, barra progresso)
- [x] Adicionar feedback sonoro (preview note C4)
- [x] Adicionar logs de console informativos
- [x] Adicionar aria-labels para acessibilidade
- [ ] Testar com dispositivo MIDI real
- [ ] Validar com 811 soundfonts carregados
- [ ] Testar navegação circular extremos (1↔811)
- [ ] Testar todos os 16 canais MIDI
- [ ] Otimizar performance (debounce se necessário)

---

## 📚 Referências

- **MIDI 1.0 Specification**: https://www.midi.org/specifications
- **Web MIDI API**: https://www.w3.org/TR/webmidi/
- **General MIDI (GM) Standard**: Mapeamento tradicional Program Change 0-127
- **WebAudioFont**: Sistema de soundfonts do projeto

---

## 🎓 Conceitos Técnicos

### Program Change MIDI
- **Range**: 0-127 (7 bits)
- **Propósito**: Mudar preset/patch em sintetizadores
- **Canal**: Cada um dos 16 canais MIDI pode ter seu próprio Program Change

### Navegação Circular
- **Modulo Aritmético**: `(index + offset) % total`
- **Offset positivo**: previne valores negativos antes do módulo
- **Conversão 1-based**: ajuste +1/-1 para índices que começam em 1

### Event-driven Architecture
- **MIDI Input**: Assíncrono via Web MIDI API
- **Handler Chain**: browserCompatibility → midiDeviceManager → midiTerraDevice → catalogNavigationManager
- **UI Updates**: Síncronos via DOM manipulation

---

## 👨‍💻 Autor e Manutenção

**Projeto**: Terra MIDI - Plataforma de Musicoterapia Interativa  
**Feature**: Sistema de Navegação por Catálogo MIDI  
**Data de Implementação**: 2024  
**Versão**: 1.0.0  

---

## 📄 Licença

Este código faz parte do projeto Terra MIDI. Consulte o arquivo LICENSE na raiz do projeto para detalhes.

---

**✅ Sistema totalmente implementado e pronto para testes!**

Para ativar o sistema:
1. Conecte um dispositivo MIDI
2. Abra a aplicação em navegador compatível (Chrome/Edge)
3. Conceda permissões MIDI
4. Envie mensagens Program Change via seu controlador MIDI
5. Observe o display visual sendo atualizado automaticamente
6. Ouça o preview sonoro do soundfont selecionado

**Próximo passo recomendado**: Testar com dispositivo MIDI real e validar todos os cenários descritos na seção "Cenários de Teste".
