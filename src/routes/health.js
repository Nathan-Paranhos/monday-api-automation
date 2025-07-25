const express = require('express');
const HealthController = require('../controllers/healthController');
const { asyncErrorHandler } = require('../middlewares/errorHandler');

const router = express.Router();
const healthController = new HealthController();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificação básica de saúde
 *     tags: [Health]
 *     description: Retorna status básico da aplicação
 *     responses:
 *       200:
 *         description: Aplicação funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Tempo de atividade em segundos
 *                 version:
 *                   type: string
 *       503:
 *         description: Aplicação com problemas
 */
router.get('/', asyncErrorHandler(async (req, res) => {
  const result = await healthController.basicHealthCheck(req, res);
  return result;
}));

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Verificação detalhada de saúde
 *     tags: [Health]
 *     description: |
 *       Retorna informações detalhadas sobre o status da aplicação,
 *       incluindo dependências externas e recursos do sistema
 *     responses:
 *       200:
 *         description: Status detalhado da aplicação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     monday:
 *                       $ref: '#/components/schemas/DependencyStatus'
 *                     fileSystem:
 *                       $ref: '#/components/schemas/DependencyStatus'
 *                 system:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *                     disk:
 *                       type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/detailed', asyncErrorHandler(async (req, res) => {
  const result = await healthController.detailedHealthCheck(req, res);
  return result;
}));

/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Verificação de prontidão
 *     tags: [Health]
 *     description: |
 *       Verifica se a aplicação está pronta para receber tráfego.
 *       Usado por orquestradores como Kubernetes.
 *     responses:
 *       200:
 *         description: Aplicação pronta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: boolean
 *                     externalAPIs:
 *                       type: boolean
 *                     fileSystem:
 *                       type: boolean
 *       503:
 *         description: Aplicação não está pronta
 */
router.get('/ready', asyncErrorHandler(async (req, res) => {
  const result = await healthController.readinessCheck(req, res);
  return result;
}));

/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Verificação de vivacidade
 *     tags: [Health]
 *     description: |
 *       Verifica se a aplicação está viva e responsiva.
 *       Usado por orquestradores para detectar aplicações travadas.
 *     responses:
 *       200:
 *         description: Aplicação viva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                 pid:
 *                   type: number
 *                 uptime:
 *                   type: number
 */
router.get('/live', asyncErrorHandler(async (req, res) => {
  const result = await healthController.livenessCheck(req, res);
  return result;
}));

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Métricas da aplicação
 *     tags: [Health]
 *     description: Retorna métricas de performance e uso da aplicação
 *     responses:
 *       200:
 *         description: Métricas da aplicação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     usage:
 *                       type: number
 *                     loadAverage:
 *                       type: array
 *                       items:
 *                         type: number
 *                 requests:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     perMinute:
 *                       type: number
 *                     errors:
 *                       type: number
 *                 automations:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     success:
 *                       type: number
 *                     errors:
 *                       type: number
 *                     processing:
 *                       type: number
 */
router.get('/metrics', asyncErrorHandler(async (req, res) => {
  const result = await healthController.getMetrics(req, res);
  return result;
}));

/**
 * @swagger
 * /api/health/dependencies:
 *   get:
 *     summary: Status das dependências
 *     tags: [Health]
 *     description: Verifica o status de todas as dependências externas
 *     responses:
 *       200:
 *         description: Status das dependências
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 dependencies:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/DependencyStatus'
 *                 timestamp:
 *                   type: string
 */
router.get('/dependencies', asyncErrorHandler(async (req, res) => {
  const dependencies = await healthController.checkDependencies();
  
  // Determinar status geral
  const statuses = Object.values(dependencies);
  let overall = 'healthy';
  
  if (statuses.some(dep => dep.status === 'unhealthy')) {
    overall = 'unhealthy';
  } else if (statuses.some(dep => dep.status === 'degraded')) {
    overall = 'degraded';
  }
  
  const statusCode = overall === 'unhealthy' ? 503 : 200;
  
  res.status(statusCode).json({
    overall,
    dependencies,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/health/system:
 *   get:
 *     summary: Informações do sistema
 *     tags: [Health]
 *     description: Retorna informações detalhadas sobre o sistema operacional e recursos
 *     responses:
 *       200:
 *         description: Informações do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 platform:
 *                   type: string
 *                 architecture:
 *                   type: string
 *                 nodeVersion:
 *                   type: string
 *                 memory:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     free:
 *                       type: number
 *                     used:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     model:
 *                       type: string
 *                     cores:
 *                       type: number
 *                     speed:
 *                       type: number
 *                 uptime:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: number
 *                     process:
 *                       type: number
 *                 timestamp:
 *                   type: string
 */
router.get('/system', asyncErrorHandler(async (req, res) => {
  const systemInfo = await healthController.getSystemInfo();
  
  res.json({
    ...systemInfo,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Ping simples
 *     tags: [Health]
 *     description: Endpoint mais simples para verificar se a API está respondendo
 *     responses:
 *       200:
 *         description: Pong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "pong"
 *                 timestamp:
 *                   type: string
 */
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/version:
 *   get:
 *     summary: Informações de versão
 *     tags: [Health]
 *     description: Retorna informações sobre a versão da aplicação
 *     responses:
 *       200:
 *         description: Informações de versão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: string
 *                 buildDate:
 *                   type: string
 *                 gitCommit:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 nodeVersion:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                 timestamp:
 *                   type: string
 */
router.get('/version', (req, res) => {
  const packageJson = require('../../../package.json');
  
  res.json({
    version: packageJson.version || '1.0.0',
    name: packageJson.name || 'monday-automation-api',
    description: packageJson.description || 'API de Automação Monday.com',
    buildDate: process.env.BUILD_DATE || 'unknown',
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    dependencies: {
      express: packageJson.dependencies?.express || 'unknown',
      mondaySDK: packageJson.dependencies?.['monday-sdk-js'] || 'unknown'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/reset:
 *   post:
 *     summary: Reset de métricas
 *     tags: [Health]
 *     description: |
 *       Reseta contadores e métricas da aplicação.
 *       Disponível apenas em ambiente de desenvolvimento.
 *     responses:
 *       200:
 *         description: Métricas resetadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *       403:
 *         description: Não permitido em produção
 */
router.post('/reset', asyncErrorHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Reset não permitido em produção',
      timestamp: new Date().toISOString()
    });
  }
  
  const result = await healthController.resetMetrics();
  
  res.json({
    success: true,
    message: 'Métricas resetadas com sucesso',
    reset: result,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;