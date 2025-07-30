const express = require('express');
const WebhookController = require('../../controllers/webhookController');
const { validateMondayWebhook, validateContentType } = require('../../middlewares/validation');
const { verifyMondaySignature } = require('../../middlewares/security');
const { asyncErrorHandler } = require('../../middlewares/errorHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const webhookController = new WebhookController();

/**
 * Rate limiting para webhooks
 * Mais permissivo para webhooks do Monday.com
 */
const webhookRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 200, // máximo 200 webhooks por 5 minutos
  message: {
    error: 'Limite de webhooks excedido',
    message: 'Muitos webhooks recebidos. Tente novamente em alguns minutos.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplicar rate limiting para webhooks do Monday.com
    return req.path === '/monday' && req.method === 'POST';
  }
});

// Aplicar rate limiting seletivo
router.use(webhookRateLimit);

/**
 * @swagger
 * /api/webhooks/monday:
 *   post:
 *     summary: Recebe webhooks do Monday.com
 *     tags: [Webhooks]
 *     description: |
 *       Endpoint principal para receber webhooks do Monday.com.
 *       Suporta challenge response e processamento de eventos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   challenge:
 *                     type: string
 *                     description: Challenge para verificação do webhook
 *               - type: object
 *                 properties:
 *                   event:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [change_column_value, create_item, update_item]
 *                       itemId:
 *                         type: string
 *                       columnId:
 *                         type: string
 *                       value:
 *                         type: object
 *                   timestamp:
 *                     type: string
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 challenge:
 *                   type: string
 *                   description: Retornado apenas para challenge response
 *                 processed:
 *                   type: boolean
 *                   description: Indica se o evento foi processado
 *                 requiresAutomation:
 *                   type: boolean
 *                   description: Indica se requer automação
 *       400:
 *         description: Webhook inválido
 */
router.post('/monday', 
  validateContentType,
  verifyMondaySignature,
  validateMondayWebhook,
  asyncErrorHandler(async (req, res) => {
    const result = await webhookController.processMondayWebhook(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/webhooks/generic:
 *   post:
 *     summary: Recebe webhooks genéricos
 *     tags: [Webhooks]
 *     description: Endpoint para receber webhooks de outras fontes
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Identificador da fonte do webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Dados do webhook (estrutura livre)
 *     responses:
 *       200:
 *         description: Webhook processado
 *       400:
 *         description: Dados inválidos
 */
router.post('/generic', 
  validateContentType,
  asyncErrorHandler(async (req, res) => {
    const result = await webhookController.processGenericWebhook(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/webhooks/history:
 *   get:
 *     summary: Obtém histórico de webhooks
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Itens por página
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filtrar por fonte
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processando, sucesso, erro]
 *         description: Filtrar por status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final (ISO 8601)
 *     responses:
 *       200:
 *         description: Histórico de webhooks
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
 *                     webhooks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WebhookHistory'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get('/history', asyncErrorHandler(async (req, res) => {
  const result = await webhookController.getHistory(req, res);
  return result;
}));

/**
 * @swagger
 * /api/webhooks/stats:
 *   get:
 *     summary: Obtém estatísticas de webhooks
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 7d
 *         description: Período para estatísticas
 *     responses:
 *       200:
 *         description: Estatísticas de webhooks
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
 *                     period:
 *                       type: string
 *                     total:
 *                       type: integer
 *                     success:
 *                       type: integer
 *                     errors:
 *                       type: integer
 *                     processing:
 *                       type: integer
 *                     bySource:
 *                       type: object
 *                     byDay:
 *                       type: object
 *                     averageProcessingTime:
 *                       type: number
 *                     errorRate:
 *                       type: number
 */
router.get('/stats', asyncErrorHandler(async (req, res) => {
  const result = await webhookController.getStats(req, res);
  return result;
}));

/**
 * @swagger
 * /api/webhooks/{webhookId}/reprocess:
 *   post:
 *     summary: Reprocessa um webhook específico
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do webhook
 *     responses:
 *       200:
 *         description: Webhook reprocessado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Webhook não encontrado
 *       400:
 *         description: Webhook não pode ser reprocessado
 */
router.post('/:webhookId/reprocess', asyncErrorHandler(async (req, res) => {
  const result = await webhookController.reprocessWebhook(req, res);
  return result;
}));

/**
 * @swagger
 * /api/webhooks/test:
 *   post:
 *     summary: Testa processamento de webhook
 *     tags: [Webhooks]
 *     description: Endpoint para testar webhooks durante desenvolvimento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Dados de teste do webhook
 *             example:
 *               event:
 *                 type: "change_column_value"
 *                 itemId: "12345"
 *                 columnId: "produto"
 *                 value: "Produto Teste"
 *     responses:
 *       200:
 *         description: Teste executado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 testResult:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                     processedData:
 *                       type: object
 */
router.post('/test', 
  validateContentType,
  asyncErrorHandler(async (req, res) => {
    const result = await webhookController.testWebhook(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/webhooks/queue/status:
 *   get:
 *     summary: Obtém status da fila de processamento
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Status da fila
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
 *                     queueSize:
 *                       type: integer
 *                     processing:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     averageProcessingTime:
 *                       type: number
 */
router.get('/queue/status', asyncErrorHandler(async (req, res) => {
  const queueStatus = await webhookController.getQueueStatus();
  
  res.json({
    success: true,
    data: queueStatus,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/webhooks/queue/clear:
 *   post:
 *     summary: Limpa fila de processamento
 *     tags: [Webhooks]
 *     description: Remove todos os webhooks pendentes da fila (use com cuidado)
 *     responses:
 *       200:
 *         description: Fila limpa com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 cleared:
 *                   type: integer
 */
router.post('/queue/clear', asyncErrorHandler(async (req, res) => {
  const cleared = await webhookController.clearQueue();
  
  res.json({
    success: true,
    message: 'Fila de webhooks limpa com sucesso',
    cleared,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/webhooks/validate:
 *   post:
 *     summary: Valida estrutura de webhook
 *     tags: [Webhooks]
 *     description: Valida se um webhook tem a estrutura correta sem processá-lo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Dados do webhook para validação
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 structure:
 *                   type: object
 *                   description: Análise da estrutura do webhook
 */
router.post('/validate', 
  validateContentType,
  asyncErrorHandler(async (req, res) => {
    const validation = await webhookController.validateWebhookStructure(req.body);
    
    res.json({
      success: true,
      ...validation,
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router;