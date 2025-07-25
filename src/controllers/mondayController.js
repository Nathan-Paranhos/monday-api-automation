const { logger } = require('../../logs/logger');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const MondayService = require('../services/mondayService');

/**
 * Controlador para operações do Monday.com
 * Gerencia consultas e operações relacionadas ao Monday.com
 */
class MondayController {
  constructor() {
    this.mondayService = new MondayService();
  }

  /**
   * Testa conexão com Monday.com
   * GET /api/monday/test-connection
   */
  testConnection = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Testando conexão com Monday.com', { requestId });

    try {
      const connectionTest = await this.mondayService.testarConexao();

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Conexão com Monday.com estabelecida com sucesso',
        dados: {
          conectado: true,
          usuario: connectionTest.usuario,
          workspace: connectionTest.workspace,
          board: connectionTest.board,
          timestamp: new Date().toISOString()
        },
        requestId
      });

    } catch (error) {
      logger.error('Erro ao testar conexão com Monday.com', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      throw new AppError(
        'Falha na conexão com Monday.com',
        502,
        'MONDAY_CONNECTION_ERROR'
      );
    }
  });

  /**
   * Consulta produto por ID do cliente
   * GET /api/monday/product/:clienteId
   */
  getProduct = asyncErrorHandler(async (req, res) => {
    const { clienteId } = req.params;
    const requestId = req.requestId;

    logger.info('Consultando produto no Monday.com', { requestId, clienteId });

    try {
      const produto = await this.mondayService.consultarProduto(clienteId);

      if (!produto) {
        throw new AppError(
          `Produto com ID ${clienteId} não encontrado`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      res.status(200).json({
        status: 'sucesso',
        dados: {
          id: produto.id,
          nome: produto.nome,
          clienteId: produto.clienteId,
          status: produto.status,
          responsavel: produto.responsavel,
          dataCriacao: produto.dataCriacao,
          ultimaAtualizacao: produto.ultimaAtualizacao,
          colunas: produto.colunas
        },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao consultar produto', {
        requestId,
        clienteId,
        error: error.message
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Erro ao consultar produto no Monday.com',
        500,
        'PRODUCT_QUERY_ERROR'
      );
    }
  });

  /**
   * Busca farmácias BOT
   * GET /api/monday/pharmacies
   */
  getPharmacies = asyncErrorHandler(async (req, res) => {
    const { status, produto, limit = 50 } = req.query;
    const requestId = req.requestId;

    logger.info('Buscando farmácias BOT', {
      requestId,
      filters: { status, produto, limit }
    });

    try {
      const farmacias = await this.mondayService.buscarFarmaciasBOT({
        status,
        produto,
        limit: parseInt(limit)
      });

      res.status(200).json({
        status: 'sucesso',
        dados: farmacias,
        total: farmacias.length,
        filtros: { status, produto, limit },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao buscar farmácias BOT', {
        requestId,
        error: error.message,
        filters: { status, produto, limit }
      });

      throw new AppError(
        'Erro ao buscar farmácias BOT',
        500,
        'PHARMACIES_QUERY_ERROR'
      );
    }
  });

  /**
   * Atualiza item no Monday.com
   * PUT /api/monday/item/:itemId
   */
  updateItem = asyncErrorHandler(async (req, res) => {
    const { itemId } = req.params;
    const updateData = req.body;
    const requestId = req.requestId;

    logger.info('Atualizando item no Monday.com', {
      requestId,
      itemId,
      updateData
    });

    try {
      const result = await this.mondayService.atualizarItem(itemId, updateData);

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Item atualizado com sucesso',
        dados: result,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao atualizar item', {
        requestId,
        itemId,
        updateData,
        error: error.message
      });

      throw new AppError(
        'Erro ao atualizar item no Monday.com',
        500,
        'ITEM_UPDATE_ERROR'
      );
    }
  });

  /**
   * Lista itens do board
   * GET /api/monday/items
   */
  getItems = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 25, status, responsavel } = req.query;
    const requestId = req.requestId;

    logger.info('Listando itens do Monday.com', {
      requestId,
      filters: { page, limit, status, responsavel }
    });

    try {
      const items = await this.mondayService.listarItens({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        responsavel
      });

      res.status(200).json({
        status: 'sucesso',
        dados: items.items,
        paginacao: {
          pagina: parseInt(page),
          limite: parseInt(limit),
          total: items.total,
          totalPaginas: Math.ceil(items.total / parseInt(limit))
        },
        filtros: { status, responsavel },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao listar itens', {
        requestId,
        error: error.message,
        filters: { page, limit, status, responsavel }
      });

      throw new AppError(
        'Erro ao listar itens do Monday.com',
        500,
        'ITEMS_LIST_ERROR'
      );
    }
  });

  /**
   * Cria novo item no Monday.com
   * POST /api/monday/item
   */
  createItem = asyncErrorHandler(async (req, res) => {
    const itemData = req.body;
    const requestId = req.requestId;

    logger.info('Criando novo item no Monday.com', {
      requestId,
      itemData
    });

    try {
      const newItem = await this.mondayService.criarItem(itemData);

      res.status(201).json({
        status: 'sucesso',
        mensagem: 'Item criado com sucesso',
        dados: newItem,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao criar item', {
        requestId,
        itemData,
        error: error.message
      });

      throw new AppError(
        'Erro ao criar item no Monday.com',
        500,
        'ITEM_CREATE_ERROR'
      );
    }
  });

  /**
   * Obtém estatísticas do board
   * GET /api/monday/stats
   */
  getStats = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Obtendo estatísticas do Monday.com', { requestId });

    try {
      const stats = await this.mondayService.obterEstatisticas();

      res.status(200).json({
        status: 'sucesso',
        dados: stats,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas', {
        requestId,
        error: error.message
      });

      throw new AppError(
        'Erro ao obter estatísticas do Monday.com',
        500,
        'STATS_ERROR'
      );
    }
  });
}

module.exports = MondayController;