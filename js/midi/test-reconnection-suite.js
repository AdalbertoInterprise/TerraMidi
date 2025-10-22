// 🧪 TEST SUITE: Reconexão Automática do Midi-Terra
// Executar no Console (F12) do navegador com TerraMidi aberto
// Data: 22/10/2025

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST SUITE: Reconexão Automática do Midi-Terra');
console.log('═══════════════════════════════════════════════════════════');

const MIDIReconnectionTests = {
    results: [],
    
    /**
     * Teste 1: Verificar se midiManager está inicializado
     */
    test01_CheckMIDIManagerInitialization() {
        console.log('\n📋 TESTE 1: Verificar inicialização do MIDI Manager');
        console.log('─────────────────────────────────────────────');
        
        const pass = typeof window.midiManager !== 'undefined' && 
                     window.midiManager instanceof MIDIDeviceManager;
        
        console.log(`Status: ${pass ? '✅ PASSOU' : '❌ FALHOU'}`);
        if (!pass) {
            console.log('❌ MIDI Manager não inicializado');
            console.log('   Ação: Recarregue a página e aguarde o carregamento completo');
        } else {
            console.log('✅ MIDI Manager inicializado corretamente');
        }
        
        this.results.push({ test: 'MIDI Manager Initialization', pass });
        return pass;
    },

    /**
     * Teste 2: Verificar se midiAccess foi obtido
     */
    test02_CheckMIDIAccessState() {
        console.log('\n📋 TESTE 2: Verificar estado do midiAccess');
        console.log('─────────────────────────────────────────────');
        
        const midiAccess = window.midiManager?.midiAccess;
        const hasMIDIAccess = midiAccess && typeof midiAccess === 'object';
        const hasInputs = hasMIDIAccess && midiAccess.inputs && midiAccess.inputs.size >= 0;
        
        console.log(`midiAccess obtido: ${hasMIDIAccess ? '✅' : '❌'}`);
        console.log(`midiAccess.inputs: ${hasInputs ? `✅ (${midiAccess.inputs.size})` : '❌'}`);
        console.log(`midiAccess.outputs: ${hasMIDIAccess && midiAccess.outputs ? `✅ (${midiAccess.outputs.size})` : '❌'}`);
        
        const pass = hasMIDIAccess && hasInputs;
        console.log(`\nStatus: ${pass ? '✅ PASSOU' : '❌ FALHOU'}`);
        
        if (!pass) {
            console.log('❌ Não foi possível obter acesso MIDI');
            console.log('   Ação: Clique em "Permitir" quando Chrome solicitar, depois recarregue');
        }
        
        this.results.push({ test: 'MIDI Access State', pass });
        return pass;
    },

    /**
     * Teste 3: Verificar se há dispositivos MIDI conectados
     */
    test03_CheckConnectedDevices() {
        console.log('\n📋 TESTE 3: Verificar dispositivos MIDI conectados');
        console.log('─────────────────────────────────────────────');
        
        const connectedDevices = window.midiManager?.connectedDevices;
        const deviceCount = connectedDevices?.size || 0;
        
        console.log(`Dispositivos conectados: ${deviceCount}`);
        
        if (deviceCount > 0) {
            connectedDevices.forEach((device, id) => {
                console.log(`  ✅ ${device.name} (ID: ${id})`);
            });
        } else {
            console.log('  ⚠️ Nenhum dispositivo conectado');
        }
        
        const pass = deviceCount > 0;
        console.log(`\nStatus: ${pass ? '✅ PASSOU' : '⚠️ AVISO (sem dispositivos)'}`);
        
        if (!pass) {
            console.log('💡 Próximas ações:');
            console.log('   1. Conecte seu Midi-Terra via USB');
            console.log('   2. Aguarde 2-3 segundos');
            console.log('   3. Execute novamente este teste');
            console.log('   4. Ou execute: window.midiManager.scanForDevices("manual-test")');
        }
        
        this.results.push({ test: 'Connected Devices', pass });
        return pass;
    },

    /**
     * Teste 4: Verificar se onstatechange está configurado
     */
    test04_CheckStateChangeListener() {
        console.log('\n📋 TESTE 4: Verificar listener de estado MIDI');
        console.log('─────────────────────────────────────────────');
        
        const midiAccess = window.midiManager?.midiAccess;
        const hasListener = midiAccess && typeof midiAccess.onstatechange === 'function';
        
        console.log(`onstatechange configurado: ${hasListener ? '✅' : '❌'}`);
        
        const pass = hasListener;
        console.log(`Status: ${pass ? '✅ PASSOU' : '❌ FALHOU'}`);
        
        if (!pass) {
            console.log('❌ Listener onstatechange não configurado');
            console.log('   Ação: Chame window.midiManager.attachMIDIAccessListeners()');
        } else {
            console.log('✅ Listener configurado corretamente');
            console.log('   → Mudanças de estado USB serão detectadas automaticamente');
        }
        
        this.results.push({ test: 'State Change Listener', pass });
        return pass;
    },

    /**
     * Teste 5: Verificar se há localStorage com estado persistido
     */
    test05_CheckPersistedState() {
        console.log('\n📋 TESTE 5: Verificar estado persistido no localStorage');
        console.log('─────────────────────────────────────────────');
        
        const wasInitialized = localStorage.getItem('terraMidi:wasInitialized');
        const lastConnected = localStorage.getItem('terraMidi:lastConnectedDevices');
        const lastInitTime = localStorage.getItem('terraMidi:lastInitTime');
        
        console.log(`wasInitialized: ${wasInitialized ? `✅ (${wasInitialized})` : '❌ (ausente)'}`);
        console.log(`lastConnectedDevices: ${lastConnected ? `✅` : '❌ (ausente)'}`);
        console.log(`lastInitTime: ${lastInitTime ? `✅ (${new Date(parseInt(lastInitTime)).toLocaleTimeString()})` : '❌ (ausente)'}`);
        
        if (lastConnected) {
            try {
                const devices = JSON.parse(lastConnected);
                console.log(`   └─ Dispositivos salvos: ${devices.join(', ')}`);
            } catch (e) {
                console.log('   └─ (erro ao parsear)');
            }
        }
        
        const pass = wasInitialized && lastConnected;
        console.log(`\nStatus: ${pass ? '✅ PASSOU' : '⚠️ AVISO (estado incompleto)'}`);
        
        if (!pass) {
            console.log('💡 Estado não será recuperado em próximo reload');
            console.log('   Ação: Aguarde até que dispositivo seja detectado');
        }
        
        this.results.push({ test: 'Persisted State', pass });
        return pass;
    },

    /**
     * Teste 6: Forçar reconexão automática
     */
    async test06_ForceAutoReconnect() {
        console.log('\n📋 TESTE 6: Forçar reconexão automática');
        console.log('─────────────────────────────────────────────');
        
        if (!window.midiManager?.autoReconnect) {
            console.log('❌ Método autoReconnect não disponível');
            this.results.push({ test: 'Force Auto Reconnect', pass: false });
            return false;
        }
        
        console.log('⏳ Iniciando reconexão automática...');
        try {
            const result = await window.midiManager.autoReconnect('test-suite');
            console.log(`Resultado: ${result ? '✅ Sucesso' : '⚠️ Nenhum dispositivo'}`);
            
            // Aguardar um pouco para o scan completar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const deviceCount = window.midiManager.connectedDevices?.size || 0;
            console.log(`\nDispositivos encontrados: ${deviceCount}`);
            
            const pass = deviceCount > 0 || result === true;
            console.log(`\nStatus: ${pass ? '✅ PASSOU' : '⚠️ (sem dispositivos encontrados)'}`);
            
            if (!pass) {
                console.log('💡 Dicas:');
                console.log('   1. Verifique se Midi-Terra está conectado via USB');
                console.log('   2. Confira se o dispositivo está em "Usar" (não em "Uso exclusivo")');
                console.log('   3. Tente desconectar e reconectar o cabo USB');
            }
            
            this.results.push({ test: 'Force Auto Reconnect', pass });
            return pass;
        } catch (error) {
            console.error('❌ Erro ao forçar reconexão:', error);
            console.log(`Status: ❌ FALHOU (${error.message})`);
            this.results.push({ test: 'Force Auto Reconnect', pass: false });
            return false;
        }
    },

    /**
     * Teste 7: Testar MIDI Message Handling
     */
    test07_TestMIDIMessageHandling() {
        console.log('\n📋 TESTE 7: Testar manipulação de mensagens MIDI');
        console.log('─────────────────────────────────────────────');
        
        const deviceCount = window.midiManager?.connectedDevices?.size || 0;
        
        if (deviceCount === 0) {
            console.log('⚠️ Nenhum dispositivo conectado');
            console.log('Ação: Conecte Midi-Terra e execute novamente');
            this.results.push({ test: 'MIDI Message Handling', pass: false });
            return false;
        }
        
        console.log(`✅ ${deviceCount} dispositivo(s) pronto(s) para receber MIDI`);
        console.log('\n💡 Próximas ações:');
        console.log('   1. Pressione algumas teclas no Midi-Terra');
        console.log('   2. Procure por logs "🎵 MIDI:" no console');
        console.log('   3. Verifique se os eventos estão sendo recebidos');
        
        const pass = deviceCount > 0;
        console.log(`\nStatus: ${pass ? '✅ Aguardando entrada MIDI...' : '❌ Sem dispositivos'}`);
        
        this.results.push({ test: 'MIDI Message Handling', pass });
        return pass;
    },

    /**
     * Teste 8: Simular reload
     */
    test08_SimulateReload() {
        console.log('\n📋 TESTE 8: Simular reload de página');
        console.log('─────────────────────────────────────────────');
        console.log('\n⏳ Em 5 segundos, a página será recarregada...');
        console.log('Após reload, execute novamente para verificar reconexão automática\n');
        
        const timeoutId = setTimeout(() => {
            console.log('🔄 Recarregando...');
            window.location.reload();
        }, 5000);
        
        // Permitir cancelar pressionando 'c'
        window.__testTimeoutId = timeoutId;
        
        this.results.push({ test: 'Simulate Reload', pass: null });
    },

    /**
     * Teste 9: Verificar browser compatibility
     */
    test09_CheckBrowserCompatibility() {
        console.log('\n📋 TESTE 9: Verificar compatibilidade do navegador');
        console.log('─────────────────────────────────────────────');
        
        const browserCompat = window.midiManager?.browserCompat;
        
        if (!browserCompat) {
            console.log('❌ BrowserCompatibility não disponível');
            this.results.push({ test: 'Browser Compatibility', pass: false });
            return false;
        }
        
        const report = browserCompat.generateCompatibilityReport();
        
        console.log(`Navegador: ${report.browser.name} ${report.browser.version}`);
        console.log(`Web MIDI suportado: ${report.features.midiSupport ? '✅' : '❌'}`);
        console.log(`Contexto seguro (HTTPS/localhost): ${report.features.secureContext ? '✅' : '❌'}`);
        console.log(`Disponibilidade: ${report.availability.available ? '✅' : '❌'}`);
        
        if (report.availability.warnings.length > 0) {
            console.log('\n⚠️ Avisos de compatibilidade:');
            report.availability.warnings.forEach(w => console.log(`   - ${w}`));
        }
        
        if (report.availability.recommendations.length > 0) {
            console.log('\n💡 Recomendações:');
            report.availability.recommendations.forEach(r => console.log(`   - ${r}`));
        }
        
        const pass = report.features.midiSupport && report.availability.available;
        console.log(`\nStatus: ${pass ? '✅ PASSOU' : '❌ FALHOU'}`);
        
        this.results.push({ test: 'Browser Compatibility', pass });
        return pass;
    },

    /**
     * Teste 10: Debug completo
     */
    test10_FullDebugInfo() {
        console.log('\n📋 TESTE 10: Informações de debug completas');
        console.log('─────────────────────────────────────────────');
        
        if (window.midiManager?.debugMidi) {
            window.midiManager.debugMidi();
        } else {
            console.log('❌ Método debugMidi não disponível');
        }
        
        this.results.push({ test: 'Full Debug Info', pass: true });
    },

    /**
     * Executar todos os testes
     */
    async runAll() {
        console.log('\n🧪 EXECUTANDO SUITE COMPLETA DE TESTES...\n');
        
        this.test01_CheckMIDIManagerInitialization();
        this.test02_CheckMIDIAccessState();
        this.test03_CheckConnectedDevices();
        this.test04_CheckStateChangeListener();
        this.test05_CheckPersistedState();
        this.test06_ForceAutoReconnect();
        this.test07_TestMIDIMessageHandling();
        this.test09_CheckBrowserCompatibility();
        this.test10_FullDebugInfo();
        
        // Gerar relatório
        this.printSummary();
    },

    /**
     * Imprimir resumo dos testes
     */
    printSummary() {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMO DOS TESTES');
        console.log('═══════════════════════════════════════════════════════════');
        
        const passed = this.results.filter(r => r.pass === true).length;
        const failed = this.results.filter(r => r.pass === false).length;
        const skipped = this.results.filter(r => r.pass === null).length;
        
        console.log(`\n✅ Passou: ${passed}`);
        console.log(`❌ Falhou: ${failed}`);
        console.log(`⏭️ Pulados: ${skipped}`);
        console.log(`📊 Total: ${this.results.length}`);
        
        console.log('\n📋 Detalhes:');
        this.results.forEach(result => {
            const icon = result.pass === true ? '✅' : result.pass === false ? '❌' : '⏭️';
            console.log(`   ${icon} ${result.test}`);
        });
        
        const successRate = Math.round((passed / (passed + failed)) * 100) || 0;
        console.log(`\n📈 Taxa de sucesso: ${successRate}%`);
        
        if (failed === 0 && skipped === 0) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ Sistema pronto para uso');
        } else if (failed > 0) {
            console.log('\n⚠️ Alguns testes falharam');
            console.log('💡 Revise as mensagens acima para troubleshooting');
        }
    }
};

// Atalhos convenientes
window.midiTest = {
    run: () => MIDIReconnectionTests.runAll(),
    test1: () => MIDIReconnectionTests.test01_CheckMIDIManagerInitialization(),
    test2: () => MIDIReconnectionTests.test02_CheckMIDIAccessState(),
    test3: () => MIDIReconnectionTests.test03_CheckConnectedDevices(),
    test4: () => MIDIReconnectionTests.test04_CheckStateChangeListener(),
    test5: () => MIDIReconnectionTests.test05_CheckPersistedState(),
    test6: () => MIDIReconnectionTests.test06_ForceAutoReconnect(),
    test7: () => MIDIReconnectionTests.test07_TestMIDIMessageHandling(),
    test9: () => MIDIReconnectionTests.test09_CheckBrowserCompatibility(),
    test10: () => MIDIReconnectionTests.test10_FullDebugInfo(),
    debug: () => window.midiManager?.debugMidi?.(),
    status: () => {
        console.log('MIDI Manager Status:');
        console.log(`- Inicializado: ${window.midiManager ? '✅' : '❌'}`);
        console.log(`- Dispositivos: ${window.midiManager?.connectedDevices?.size || 0}`);
        console.log(`- MIDI Access: ${window.midiManager?.midiAccess ? '✅' : '❌'}`);
    }
};

console.log('\n💡 Comandos disponíveis:');
console.log('   midiTest.run()      - Executar todos os testes');
console.log('   midiTest.test1()    - Verificar inicialização');
console.log('   midiTest.debug()    - Info de debug');
console.log('   midiTest.status()   - Status rápido');
console.log('   midiTest.test6()    - Forçar reconexão\n');

console.log('═══════════════════════════════════════════════════════════\n');
