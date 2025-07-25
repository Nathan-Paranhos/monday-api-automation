const crypto = require('crypto');
const { logger } = require('../../logs/logger');

/**
 * Utilitários e funções auxiliares
 * Funções reutilizáveis em toda a aplicação
 */

/**
 * Gera ID único
 * @param {string} prefix - Prefixo para o ID
 * @param {number} length - Comprimento da parte aleatória
 * @returns {string} ID único
 */
function generateId(prefix = '', length = 8) {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(length).toString('hex').substring(0, length);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Gera hash MD5
 * @param {string} data - Dados para gerar hash
 * @returns {string} Hash MD5
 */
function generateHash(data) {
  return crypto.createHash('md5').update(data.toString()).digest('hex');
}

/**
 * Gera hash SHA256
 * @param {string} data - Dados para gerar hash
 * @returns {string} Hash SHA256
 */
function generateSHA256(data) {
  return crypto.createHash('sha256').update(data.toString()).digest('hex');
}

/**
 * Sanitiza string para uso em nomes de arquivo
 * @param {string} str - String a ser sanitizada
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} String sanitizada
 */
function sanitizeFileName(str, maxLength = 100) {
  if (!str) return 'unnamed';
  
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais
    .replace(/_{2,}/g, '_') // Remove underscores duplos
    .replace(/^_+|_+$/g, '') // Remove underscores do início e fim
    .substring(0, maxLength) || 'unnamed';
}

/**
 * Sanitiza entrada de usuário
 * @param {any} input - Entrada a ser sanitizada
 * @returns {any} Entrada sanitizada
 */
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Valida email
 * @param {string} email - Email a ser validado
 * @returns {boolean} True se válido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida URL
 * @param {string} url - URL a ser validada
 * @returns {boolean} True se válida
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formata bytes em formato legível
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Casas decimais
 * @returns {string} Tamanho formatado
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formata duração em formato legível
 * @param {number} milliseconds - Duração em milissegundos
 * @returns {string} Duração formatada
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formata data em formato brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatDateBR(date) {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Debounce function
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Limite de tempo em ms
 * @returns {Function} Função com throttle
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry function com backoff exponencial
 * @param {Function} fn - Função a ser executada
 * @param {number} maxRetries - Número máximo de tentativas
 * @param {number} baseDelay - Delay base em ms
 * @returns {Promise} Resultado da função
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error('Máximo de tentativas excedido', {
          attempts: attempt + 1,
          error: error.message
        });
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms`, {
        error: error.message
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Sleep function
 * @param {number} ms - Tempo em milissegundos
 * @returns {Promise} Promise que resolve após o tempo especificado
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Converte string para camelCase
 * @param {string} str - String a ser convertida
 * @returns {string} String em camelCase
 */
function toCamelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Converte string para snake_case
 * @param {string} str - String a ser convertida
 * @returns {string} String em snake_case
 */
function toSnakeCase(str) {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\s/)
    .map(word => word.toLowerCase())
    .join('_');
}

/**
 * Converte string para kebab-case
 * @param {string} str - String a ser convertida
 * @returns {string} String em kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\s/)
    .map(word => word.toLowerCase())
    .join('-');
}

/**
 * Mascara string sensível
 * @param {string} str - String a ser mascarada
 * @param {number} visibleChars - Caracteres visíveis no início e fim
 * @returns {string} String mascarada
 */
function maskSensitiveData(str, visibleChars = 4) {
  if (!str || str.length <= visibleChars * 2) {
    return '*'.repeat(str?.length || 8);
  }
  
  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const middle = '*'.repeat(str.length - (visibleChars * 2));
  
  return start + middle + end;
}

/**
 * Verifica se valor é vazio
 * @param {any} value - Valor a ser verificado
 * @returns {boolean} True se vazio
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone de objeto
 * @param {any} obj - Objeto a ser clonado
 * @returns {any} Objeto clonado
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Merge profundo de objetos
 * @param {object} target - Objeto alvo
 * @param {object} source - Objeto fonte
 * @returns {object} Objeto merged
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Obtém valor aninhado de objeto
 * @param {object} obj - Objeto
 * @param {string} path - Caminho (ex: 'user.profile.name')
 * @param {any} defaultValue - Valor padrão
 * @returns {any} Valor encontrado ou padrão
 */
function getNestedValue(obj, path, defaultValue = null) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Define valor aninhado em objeto
 * @param {object} obj - Objeto
 * @param {string} path - Caminho (ex: 'user.profile.name')
 * @param {any} value - Valor a ser definido
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Converte período em milissegundos
 * @param {string} period - Período (ex: '1h', '30m', '7d')
 * @returns {number} Milissegundos
 */
function parsePeriod(period) {
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };
  
  const match = period.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Período inválido: ${period}`);
  }
  
  const [, amount, unit] = match;
  return parseInt(amount) * units[unit];
}

/**
 * Gera cores aleatórias
 * @returns {string} Cor em formato hexadecimal
 */
function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Calcula porcentagem
 * @param {number} value - Valor
 * @param {number} total - Total
 * @param {number} decimals - Casas decimais
 * @returns {number} Porcentagem
 */
function calculatePercentage(value, total, decimals = 2) {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(decimals));
}

module.exports = {
  generateId,
  generateHash,
  generateSHA256,
  sanitizeFileName,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  formatBytes,
  formatDuration,
  formatDateBR,
  debounce,
  throttle,
  retryWithBackoff,
  sleep,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  maskSensitiveData,
  isEmpty,
  deepClone,
  deepMerge,
  getNestedValue,
  setNestedValue,
  parsePeriod,
  generateRandomColor,
  calculatePercentage
};