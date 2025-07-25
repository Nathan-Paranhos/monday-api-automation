const express = require('express');
const automationRoutes = require('./automation');
const mondayRoutes = require('./monday');
const webhookRoutes = require('./webhook');
const healthRoutes = require('./health');
const configRoutes = require('./config');
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
      automation: '/api/automation',
      monday: '/api/monday',
      webhooks: '/api/webhooks',
      health: '/api/health',
      config: '/api/config',
      docs: '/api-docs'
    }
  });
});

// Registrar rotas por módulo
router.use('/automation', automationRoutes);
router.use('/monday', mondayRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/health', healthRoutes);
router.use('/config', configRoutes);

// Rota de informações da API (compatibilidade)
router.get('/info', (req, res) => {
  res.json({
    name: 'Monday.com Automation API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'API para automação de processos no Monday.com',
    author: 'Fagron',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

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
      automation: '/api/automation',
      monday: '/api/monday',
      webhooks: '/api/webhooks',
      health: '/api/health',
      config: '/api/config',
      docs: '/api-docs'
    }
  });
});

module.exports = router;