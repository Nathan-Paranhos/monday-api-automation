const express = require('express');
const MondayController = require('../../controllers/mondayController');
const { validateQueryParams, validateContentType } = require('../../middlewares/validation');
const { asyncErrorHandler } = require('../../middlewares/errorHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const mondayController = new MondayController();

/**
 * Rate limiting específico para Monday.com API
 * Mais restritivo devido aos limites da API externa
 */
const mondayRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // máximo 30 requests por minuto
  message: {
    error: 'Limite de requisições para Monday.com excedido',
    message: 'Aguarde 1 minuto antes de fazer novas requisições para a API do Monday.com',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting a todas as rotas do Monday.com
router.use(mondayRateLimit);

/**
 * @swagger
 * /api/monday/test-connection:
 *   get:
 *     summary: Testa conexão com Monday.com
 *     tags: [Monday]
 *     responses:
 *       200:
 *         description: Conexão testada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 connected:
 *                   type: boolean
 *                 apiVersion:
 *                   type: string
 *                 boardId:
 *                   type: string
 *                 responseTime:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *       401:
 *         description: Token de API inválido
 *       500:
 *         description: Erro de conexão
 */
router.get('/test-connection', asyncErrorHandler(async (req, res) => {
  const result = await mondayController.testConnection(req, res);
  return result;
}));

/**
 * @swagger
 * /api/monday/product/{clienteId}:
 *   get:
 *     summary: Consulta produto por ID do cliente
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: clienteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cliente
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir histórico de mudanças
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produto não encontrado
 */
router.get('/product/:clienteId', 
  validateQueryParams(['clienteId']),
  asyncErrorHandler(async (req, res) => {
    const result = await mondayController.queryProduct(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/monday/pharmacies:
 *   get:
 *     summary: Busca farmácias BOT
 *     tags: [Monday]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *       - in: query
 *         name: produto
 *         schema:
 *           type: string
 *         description: Filtrar por produto
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limite de resultados
 *     responses:
 *       200:
 *         description: Lista de farmácias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pharmacy'
 *                 total:
 *                   type: integer
 */
router.get('/pharmacies', asyncErrorHandler(async (req, res) => {
  const result = await mondayController.searchPharmacies(req, res);
  return result;
}));

/**
 * @swagger
 * /api/monday/items:
 *   get:
 *     summary: Lista itens do board
 *     tags: [Monday]
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
 *           default: 25
 *         description: Itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca
 *     responses:
 *       200:
 *         description: Lista de itens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MondayItem'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/items', asyncErrorHandler(async (req, res) => {
  const result = await mondayController.listItems(req, res);
  return result;
}));

/**
 * @swagger
 * /api/monday/items:
 *   post:
 *     summary: Cria novo item no board
 *     tags: [Monday]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do item
 *               columnValues:
 *                 type: object
 *                 description: Valores das colunas
 *               groupId:
 *                 type: string
 *                 description: ID do grupo
 *     responses:
 *       201:
 *         description: Item criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/items', 
  validateContentType,
  asyncErrorHandler(async (req, res) => {
    const result = await mondayController.createItem(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/monday/items/{itemId}:
 *   put:
 *     summary: Atualiza item existente
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               columnValues:
 *                 type: object
 *                 description: Valores das colunas para atualizar
 *               name:
 *                 type: string
 *                 description: Novo nome do item
 *     responses:
 *       200:
 *         description: Item atualizado com sucesso
 *       404:
 *         description: Item não encontrado
 */
router.put('/items/:itemId', 
  validateQueryParams(['itemId']),
  validateContentType,
  asyncErrorHandler(async (req, res) => {
    const result = await mondayController.updateItem(req, res);
    return result;
  })
);

/**
 * @swagger
 * /api/monday/board/stats:
 *   get:
 *     summary: Obtém estatísticas do board
 *     tags: [Monday]
 *     responses:
 *       200:
 *         description: Estatísticas do board
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
 *                     totalItems:
 *                       type: integer
 *                     totalGroups:
 *                       type: integer
 *                     totalColumns:
 *                       type: integer
 *                     itemsByStatus:
 *                       type: object
 *                     itemsByGroup:
 *                       type: object
 *                     lastUpdated:
 *                       type: string
 */
router.get('/board/stats', asyncErrorHandler(async (req, res) => {
  const result = await mondayController.getBoardStats(req, res);
  return result;
}));

/**
 * @swagger
 * /api/monday/columns:
 *   get:
 *     summary: Lista colunas do board
 *     tags: [Monday]
 *     responses:
 *       200:
 *         description: Lista de colunas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       type:
 *                         type: string
 *                       settings:
 *                         type: object
 */
router.get('/columns', asyncErrorHandler(async (req, res) => {
  const columns = await mondayController.getBoardColumns();
  
  res.json({
    success: true,
    data: columns,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/monday/groups:
 *   get:
 *     summary: Lista grupos do board
 *     tags: [Monday]
 *     responses:
 *       200:
 *         description: Lista de grupos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       color:
 *                         type: string
 *                       itemsCount:
 *                         type: integer
 */
router.get('/groups', asyncErrorHandler(async (req, res) => {
  const groups = await mondayController.getBoardGroups();
  
  res.json({
    success: true,
    data: groups,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/monday/search:
 *   get:
 *     summary: Busca itens no board
 *     tags: [Monday]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca
 *       - in: query
 *         name: columns
 *         schema:
 *           type: string
 *         description: Colunas específicas para buscar (separadas por vírgula)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *         description: Limite de resultados
 *     responses:
 *       200:
 *         description: Resultados da busca
 *       400:
 *         description: Parâmetros de busca inválidos
 */
router.get('/search', 
  validateQueryParams(['query']),
  asyncErrorHandler(async (req, res) => {
    const { query, columns, limit = 25 } = req.query;
    const result = await mondayController.searchItems(query, columns, limit);
    
    res.json({
      success: true,
      data: result,
      query,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/monday/activity/{itemId}:
 *   get:
 *     summary: Obtém atividades de um item
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Limite de atividades
 *     responses:
 *       200:
 *         description: Lista de atividades
 *       404:
 *         description: Item não encontrado
 */
router.get('/activity/:itemId', 
  validateQueryParams(['itemId']),
  asyncErrorHandler(async (req, res) => {
    const { itemId } = req.params;
    const { limit = 20 } = req.query;
    const activities = await mondayController.getItemActivity(itemId, limit);
    
    res.json({
      success: true,
      data: activities,
      itemId,
      timestamp: new Date().toISOString()
    });
  })
);

module.exports = router;