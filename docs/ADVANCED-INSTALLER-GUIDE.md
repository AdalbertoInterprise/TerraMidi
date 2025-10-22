# 🚀 Advanced Installer - Sistema Agressivo de Instalação

## Visão Geral

O **Advanced Installer** é um sistema moderno e agressivo de instalação offline que implementa múltiplas camadas de cache para maximizar a performance e disponibilidade do TerraMidi.

## Versão: 1.0.0.0.0

### Características Principais

#### 1️⃣ **Múltiplas Camadas de Armazenamento** (Multi-Layer Storage)

```
┌─────────────────────────────────────────────────────────┐
│         CAMADA 1: Cache Storage (Service Worker)        │
│         Rápido, sincronizado com SW, até 2GB            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│     CAMADA 2: OPFS (Origin Private File System)         │
│     Automático (sem permissão), até 2GB, rápido         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│   CAMADA 3: User Directory (Desktop Only - FSA API)     │
│   Permissão do usuário, pasta no HD, ilimitado          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│    CAMADA 4: IndexedDB (Fallback Universal)             │
│    Compatível com todos os navegadores, até 2GB         │
└─────────────────────────────────────────────────────────┘
```

#### 2️⃣ **Plataformas Suportadas**

| Plataforma | Melhor Método | Alternativa | Fallback |
|-----------|--------------|-----------|----------|
| **Desktop (Chrome/Edge/Firefox)** | OPFS + FSA | FSA + Cache Storage | IndexedDB |
| **Mobile (Android/iOS)** | OPFS + IndexedDB | Cache Storage | IndexedDB |
| **Tablets** | OPFS + IndexedDB | Cache Storage | IndexedDB |
| **Safari (Desktop)** | Cache Storage | IndexedDB | localStorage |

#### 3️⃣ **Recursos Baixados Agressivamente**

```
Fase 1: Recursos Críticos (10 arquivos)
├── index.html, manifest.json, styles.css
├── sw.js, app.js, audioEngine.js
├── soundfontManager.js, instrumentLoader.js
├── catalogManager.js, WebAudioFontPlayer.js
└── Tempo: ~2-5s

Fase 2: Estilos CSS Completos (10 arquivos)
├── Todos os arquivos em /css/
└── Tempo: ~1-2s

Fase 3: Scripts Completos (25+ arquivos)
├── Módulos MIDI, UI, Utilities
├── Cache Managers, Effects Engine
└── Tempo: ~5-10s

Fase 4: Imagens e Ícones (6 arquivos)
├── Logos de 16x16 até 512x512
├── Maskable icons para PWA
└── Tempo: ~1-2s

Fase 5: Soundfonts em Background ⚡
├── FluidR3_GM (primeiros 10)
├── Aspirin, Chaos, GeneralUser (5 cada)
├── Guitars (3), Curated (15)
├── Tempo: ~10-30min (não bloqueia UI!)
└── Total: ~50-100 arquivos de soundfont
```

## Implementação Técnica

### 1. Detecção de Plataforma

```javascript
// Desktop vs Mobile
const platform = this.detectPlatform();
// "desktop" ou "mobile"
```

### 2. Setup de Armazenamento

```javascript
// OPFS - Automático
const root = await navigator.storage.getDirectory();
const terraDir = await root.getDirectoryHandle('TerraMidi', { create: true });

// FSA - Desktop com permissão
const dirHandle = await window.showDirectoryPicker({
    startIn: 'documents'
});

// IndexedDB - Fallback universal
const hybridCache = new HybridCacheManager();
await hybridCache.initialize();
```

### 3. Instalação em 8 Fases

```javascript
const installer = new AdvancedInstaller();

// Inicia instalação agressiva
await installer.startAggressiveInstallation();

// Retorna boolean: true = sucesso, false = erro
```

### 4. Progresso em Tempo Real

```javascript
// Escutar eventos de progresso
window.addEventListener('terra-installation-progress', (e) => {
    const { progress, downloadedFiles, totalFiles, estimatedTime } = e.detail;
    console.log(`${progress}% - ${downloadedFiles}/${totalFiles}`);
});
```

## Integração com UI

### HTML

```html
<!-- Adicionar ao <head> -->
<link rel="stylesheet" href="css/advanced-installer.css">

<!-- Adicionar antes de </body> -->
<script src="js/advancedInstaller.js"></script>
<script src="js/advancedInstallerUI.js"></script>
```

### JavaScript

```javascript
// Criar UI
const installerUI = new AdvancedInstallerUI();
installerUI.init();

// Mostrar modal
installerUI.show();

// Ouvir eventos
installerUI.bindInstallationEvents();
```

## Vantagens

### ✅ **Funcionalidade Offline Completa**
- Funciona 100% offline após instalação
- Todos os recursos críticos em cache
- Soundfonts pré-carregados

### ⚡ **Carregamento Instantâneo**
- Primeira requisição: ~100ms (via Service Worker)
- Sem latência de rede
- Sincronização automática quando online

### 💾 **Armazenamento Massivo**
- Até 2GB por camada
- Múltiplas camadas = até 6-8GB efetivos
- Compressão automática em algumas APIs

### 🔄 **Sincronização Inteligente**
- Atualização incremental
- Detecção de mudanças automática
- Background sync quando conectado

### 📱 **Cross-Platform**
- Funciona em todos os navegadores modernos
- Adaptativo para desktop e mobile
- Fallbacks automáticos

### 🎯 **Não Invasivo**
- Soundfonts baixam em background
- UI não é bloqueada
- Cancelável a qualquer momento

## Compatibilidade de Navegadores

### Chrome/Edge (Recomendado)
- ✅ OPFS: Sim (v86+)
- ✅ File System Access: Sim (v86+)
- ✅ Cache Storage: Sim
- ✅ IndexedDB: Sim
- **Score: 10/10** 🌟

### Firefox
- ✅ OPFS: Sim (v111+)
- ⚠️ File System Access: Não
- ✅ Cache Storage: Sim
- ✅ IndexedDB: Sim
- **Score: 8/10**

### Safari (Desktop)
- ⚠️ OPFS: Não
- ⚠️ File System Access: Não
- ✅ Cache Storage: Sim (15.1+)
- ✅ IndexedDB: Sim
- **Score: 7/10**

### Mobile Browsers (Android/iOS)
- ✅ OPFS: Sim (com restrições)
- ⚠️ File System Access: Limitado
- ✅ Cache Storage: Sim
- ✅ IndexedDB: Sim
- **Score: 8-9/10**

## Configuração de Recurosos

Edit `advancedInstaller.js` linha ~70 para ajustar:

```javascript
this.resourceConfig = {
    // Recursos críticos - sempre baixados
    critical: [/* ... */],
    
    // Quantidade de soundfonts por categoria
    soundfonts: {
        fluidr3_gm: 10,  // Primeiros 10
        aspirin: 5,      // Primeiros 5
        chaos: 5,
        generaluser: 5,
        guitars: 3,
        curated: 15
    }
};
```

## Segurança

### ✅ HTTPS Obrigatório
- Service Workers requerem HTTPS
- File System Access requer secure context
- Proteção contra MITM automática

### ✅ Same-Origin Policy
- Dados isolados por origem
- Nenhum acesso cross-domain
- Validação de manifesto

### ✅ Permissões Explícitas
- File System Access: confirmar permissão
- Persistent Storage: confirmar permissão
- OPFS: Automático (sem permissão visível)

### ✅ Validação de Conteúdo
- Hash de integridade (futuro)
- Validação de tamanho
- Tratamento de corrupção

## Otimizações

### 📊 Compressão
- Gzip nativo do navegador
- Service Worker descompacta automaticamente
- Savings: ~40-50%

### 🚀 Parallelização
- Downloads paralelos (até 6 concorrentes)
- Cache write não-bloqueante
- Service Worker independente

### 💡 Detecção Inteligente
- Pula arquivos já em cache
- Resume downloads interrompidos
- Retry automático com backoff

## Troubleshooting

### "OPFS não disponível"
- **Desktop**: Atualizar Chrome/Edge (v86+)
- **Mobile**: Suporte limitado, use IndexedDB
- **Solução**: Fallback automático para IndexedDB

### "File System Access bloqueado"
- Verificar se site está em HTTPS
- Permitir pop-ups e permissões
- Verificar console para detalhes

### "IndexedDB cheio"
- Limpar cache antigo: `installer.clearInstallationCache()`
- Reduzir quantidade de soundfonts
- Usar compressão (gzip)

### "Download muito lento"
- Verificar conexão de internet
- Diminuir simultâneos em `advancedInstaller.js`
- Pré-selecionar soundfonts importantes

## Monitoramento

### Events Disponíveis

```javascript
window.addEventListener('terra-installation-progress', (e) => {
    console.log({
        progress: 0-100,           // Porcentagem
        downloadedFiles: 150,      // Arquivos baixados
        totalFiles: 200,           // Total de arquivos
        downloadedSize: 524288000, // Bytes baixados
        totalSize: 1073741824,     // Total de bytes
        estimatedTime: 45,         // Segundos restantes
        errors: []                 // Array de erros
    });
});
```

## Próximas Melhorias

- [ ] Compressão Brotli
- [ ] Delta sync (apenas mudanças)
- [ ] Resumption automático após crash
- [ ] Analytics de instalação
- [ ] Rollback automático se falhar
- [ ] Seleção seletiva de soundfonts

## Referências

- [MDN: File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [MDN: Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: Storage for the Web](https://web.dev/articles/storage-for-the-web)

---

**Desenvolvido para TerraMidi v1.0.0.0.0**
**Data: 21/10/2025**
**Compatibilidade: Chrome 86+, Edge 86+, Firefox 111+, Safari 15.1+**
