/**
 * ============================================================
 * TESTE DE NAVEGAÇÃO BOARD BELLS VIA PROGRAMCHANGE
 * ============================================================
 * 
 * Script de teste para validar a implementação de navegação
 * incremental usando comandos programChange do Board Bells.
 * 
 * COMO USAR:
 * 1. Abra o console do navegador (F12)
 * 2. Cole este script no console
 * 3. Execute as funções de teste conforme necessário
 * 
 * @version 1.0.0
 * @date 2025-10-18
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TESTES BOARD BELLS - Navegação via ProgramChange');
console.log('═══════════════════════════════════════════════════════════');

// ============================================================
// FUNÇÕES DE TESTE
// ============================================================

/**
 * Verifica se todos os componentes necessários estão disponíveis
 */
function verificarComponentes() {
    console.log('\n📋 Verificando componentes do sistema...\n');
    
    const checks = {
        'midiDeviceManager': !!window.midiDeviceManager,
        'catalogNavigationManager': !!window.catalogNavigationManager,
        'instrumentSelector': !!window.instrumentSelector,
        'soundfontManager': !!window.soundfontManager,
        'botão spin-up': !!document.querySelector('.selector-spin-btn.spin-up'),
        'botão spin-down': !!document.querySelector('.selector-spin-btn.spin-down'),
        '#instrument-select': !!document.getElementById('instrument-select')
    };
    
    let allOk = true;
    
    Object.entries(checks).forEach(([component, exists]) => {
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${component}: ${exists ? 'OK' : 'NÃO ENCONTRADO'}`);
        if (!exists) allOk = false;
    });
    
    console.log('\n' + (allOk ? '✅ Todos os componentes OK' : '❌ Componentes ausentes detectados'));
    
    return allOk;
}

/**
 * Simula envio de comando programChange do Board Bells
 */
function simularProgramChange(valor) {
    if (!window.midiDeviceManager) {
        console.error('❌ midiDeviceManager não encontrado');
        return;
    }
    
    // Procurar dispositivo Board Bells
    const boardBells = Object.values(window.midiDeviceManager.devices || {})
        .find(device => device.constructor.name === 'BoardBellsDevice');
    
    if (!boardBells) {
        console.error('❌ Board Bells não conectado');
        console.log('💡 Dica: Conecte o Board Bells ou use simularProgramChangeManual()');
        return;
    }
    
    console.log(`\n🎹 Simulando programChange = ${valor}`);
    
    boardBells.handleProgramChange({
        program: valor,
        channel: 0,
        timestamp: Date.now()
    });
}

/**
 * Simula sequência de comandos programChange
 */
function testarSequencia(valores) {
    console.log(`\n🎼 Testando sequência: [${valores.join(', ')}]`);
    
    valores.forEach((valor, index) => {
        setTimeout(() => {
            console.log(`\n▶️ Passo ${index + 1}/${valores.length}`);
            simularProgramChange(valor);
        }, index * 2000); // 2 segundos entre cada comando
    });
}

/**
 * Teste de incremento normal
 */
function testeIncrementoNormal() {
    console.log('\n🧪 TESTE 1: Incremento Normal (50 → 55)');
    testarSequencia([50, 51, 52, 53, 54, 55]);
}

/**
 * Teste de decremento normal
 */
function testeDecrementoNormal() {
    console.log('\n🧪 TESTE 2: Decremento Normal (55 → 50)');
    testarSequencia([55, 54, 53, 52, 51, 50]);
}

/**
 * Teste de wrap-around 127 → 0
 */
function testeWrapAroundFrente() {
    console.log('\n🧪 TESTE 3: Wrap-around (127 → 0)');
    testarSequencia([125, 126, 127, 0, 1, 2]);
}

/**
 * Teste de wrap-around 0 → 127
 */
function testeWrapAroundTras() {
    console.log('\n🧪 TESTE 4: Wrap-around (0 → 127)');
    testarSequencia([2, 1, 0, 127, 126, 125]);
}

/**
 * Teste de mudanças aleatórias
 */
function testeAleatorio() {
    console.log('\n🧪 TESTE 5: Mudanças Aleatórias');
    const valores = [0, 64, 32, 96, 16, 80, 48, 112, 24, 88];
    testarSequencia(valores);
}

/**
 * Simula clique direto nos botões (sem Board Bells)
 */
function simularCliqueSpinUp() {
    const btn = document.querySelector('.selector-spin-btn.spin-up');
    if (btn && !btn.disabled) {
        console.log('🔼 Simulando clique em SPIN-UP (▲)');
        btn.click();
    } else {
        console.error('❌ Botão spin-up não disponível');
    }
}

function simularCliqueSpinDown() {
    const btn = document.querySelector('.selector-spin-btn.spin-down');
    if (btn && !btn.disabled) {
        console.log('🔽 Simulando clique em SPIN-DOWN (▼)');
        btn.click();
    } else {
        console.error('❌ Botão spin-down não disponível');
    }
}

/**
 * Verifica estado atual do sistema
 */
function verificarEstado() {
    console.log('\n📊 Estado Atual do Sistema\n');
    
    // Board Bells
    const boardBells = Object.values(window.midiDeviceManager?.devices || {})
        .find(device => device.constructor.name === 'BoardBellsDevice');
    
    if (boardBells) {
        console.log('🎹 Board Bells:');
        console.log(`   ├─ lastProgramChange: ${boardBells.state.lastProgramChange}`);
        console.log(`   ├─ currentProgram: ${boardBells.state.currentProgram}`);
        console.log(`   └─ isConnected: ${boardBells.state.isConnected}`);
    } else {
        console.log('❌ Board Bells não conectado');
    }
    
    // CatalogNavigationManager
    if (window.catalogNavigationManager) {
        console.log('\n🗂️ CatalogNavigationManager:');
        console.log(`   ├─ currentIndex: ${window.catalogNavigationManager.currentIndex}`);
        console.log(`   ├─ totalSoundfonts: ${window.catalogNavigationManager.totalSoundfonts}`);
        
        const currentSoundfont = window.catalogNavigationManager.getSoundfontAtIndex(
            window.catalogNavigationManager.currentIndex
        );
        
        if (currentSoundfont) {
            console.log(`   ├─ Soundfont atual: ${currentSoundfont.subcategory}`);
            console.log(`   └─ MIDI Number: ${currentSoundfont.midiNumber}`);
        }
    }
    
    // InstrumentSelector
    const selectElement = document.getElementById('instrument-select');
    if (selectElement) {
        console.log('\n🎛️ InstrumentSelector:');
        console.log(`   ├─ Opções totais: ${selectElement.options.length}`);
        console.log(`   ├─ selectedIndex: ${selectElement.selectedIndex}`);
        console.log(`   ├─ value: ${selectElement.value}`);
        
        if (selectElement.selectedOptions[0]) {
            console.log(`   └─ Instrumento selecionado: ${selectElement.selectedOptions[0].textContent.trim()}`);
        }
    }
    
    // Botões
    const upBtn = document.querySelector('.selector-spin-btn.spin-up');
    const downBtn = document.querySelector('.selector-spin-btn.spin-down');
    
    console.log('\n🔘 Botões de Navegação:');
    console.log(`   ├─ SPIN-UP (▲): ${upBtn ? (upBtn.disabled ? 'Desabilitado' : 'Ativo') : 'Não encontrado'}`);
    console.log(`   └─ SPIN-DOWN (▼): ${downBtn ? (downBtn.disabled ? 'Desabilitado' : 'Ativo') : 'Não encontrado'}`);
}

/**
 * Teste completo (executa todos os testes em sequência)
 */
function testeCompleto() {
    console.log('\n🚀 INICIANDO BATERIA DE TESTES COMPLETA\n');
    console.log('⏱️ Duração estimada: ~60 segundos\n');
    
    if (!verificarComponentes()) {
        console.error('❌ Testes cancelados: componentes ausentes');
        return;
    }
    
    setTimeout(() => testeIncrementoNormal(), 1000);
    setTimeout(() => testeDecrementoNormal(), 14000);
    setTimeout(() => testeWrapAroundFrente(), 27000);
    setTimeout(() => testeWrapAroundTras(), 40000);
    setTimeout(() => testeAleatorio(), 53000);
    
    setTimeout(() => {
        console.log('\n✅ BATERIA DE TESTES CONCLUÍDA');
        verificarEstado();
    }, 73000);
}

/**
 * Monitora eventos programChange em tempo real
 */
function monitorarProgramChange(duracao = 30000) {
    console.log(`\n👁️ Monitorando eventos programChange por ${duracao/1000} segundos...`);
    console.log('💡 Envie comandos pelo Board Bells físico agora\n');
    
    const boardBells = Object.values(window.midiDeviceManager?.devices || {})
        .find(device => device.constructor.name === 'BoardBellsDevice');
    
    if (!boardBells) {
        console.error('❌ Board Bells não conectado');
        return;
    }
    
    // Fazer backup do método original
    const originalMethod = boardBells.handleProgramChange.bind(boardBells);
    let eventCount = 0;
    
    // Sobrescrever temporariamente
    boardBells.handleProgramChange = function(message) {
        eventCount++;
        console.log(`\n📥 Evento #${eventCount} recebido às ${new Date().toLocaleTimeString()}`);
        console.log(`   ├─ Valor: ${message.program}`);
        console.log(`   └─ Canal: ${message.channel ?? 0}`);
        
        // Chamar método original
        originalMethod(message);
    };
    
    // Restaurar após duração
    setTimeout(() => {
        boardBells.handleProgramChange = originalMethod;
        console.log(`\n✅ Monitoramento encerrado`);
        console.log(`   └─ Total de eventos capturados: ${eventCount}`);
    }, duracao);
}

// ============================================================
// EXPORTS PARA CONSOLE
// ============================================================

window.testeBoardBells = {
    verificarComponentes,
    verificarEstado,
    simularProgramChange,
    simularCliqueSpinUp,
    simularCliqueSpinDown,
    testeIncrementoNormal,
    testeDecrementoNormal,
    testeWrapAroundFrente,
    testeWrapAroundTras,
    testeAleatorio,
    testeCompleto,
    monitorarProgramChange
};

// ============================================================
// AJUDA
// ============================================================

console.log('\n📚 FUNÇÕES DISPONÍVEIS:\n');
console.log('testeBoardBells.verificarComponentes()     - Verifica componentes do sistema');
console.log('testeBoardBells.verificarEstado()          - Mostra estado atual');
console.log('testeBoardBells.simularProgramChange(N)    - Simula programChange = N');
console.log('testeBoardBells.simularCliqueSpinUp()      - Simula clique em ▲');
console.log('testeBoardBells.simularCliqueSpinDown()    - Simula clique em ▼');
console.log('testeBoardBells.testeIncrementoNormal()    - Teste de incremento');
console.log('testeBoardBells.testeDecrementoNormal()    - Teste de decremento');
console.log('testeBoardBells.testeWrapAroundFrente()    - Teste wrap 127→0');
console.log('testeBoardBells.testeWrapAroundTras()      - Teste wrap 0→127');
console.log('testeBoardBells.testeAleatorio()           - Teste com valores aleatórios');
console.log('testeBoardBells.testeCompleto()            - Executa todos os testes');
console.log('testeBoardBells.monitorarProgramChange()   - Monitora eventos do device');
console.log('\n💡 EXEMPLO DE USO:');
console.log('   testeBoardBells.verificarComponentes()');
console.log('   testeBoardBells.simularProgramChange(50)');
console.log('   testeBoardBells.testeCompleto()');
console.log('\n═══════════════════════════════════════════════════════════\n');

// Executar verificação inicial automaticamente
verificarComponentes();
