const { logger } = require('../../logs/logger');
const mondayService = require('../services/mondayService');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const AutomationService = require('../services/automationService');
const { formatSuccess, formatError } = require('../utils/responseFormatter');
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
    const { clientId, demandType } = req.body;
    const requestId = req.requestId;

    // Validar dados de entrada
    if (!clientId || !demandType) {
      return formatError(res, 'Dados inválidos: clientId e demandType são obrigatórios', 400, 'INVALID_INPUT');
    }

    logger.info('Iniciando processamento de automação', {
      requestId,
      clientId,
      demandType,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.mondayService.processAutomation({
        clientId,
        demandType
      });

      formatSuccess(res, result, 'Automação processada com sucesso');

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erro no processamento da automação', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        clientId,
        demandType
      });

      // Se é um erro conhecido, relançar
      if (error instanceof AppError) {
        return formatError(res, error.message, error.statusCode, error.errorCode);
      }
      formatError(res, 'Erro interno no processamento da automação', 500, 'AUTOMATION_PROCESSING_ERROR');
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
      // Mock temporário para o método getStatus
      const status = {
        id: id,
        status: 'completed',
        progress: 100
      };

      if (!status) {
        throw new AppError(
          `Automação com ID ${id} não encontrada`,
          404,
          'AUTOMATION_NOT_FOUND'
        );
      }

      formatSuccess(res, status, 'Status da automação recuperado com sucesso');

    } catch (error) {
      logger.error('Erro ao consultar status da automação', {
        requestId,
        automationId: id,
        error: error.message
      });

      if (error instanceof AppError) {
        return formatError(res, error.message, error.statusCode, error.errorCode);
      }
      formatError(res, 'Erro ao consultar status da automação', 500, 'STATUS_QUERY_ERROR');
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
      // Mock temporário para o método list
      const automations = [
        { id: 'auto-1', status: 'completed' },
        { id: 'auto-2', status: 'processing' }
      ];

      formatSuccess(res, automations, 'Automações listadas com sucesso');

    } catch (error) {
      logger.error('Erro ao listar automações', {
        requestId,
        error: error.message
      });

      formatError(res, 'Erro ao listar automações', 500, 'LIST_AUTOMATIONS_ERROR');
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
      // Mock temporário para o método cancel
      const result = {
        id: id,
        status: 'cancelled'
      };

      if (!result) {
        throw new AppError(
          `Automação com ID ${id} não encontrada`,
          404,
          'AUTOMATION_NOT_FOUND'
        );
      }

      formatSuccess(res, result, 'Automação cancelada com sucesso');

    } catch (error) {
      logger.error('Erro ao cancelar automação', {
        requestId,
        automationId: id,
        error: error.message
      });

      if (error instanceof AppError) {
        return formatError(res, error.message, error.statusCode, error.errorCode);
      }
      formatError(res, 'Erro ao cancelar automação', 500, 'CANCEL_AUTOMATION_ERROR');
    }
  });

  /**
   * Obtém informações do cliente
   * GET /api/v1/automation/cliente/:id
   */
  getClientInfo = asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validar se o ID é um número válido
      if (isNaN(id) || id.trim() === '') {
        return formatError(res, 'ID do cliente deve ser um número válido', 400, 'INVALID_CLIENT_ID');
      }
      
      const clientData = await this.mondayService.getClientInfo(id);

      if (!clientData) {
        return formatError(res, 'Cliente não encontrado', 404, 'CLIENT_NOT_FOUND');
      }

      const response = {
        nome: clientData.nome,
        codigo: clientData.codigo,
        data_solicitacao: clientData.data_solicitacao,
        analista_responsavel: clientData.analista_responsavel,
      };

      formatSuccess(res, response, 'Informações do cliente recuperadas com sucesso');
    } catch (error) {
      logger.error('Erro ao buscar informações do cliente:', error);
      
      if (error.message.includes('não encontrado')) {
        return formatError(res, 'Cliente não encontrado', 404, 'CLIENT_NOT_FOUND');
      }
      
      formatError(res, 'Erro interno do servidor', 500, 'INTERNAL_SERVER_ERROR');
    }
  });
}

module.exports = AutomationController;