const { logger } = require('../../logs/logger');

/**
 * Middleware para logging de requisições HTTP
 * Registra informações detalhadas sobre cada requisição
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, url, ip, headers } = req;
  
  // Log da requisição inicial
  logger.info('Requisição recebida', {
    method,
    url,
    ip: ip || req.connection.remoteAddress,
    userAgent: headers['user-agent'],
    contentType: headers['content-type'],
    timestamp: new Date().toISOString()
  });

  // Intercepta a resposta para log de finalização
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log da resposta
    logger.info('Requisição finalizada', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      responseSize: Buffer.byteLength(data || '', 'utf8'),
      timestamp: new Date().toISOString()
    });

    // Log de erro se status >= 400
    if (statusCode >= 400) {
      logger.warn('Resposta com erro', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        errorData: data ? JSON.stringify(data).substring(0, 500) : null
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware para logging de erros específicos
 */
const errorLogger = (error, req, res, next) => {
  logger.error('Erro na aplicação', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null
    },
    timestamp: new Date().toISOString()
  });

  next(error);
};

/**
 * Middleware para logging de performance
 */
const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    if (duration > 1000) { // Log slow requests (> 1 second)
      logger.warn('Requisição lenta detectada', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  performanceLogger
};