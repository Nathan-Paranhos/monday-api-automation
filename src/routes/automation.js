const express = require('express');
const AutomationController = require('../controllers/automationController');
const { validateAutomationInput, validateQueryParams } = require('../middlewares/validation');
const { asyncErrorHandler } = require('../middlewares/errorHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const automationController = new AutomationController();

/**
 * Rate limiting para rotas de automação
 * Previne sobrecarga do sistema
 */
const automationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições',
    message: 'Limite de requisições excedido. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting a todas as rotas de automação
router.use(automationRateLimit);

/**
 * @swagger
 * /api/automation:
 *   get:
 *     summary: Lista todas as automações
 *     tags: [Automation]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processando, concluido, erro, cancelado]
 *         description: Filtrar por status
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: string
 *         description: Filtrar por cliente
 *     responses:
 *       200:
 *         description: Lista de automações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 automations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Automation'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get('/', asyncErrorHandler(async (req, res) => {
  const result = await automationController.listAutomations(req, res);
  return result;
}));

/**
 * @swagger
 * /api/automation/process:
 *   post:
 *     summary: Processa uma nova automação
 *     tags: [Automation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clienteId
 *               - produto
 *             properties:
 *               clienteId:
 *                 type: string
 *                 description: ID do cliente
 *                 example: "12345"
 *               produto:
 *                 type: string
 *                 description: Nome do produto
 *                 example: "Produto Exemplo"
 *               forceUpdate:
 *                 type: boolean
 *                 description: Forçar atualização mesmo se já existir
 *                 default: false
 *     responses:
 *       200:
 *         description: Automação processada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutomationResult'
 *       400:
 *         description: Dados de entrada inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/process', 
  validateAutomationInput,
  asyncErrorHandler(async (req, res) => {
    const result = await automationController.processAutomation(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/automation/{id}:
 *   get:
 *     summary: Obtém status de uma automação específica
 *     tags: [Automation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da automação
 *     responses:
 *       200:
 *         description: Status da automação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutomationStatus'
 *       404:
 *         description: Automação não encontrada
 */
router.get('/:id', 
  validateQueryParams(['id']),
  asyncErrorHandler(async (req, res) => {
    const result = await automationController.getAutomationStatus(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/automation/{id}/cancel:
 *   post:
 *     summary: Cancela uma automação em andamento
 *     tags: [Automation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da automação
 *     responses:
 *       200:
 *         description: Automação cancelada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 automationId:
 *                   type: string
 *       404:
 *         description: Automação não encontrada
 *       400:
 *         description: Automação não pode ser cancelada
 */
router.post('/:id/cancel', 
  validateQueryParams(['id']),
  asyncErrorHandler(async (req, res) => {
    const result = await automationController.cancelAutomation(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/automation/stats:
 *   get:
 *     summary: Obtém estatísticas das automações
 *     tags: [Automation]
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
 *         description: Estatísticas das automações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 success:
 *                   type: integer
 *                 errors:
 *                   type: integer
 *                 processing:
 *                   type: integer
 *                 averageProcessingTime:
 *                   type: number
 *                 successRate:
 *                   type: number
 *                 byStatus:
 *                   type: object
 *                 byDay:
 *                   type: object
 */
router.get('/stats', asyncErrorHandler(async (req, res) => {
  const period = req.query.period || '7d';
  const stats = await automationController.getStats(period);
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/automation/retry/{id}:
 *   post:
 *     summary: Reprocessa uma automação que falhou
 *     tags: [Automation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da automação
 *     responses:
 *       200:
 *         description: Automação reprocessada com sucesso
 *       404:
 *         description: Automação não encontrada
 *       400:
 *         description: Automação não pode ser reprocessada
 */
router.post('/retry/:id', 
  validateQueryParams(['id']),
  asyncErrorHandler(async (req, res) => {
    const automationId = req.params.id;
    const result = await automationController.retryAutomation(automationId);
    
    res.json({
      success: true,
      message: 'Automação reprocessada com sucesso',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/automation/bulk:
 *   post:
 *     summary: Processa múltiplas automações em lote
 *     tags: [Automation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - automations
 *             properties:
 *               automations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - clienteId
 *                     - produto
 *                   properties:
 *                     clienteId:
 *                       type: string
 *                     produto:
 *                       type: string
 *               concurrent:
 *                 type: boolean
 *                 description: Processar em paralelo
 *                 default: false
 *     responses:
 *       200:
 *         description: Lote processado
 *       400:
 *         description: Dados inválidos
 */
router.post('/bulk', asyncErrorHandler(async (req, res) => {
  const { automations, concurrent = false } = req.body;
  
  if (!Array.isArray(automations) || automations.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Lista de automações é obrigatória',
      code: 'INVALID_BULK_DATA'
    });
  }
  
  const result = await automationController.processBulkAutomations(automations, concurrent);
  
  res.json({
    success: true,
    message: 'Lote de automações processado',
    data: result,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;