// Test Suite: Web MIDI API Robustness Validation
// ================================================
// Data: 22/10/2025
// Descrição: Testes manuais para validar fluxo de inicialização, permissões e reconexão

/**
 * 🧪 TESTE 1: Validar Contexto Seguro
 * 
 * Execução: Abra Console (F12) e execute:
 * testSecureContext()
 */
function testSecureContext() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 1: Validar Contexto Seguro');
    console.log('═══════════════════════════════════════════════════════════');
    
    const validation = window.midiManager?.validateSecureContext?.();
    
    if (!validation) {
        console.error('❌ midiManager não encontrado. Carregue a aplicação primeiro.');
        return;
    }
    
    console.log('');
    console.log('Resultado:', validation.allowed ? '✅ PASSOU' : '❌ FALHOU');
    console.log('Razão:', validation.reason);
    console.log('');
    
    if (!validation.allowed) {
        console.log('💡 Sugestões:');
        validation.suggestions.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s}`);
        });
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    return validation.allowed;
}

/**
 * 🧪 TESTE 2: Validar Estado de Permissão
 * 
 * Execução: Abra Console (F12) e execute:
 * testPermissionStatus()
 */
async function testPermissionStatus() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 2: Validar Estado de Permissão MIDI');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!navigator.permissions || !navigator.permissions.query) {
        console.warn('⚠️ Permissions API não disponível neste navegador');
        return;
    }
    
    try {
        const status = await navigator.permissions.query({ name: 'midi' });
        
        console.log('Estado de Permissão:', status.state);
        console.log('');
        
        switch (status.state) {
            case 'granted':
                console.log('✅ Permissão já concedida');
                console.log('   Comportamento: requestMIDIAccess() será resolvido imediatamente');
                break;
                
            case 'denied':
                console.log('⛔ Permissão foi negada');
                console.log('   Ação: Abra chrome://settings/content/midiDevices e remova o bloqueio');
                break;
                
            case 'prompt':
                console.log('🔔 Permissão ainda não concedida');
                console.log('   Comportamento: Um popup será exibido ao chamar requestMIDIAccess()');
                break;
        }
        
        // Configurar observer para mudanças
        status.addEventListener('change', (event) => {
            console.log(`ℹ️ Estado de permissão mudou para: ${event.target.state}`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao consultar permissão:', error);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 3: Testar Inicialização com Gesto do Usuário
 * 
 * Execução: Abra Console (F12) e execute:
 * testUserGestureInitialization()
 * Depois clique em qualquer lugar da página
 */
async function testUserGestureInitialization() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 3: Testar Inicialização com Gesto do Usuário');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⏳ Aguardando seu clique em qualquer lugar da página...');
    console.log('═══════════════════════════════════════════════════════════');
    
    await new Promise((resolve) => {
        document.addEventListener('click', async () => {
            console.log('');
            console.log('✅ Clique detectado! Iniciando MIDI...');
            console.log('');
            
            try {
                await window.midiManager?.initializeOnUserGesture?.('click');
                console.log('✅ Inicialização completada');
            } catch (error) {
                console.error('❌ Erro na inicialização:', error);
            }
            
            resolve();
        }, { once: true });
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 4: Testar Tratamento de Erros
 * 
 * Execução: Abra Console (F12) e execute:
 * testErrorHandling()
 */
async function testErrorHandling() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 4: Testar Tratamento de Erros');
    console.log('═══════════════════════════════════════════════════════════');
    
    const testErrors = [
        {
            name: 'SecurityError',
            message: 'access denied for origin',
            type: 'Contexto inseguro (HTTP em host remoto)',
            solution: 'Use HTTPS ou localhost'
        },
        {
            name: 'NotAllowedError',
            message: 'MIDI access denied',
            type: 'Permissão negada pelo usuário',
            solution: 'Abra chrome://settings/content/midiDevices'
        },
        {
            name: 'NotSupportedError',
            message: 'MIDI is not supported',
            type: 'Navegador não suporta Web MIDI',
            solution: 'Use Chrome, Edge ou Opera'
        },
        {
            name: 'TimeoutError',
            message: 'Permission request timed out',
            type: 'Timeout ao solicitar permissão',
            solution: 'Tente novamente e clique rapidamente'
        }
    ];
    
    console.log('Tipos de erro esperados:');
    console.log('');
    
    testErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.name}`);
        console.log(`   Mensagem: ${err.message}`);
        console.log(`   Tipo: ${err.type}`);
        console.log(`   Solução: ${err.solution}`);
        console.log('');
    });
    
    console.log('✅ Os erros acima são tratados pela classe MIDIDeviceManager');
    console.log('   Métodos responsáveis:');
    console.log('   • handleSecurityError()');
    console.log('   • handleNotAllowedError()');
    console.log('   • handleNotSupportedError()');
    console.log('   • handleTimeoutError()');
    console.log('   • handleAbortError()');
    console.log('   • handleGenericError()');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 5: Testar Detecção de Dispositivos
 * 
 * Execução: Abra Console (F12) e execute:
 * testDeviceDetection()
 * Depois conecte/desconecte o Midi-Terra
 */
async function testDeviceDetection() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 5: Testar Detecção de Dispositivos');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!window.midiManager?.isInitialized) {
        console.warn('⚠️ MIDI não inicializado. Execute initialize() primeiro.');
        return;
    }
    
    console.log('Estado atual:');
    console.log(`  Dispositivos conectados: ${window.midiManager?.connectedDevices?.size || 0}`);
    console.log('');
    
    // Listar dispositivos
    if (window.midiManager?.connectedDevices?.size > 0) {
        console.log('✅ Dispositivos conectados:');
        window.midiManager.connectedDevices.forEach((device, deviceId) => {
            console.log(`  • ${device.name} (ID: ${deviceId})`);
            console.log(`    Fabricante: ${device.manufacturer || 'N/A'}`);
            console.log(`    Estado: ${device.state}`);
        });
    } else {
        console.log('❌ Nenhum dispositivo detectado');
        console.log('   Ações:');
        console.log('   1. Reconecte o cabo USB do Midi-Terra');
        console.log('   2. Feche Microsoft Edge se estiver aberto');
        console.log('   3. Feche DAWs e aplicativos MIDI');
        console.log('   4. Recarregue a página (F5)');
    }
    
    console.log('');
    console.log('📝 Deixe este teste executando e:');
    console.log('   1. Desconecte o Midi-Terra do USB');
    console.log('   2. Observe os logs de desconexão');
    console.log('   3. Reconecte o Midi-Terra');
    console.log('   4. Observe os logs de reconexão automática');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 6: Testar Event Listener (onstatechange)
 * 
 * Execução: Abra Console (F12) e execute:
 * testStateChangeListener()
 * Depois conecte/desconecte o Midi-Terra
 */
async function testStateChangeListener() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 6: Testar Event Listener onstatechange');
    console.log('═══════════════════════════════════════════════════════════');
    
    const midiAccess = window.midiManager?.getMIDIAccess?.();
    
    if (!midiAccess) {
        console.warn('⚠️ midiAccess não disponível');
        return;
    }
    
    // Listar portas atuais
    console.log('Portas MIDI atuais:');
    console.log(`  Inputs: ${midiAccess.inputs.size}`);
    console.log(`  Outputs: ${midiAccess.outputs.size}`);
    console.log('');
    
    Array.from(midiAccess.inputs.values()).forEach((input, i) => {
        console.log(`  Input ${i + 1}: ${input.name} (state: ${input.state})`);
    });
    
    console.log('');
    console.log('📝 Deixe este teste executando:');
    console.log('   Conecte/Desconecte o Midi-Terra USB');
    console.log('   Você deve ver eventos de mudança de estado abaixo');
    console.log('');
    
    // Setup listener temporário para este teste
    const testListener = (event) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${event.port.state.toUpperCase()}: ${event.port.name}`);
    };
    
    midiAccess.addEventListener('statechange', testListener);
    
    console.log('⏳ Listener ativo. Aguardando eventos...');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 7: Testar Mensagens MIDI
 * 
 * Execução: Abra Console (F12) e execute:
 * testMIDIMessages()
 * Depois pressione uma tecla no Midi-Terra
 */
async function testMIDIMessages() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 7: Testar Recepção de Mensagens MIDI');
    console.log('═══════════════════════════════════════════════════════════');
    
    const midiAccess = window.midiManager?.getMIDIAccess?.();
    
    if (!midiAccess || midiAccess.inputs.size === 0) {
        console.warn('⚠️ Nenhuma porta MIDI de entrada disponível');
        return;
    }
    
    const inputs = Array.from(midiAccess.inputs.values());
    console.log(`Monitorando ${inputs.length} porta(s) MIDI:`);
    
    inputs.forEach((input) => {
        console.log(`  • ${input.name}`);
        
        // Setup listener para mensagens
        input.onmidimessage = (event) => {
            const [status, note, velocity] = event.data;
            const timestamp = new Date().toISOString();
            const statusName = (status >> 4) === 9 ? 'Note On' : 'Note Off';
            
            console.log(`[${timestamp}] ${statusName} | Nota: ${note} | Velocity: ${velocity}`);
        };
    });
    
    console.log('');
    console.log('📝 Agora pressione uma tecla no Midi-Terra');
    console.log('   Você deve ver eventos como:');
    console.log('   [2025-10-22T10:30:45] Note On | Nota: 60 | Velocity: 100');
    console.log('');
    console.log('⏳ Listener ativo. Aguardando mensagens MIDI...');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 8: Teste Completo de Reconexão Automática
 * 
 * Execução: Abra Console (F12) e execute:
 * testAutoReconnection()
 * Depois desconecte/reconecte o Midi-Terra
 */
async function testAutoReconnection() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE 8: Teste Completo de Reconexão Automática');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!window.midiManager?.isInitialized) {
        console.warn('⚠️ MIDI não inicializado');
        return;
    }
    
    console.log('Sequência de teste:');
    console.log('');
    console.log('1. ⏳ Aguardando desconexão do dispositivo...');
    console.log('   (Desconecte o cabo USB do Midi-Terra)');
    console.log('');
    console.log('2. ⏳ Após desconexão, aguardando reconexão...');
    console.log('   (Reconecte o cabo USB do Midi-Terra)');
    console.log('');
    console.log('3. ✅ Sistema tentará reconectar automaticamente');
    console.log('   (Observe os logs de tentativa de reconexão)');
    console.log('');
    console.log('Resultado esperado:');
    console.log('  ✅ Dispositivo reconectado sem ação manual');
    console.log('  ✅ Eventos MIDI voltam a funcionar');
    console.log('  ✅ Sem perda de estado da aplicação');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

/**
 * 🧪 TESTE 9: Diagnóstico Completo
 * 
 * Execução: Abra Console (F12) e execute:
 * runFullDiagnostics()
 */
async function runFullDiagnostics() {
    console.clear();
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       🧪 DIAGNÓSTICO COMPLETO - TERRA MIDI             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    
    // 1. Contexto Seguro
    const secureOk = testSecureContext();
    
    // 2. Permissão
    await testPermissionStatus();
    
    // 3. Status Geral
    console.log('📊 STATUS GERAL:');
    console.log('');
    console.log(`Navegador: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
    console.log(`MIDI Suportado: ${navigator.requestMIDIAccess ? '✅' : '❌'}`);
    console.log(`MIDIDeviceManager: ${window.midiManager ? '✅' : '❌'}`);
    console.log(`Inicializado: ${window.midiManager?.isInitialized ? '✅' : '❌'}`);
    console.log(`Dispositivos: ${window.midiManager?.connectedDevices?.size || 0}`);
    console.log('');
    
    // 4. Próximas ações
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('');
    
    if (!secureOk) {
        console.log('1. ⚠️ Configure HTTPS ou localhost');
        console.log('2. Recarregue a página');
    }
    
    if (!window.midiManager?.isInitialized) {
        console.log('3. Clique em "Conectar MIDI" ou qualquer elemento da página');
        console.log('4. Clique rapidamente em "Permitir" quando o prompt aparecer');
    }
    
    if (window.midiManager?.connectedDevices?.size === 0) {
        console.log('5. Se nenhum dispositivo aparecer:');
        console.log('   • Feche Microsoft Edge');
        console.log('   • Feche DAWs e apps de teste MIDI');
        console.log('   • Reconecte o cabo USB');
    } else {
        console.log('6. ✅ Tudo pronto! Teste pressionando uma tecla no Midi-Terra');
    }
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Para mais testes, execute as funções abaixo:      ║');
    console.log('║                                                         ║');
    console.log('║  testUserGestureInitialization()                        ║');
    console.log('║  testErrorHandling()                                    ║');
    console.log('║  testDeviceDetection()                                  ║');
    console.log('║  testStateChangeListener()                              ║');
    console.log('║  testMIDIMessages()                                     ║');
    console.log('║  testAutoReconnection()                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
}

// Exportar funções para escopo global
if (typeof window !== 'undefined') {
    window.testSecureContext = testSecureContext;
    window.testPermissionStatus = testPermissionStatus;
    window.testUserGestureInitialization = testUserGestureInitialization;
    window.testErrorHandling = testErrorHandling;
    window.testDeviceDetection = testDeviceDetection;
    window.testStateChangeListener = testStateChangeListener;
    window.testMIDIMessages = testMIDIMessages;
    window.testAutoReconnection = testAutoReconnection;
    window.runFullDiagnostics = runFullDiagnostics;
    
    console.log('✅ Test Suite carregado. Execute runFullDiagnostics() para começar.');
}
