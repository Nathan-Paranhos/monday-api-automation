const express = require('express');
const ConfigController = require('../controllers/configController');
const { asyncErrorHandler } = require('../middlewares/errorHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const configController = new ConfigController();

/**
 * Rate limiting para rotas de configuração
 * Mais restritivo para proteger informações sensíveis
 */
const configRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 requests por IP
  message: {
    error: 'Limite de requisições para configurações excedido',
    message: 'Muitas tentativas de acesso às configurações. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting a todas as rotas de configuração
router.use(configRateLimit);

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Obtém configurações públicas
 *     tags: [Config]
 *     description: |
 *       Retorna configurações não sensíveis da aplicação.
 *       Informações como tokens e senhas são omitidas.
 *     responses:
 *       200:
 *         description: Configurações públicas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     environment:
 *                       type: string
 *                     version:
 *                       type: string
 *                     server:
 *                       type: object
 *                       properties:
 *                         port:
 *                           type: number
 *                         host:
 *                           type: string
 *                     features:
 *                       type: object
 *                       properties:
 *                         webhooks:
 *                           type: boolean
 *                         automation:
 *                           type: boolean
 *                         fileManagement:
 *                           type: boolean
 *                     limits:
 *                       type: object
 *                       properties:
 *                         maxFileSize:
 *                           type: number
 *                         requestTimeout:
 *                           type: number
 *                         rateLimit:
 *                           type: object
 *                 timestamp:
 *                   type: string
 */
router.get('/', asyncErrorHandler(async (req, res) => {
  const result = await configController.getPublicConfig(req, res);
  return result;
}));

/**
 * @swagger
 * /api/config/detailed:
 *   get:
 *     summary: Obtém configurações detalhadas
 *     tags: [Config]
 *     description: |
 *       Retorna configurações detalhadas da aplicação.
 *       Disponível apenas em ambiente de desenvolvimento.
 *       Informações sensíveis são mascaradas.
 *     responses:
 *       200:
 *         description: Configurações detalhadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     environment:
 *                       type: object
 *                     server:
 *                       type: object
 *                     monday:
 *                       type: object
 *                     security:
 *                       type: object
 *                     logging:
 *                       type: object
 *                     features:
 *                       type: object
 *       403:
 *         description: Não disponível em produção
 */
router.get('/detailed', asyncErrorHandler(async (req, res) => {
  const result = await configController.getDetailedConfig(req, res);
  return result;
}));

/**
 * @swagger
 * /api/config/validate:
 *   get:
 *     summary: Valida configurações
 *     tags: [Config]
 *     description: |
 *       Verifica se todas as configurações necessárias estão presentes
 *       e são válidas para o funcionamento da aplicação.
 *     responses:
 *       200:
 *         description: Resultado da validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     environment:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     monday:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     paths:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     security:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         warnings:
 *                           type: array
 *                           items:
 *                             type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/validate', asyncErrorHandler(async (req, res) => {
  const result = await configController.validateConfig(req, res);
  return result;
}));

/**
 * @swagger
 * /api/config/env:
 *   get:
 *     summary: Informações sobre variáveis de ambiente
 *     tags: [Config]
 *     description: |
 *       Lista variáveis de ambiente necessárias e seu status.
 *       Valores sensíveis são mascarados.
 *     responses:
 *       200:
 *         description: Status das variáveis de ambiente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     required:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           present:
 *                             type: boolean
 *                           masked:
 *                             type: boolean
 *                           value:
 *                             type: string
 *                             description: Valor mascarado se sensível
 *                     optional:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           present:
 *                             type: boolean
 *                           default:
 *                             type: string
 *                     missing:
 *                       type: array
 *                       items:
 *                         type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/env', asyncErrorHandler(async (req, res) => {
  const result = await configController.getEnvironmentInfo(req, res);
  return result;
}));

/**
 * @swagger
 * /api/config/features:
 *   get:
 *     summary: Status das funcionalidades
 *     tags: [Config]
 *     description: Retorna quais funcionalidades estão habilitadas na aplicação
 *     responses:
 *       200:
 *         description: Status das funcionalidades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     automation:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         description:
 *                           type: string
 *                     webhooks:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         monday:
 *                           type: boolean
 *                         generic:
 *                           type: boolean
 *                     fileManagement:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         baseDirectory:
 *                           type: string
 *                         maxFileSize:
 *                           type: number
 *                     monitoring:
 *                       type: object
 *                       properties:
 *                         healthChecks:
 *                           type: boolean
 *                         metrics:
 *                           type: boolean
 *                         logging:
 *                           type: boolean
 *                     security:
 *                       type: object
 *                       properties:
 *                         rateLimit:
 *                           type: boolean
 *                         cors:
 *                           type: boolean
 *                         helmet:
 *                           type: boolean
 *                 timestamp:
 *                   type: string
 */
router.get('/features', asyncErrorHandler(async (req, res) => {
  const features = await configController.getFeatureStatus();
  
  res.json({
    success: true,
    data: features,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/config/limits:
 *   get:
 *     summary: Limites e quotas da aplicação
 *     tags: [Config]
 *     description: Retorna informações sobre limites configurados na aplicação
 *     responses:
 *       200:
 *         description: Limites da aplicação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     requests:
 *                       type: object
 *                       properties:
 *                         perMinute:
 *                           type: number
 *                         perHour:
 *                           type: number
 *                         timeout:
 *                           type: number
 *                     files:
 *                       type: object
 *                       properties:
 *                         maxSize:
 *                           type: number
 *                         allowedExtensions:
 *                           type: array
 *                           items:
 *                             type: string
 *                     automation:
 *                       type: object
 *                       properties:
 *                         concurrent:
 *                           type: number
 *                         queueSize:
 *                           type: number
 *                     webhooks:
 *                       type: object
 *                       properties:
 *                         perMinute:
 *                           type: number
 *                         historySize:
 *                           type: number
 *                 timestamp:
 *                   type: string
 */
router.get('/limits', asyncErrorHandler(async (req, res) => {
  const limits = await configController.getLimits();
  
  res.json({
    success: true,
    data: limits,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/config/reload:
 *   post:
 *     summary: Recarrega configurações
 *     tags: [Config]
 *     description: |
 *       Recarrega configurações da aplicação.
 *       Disponível apenas em ambiente de desenvolvimento.
 *     responses:
 *       200:
 *         description: Configurações recarregadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 reloaded:
 *                   type: array
 *                   items:
 *                     type: string
 *                 timestamp:
 *                   type: string
 *       403:
 *         description: Não permitido em produção
 */
router.post('/reload', asyncErrorHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Recarga de configurações não permitida em produção',
      timestamp: new Date().toISOString()
    });
  }
  
  const reloaded = await configController.reloadConfig();
  
  res.json({
    success: true,
    message: 'Configurações recarregadas com sucesso',
    reloaded,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/config/schema:
 *   get:
 *     summary: Schema das configurações
 *     tags: [Config]
 *     description: Retorna o schema esperado para as configurações da aplicação
 *     responses:
 *       200:
 *         description: Schema das configurações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     required:
 *                       type: object
 *                       description: Configurações obrigatórias
 *                     optional:
 *                       type: object
 *                       description: Configurações opcionais
 *                     types:
 *                       type: object
 *                       description: Tipos esperados para cada configuração
 *                     defaults:
 *                       type: object
 *                       description: Valores padrão
 *                 timestamp:
 *                   type: string
 */
router.get('/schema', asyncErrorHandler(async (req, res) => {
  const schema = await configController.getConfigSchema();
  
  res.json({
    success: true,
    data: schema,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;