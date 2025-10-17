// Diagnóstico MIDI - Midi-Terra
// Execute este script no console do navegador (F12)

console.log('🔍 INICIANDO DIAGNÓSTICO MIDI...');
console.log('='.repeat(60));

// 1. Verificar suporte à Web MIDI API
console.log('\n1️⃣ Verificando suporte à Web MIDI API...');
if (navigator.requestMIDIAccess) {
    console.log('✅ Web MIDI API SUPORTADA');
} else {
    console.error('❌ Web MIDI API NÃO SUPORTADA');
    console.log('💡 Use Chrome, Edge ou Opera');
}

// 2. Verificar se scripts foram carregados
console.log('\n2️⃣ Verificando scripts carregados...');
console.log('MIDIDeviceManager:', typeof MIDIDeviceManager !== 'undefined' ? '✅' : '❌');
console.log('MIDIConnectionNotifier:', typeof MIDIConnectionNotifier !== 'undefined' ? '✅' : '❌');
console.log('BoardBellsDevice:', typeof BoardBellsDevice !== 'undefined' ? '✅' : '❌');
console.log('MIDIOscilloscope:', typeof MIDIOscilloscope !== 'undefined' ? '✅' : '❌');
console.log('MIDIStatusPanel:', typeof MIDIStatusPanel !== 'undefined' ? '✅' : '❌');

// 3. Verificar instâncias globais
console.log('\n3️⃣ Verificando instâncias globais...');
console.log('window.midiManager:', window.midiManager ? '✅' : '❌');
console.log('window.midiNotifier:', window.midiNotifier ? '✅' : '❌');
console.log('window.midiStatusPanel:', window.midiStatusPanel ? '✅' : '❌');
console.log('window.midiOscilloscope:', window.midiOscilloscope ? '✅' : '❌');
console.log('window.soundfontManager:', window.soundfontManager ? '✅' : '❌');
console.log('window.audioEngine:', window.audioEngine ? '✅' : '❌');

// 4. Escanear dispositivos MIDI manualmente
console.log('\n4️⃣ Escaneando dispositivos MIDI...');
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: false }).then(access => {
        const inputs = Array.from(access.inputs.values());
        const outputs = Array.from(access.outputs.values());
        
        console.log(`📥 Entradas MIDI: ${inputs.length}`);
        console.log(`📤 Saídas MIDI: ${outputs.length}`);
        
        if (inputs.length === 0) {
            console.warn('⚠️ NENHUM DISPOSITIVO MIDI DETECTADO!');
            console.log('💡 Verifique:');
            console.log('   - Midi-Terra está conectado via USB?');
            console.log('   - Cabo USB está funcionando?');
            console.log('   - Dispositivo aparece no Gerenciador de Dispositivos?');
        } else {
            console.log('\n📋 DISPOSITIVOS DETECTADOS:');
            inputs.forEach((input, index) => {
                console.log(`\n[${index + 1}] ${input.name}`);
                console.log(`    ID: ${input.id}`);
                console.log(`    Fabricante: ${input.manufacturer || 'N/A'}`);
                console.log(`    Estado: ${input.state}`);
                console.log(`    Tipo: ${input.type}`);
                
                const isMidiTerra = input.name.toLowerCase().includes('midi-terra') ||
                                   input.name.toLowerCase().includes('midterra');
                
                if (isMidiTerra) {
                    console.log('    🎉 MIDI-TERRA DETECTADO!');
                }
            });
        }
        
        // 5. Verificar se midiManager detectou
        console.log('\n5️⃣ Status do MIDIDeviceManager...');
        if (window.midiManager) {
            console.log('Dispositivos conectados:', window.midiManager.connectedDevices.size);
            console.log('Handlers criados:', window.midiManager.deviceHandlers.size);
            console.log('Estatísticas:', window.midiManager.stats);
            
            if (window.midiManager.connectedDevices.size === 0) {
                console.warn('⚠️ MIDIDeviceManager NÃO CONECTOU nenhum dispositivo!');
                console.log('💡 Possíveis causas:');
                console.log('   - Filtro de nome não reconheceu o dispositivo');
                console.log('   - Erro na inicialização do manager');
            } else {
                console.log('✅ Dispositivos conectados pelo manager:');
                window.midiManager.connectedDevices.forEach((device, id) => {
                    console.log(`   - ${device.name} (${id})`);
                });
            }
        } else {
            console.error('❌ window.midiManager NÃO EXISTE!');
            console.log('💡 O MIDIDeviceManager não foi inicializado');
            console.log('   Verifique erros no console durante o carregamento da página');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ DIAGNÓSTICO COMPLETO!');
        
    }).catch(error => {
        console.error('❌ ERRO ao acessar MIDI:', error);
        console.log('💡 Verifique as permissões MIDI no navegador');
    });
} else {
    console.error('❌ Navegador não suporta Web MIDI API');
}
