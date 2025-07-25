const { logger } = require('../../logs/logger');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const AutomationService = require('../services/automationService');
const MondayService = require('../services/mondayService');
const FileService = require('../services/fileService');

/**
 * Controlador para operações de automação
 * Gerencia o fluxo principal de automação do Monday.com
 */
class AutomationController {
  constructor() {
    this.automationService = new AutomationService();
    this.mondayService = new MondayService();
    this.fileService = new FileService();
  }

  /**
   * Processa automação principal
   * POST /api/automation
   */
  processAutomation = asyncErrorHandler(async (req, res) => {
    const startTime = Date.now();
    const { clienteId, produto, responsavel } = req.body;
    const requestId = req.requestId;

    logger.info('Iniciando processamento de automação', {
      requestId,
      clienteId,
      produto,
      responsavel,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Consultar produto no Monday.com
      logger.info('Consultando produto no Monday.com', { requestId, clienteId });
      const produtoInfo = await this.mondayService.consultarProduto(clienteId);

      if (!produtoInfo) {
        logger.warn('Produto não encontrado no Monday.com', { requestId, clienteId });
        throw new AppError(
          `Produto com ID ${clienteId} não encontrado no Monday.com`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      // 2. Determinar responsável
      const responsavelFinal = responsavel || produtoInfo.responsavel || 'Não definido';
      logger.info('Responsável determinado', { requestId, responsavelFinal });

      // 3. Criar estrutura de pastas
      logger.info('Criando estrutura de pastas', { requestId, produto });
      const estruturaPastas = await this.fileService.criarEstruturaPastas({
        produto,
        responsavel: responsavelFinal,
        clienteId
      });

      // 4. Atualizar Monday.com com informações da automação
      logger.info('Atualizando Monday.com', { requestId });
      await this.mondayService.atualizarItem(produtoInfo.id, {
        status: 'Em Processamento',
        responsavel: responsavelFinal,
        estruturaPastas: estruturaPastas.caminho
      });

      const duration = Date.now() - startTime;
      logger.info('Automação processada com sucesso', {
        requestId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      // Resposta de sucesso
      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Automação processada com sucesso',
        dados: {
          clienteId,
          produto,
          responsavel: responsavelFinal,
          produtoInfo: {
            id: produtoInfo.id,
            nome: produtoInfo.nome,
            status: produtoInfo.status
          },
          estruturaPastas,
          processamento: {
            duracao: `${duration}ms`,
            timestamp: new Date().toISOString()
          }
        },
        requestId
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erro no processamento da automação', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        clienteId,
        produto
      });

      // Se é um erro conhecido, relançar
      if (error instanceof AppError) {
        throw error;
      }

      // Erro genérico
      throw new AppError(
        'Erro interno no processamento da automação',
        500,
        'AUTOMATION_PROCESSING_ERROR'
      );
    }
  });

  /**
   * Obtém status de uma automação
   * GET /api/automation/:id/status
   */
  getAutomationStatus = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const requestId = req.requestId;

    logger.info('Consultando status de automação', { requestId, automationId: id });

    try {
      const status = await this.automationService.getStatus(id);

      if (!status) {
        throw new AppError(
          `Automação com ID ${id} não encontrada`,
          404,
          'AUTOMATION_NOT_FOUND'
        );
      }

      res.status(200).json({
        status: 'sucesso',
        dados: status,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao consultar status da automação', {
        requestId,
        automationId: id,
        error: error.message
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Erro ao consultar status da automação',
        500,
        'STATUS_QUERY_ERROR'
      );
    }
  });

  /**
   * Lista todas as automações
   * GET /api/automation
   */
  listAutomations = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, status, responsavel } = req.query;
    const requestId = req.requestId;

    logger.info('Listando automações', {
      requestId,
      filters: { page, limit, status, responsavel }
    });

    try {
      const automations = await this.automationService.list({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        responsavel
      });

      res.status(200).json({
        status: 'sucesso',
        dados: automations,
        paginacao: {
          pagina: parseInt(page),
          limite: parseInt(limit),
          total: automations.total
        },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao listar automações', {
        requestId,
        error: error.message
      });

      throw new AppError(
        'Erro ao listar automações',
        500,
        'LIST_AUTOMATIONS_ERROR'
      );
    }
  });

  /**
   * Cancela uma automação
   * DELETE /api/automation/:id
   */
  cancelAutomation = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const requestId = req.requestId;

    logger.info('Cancelando automação', { requestId, automationId: id });

    try {
      const result = await this.automationService.cancel(id);

      if (!result) {
        throw new AppError(
          `Automação com ID ${id} não encontrada`,
          404,
          'AUTOMATION_NOT_FOUND'
        );
      }

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Automação cancelada com sucesso',
        dados: result,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao cancelar automação', {
        requestId,
        automationId: id,
        error: error.message
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Erro ao cancelar automação',
        500,
        'CANCEL_AUTOMATION_ERROR'
      );
    }
  });
}

module.exports = AutomationController;