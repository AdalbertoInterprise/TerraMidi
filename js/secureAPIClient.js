/**
 * API Client - Camada de abstração segura para chamadas à API
 * 
 * Este módulo nunca expõe tokens ou credenciais.
 * Todas as chamadas são feitas através de funções serverless.
 */

class SecureAPIClient {
    constructor() {
        // Detectar ambiente automaticamente
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        
        // Endpoint base para funções serverless
        if (this.isProduction) {
            // Em produção, usar o domínio atual
            this.baseUrl = '/.netlify/functions';
        } else {
            // Em desenvolvimento local, usar Netlify Dev
            this.baseUrl = 'http://localhost:8888/.netlify/functions';
        }
        
        // Configurações de timeout e retry
        this.timeout = 30000; // 30 segundos
        this.maxRetries = 2;
        
        console.log(`🔒 Secure API Client inicializado (${this.isProduction ? 'production' : 'development'})`);
    }

    /**
     * Gerar melodia usando IA de forma segura
     * @param {string} prompt - Prompt para geração de melodia
     * @param {object} options - Opções adicionais
     * @returns {Promise<object>} - Dados da melodia gerada
     */
    async generateMelody(prompt, options = {}) {
        const {
            model = 'gpt-4o-mini',
            maxTokens = 1000,
            temperature = 0.7
        } = options;

        try {
            console.log('🔒 Chamando função serverless segura...', { prompt: prompt.substring(0, 50) });

            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/generate-melody`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        model,
                        maxTokens,
                        temperature
                    })
                },
                this.timeout
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || 
                    `Server returned ${response.status}: ${response.statusText}`
                );
            }

            const data = await response.json();

            if (!data.success || !data.content) {
                throw new Error('Invalid response from server');
            }

            console.log('✅ Melodia gerada com sucesso via função segura');
            return data.content;

        } catch (error) {
            console.error('❌ Erro na chamada segura:', error.message);
            throw error;
        }
    }

    /**
     * Fetch com timeout
     * @private
     */
    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - servidor demorou muito para responder');
            }
            throw error;
        }
    }

    /**
     * Verificar se a API está disponível
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        try {
            // Tentar um ping simples
            const testPrompt = "test";
            await this.generateMelody(testPrompt, { maxTokens: 1 });
            return true;
        } catch (error) {
            console.warn('⚠️ API não disponível:', error.message);
            return false;
        }
    }

    /**
     * Obter informações sobre o ambiente
     * @returns {object}
     */
    getEnvironmentInfo() {
        return {
            isProduction: this.isProduction,
            baseUrl: this.baseUrl,
            hostname: window.location.hostname
        };
    }
}

// Exportar instância global
if (typeof window !== 'undefined') {
    window.secureAPIClient = new SecureAPIClient();
}
