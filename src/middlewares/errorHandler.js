const { logger } = require('../../logs/logger');

/**
 * Middleware global para tratamento de erros
 * Padroniza as respostas de erro da API
 */
const errorHandler = (error, req, res, next) => {
  // Log do erro
  logger.error('Erro capturado pelo middleware global', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });

  // Determinar status code baseado no tipo de erro
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Erro interno do servidor';

  // Erros de validação
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Dados de entrada inválidos';
  }
  
  // Erros de autenticação
  else if (error.name === 'UnauthorizedError' || error.code === 'UNAUTHORIZED') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Acesso não autorizado';
  }
  
  // Erros de recurso não encontrado
  else if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Recurso não encontrado';
  }
  
  // Erros de rate limit
  else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    message = 'Muitas requisições. Tente novamente mais tarde';
  }
  
  // Erros de timeout
  else if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
    statusCode = 408;
    errorCode = 'REQUEST_TIMEOUT';
    message = 'Tempo limite da requisição excedido';
  }
  
  // Erros de conexão com Monday.com
  else if (error.message?.includes('Monday') || error.code === 'MONDAY_API_ERROR') {
    statusCode = 502;
    errorCode = 'MONDAY_API_ERROR';
    message = 'Erro na comunicação com Monday.com';
  }
  
  // Erros de sintaxe JSON
  else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'JSON inválido na requisição';
  }

  // Resposta padronizada de erro
  const errorResponse = {
    status: 'erro',
    erro: message,
    codigo: errorCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Adicionar detalhes em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    errorResponse.detalhes = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10), // Limitar stack trace
      originalError: error.name
    };
  }

  // Adicionar ID de rastreamento se disponível
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar rotas não encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  logger.warn('Rota não encontrada', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  const errorResponse = {
    status: 'erro',
    erro: `Rota ${req.method} ${req.url} não encontrada`,
    codigo: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    sugestoes: [
      'Verifique a URL da requisição',
      'Consulte a documentação em /api-docs',
      'Verifique o método HTTP utilizado'
    ]
  };

  res.status(404).json(errorResponse);
};

/**
 * Middleware para capturar erros assíncronos não tratados
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Classe para erros customizados da aplicação
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  AppError
};