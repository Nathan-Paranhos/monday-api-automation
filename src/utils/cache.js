const { logger } = require('../../logs/logger');
const { formatBytes, formatDuration } = require('./helpers');

/**
 * Sistema de cache em memória
 * Implementa cache com TTL, LRU e estatísticas
 */
class MemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000; // Máximo de itens
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutos
    this.checkInterval = options.checkInterval || 60000; // 1 minuto
    this.enableStats = options.enableStats !== false;
    
    this.cache = new Map();
    this.accessOrder = new Map(); // Para LRU
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expired: 0,
      memoryUsage: 0
    };
    
    // Inicia limpeza automática
    this.startCleanupInterval();
    
    logger.info('Cache inicializado', {
      maxSize: this.maxSize,
      defaultTTL: formatDuration(this.defaultTTL),
      checkInterval: formatDuration(this.checkInterval)
    });
  }
  
  /**
   * Define valor no cache
   * @param {string} key - Chave
   * @param {any} value - Valor
   * @param {number} ttl - TTL em milissegundos
   */
  set(key, value, ttl = this.defaultTTL) {
    const now = Date.now();
    const expiresAt = now + ttl;
    
    // Remove item existente se houver
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
    
    // Verifica se precisa fazer eviction
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Adiciona novo item
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0
    });
    
    this.accessOrder.set(key, now);
    
    if (this.enableStats) {
      this.stats.sets++;
      this.updateMemoryUsage();
    }
    
    logger.debug('Item adicionado ao cache', {
      key,
      ttl: formatDuration(ttl),
      cacheSize: this.cache.size
    });
  }
  
  /**
   * Obtém valor do cache
   * @param {string} key - Chave
   * @returns {any} Valor ou null se não encontrado/expirado
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      if (this.enableStats) this.stats.misses++;
      return null;
    }
    
    const now = Date.now();
    
    // Verifica se expirou
    if (item.expiresAt <= now) {
      this.delete(key);
      if (this.enableStats) {
        this.stats.misses++;
        this.stats.expired++;
      }
      return null;
    }
    
    // Atualiza ordem de acesso (LRU)
    this.accessOrder.set(key, now);
    item.accessCount++;
    
    if (this.enableStats) this.stats.hits++;
    
    logger.debug('Item recuperado do cache', {
      key,
      accessCount: item.accessCount,
      age: formatDuration(now - item.createdAt)
    });
    
    return item.value;
  }
  
  /**
   * Remove item do cache
   * @param {string} key - Chave
   * @returns {boolean} True se removido
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (deleted && this.enableStats) {
      this.stats.deletes++;
      this.updateMemoryUsage();
    }
    
    return deleted;
  }
  
  /**
   * Verifica se chave existe no cache
   * @param {string} key - Chave
   * @returns {boolean} True se existe e não expirou
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiresAt <= Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    
    if (this.enableStats) {
      this.stats.deletes += size;
      this.updateMemoryUsage();
    }
    
    logger.info('Cache limpo', { itemsRemoved: size });
  }
  
  /**
   * Remove item menos recentemente usado (LRU)
   */
  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    // Encontra o item menos recentemente usado
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      if (this.enableStats) this.stats.evictions++;
      
      logger.debug('Item removido por LRU', {
        key: oldestKey,
        age: formatDuration(Date.now() - oldestTime)
      });
    }
  }
  
  /**
   * Remove itens expirados
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, item] of this.cache) {
      if (item.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
      if (this.enableStats) this.stats.expired++;
    }
    
    if (expiredKeys.length > 0) {
      logger.debug('Limpeza de cache executada', {
        expiredItems: expiredKeys.length,
        remainingItems: this.cache.size
      });
    }
  }
  
  /**
   * Inicia intervalo de limpeza automática
   */
  startCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.checkInterval);
  }
  
  /**
   * Para intervalo de limpeza automática
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Atualiza estatísticas de uso de memória
   */
  updateMemoryUsage() {
    if (!this.enableStats) return;
    
    try {
      const usage = JSON.stringify(Array.from(this.cache.entries())).length;
      this.stats.memoryUsage = usage;
    } catch (error) {
      logger.warn('Erro ao calcular uso de memória do cache', { error: error.message });
    }
  }
  
  /**
   * Obtém estatísticas do cache
   * @returns {object} Estatísticas
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: formatBytes(this.stats.memoryUsage),
      uptime: formatDuration(Date.now() - (this.startTime || Date.now()))
    };
  }
  
  /**
   * Obtém informações detalhadas dos itens
   * @returns {Array} Lista de itens com detalhes
   */
  getItems() {
    const now = Date.now();
    const items = [];
    
    for (const [key, item] of this.cache) {
      items.push({
        key,
        size: JSON.stringify(item.value).length,
        age: formatDuration(now - item.createdAt),
        ttl: formatDuration(Math.max(0, item.expiresAt - now)),
        accessCount: item.accessCount,
        expired: item.expiresAt <= now
      });
    }
    
    return items.sort((a, b) => b.accessCount - a.accessCount);
  }
  
  /**
   * Redefine estatísticas
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expired: 0,
      memoryUsage: 0
    };
    this.startTime = Date.now();
    
    logger.info('Estatísticas do cache redefinidas');
  }
  
  /**
   * Obtém ou define valor com função de fallback
   * @param {string} key - Chave
   * @param {Function} fallback - Função para obter valor se não estiver no cache
   * @param {number} ttl - TTL em milissegundos
   * @returns {Promise<any>} Valor
   */
  async getOrSet(key, fallback, ttl = this.defaultTTL) {
    let value = this.get(key);
    
    if (value === null) {
      try {
        value = await fallback();
        this.set(key, value, ttl);
        
        logger.debug('Valor obtido via fallback e armazenado no cache', {
          key,
          ttl: formatDuration(ttl)
        });
      } catch (error) {
        logger.error('Erro ao executar fallback do cache', {
          key,
          error: error.message
        });
        throw error;
      }
    }
    
    return value;
  }
  
  /**
   * Invalida cache por padrão
   * @param {string|RegExp} pattern - Padrão para invalidar
   */
  invalidatePattern(pattern) {
    const keys = Array.from(this.cache.keys());
    const invalidatedKeys = [];
    
    for (const key of keys) {
      let shouldInvalidate = false;
      
      if (typeof pattern === 'string') {
        shouldInvalidate = key.includes(pattern);
      } else if (pattern instanceof RegExp) {
        shouldInvalidate = pattern.test(key);
      }
      
      if (shouldInvalidate) {
        this.delete(key);
        invalidatedKeys.push(key);
      }
    }
    
    logger.info('Cache invalidado por padrão', {
      pattern: pattern.toString(),
      invalidatedKeys: invalidatedKeys.length
    });
    
    return invalidatedKeys;
  }
  
  /**
   * Destroi o cache
   */
  destroy() {
    this.stopCleanupInterval();
    this.clear();
    
    logger.info('Cache destruído');
  }
}

/**
 * Cache global da aplicação
 */
const globalCache = new MemoryCache({
  maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300000,
  checkInterval: parseInt(process.env.CACHE_CHECK_INTERVAL) || 60000
});

/**
 * Decorador para cache de métodos
 * @param {number} ttl - TTL em milissegundos
 * @param {Function} keyGenerator - Função para gerar chave do cache
 */
function cached(ttl = 300000, keyGenerator = null) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = keyGenerator 
        ? keyGenerator(this, ...args)
        : `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;
      
      return await globalCache.getOrSet(key, () => method.apply(this, args), ttl);
    };
    
    return descriptor;
  };
}

/**
 * Utilitários de cache
 */
const cacheUtils = {
  /**
   * Gera chave de cache padronizada
   * @param {string} prefix - Prefixo
   * @param {...any} parts - Partes da chave
   * @returns {string} Chave do cache
   */
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.map(p => 
      typeof p === 'object' ? JSON.stringify(p) : String(p)
    ).join(':')}`;
  },
  
  /**
   * Invalida cache relacionado a um recurso
   * @param {string} resource - Nome do recurso
   */
  invalidateResource(resource) {
    return globalCache.invalidatePattern(new RegExp(`^${resource}:`));
  },
  
  /**
   * Cache para resultados de API
   * @param {string} endpoint - Endpoint da API
   * @param {object} params - Parâmetros
   * @param {Function} apiCall - Função da API
   * @param {number} ttl - TTL
   * @returns {Promise<any>} Resultado
   */
  async cacheApiCall(endpoint, params, apiCall, ttl = 300000) {
    const key = this.generateKey('api', endpoint, params);
    return await globalCache.getOrSet(key, apiCall, ttl);
  },
  
  /**
   * Cache para consultas de banco de dados
   * @param {string} query - Query
   * @param {Array} params - Parâmetros
   * @param {Function} dbCall - Função do banco
   * @param {number} ttl - TTL
   * @returns {Promise<any>} Resultado
   */
  async cacheDbQuery(query, params, dbCall, ttl = 600000) {
    const key = this.generateKey('db', query, params);
    return await globalCache.getOrSet(key, dbCall, ttl);
  }
};

module.exports = {
  MemoryCache,
  globalCache,
  cached,
  cacheUtils
};