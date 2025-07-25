const { logger } = require('../../logs/logger');
const { AppError } = require('./errorHandler');

/**
 * Middleware para validar variáveis de ambiente obrigatórias
 */
const validateEnvironment = (req, res, next) => {
  const requiredEnvVars = [
    'MONDAY_API_TOKEN',
    'MONDAY_BOARD_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Variáveis de ambiente obrigatórias não configuradas', {
      missingVars,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      status: 'erro',
      erro: 'Configuração do servidor incompleta',
      codigo: 'MISSING_ENVIRONMENT_VARIABLES',
      detalhes: process.env.NODE_ENV === 'development' ? {
        variaveisFaltando: missingVars
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Middleware para validar dados de entrada da automação
 */
const validateAutomationInput = (req, res, next) => {
  const { clienteId, produto } = req.body;

  const errors = [];

  // Validar clienteId
  if (!clienteId) {
    errors.push('clienteId é obrigatório');
  } else if (typeof clienteId !== 'string' && typeof clienteId !== 'number') {
    errors.push('clienteId deve ser uma string ou número');
  }

  // Validar produto
  if (!produto) {
    errors.push('produto é obrigatório');
  } else if (typeof produto !== 'string') {
    errors.push('produto deve ser uma string');
  } else if (produto.trim().length === 0) {
    errors.push('produto não pode estar vazio');
  }

  if (errors.length > 0) {
    logger.warn('Dados de entrada inválidos para automação', {
      errors,
      body: req.body,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      status: 'erro',
      erro: 'Dados de entrada inválidos',
      codigo: 'VALIDATION_ERROR',
      detalhes: errors,
      timestamp: new Date().toISOString()
    });
  }

  // Normalizar dados
  req.body.clienteId = String(clienteId).trim();
  req.body.produto = produto.trim();

  next();
};

/**
 * Middleware para validar webhook do Monday.com
 */
const validateMondayWebhook = (req, res, next) => {
  const { challenge } = req.body;

  // Se é um challenge, responder imediatamente
  if (challenge) {
    logger.info('Challenge do Monday.com recebido', {
      challenge,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ challenge });
  }

  // Validar estrutura do webhook
  const { event } = req.body;
  
  if (!event) {
    logger.warn('Webhook sem evento recebido', {
      body: req.body,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      status: 'erro',
      erro: 'Webhook inválido: evento não encontrado',
      codigo: 'INVALID_WEBHOOK',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Middleware para validar parâmetros de consulta
 */
const validateQueryParams = (requiredParams = []) => {
  return (req, res, next) => {
    const missingParams = requiredParams.filter(param => !req.query[param]);

    if (missingParams.length > 0) {
      logger.warn('Parâmetros de consulta obrigatórios ausentes', {
        missingParams,
        query: req.query,
        url: req.url,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        status: 'erro',
        erro: 'Parâmetros obrigatórios ausentes',
        codigo: 'MISSING_QUERY_PARAMS',
        detalhes: {
          parametrosFaltando: missingParams,
          parametrosRecebidos: Object.keys(req.query)
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Middleware para validar Content-Type
 */
const validateContentType = (expectedType = 'application/json') => {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];
      
      if (!contentType || !contentType.includes(expectedType)) {
        logger.warn('Content-Type inválido', {
          expected: expectedType,
          received: contentType,
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          status: 'erro',
          erro: `Content-Type deve ser ${expectedType}`,
          codigo: 'INVALID_CONTENT_TYPE',
          detalhes: {
            esperado: expectedType,
            recebido: contentType || 'não informado'
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  };
};

/**
 * Middleware para sanitizar dados de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Função para sanitizar strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .trim()
      .replace(/[<>"'&]/g, '') // Remove caracteres perigosos
      .substring(0, 1000); // Limita tamanho
  };

  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Sanitizar query params
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  next();
};

module.exports = {
  validateEnvironment,
  validateAutomationInput,
  validateMondayWebhook,
  validateQueryParams,
  validateContentType,
  sanitizeInput
};