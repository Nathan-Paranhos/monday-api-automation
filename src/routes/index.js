const express = require('express');
const v1Routes = require('./v1');
const { logger } = require('../../logs/logger');

const router = express.Router();

/**
 * Configuração central de rotas
 * Organiza todas as rotas da API em módulos separados
 */

// Middleware de log para todas as rotas
router.use((req, res, next) => {
  logger.info('Rota acessada', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Rota raiz da API
router.get('/', (req, res) => {
  res.json({
    message: 'Monday.com Automation API',
    version: process.env.npm_package_version || '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      v1: '/api/v1',
      health: '/api/health',
      config: '/api/config',
      docs: '/api-docs'
    }
  });
});

// Registrar rotas por módulo
router.use('/v1', v1Routes);



// Middleware de tratamento de rotas não encontradas
router.use('*', (req, res) => {
  logger.warn('Rota não encontrada', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    availableRoutes: {
      v1: '/api/v1',
      health: '/api/health',
      config: '/api/config',
      docs: '/api-docs'
    }
  });
});

module.exports = router;