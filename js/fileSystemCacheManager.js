// File System Cache Manager - Salva soundfonts em pasta do sistema
// Requer permissão do usuário para acessar pasta

class FileSystemCacheManager {
    constructor() {
        this.directoryHandle = null;
        this.isSupported = this.checkSupport();
        this.cachedFiles = new Map();
        
        console.log('📁 FileSystemCacheManager inicializado');
        console.log(`✅ File System Access API suportado: ${this.isSupported}`);
    }
    
    /**
     * Verifica se File System Access API é suportada
     */
    checkSupport() {
        return 'showDirectoryPicker' in window;
    }
    
    /**
     * Solicita permissão para acessar uma pasta
     * Usuário escolhe onde salvar os soundfonts
     */
    async requestDirectoryAccess() {
        if (!this.isSupported) {
            // 🔇 Sem alert intrusivo
            if (typeof SystemLogger !== 'undefined' && SystemLogger.log) {
                SystemLogger.log('error', 'Navegador não suporta acesso ao sistema de arquivos. Use Chrome, Edge ou Opera (versões recentes)');
            }
            console.error('❌ Navegador não suporta File System Access API');
            return false;
        }
        
        try {
            // Solicitar acesso à pasta
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents' // Sugere pasta Documentos
            });
            
            console.log('✅ Acesso à pasta concedido:', this.directoryHandle.name);
            
            // Criar subpasta "Terra_Soundfonts" se não existir
            try {
                await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts', { create: true });
                console.log('📁 Pasta Terra_Soundfonts criada/verificada');
            } catch (error) {
                console.warn('⚠️ Erro ao criar subpasta:', error);
            }
            
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('ℹ️ Usuário cancelou seleção de pasta');
            } else {
                console.error('❌ Erro ao solicitar acesso à pasta:', error);
            }
            return false;
        }
    }
    
    /**
     * Salva soundfont como arquivo físico
     * @param {string} filename - Nome do arquivo (ex: '0210_Accordion_sf2_file.js')
     * @param {string} content - Conteúdo do arquivo (código JavaScript)
     */
    async saveToFile(filename, content) {
        if (!this.directoryHandle) {
            console.warn('⚠️ Pasta não selecionada. Use requestDirectoryAccess() primeiro.');
            return false;
        }
        
        try {
            // Acessar subpasta Terra_Soundfonts
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts', { create: true });
            
            // Criar arquivo
            const fileHandle = await soundfontsDir.getFileHandle(filename, { create: true });
            
            // Escrever conteúdo
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            // Marcar como em cache
            this.cachedFiles.set(filename, fileHandle);
            
            console.log(`💾 Arquivo salvo: ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar arquivo ${filename}:`, error);
            return false;
        }
    }
    
    /**
     * Lê soundfont do arquivo físico
     * @param {string} filename - Nome do arquivo
     * @returns {Promise<string|null>} Conteúdo do arquivo ou null
     */
    async readFromFile(filename) {
        if (!this.directoryHandle) {
            console.warn('⚠️ Pasta não selecionada.');
            return null;
        }
        
        try {
            // Acessar subpasta Terra_Soundfonts
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts');
            
            // Tentar obter arquivo
            const fileHandle = await soundfontsDir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const content = await file.text();
            
            console.log(`✅ Arquivo lido do disco: ${filename}`);
            return content;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                console.log(`ℹ️ Arquivo não encontrado: ${filename}`);
            } else {
                console.error(`❌ Erro ao ler arquivo ${filename}:`, error);
            }
            return null;
        }
    }
    
    /**
     * Verifica se arquivo existe no disco
     */
    async fileExists(filename) {
        if (!this.directoryHandle) return false;
        
        try {
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts');
            await soundfontsDir.getFileHandle(filename);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Lista todos os soundfonts salvos
     */
    async listCachedFiles() {
        if (!this.directoryHandle) return [];
        
        try {
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts');
            const files = [];
            
            for await (const entry of soundfontsDir.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    files.push({
                        name: entry.name,
                        size: file.size,
                        lastModified: file.lastModified
                    });
                }
            }
            
            return files;
        } catch (error) {
            console.error('❌ Erro ao listar arquivos:', error);
            return [];
        }
    }
    
    /**
     * Deleta arquivo específico
     */
    async deleteFile(filename) {
        if (!this.directoryHandle) return false;
        
        try {
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts');
            await soundfontsDir.removeEntry(filename);
            this.cachedFiles.delete(filename);
            console.log(`🗑️ Arquivo deletado: ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao deletar ${filename}:`, error);
            return false;
        }
    }
    
    /**
     * Limpa todos os soundfonts
     */
    async clearAllFiles() {
        if (!this.directoryHandle) return false;
        
        try {
            const soundfontsDir = await this.directoryHandle.getDirectoryHandle('Terra_Soundfonts');
            
            // Listar e deletar todos os arquivos
            for await (const entry of soundfontsDir.values()) {
                if (entry.kind === 'file') {
                    await soundfontsDir.removeEntry(entry.name);
                    console.log(`🗑️ Deletado: ${entry.name}`);
                }
            }
            
            this.cachedFiles.clear();
            console.log('✅ Todos os soundfonts foram deletados');
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar arquivos:', error);
            return false;
        }
    }
    
    /**
     * Obtém estatísticas de armazenamento
     */
    async getStorageStats() {
        const files = await this.listCachedFiles();
        
        let totalSize = 0;
        files.forEach(file => totalSize += file.size);
        
        return {
            count: files.length,
            totalSize: totalSize,
            files: files.sort((a, b) => b.size - a.size) // Ordenar por tamanho
        };
    }
    
    /**
     * Formata bytes para leitura humana
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * Exporta informações da pasta selecionada
     */
    getDirectoryInfo() {
        if (!this.directoryHandle) {
            return {
                selected: false,
                path: null,
                name: null
            };
        }
        
        return {
            selected: true,
            path: 'Pasta do usuário', // Navegador não expõe path completo
            name: this.directoryHandle.name
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.FileSystemCacheManager = FileSystemCacheManager;
}
