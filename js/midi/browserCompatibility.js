/**
 * ============================================================
 * MÓDULO DE COMPATIBILIDADE ENTRE NAVEGADORES
 * ============================================================
 * 
 * Detecta e adapta comportamentos específicos de cada navegador
 * para garantir funcionamento robusto da Web MIDI API.
 * 
 * Navegadores Suportados:
 * - Chrome 43+ ✅
 * - Edge 79+ ✅
 * - Opera 30+ ✅
 * - Firefox 108+ (experimental) ⚠️
 * 
 * Diferenças Conhecidas:
 * 
 * 1. CHROME vs EDGE:
 *    - Chrome: Mais restritivo com permissões MIDI
 *    - Chrome: Requer HTTPS ou localhost estrito
 *    - Chrome: Timeout mais curto para requestMIDIAccess()
 *    - Edge: Mais permissivo, funciona em contextos HTTP locais
 * 
 * 2. DETECÇÃO DE DISPOSITIVOS:
 *    - Chrome: Pode exibir nomes genéricos para dispositivos USB-MIDI
 *    - Edge: Geralmente mostra nomes mais detalhados
 *    - Ambos: Não expõem vendorId/productId via Web MIDI API
 * 
 * 3. PERMISSÕES:
 *    - Chrome: Prompt de permissão mais frequente
 *    - Edge: Lembra permissões por mais tempo
 * 
 * @version 1.0.0
 * @date 2025-10-16
 */

class BrowserCompatibility {
    constructor() {
        this.browser = this.detectBrowser();
        this.features = this.detectFeatures();
        this.quirks = this.identifyQuirks();
        
        console.log('🌐 Navegador detectado:', this.browser);
        console.log('🔧 Recursos disponíveis:', this.features);
        console.log('⚠️ Quirks identificados:', this.quirks);
    }

    /**
     * Detecta o navegador em uso
     * @returns {Object} Informações do navegador
     */
    detectBrowser() {
        const userAgent = navigator.userAgent;
        const vendor = navigator.vendor || '';
        
        // Detecção precisa baseada em múltiplos fatores
        const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(vendor) && !this.isEdge();
        const isEdge = /Edg/.test(userAgent);
        const isOpera = /OPR/.test(userAgent) || /Opera/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && /Apple/.test(vendor) && !isChrome && !isEdge;
        
        // Versões
        let version = 'desconhecida';
        let versionNumber = null;
        if (isChrome) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            if (match) {
                version = match[1];
                versionNumber = parseInt(match[1], 10);
            }
        } else if (isEdge) {
            const match = userAgent.match(/Edg\/(\d+)/);
            if (match) {
                version = match[1];
                versionNumber = parseInt(match[1], 10);
            }
        } else if (isOpera) {
            const match = userAgent.match(/OPR\/(\d+)/);
            if (match) {
                version = match[1];
                versionNumber = parseInt(match[1], 10);
            }
        } else if (isFirefox) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            if (match) {
                version = match[1];
                versionNumber = parseInt(match[1], 10);
            }
        }

        const normalizedVersion = (typeof versionNumber === 'number' && !Number.isNaN(versionNumber))
            ? versionNumber
            : null;
        
        return {
            name: isChrome ? 'Chrome' : isEdge ? 'Edge' : isOpera ? 'Opera' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Desconhecido',
            version: version,
            majorVersion: normalizedVersion,
            isChrome: isChrome,
            isEdge: isEdge,
            isOpera: isOpera,
            isFirefox: isFirefox,
            isSafari: isSafari,
            isChromiumBased: isChrome || isEdge || isOpera,
            userAgent: userAgent
        };
    }

    /**
     * Verifica se é Edge (precisa ser separado para evitar detecção como Chrome)
     */
    isEdge() {
        return /Edg/.test(navigator.userAgent);
    }

    /**
     * Detecta recursos disponíveis
     * @returns {Object} Mapa de recursos
     */
    detectFeatures() {
        return {
            midiSupport: 'requestMIDIAccess' in navigator,
            secureContext: window.isSecureContext,
            https: window.location.protocol === 'https:',
            localhost: this.isLocalhost(),
            serviceWorker: 'serviceWorker' in navigator,
            notifications: 'Notification' in window,
            audioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };
    }

    /**
     * Verifica se está rodando em localhost
     * @returns {boolean}
     */
    isLocalhost() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname === '[::1]' ||
               hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/);
    }

    /**
     * Identifica quirks específicos do navegador
     * @returns {Object} Mapa de quirks
     */
    identifyQuirks() {
        const quirks = {};
        
        if (this.browser.isChrome) {
            // Chrome é mais restritivo com segurança
            quirks.requiresStrictHTTPS = !this.features.localhost && !this.features.https;
            quirks.shortPermissionTimeout = true; // Chrome timeout ~30s
            quirks.needsExplicitUserGesture = true;
            quirks.genericDeviceNames = true; // Chrome pode mostrar nomes genéricos
            quirks.recommendedTimeout = 30000; // 30 segundos
        }
        
        if (this.browser.isEdge) {
            // Edge é mais permissivo
            quirks.requiresStrictHTTPS = false;
            quirks.shortPermissionTimeout = false; // Edge timeout ~60s
            quirks.needsExplicitUserGesture = false; // Edge permite chamadas automáticas em alguns contextos
            quirks.betterDeviceNames = true; // Edge geralmente mostra nomes melhores
            quirks.recommendedTimeout = 60000; // 60 segundos
        }
        
        if (this.browser.isOpera) {
            // Opera usa Chromium, similar ao Chrome
            quirks.requiresStrictHTTPS = !this.features.localhost && !this.features.https;
            quirks.shortPermissionTimeout = true;
            quirks.needsExplicitUserGesture = true;
            quirks.recommendedTimeout = 30000;
        }
        
        if (this.browser.isFirefox) {
            // Firefox 108+ tem suporte experimental
            quirks.experimentalSupport = true;
            quirks.requiresPreferences = true; // Pode precisar habilitar em about:config
            quirks.limitedSupport = true;
            quirks.recommendedTimeout = 45000;
        }
        
        return quirks;
    }

    /**
     * Verifica se Web MIDI está disponível e pode ser usado
     * @returns {Object} Status de disponibilidade
     */
    checkMIDIAvailability() {
        const status = {
            available: false,
            reason: '',
            canProceed: false,
            warnings: [],
            recommendations: [],
            versionStatus: {
                current: this.browser.majorVersion,
                minimum: null,
                outdated: false
            }
        };

        // 1. Verificar suporte básico
        if (!this.features.midiSupport) {
            status.reason = 'Web MIDI API não suportada neste navegador';
            status.recommendations.push('Use Chrome 43+, Edge 79+ ou Opera 30+');
            
            if (this.browser.isFirefox) {
                status.warnings.push('Firefox tem suporte experimental desde versão 108');
                status.recommendations.push('Verifique a versão e habilite em about:config se necessário');
            }
            
            return status;
        }

        // 2. Verificar contexto seguro (HTTPS ou localhost)
        if (!this.features.secureContext) {
            status.reason = 'Web MIDI requer contexto seguro (HTTPS ou localhost)';
            status.canProceed = false;
            
            if (this.browser.isChrome) {
                status.warnings.push('Chrome é particularmente restritivo com requisitos de segurança');
                status.warnings.push('Chrome bloqueia Web MIDI em contextos HTTP não-seguros');
            }
            
            if (!this.features.https && !this.features.localhost) {
                status.recommendations.push('Acesse via HTTPS ou localhost');
                status.recommendations.push('Para desenvolvimento: use http://localhost ou http://127.0.0.1');
                status.recommendations.push('Para produção: configure certificado SSL/TLS válido');
                
                // Adicionar informação específica para Chrome
                if (this.browser.isChrome) {
                    status.recommendations.push('Execute: npx http-server -S -C cert.pem -K key.pem (requer mkcert)');
                }
            }
            
            return status;
        }

        // 3. Verificar quirks específicos do Chrome
        if (this.browser.isChrome && this.quirks.requiresStrictHTTPS) {
            status.warnings.push('Chrome detectado: certifique-se de estar em HTTPS ou localhost');
            status.warnings.push('Chrome pode ter timeout mais curto (~30s) para concessão de permissão');
        }

        // 4. Verificar Edge
        if (this.browser.isEdge) {
            status.warnings.push('Edge detectado: geralmente mais permissivo que Chrome');
        }

        // 5. Tudo OK
        status.available = true;
        status.canProceed = true;
        status.reason = 'Web MIDI API disponível e pronta para uso';

        if (this.browser.isChrome) {
            const minimumChromeVersion = 115;
            status.versionStatus.minimum = minimumChromeVersion;

            if (!status.versionStatus.current || status.versionStatus.current < minimumChromeVersion) {
                status.versionStatus.outdated = true;
                const currentLabel = status.versionStatus.current ? `versão ${status.versionStatus.current}` : 'versão desconhecida';
                status.warnings.push(`Chrome ${currentLabel} detectado. Recomenda-se atualizar para a versão ${minimumChromeVersion} ou superior para garantir suporte Web MIDI completo.`);
                status.recommendations.push('Abra chrome://settings/help e procure por atualizações do Chrome. Reinicie o navegador após atualizar.');
            }
        }
        
        return status;
    }

    /**
     * Retorna configurações otimizadas para requestMIDIAccess()
     * @returns {Object} Opções de configuração
     */
    getOptimizedMIDIOptions() {
        return {
            sysex: false, // SysEx requer permissões extras, desabilitado por padrão
            software: true, // Incluir dispositivos de software
            
            // Timeout recomendado baseado no navegador
            recommendedTimeout: this.quirks.recommendedTimeout || 45000,
            
            // Se precisa de gesto explícito do usuário
            needsUserGesture: this.quirks.needsExplicitUserGesture || false,
            
            // Se é seguro tentar automático (sem clique)
            canAutoRequest: !this.quirks.needsExplicitUserGesture
        };
    }

    /**
     * Normaliza nome do dispositivo entre navegadores
     * Chrome e Edge podem reportar nomes diferentes para o mesmo dispositivo
     * 
     * @param {string} deviceName Nome reportado pelo navegador
     * @returns {string} Nome normalizado
     */
    normalizeDeviceName(deviceName) {
        if (!deviceName) return '';
        
        let normalized = deviceName.trim().toLowerCase();
        
        // Remover caracteres especiais comuns
        normalized = normalized.replace(/[^\w\s-]/g, '');
        
        // Normalizar espaços
        normalized = normalized.replace(/\s+/g, ' ');
        
        // Variações conhecidas do Midi-Terra
        const midiTerraVariations = [
            'midi-terra',
            'miditerra',
            'midi terra'
        ];

        for (const variation of midiTerraVariations) {
            if (normalized.includes(variation)) {
                return 'midi-terra'; // Nome padrão
            }
        }

        return normalized;
    }

    /**
     * Verifica se um dispositivo corresponde aos padrões Terra
     * Adaptado para diferentes formas de detecção entre navegadores
     * 
     * @param {MIDIInput|MIDIOutput} device Dispositivo MIDI
     * @returns {boolean} true se é dispositivo Terra
     */
    isTerraDevice(device) {
        if (!device) return false;
        
        const name = device.name || '';
        const manufacturer = device.manufacturer || '';
        const normalizedName = this.normalizeDeviceName(name);
        const normalizedManufacturer = this.normalizeDeviceName(manufacturer);
        const normalizedId = this.normalizeDeviceName(device.id || '');
        const midiTerraFingerprint = 'midi-terra';

        const matchesName = normalizedName.includes(midiTerraFingerprint);
        const matchesManufacturer = normalizedManufacturer.includes(midiTerraFingerprint);
        const matchesId = normalizedId.includes(midiTerraFingerprint);

        if (matchesName || matchesManufacturer || matchesId) {
            console.log('✅ Dispositivo Midi-Terra detectado (filtro restrito)');
            console.log(`   ├─ Nome original: "${name}"`);
            console.log(`   ├─ Nome normalizado: "${normalizedName}"`);
            console.log(`   ├─ ID normalizado: "${normalizedId}"`);
            console.log(`   └─ Navegador: ${this.browser.name}`);
            return true;
        }
        
        // Log de dispositivo não reconhecido para debugging
        if (this.browser.isChrome && this.quirks.genericDeviceNames) {
            console.log('⚠️ Chrome pode estar reportando nome genérico:', name);
            console.log('   Considere verificar manualmente se este é o dispositivo correto');
        }
        
        return false;
    }

    /**
     * Retorna mensagem de erro contextual baseada no navegador
     * @param {string} errorType Tipo do erro
     * @returns {string} Mensagem formatada
     */
    getContextualErrorMessage(errorType) {
        const messages = {
            unsupported: {
                Chrome: 'Web MIDI requer Chrome 43 ou superior. Verifique sua versão.',
                Edge: 'Web MIDI requer Edge 79 ou superior. Verifique sua versão.',
                Firefox: 'Web MIDI tem suporte experimental no Firefox 108+. Habilite em about:config.',
                Safari: 'Safari tem suporte limitado/instável para Web MIDI. Use Chrome ou Edge.',
                default: 'Este navegador não suporta Web MIDI API. Use Chrome, Edge ou Opera.'
            },
            
            secureContext: {
                Chrome: 'Chrome requer HTTPS ou localhost para Web MIDI. Contexto HTTP simples não é permitido.',
                Edge: 'Edge requer contexto seguro para Web MIDI. Use HTTPS ou localhost.',
                default: 'Web MIDI requer contexto seguro (HTTPS ou localhost).'
            },
            
            permission: {
                Chrome: 'Permissão MIDI negada. Chrome requer autorização explícita do usuário. Clique em "Permitir" quando solicitado.',
                Edge: 'Permissão MIDI negada. Clique em "Permitir" quando o navegador solicitar acesso.',
                default: 'Permissão MIDI negada. Autorize o acesso quando solicitado pelo navegador.'
            },
            
            timeout: {
                Chrome: 'Tempo esgotado esperando permissão MIDI. Chrome tem timeout de ~30s. Tente novamente e clique em "Permitir" rapidamente.',
                Edge: 'Tempo esgotado esperando permissão MIDI. Tente novamente.',
                default: 'Tempo esgotado esperando resposta do navegador. Tente novamente.'
            }
        };

        const browserMessages = messages[errorType];
        if (!browserMessages) return 'Erro desconhecido ao acessar Web MIDI API';
        
        return browserMessages[this.browser.name] || browserMessages.default;
    }

    /**
     * Gera relatório completo de compatibilidade
     * @returns {Object} Relatório detalhado
     */
    generateCompatibilityReport() {
        return {
            browser: this.browser,
            features: this.features,
            quirks: this.quirks,
            availability: this.checkMIDIAvailability(),
            optimizedOptions: this.getOptimizedMIDIOptions(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fornece instruções específicas de troubleshooting para Chrome
     * @returns {Object} Instruções detalhadas
     */
    getChromePermissionInstructions() {
        return {
            permissionsPage: 'chrome://settings/content/midiDevices',
            steps: [
                '1. Copie e cole na barra de endereços: chrome://settings/content/midiDevices',
                '2. Pressione Enter para acessar as configurações de dispositivos MIDI',
                '3. Verifique se o site está na lista "Bloquear" e mova para "Permitir"',
                '4. Se necessário, adicione manualmente a URL do site na lista "Permitir"',
                '5. Recarregue a página do aplicativo (F5 ou Ctrl+R)',
                '6. Clique em "Permitir" quando o prompt de permissão MIDI aparecer'
            ],
            commonIssues: [
                {
                    issue: 'Dispositivo não detectado mesmo com permissão',
                    solutions: [
                        'Feche todos os outros aplicativos que possam estar usando o dispositivo MIDI (incluindo Edge)',
                        'Desconecte e reconecte o dispositivo USB',
                        'Reinicie o navegador Chrome',
                        'Verifique se o dispositivo aparece no Gerenciador de Dispositivos do Windows'
                    ]
                },
                {
                    issue: 'Site em HTTP (não HTTPS)',
                    solutions: [
                        'Web MIDI requer HTTPS ou localhost',
                        'Para desenvolvimento local, acesse via http://localhost',
                        'Para produção, configure certificado SSL válido',
                        'Use npx http-server -S para servidor HTTPS local (requer mkcert)'
                    ]
                },
                {
                    issue: 'Chrome desatualizado',
                    solutions: [
                        'Acesse chrome://settings/help',
                        'Verifique e instale atualizações disponíveis',
                        'Reinicie o Chrome após atualizar',
                        'Versão mínima recomendada: Chrome 115+'
                    ]
                }
            ]
        };
    }

    /**
     * Detecta possíveis conflitos com outros aplicativos usando dispositivos MIDI
     * @returns {Object} Informações sobre conflitos
     */
    detectPotentialConflicts() {
        const conflicts = {
            hasConflict: false,
            possibleCauses: [],
            recommendations: []
        };

        // Chrome e Edge ambos abertos podem causar conflito
        if (this.browser.isChrome) {
            conflicts.possibleCauses.push('Microsoft Edge pode estar com acesso exclusivo ao dispositivo MIDI');
            conflicts.possibleCauses.push('Outro aplicativo MIDI (DAW, software de música) pode estar usando o dispositivo');
            conflicts.recommendations.push('Feche o Microsoft Edge completamente');
            conflicts.recommendations.push('Feche qualquer outro software que use MIDI');
            conflicts.recommendations.push('Desconecte e reconecte o dispositivo USB');
            conflicts.hasConflict = true;
        }

        return conflicts;
    }

    /**
     * Exibe relatório de compatibilidade no console
     */
    logCompatibilityReport() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🌐 RELATÓRIO DE COMPATIBILIDADE DO NAVEGADOR');
        console.log('═══════════════════════════════════════════════════════════');
        
        const report = this.generateCompatibilityReport();
        
        console.log('📱 Navegador:', `${report.browser.name} ${report.browser.version}`);
        console.log('🔧 Web MIDI suportado:', report.features.midiSupport ? '✅' : '❌');
        console.log('🔒 Contexto seguro:', report.features.secureContext ? '✅' : '❌');
        console.log('🌐 Protocolo:', report.features.https ? 'HTTPS ✅' : 'HTTP ⚠️');
        console.log('🏠 Localhost:', report.features.localhost ? 'Sim ✅' : 'Não');
        
        if (Object.keys(report.quirks).length > 0) {
            console.log('\n⚠️ Quirks detectados:');
            for (const [key, value] of Object.entries(report.quirks)) {
                console.log(`   ├─ ${key}: ${value}`);
            }
        }
        
        console.log('\n📊 Status geral:', report.availability.canProceed ? '✅ PRONTO' : '❌ BLOQUEADO');
        console.log('📝 Razão:', report.availability.reason);
        
        if (report.availability.warnings.length > 0) {
            console.log('\n⚠️ Avisos:');
            report.availability.warnings.forEach(w => console.log(`   - ${w}`));
        }
        
        if (report.availability.recommendations.length > 0) {
            console.log('\n💡 Recomendações:');
            report.availability.recommendations.forEach(r => console.log(`   - ${r}`));
        }
        
        console.log('═══════════════════════════════════════════════════════════');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BrowserCompatibility = BrowserCompatibility;
}
