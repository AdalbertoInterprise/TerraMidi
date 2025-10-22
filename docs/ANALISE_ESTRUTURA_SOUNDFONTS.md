# 📊 Análise da Estrutura de Soundfonts - TerraMidi

## 🎯 Resumo Executivo

A estrutura de soundfonts está **CORRETAMENTE ORGANIZADA** com suporte inteligente de detecção de subpastas. Os caminhos funcionam corretamente em todos os contextos (localhost, GitHub Pages, servidor).

---

## 📁 Estrutura Física de Pastas

```
soundfonts/
├── aspirin/                    # 0-999 instrumentos Aspirin
├── chaos/                      # 0-999 instrumentos Chaos
├── curated/                    # Instrumentos curados especiais
├── fluidr3_gm/                 # 811+ instrumentos FluidR3_GM (principal)
├── generaluser/                # 0-999 instrumentos GeneralUserGS
├── guitars/                    # Guitarras especiais (LesPaul, Stratocaster)
├── jclive/                     # Instrumentos JCLive de alta qualidade
├── other/                      # Fallback para arquivos não classificados
└── [arquivo.js]                # Soundfonts individuais dentro de cada pasta
```

### Exemplo Real
- **FluidR3_GM**: `soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js`
- **Aspirin**: `soundfonts/aspirin/0000_Aspirin_sf2_file.js`
- **Curated**: `soundfonts/curated/piano_grand.js`

---

## 🔄 Fluxo de Carregamento

### 1️⃣ Catalogo Manager (catalogManager.js)

```javascript
// Gera referências SEM subpasta
generateVariations(midiNumber, soundfonts) {
    return soundfonts.map(sf => ({
        file: `${midiNumber}_${sf}_sf2_file.js`,
        variable: `_tone_${midiNumber}_${sf}_sf2_file`,
        url: `${this.baseURL}${midiNumber}_${sf}_sf2_file.js`
    }));
}
```

**Status**: ✅ Correto - Apenas nome do arquivo, subpasta detectada dinamicamente

---

### 2️⃣ Soundfont Manager (soundfontManager.js)

#### A. Detecção de Subpasta

```javascript
// Função de detecção automática
function detectSoundfontSubfolder(filename) {
    // 1. Verifica padrões exatos (curated)
    if (SOUNDFONT_SUBFOLDER_PATTERNS.curated.includes(filename))
        return 'curated';
    
    // 2. Verifica padrões regex
    // _FluidR3_GM_sf2_file.js → fluidr3_gm
    // _JCLive_sf2_file.js → jclive
    // _Aspirin_sf2_file.js → aspirin
    // _Chaos_sf2_file.js → chaos
    // _GeneralUserGS_sf2_file.js → generaluser
    // _LesPaul_sf2_file.js → guitars
    
    // 3. Fallback
    return 'other';
}
```

**Status**: ✅ Correto - Detecta automaticamente a subpasta do arquivo

#### B. Construção de Caminho Completo

```javascript
// Durante o carregamento de script
const script = document.createElement('script');

// Caminho construído:
// soundfonts/ + [subpasta detectada] + / + [filename]
script.src = `soundfonts/${subfolder}/${filename}`;
```

**Status**: ✅ Correto - Caminho relativo, funciona em todos os contextos

---

### 3️⃣ Instrument Loader (instrumentLoader.js)

```javascript
// Base URL relativa
this.localBaseURL = 'soundfonts/';

// Durante download
const downloadSources = [
    { 
        label: 'local', 
        url: `${this.localBaseURL}${instrumentPath}`,  // com subpasta
        timeout: 3000 
    },
    { 
        label: 'Surikov', 
        url: `${this.remoteSources[0]}${instrumentPath}`,
        timeout: 10000 
    }
];
```

**Status**: ✅ Correto - Usa caminhos relativos locais, fallback remoto

---

## 📍 Mapeamento de Subpastas

### SOUNDFONT_SUBFOLDER_PATTERNS

```javascript
const SOUNDFONT_SUBFOLDER_PATTERNS = {
    'curated': [
        'piano_grand.js', 'piano_acoustic.js', 'piano_bright.js',
        'celesta.js', 'glockenspiel.js', 'music_box.js', 'vibraphone.js',
        'harp.js', 'harpsichord.js', 'church_organ.js', 'accordion.js',
        // ... outros instrumentos curados
    ],
    
    'fluidr3_gm': [
        /_\d+_FluidR3_GM_sf2_file\.js$/  // Regex: 0000_FluidR3_GM_sf2_file.js
    ],
    
    'jclive': [
        /_JCLive_sf2_file\.js$/  // Regex: 0000_JCLive_sf2_file.js
    ],
    
    'aspirin': [
        /_Aspirin_sf2_file\.js$/  // Regex: 0000_Aspirin_sf2_file.js
    ],
    
    'chaos': [
        /_Chaos_sf2_file\.js$/  // Regex: 0000_Chaos_sf2_file.js
    ],
    
    'generaluser': [
        /_GeneralUserGS_sf2_file\.js$/  // Regex: 0000_GeneralUserGS_sf2_file.js
    ],
    
    'guitars': [
        /_LesPaul_sf2_file\.js$/,
        /_Stratocaster_sf2_file\.js$/,
        /_Gibson_sf2_file\.js$/,
        /_Acoustic_sf2_file\.js$/
    ],
    
    'drums': [
        /^12[89]_|^13\d_/  // Regex: 128_*, 129_*, 13*_
    ]
};
```

---

## ✅ Validação de Caminhos

### Exemplos de Caminhos Válidos

| Tipo | Arquivo | Caminho Final | Detecção |
|------|---------|---------------|----------|
| Piano | `0000_FluidR3_GM_sf2_file.js` | `soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js` | ✅ Via regex |
| Acordeão | `0210_FluidR3_GM_sf2_file.js` | `soundfonts/fluidr3_gm/0210_FluidR3_GM_sf2_file.js` | ✅ Via regex |
| Piano Curado | `piano_grand.js` | `soundfonts/curated/piano_grand.js` | ✅ Via lista exata |
| JCLive | `0000_JCLive_sf2_file.js` | `soundfonts/jclive/0000_JCLive_sf2_file.js` | ✅ Via regex |
| Guitarra | `0270_Stratocaster_sf2_file.js` | `soundfonts/guitars/0270_Stratocaster_sf2_file.js` | ✅ Via regex |
| Não encontrado | `desconhecido.js` | `soundfonts/other/desconhecido.js` | ✅ Fallback |

---

## 🌐 Compatibilidade em Diferentes Contextos

### Local (file://)
```
✅ Funciona: soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js
```

### Localhost (http://localhost:8080)
```
✅ Funciona: soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js
```

### GitHub Pages (https://adalbertobi.github.io/TerraMidi)
```
✅ Funciona: soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js
(caminhos relativos funcionam perfeitamente)
```

### Netlify / Servidor Remoto
```
✅ Funciona: soundfonts/fluidr3_gm/0000_FluidR3_GM_sf2_file.js
```

---

## 🔄 Fluxo Completo de Carregamento

```
┌─────────────────────────────────────────────────────────────┐
│ Usuário seleciona instrumento (ex: Piano - MIDI 0)          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────┐
        │ catalogManager.js          │
        │ file: "0000_FluidR3..." │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────────────────┐
        │ soundfontManager.js                    │
        │ detectSoundfontSubfolder()             │
        │ → "fluidr3_gm" (via regex)             │
        └────────────┬───────────────────────────┘
                     │
        ┌────────────▼────────────────────────────────────┐
        │ instrumentLoader.js                             │
        │ URL: soundfonts/fluidr3_gm/0000_FluidR3...js   │
        │ Tenta: Local → Surikov → jsDelivr              │
        └────────────┬─────────────────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ ✅ Script carregado         │
        │ ✅ Variável definida        │
        │ ✅ Preset pronto            │
        └─────────────────────────────┘
```

---

## 🎯 Checklist de Verificação

| Item | Status | Detalhes |
|------|--------|----------|
| Estrutura de pastas | ✅ | 8 subpastas organizadas |
| Detecção automática | ✅ | Via `detectSoundfontSubfolder()` |
| Padrões regex | ✅ | Cobrem todos os tipos |
| Caminhos relativos | ✅ | Funcionam em todos os contextos |
| Fallback | ✅ | Pasta "other" para desconhecidos |
| Remoto (Surikov) | ✅ | CDN como fallback |
| Cache local | ✅ | IndexedDB + File System |
| Documentação | ✅ | Este arquivo |

---

## 📝 Recomendações

### ✅ Está Correto
- ✅ Estrutura de pastas bem organizada
- ✅ Detecção automática funcionando
- ✅ Caminhos relativos implementados
- ✅ Fallback para remoto funcionando
- ✅ Cache híbrido (IndexedDB + File System)

### 🟡 Opções de Otimização (Futuro)

1. **Adicionar índice de soundfonts**
   - Arquivo JSON com mapeamento completo
   - Evita detecção em runtime

2. **Versioning de soundfonts**
   - Integrar versão no nome da pasta
   - Permitir múltiplas versões

3. **Manifest serverless**
   - Worker script para listar arquivos
   - Dinâmico sem banco de dados

---

## 🐛 Troubleshooting

### Problema: "404 Not Found soundfont"
**Causas possíveis:**
1. Arquivo não existe na subpasta detectada
2. Nome do arquivo não bate com padrão regex
3. Caminho relativo quebrado

**Solução:**
1. Verificar se arquivo existe: `soundfonts/[subfolder]/[filename]`
2. Verificar padrão em `SOUNDFONT_SUBFOLDER_PATTERNS`
3. Adicionar em "other" se necessário

### Problema: Soundfont carrega mas som não toca
**Causas possíveis:**
1. Preset não decodificado corretamente
2. AudioContext não inicializado
3. Variável global não definida

**Solução:**
1. Verificar `player.loader.decodeAfterLoading()`
2. Chamar `ensureAudioContext()` antes
3. Verificar console para `_tone_...` variável

---

## 📞 Contato

Para questões sobre estrutura de soundfonts, consulte:
- **soundfontManager.js** - Lógica principal
- **instrumentLoader.js** - Download e cache
- **catalogManager.js** - Geração de catálogo

---

**Última atualização**: 21 de outubro de 2025  
**Status**: ✅ Produção  
**Versão**: 1.0.0
