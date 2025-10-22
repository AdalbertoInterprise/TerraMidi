#!/usr/bin/env node
/**
 * 🧪 Script de Validação de Duplicação de Classes
 * Verifica se ServiceWorkerBridge e PWAInstaller estão corretamente carregados
 * 
 * Uso: node scripts/validate-no-duplicates.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFileDuplicates(filepath, scriptName) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const matches = (content.match(new RegExp(`src="${scriptName}"`, 'g')) || []).length;
        
        return {
            scriptName,
            count: matches,
            passed: matches === 1
        };
    } catch (error) {
        return {
            scriptName,
            count: 0,
            passed: false,
            error: error.message
        };
    }
}

function checkProtection(filepath, className) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Verificar se tem proteção contra re-declaração
        const hasCheck = content.includes(`if (!window.${className})`);
        const hasWarning = content.includes(`já foi carregado`);
        
        return {
            className,
            hasCheck,
            hasWarning,
            passed: hasCheck && hasWarning
        };
    } catch (error) {
        return {
            className,
            hasCheck: false,
            hasWarning: false,
            passed: false,
            error: error.message
        };
    }
}

function main() {
    log('\n🧪 VALIDAÇÃO DE DUPLICAÇÃO DE CLASSES', 'cyan');
    log('=' .repeat(50), 'cyan');
    
    const indexPath = path.join(__dirname, '../index.html');
    const swBridgePath = path.join(__dirname, '../js/serviceWorkerBridge.js');
    const pwaInstallerPath = path.join(__dirname, '../js/pwaInstaller.js');
    
    let allPassed = true;
    
    // Teste 1: Verificar inclusões no HTML
    log('\n📋 Teste 1: Verificar Inclusões no HTML', 'blue');
    log('-' .repeat(50), 'blue');
    
    const swBridgeTest = checkFileDuplicates(indexPath, 'js/serviceWorkerBridge.js');
    const pwaInstallerTest = checkFileDuplicates(indexPath, 'js/pwaInstaller.js');
    
    if (swBridgeTest.error) {
        log(`❌ Erro ao ler ${indexPath}: ${swBridgeTest.error}`, 'red');
        allPassed = false;
    } else {
        const color = swBridgeTest.passed ? 'green' : 'red';
        const status = swBridgeTest.passed ? '✅ PASSOU' : '❌ FALHOU';
        log(`${status} - serviceWorkerBridge.js incluído ${swBridgeTest.count}x (esperado: 1)`, color);
        if (!swBridgeTest.passed) allPassed = false;
    }
    
    if (pwaInstallerTest.error) {
        log(`❌ Erro ao ler ${indexPath}: ${pwaInstallerTest.error}`, 'red');
        allPassed = false;
    } else {
        const color = pwaInstallerTest.passed ? 'green' : 'red';
        const status = pwaInstallerTest.passed ? '✅ PASSOU' : '❌ FALHOU';
        log(`${status} - pwaInstaller.js incluído ${pwaInstallerTest.count}x (esperado: 1)`, color);
        if (!pwaInstallerTest.passed) allPassed = false;
    }
    
    // Teste 2: Verificar proteção contra re-declaração
    log('\n🔒 Teste 2: Verificar Proteção contra Re-declaração', 'blue');
    log('-' .repeat(50), 'blue');
    
    const swBridgeProtection = checkProtection(swBridgePath, 'ServiceWorkerBridge');
    const pwaInstallerProtection = checkProtection(pwaInstallerPath, 'PWAInstaller');
    
    if (swBridgeProtection.error) {
        log(`❌ Erro ao ler ${swBridgePath}: ${swBridgeProtection.error}`, 'red');
        allPassed = false;
    } else {
        const status = swBridgeProtection.passed ? '✅ PASSOU' : '❌ FALHOU';
        log(`${status} - serviceWorkerBridge.js`, 'blue');
        log(`   ├─ Tem verificação if (!window.ServiceWorkerBridge): ${swBridgeProtection.hasCheck ? '✅' : '❌'}`, 
            swBridgeProtection.hasCheck ? 'green' : 'red');
        log(`   └─ Tem mensagem de aviso: ${swBridgeProtection.hasWarning ? '✅' : '❌'}`, 
            swBridgeProtection.hasWarning ? 'green' : 'red');
        if (!swBridgeProtection.passed) allPassed = false;
    }
    
    if (pwaInstallerProtection.error) {
        log(`❌ Erro ao ler ${pwaInstallerPath}: ${pwaInstallerProtection.error}`, 'red');
        allPassed = false;
    } else {
        const status = pwaInstallerProtection.passed ? '✅ PASSOU' : '❌ FALHOU';
        log(`${status} - pwaInstaller.js`, 'blue');
        log(`   ├─ Tem verificação if (!window.PWAInstaller): ${pwaInstallerProtection.hasCheck ? '✅' : '❌'}`, 
            pwaInstallerProtection.hasCheck ? 'green' : 'red');
        log(`   └─ Tem mensagem de aviso: ${pwaInstallerProtection.hasWarning ? '✅' : '❌'}`, 
            pwaInstallerProtection.hasWarning ? 'green' : 'red');
        if (!pwaInstallerProtection.passed) allPassed = false;
    }
    
    // Teste 3: Verificar outros scripts duplicados
    log('\n🔍 Teste 3: Verificar Outros Scripts Duplicados', 'blue');
    log('-' .repeat(50), 'blue');
    
    try {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        // Extrair todos os scripts
        const scriptRegex = /src="([^"]+\.js)"/g;
        const scripts = {};
        let match;
        
        while ((match = scriptRegex.exec(htmlContent)) !== null) {
            const src = match[1];
            scripts[src] = (scripts[src] || 0) + 1;
        }
        
        // Verificar se há duplicatas
        let foundDuplicates = false;
        for (const [src, count] of Object.entries(scripts)) {
            if (count > 1) {
                log(`⚠️  ${src} incluído ${count}x (esperado: 1)`, 'yellow');
                foundDuplicates = true;
            }
        }
        
        if (!foundDuplicates) {
            log(`✅ PASSOU - Nenhum script duplicado encontrado`, 'green');
        } else {
            allPassed = false;
        }
    } catch (error) {
        log(`❌ Erro ao verificar duplicatas: ${error.message}`, 'red');
        allPassed = false;
    }
    
    // Resultado Final
    log('\n' + '=' .repeat(50), 'cyan');
    if (allPassed) {
        log('✅ TODOS OS TESTES PASSARAM', 'green');
        log('Duplicação de classes foi corrigida com sucesso!', 'green');
        process.exit(0);
    } else {
        log('❌ ALGUNS TESTES FALHARAM', 'red');
        log('Verifique os erros acima e corrija os problemas.', 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkFileDuplicates, checkProtection };
