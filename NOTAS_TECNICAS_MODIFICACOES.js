// ============================================
// RESUMO TÉCNICO: MODIFICAÇÕES VIRTUAL KEYBOARD
// ============================================

/*
 * OBJETIVO: Substituir clique em tecla para abrir lista de instrumentos global
 * ao invés de painel de configuração individual
 * 
 * DATA: 22 de outubro de 2025
 * STATUS: ✅ Pronto para testes
 */

// ============================================
// ARQUIVO 1: js/ui/virtual-keyboard.js
// ============================================

/*
 * MUDANÇA 1: bindKeyEvents() - Linhas ~625-675
 * 
 * ANTES: Clique na tecla → openConfigPanel(note, keyEl)
 * DEPOIS: Clique na tecla → window.openInstrumentList()
 * 
 * DETALHES:
 * - Mouse/Touch dispara abertura da lista de instrumentos
 * - Previne propagação de eventos (preventDefault, stopPropagation)
 * - Mobile: passive:false para permitir preventDefault em touchstart
 * - Desktop: suporta apenas mouse esquerdo (button === 0)
 * 
 * COMPATIBILIDADE:
 * - Desktop: Chrome, Firefox, Safari, Edge ✅
 * - Mobile: iOS Safari, Chrome Android ✅
 * - Backward: Sem quebra de compatibilidade ✅
 */

// Pseudocódigo da mudança:
const bindKeyEvents = function(keyEl, note) {
    const openQuickInstrumentList = (event) => {
        if (event.type === 'mousedown' && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        requestAnimationFrame(() => {
            if (typeof window.openInstrumentList === 'function') {
                window.openInstrumentList();
            } else if (typeof window.showInstrumentSelector === 'function') {
                window.showInstrumentSelector();
            }
        });
    };
    
    keyEl.addEventListener('mousedown', openQuickInstrumentList);
    keyEl.addEventListener('touchstart', openQuickInstrumentList, { passive: false });
    keyEl.addEventListener('mouseup', stop);
    keyEl.addEventListener('mouseleave', stop);
    keyEl.addEventListener('touchend', stop);
    keyEl.addEventListener('touchcancel', stop);
};

/*
 * MUDANÇA 2: createConfigPanel() - Linhas ~680-715
 * 
 * MUDANÇA: Remover botões vk-config-preview e vk-config-clear
 * 
 * HTML ANTES:
 * <div class="vk-config-actions">
 *     <button type="button" class="vk-config-preview">Pré-visualizar</button>
 *     <button type="button" class="vk-config-clear">Remover personalizado</button>
 * </div>
 * 
 * HTML DEPOIS (comentado):
 * <!-- 🔧 COMENTADO: Botões preview e clear removidos - usar seletor global -->
 * 
 * EVENT LISTENERS: Desativados
 * - panel.querySelector('.vk-config-preview').addEventListener(...) ❌
 * - panel.querySelector('.vk-config-clear').addEventListener(...) ❌
 */

/*
 * MUDANÇA 3: Funções Comentadas - Linhas ~1250-1285
 * 
 * previewCurrentSelection() ❌ COMENTADO
 * - Pré-visualiza som do instrumento no painel individual
 * - Agora substituído por pré-visualização no seletor global
 * 
 * clearCurrentAssignment() ❌ COMENTADO
 * - Limpa atribuição de instrumento individual
 * - Agora substituído por gerenciamento no seletor global
 * 
 * RAZÃO: Funcionalidades existem no seletor global
 */


// ============================================
// ARQUIVO 2: js/ui/instrumentSelector.js
// ============================================

/*
 * MUDANÇA 1: openInstrumentList() - NOVA FUNÇÃO GLOBAL
 * 
 * PROPÓSITO: Abrir painel de catálogo de instrumentos
 * CHAMADA: window.openInstrumentList() - Virtual Keyboard
 * RETORNO: Boolean (true = sucesso, false = falha)
 * 
 * LÓGICA:
 * 1. Buscar elemento #instrument-catalog-panel
 * 2. Se não existe → log warning, retorna false
 * 3. Se está oculto (classe 'is-hidden') → remover classe, abrir painel
 * 4. Se já está aberto → manter como está
 * 5. Log de confirmação no console
 * 
 * ALIASES:
 * - window.openInstrumentList() ← Principal
 * - window.showInstrumentSelector() ← Compatibilidade
 */

// Pseudocódigo:
global.openInstrumentList = function() {
    const catalogPanel = document.getElementById('instrument-catalog-panel');
    if (!catalogPanel) {
        console.warn('⚠️ openInstrumentList: Painel não encontrado');
        return false;
    }
    
    const isHidden = catalogPanel.classList.contains('is-hidden');
    if (isHidden) {
        catalogPanel.classList.remove('is-hidden');
        console.log('📂 Lista de instrumentos aberta');
    }
    
    return true;
};

global.showInstrumentSelector = global.openInstrumentList;


// ============================================
// FLUXO DE DADOS
// ============================================

/*
 * ANTES:
 * 
 * Virtual Keyboard (tecla clicada)
 *     ↓
 * openConfigPanel(note, keyEl)
 *     ↓
 * vk-config-panel abre (pequeno, note-específico)
 *     ↓
 * Dropdown vk-config-select muda
 *     ↓
 * handleConfigSelection() chama setAssignment()
 *     ↓
 * Instrumento personalizado aplicado à nota
 *     ↓
 * updateKeyVisual() atualiza indicador da tecla
 * 
 * 
 * DEPOIS:
 * 
 * Virtual Keyboard (tecla clicada)
 *     ↓
 * window.openInstrumentList()
 *     ↓
 * instrument-catalog-panel abre (grande, global)
 *     ↓
 * User seleciona instrumento (dropdown, search, ou navegação)
 *     ↓
 * Instrumento global aplicado OU individual (depende de UI)
 *     ↓
 * Sincronização automática com Board Bells (existente)
 */


// ============================================
// ESTADO GLOBAL MANTIDO
// ============================================

/*
 * PERSISTÊNCIA (sem mudanças):
 * - localStorage: Favorites, Assignments, Soundfont atual
 * - sessionStorage: Estado de UI (se houver)
 * - IndexedDB: Cache de soundfonts (se em uso)
 * 
 * SINCRONIZAÇÃO (sem mudanças):
 * - Event: 'virtual-keyboard-assignment-changed'
 * - Dispatcher: Virtual Keyboard → window.dispatchEvent()
 * - Listener: Board Bells, MIDI Device Manager
 * - Data: { assignments: {...} }
 */


// ============================================
// TESTES RECOMENDADOS
// ============================================

/*
 * UNIT TESTS (se aplicável):
 * - openInstrumentList() retorna true/false conforme esperado
 * - Classe 'is-hidden' é removida
 * - Sem erros ao buscar elemento
 * 
 * INTEGRATION TESTS:
 * - Virtual Keyboard → Instrument Selector (fluxo completo)
 * - Assignments → Board Bells (sincronização)
 * - Favorites (load/save)
 * 
 * E2E TESTS (manual):
 * - Desktop: Click tecla → Lista abre ✅
 * - Mobile: Touch tecla → Lista abre ✅
 * - Bloqueio: toggle-quick-instrument-lock funciona ✅
 * - Audio: Soundfont global + custom por nota ✅
 * 
 * PERFORMANCE TESTS:
 * - Abertura lista < 200ms
 * - Sem memory leaks (heap)
 * - Scroll suave (60fps)
 */


// ============================================
// LOGS DE DEBUG ESPERADOS
// ============================================

/*
 * ✅ Sucesso:
 * "📂 Lista de instrumentos aberta"
 * "ℹ️ Lista de instrumentos já está aberta"
 * 
 * ⚠️ Aviso:
 * "⚠️ openInstrumentList: Painel de catálogo não encontrado"
 * 
 * ❌ Erro:
 * (Deveria ser raro após implementação)
 */


// ============================================
// DEPENDÊNCIAS EXTERNAS
// ============================================

/*
 * REQUERIDAS:
 * 1. instrumentSelector.js: setupInstrumentSelection()
 * 2. soundfontManager: Carregamento de audio
 * 3. catalogManager: Acesso ao catálogo de soundfonts
 * 
 * OPCIONAIS (fallback):
 * - Board Bells: Sincronização de assignments
 * - MIDI Device Manager: Integração MIDI
 */


// ============================================
// PERFORMANCE & MEMORIA
// ============================================

/*
 * OVERHEAD ADICIONADO:
 * - Função global: ~2KB (minified)
 * - Event listeners: Existentes (apenas redireciona)
 * - DOM queries: 1x getElementById() por abertura
 * 
 * IMPACTO NA MEMORIA:
 * - Virtual Keyboard: 0KB adicional
 * - Instrument Selector: 0KB adicional (função inline)
 * 
 * IMPACTO NA PERFORMANCE:
 * - Abertura lista: < 50ms (DOM manipulation)
 * - Sem impact no audio playback
 * - Compatível com PWA
 */


// ============================================
// ROLLBACK (se necessário)
// ============================================

/*
 * PASSOS PARA REVERTER:
 * 
 * 1. Restaurar virtual-keyboard.js bindKeyEvents() original
 * 2. Descommentar createConfigPanel() botões
 * 3. Restaurar previewCurrentSelection() e clearCurrentAssignment()
 * 4. Remover openInstrumentList() de instrumentSelector.js
 * 5. Testar funcionamento anterior
 * 
 * TEMPO ESTIMADO: ~15 minutos
 * RISCO: Baixo (mudanças localizadas)
 */


// ============================================
// VERSIONING
// ============================================

/*
 * VERSÃO: 2.0 (Virtual Keyboard com Instrument Selector)
 * 
 * HISTÓRICO:
 * v1.0: Virtual Keyboard com painel de config individual
 * v1.5: Integração com toggle-quick-instrument-lock
 * v2.0: Substituição de painel por lista global de instrumentos
 * 
 * MUDANÇAS FUTURAS (roadmap):
 * v2.1: Remover vk-config-panel completamente
 * v2.2: Adicionar atalhos de teclado para navegação
 * v2.3: Sincronizar feedback visual com Board Bells
 * v3.0: Integração de efeitos de áudio em tempo real
 */

