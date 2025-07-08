// Sistema de cache unificado para otimização de performance
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.maxMemoryItems = 100;
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
        this.compressionEnabled = false;
        
        // Verificar se há suporte para compressão
        this.checkCompressionSupport();
        
        // Limpar cache expirado periodicamente
        this.startCleanupTask();
        
        // Listener para limpar cache quando necessário
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    // Verificar suporte para compressão
    checkCompressionSupport() {
        try {
            if (typeof CompressionStream !== 'undefined') {
                this.compressionEnabled = true;
                console.log('Compressão de cache habilitada');
            }
        } catch (e) {
            console.log('Compressão não suportada, usando cache sem compressão');
        }
    }

    // Gerar chave de cache
    generateKey(prefix, params = {}) {
        const sortedParams = Object.keys(params).sort().reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});
        
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }

    // Armazenar no cache com TTL
    async set(key, data, ttl = this.defaultTTL) {
        try {
            // Limitar tamanho do cache
            if (this.memoryCache.size >= this.maxMemoryItems) {
                this.evictOldestItems(10);
            }

            const item = {
                data: await this.compress(data),
                timestamp: Date.now(),
                ttl: ttl,
                hits: 0,
                size: this.getDataSize(data)
            };

            this.memoryCache.set(key, item);
            
            // Armazenar no localStorage para dados importantes
            if (this.shouldPersist(key)) {
                try {
                    localStorage.setItem(`cache_${key}`, JSON.stringify({
                        data: data,
                        timestamp: item.timestamp,
                        ttl: ttl
                    }));
                } catch (e) {
                    console.warn('Erro ao persistir cache no localStorage:', e);
                }
            }

            return true;
        } catch (error) {
            console.error('Erro ao armazenar no cache:', error);
            return false;
        }
    }

    // Recuperar do cache
    async get(key) {
        try {
            // Verificar cache em memória primeiro
            let item = this.memoryCache.get(key);
            
            // Se não estiver em memória, verificar localStorage
            if (!item && this.shouldPersist(key)) {
                const persistedItem = localStorage.getItem(`cache_${key}`);
                if (persistedItem) {
                    const parsed = JSON.parse(persistedItem);
                    if (this.isValid(parsed)) {
                        item = {
                            data: await this.compress(parsed.data),
                            timestamp: parsed.timestamp,
                            ttl: parsed.ttl,
                            hits: 0,
                            size: this.getDataSize(parsed.data)
                        };
                        this.memoryCache.set(key, item);
                    } else {
                        localStorage.removeItem(`cache_${key}`);
                    }
                }
            }

            if (!item) return null;

            // Verificar se ainda é válido
            if (!this.isValid(item)) {
                this.delete(key);
                return null;
            }

            // Incrementar hits para algoritmo de LRU
            item.hits++;
            item.lastAccess = Date.now();

            return await this.decompress(item.data);
        } catch (error) {
            console.error('Erro ao recuperar do cache:', error);
            return null;
        }
    }

    // Verificar se item está válido
    isValid(item) {
        return (Date.now() - item.timestamp) < item.ttl;
    }

    // Deletar item do cache
    delete(key) {
        this.memoryCache.delete(key);
        localStorage.removeItem(`cache_${key}`);
    }

    // Limpar cache expirado
    cleanup() {
        const now = Date.now();
        
        for (const [key, item] of this.memoryCache.entries()) {
            if (!this.isValid(item)) {
                this.delete(key);
            }
        }

        // Limpar localStorage também
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (!this.isValid(item)) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    // Remover itens mais antigos baseado em LRU
    evictOldestItems(count) {
        const items = Array.from(this.memoryCache.entries())
            .sort((a, b) => {
                // Priorizar por último acesso e número de hits
                const scoreA = (a[1].lastAccess || a[1].timestamp) + (a[1].hits * 1000);
                const scoreB = (b[1].lastAccess || b[1].timestamp) + (b[1].hits * 1000);
                return scoreA - scoreB;
            });

        for (let i = 0; i < Math.min(count, items.length); i++) {
            this.delete(items[i][0]);
        }
    }

    // Determinar se deve persistir no localStorage
    shouldPersist(key) {
        // Persistir dados de configuração e estatísticas
        return key.includes('config') || key.includes('statistics') || key.includes('user');
    }

    // Calcular tamanho dos dados
    getDataSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch (e) {
            return JSON.stringify(data).length;
        }
    }

    // Comprimir dados se possível
    async compress(data) {
        if (!this.compressionEnabled || this.getDataSize(data) < 1024) {
            return data; // Não comprimir dados pequenos
        }

        try {
            const jsonString = JSON.stringify(data);
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(new TextEncoder().encode(jsonString));
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
        } catch (e) {
            return data; // Fallback para dados não comprimidos
        }
    }

    // Descomprimir dados
    async decompress(data) {
        if (!(data instanceof Uint8Array)) {
            return data; // Dados não comprimidos
        }

        try {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(data);
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
            const jsonString = new TextDecoder().decode(decompressed);
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Erro ao descomprimir dados:', e);
            return null;
        }
    }

    // Iniciar tarefa de limpeza periódica
    startCleanupTask() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Limpar a cada minuto
    }

    // Obter estatísticas do cache
    getStats() {
        let totalSize = 0;
        let expiredItems = 0;
        const now = Date.now();

        for (const [key, item] of this.memoryCache.entries()) {
            totalSize += item.size || 0;
            if (!this.isValid(item)) {
                expiredItems++;
            }
        }

        return {
            totalItems: this.memoryCache.size,
            totalSize: totalSize,
            expiredItems: expiredItems,
            hitRate: this.calculateHitRate(),
            compressionEnabled: this.compressionEnabled
        };
    }

    // Calcular taxa de acerto
    calculateHitRate() {
        let totalHits = 0;
        let totalRequests = 0;

        for (const [key, item] of this.memoryCache.entries()) {
            totalHits += item.hits || 0;
            totalRequests += (item.hits || 0) + 1; // +1 para a inserção inicial
        }

        return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    }

    // Limpar todo o cache
    clear() {
        this.memoryCache.clear();
        
        // Limpar localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        }
    }
}

// Sistema de debounce para otimizar chamadas de função
class DebounceManager {
    constructor() {
        this.timeouts = new Map();
    }

    // Debounce uma função
    debounce(key, func, delay = 300) {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
        }

        const timeout = setTimeout(() => {
            func();
            this.timeouts.delete(key);
        }, delay);

        this.timeouts.set(key, timeout);
    }

    // Throttle uma função
    throttle(key, func, delay = 300) {
        if (this.timeouts.has(key)) {
            return; // Função ainda em throttle
        }

        func();
        const timeout = setTimeout(() => {
            this.timeouts.delete(key);
        }, delay);

        this.timeouts.set(key, timeout);
    }

    // Cancelar debounce/throttle
    cancel(key) {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
            this.timeouts.delete(key);
        }
    }

    // Limpar todos os timeouts
    clear() {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
    }
}

// Instâncias globais
window.cacheManager = new CacheManager();
window.debounceManager = new DebounceManager();

// Funções de conveniência
window.cache = {
    set: (key, data, ttl) => window.cacheManager.set(key, data, ttl),
    get: (key) => window.cacheManager.get(key),
    delete: (key) => window.cacheManager.delete(key),
    clear: () => window.cacheManager.clear(),
    stats: () => window.cacheManager.getStats()
};

window.debounce = (key, func, delay) => window.debounceManager.debounce(key, func, delay);
window.throttle = (key, func, delay) => window.debounceManager.throttle(key, func, delay);

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CacheManager, DebounceManager };
} 