const { logger } = require('../../logs/logger');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const WebhookService = require('../services/webhookService');
const AutomationService = require('../services/automationService');

/**
 * Controlador para webhooks
 * Gerencia recebimento e processamento de webhooks do Monday.com
 */
class WebhookController {
  constructor() {
    this.webhookService = new WebhookService();
    this.automationService = new AutomationService();
  }

  /**
   * Processa webhook do Monday.com
   * POST /webhook/monday
   */
  processMondayWebhook = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;
    const webhookData = req.body;

    logger.info('Webhook do Monday.com recebido', {
      requestId,
      event: webhookData.event,
      timestamp: new Date().toISOString()
    });

    try {
      // Validar e processar webhook
      const processedData = await this.webhookService.processWebhook(webhookData);

      // Se o webhook requer automação, disparar processo
      if (processedData.requiresAutomation) {
        logger.info('Webhook requer automação, disparando processo', {
          requestId,
          itemId: processedData.itemId,
          changeType: processedData.changeType
        });

        // Disparar automação de forma assíncrona
        this.automationService.processWebhookAutomation(processedData)
          .catch(error => {
            logger.error('Erro na automação disparada por webhook', {
              requestId,
              error: error.message,
              processedData
            });
          });
      }

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Webhook processado com sucesso',
        dados: {
          processed: true,
          automationTriggered: processedData.requiresAutomation,
          itemId: processedData.itemId,
          changeType: processedData.changeType
        },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao processar webhook do Monday.com', {
        requestId,
        error: error.message,
        webhookData
      });

      // Para webhooks, sempre retornar 200 para evitar reenvios
      res.status(200).json({
        status: 'erro',
        mensagem: 'Erro no processamento do webhook',
        erro: error.message,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Processa webhook genérico
   * POST /webhook/generic
   */
  processGenericWebhook = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;
    const webhookData = req.body;
    const { source } = req.query;

    logger.info('Webhook genérico recebido', {
      requestId,
      source,
      dataKeys: Object.keys(webhookData),
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.webhookService.processGenericWebhook(webhookData, source);

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Webhook genérico processado com sucesso',
        dados: result,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao processar webhook genérico', {
        requestId,
        source,
        error: error.message,
        webhookData
      });

      res.status(200).json({
        status: 'erro',
        mensagem: 'Erro no processamento do webhook genérico',
        erro: error.message,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Lista webhooks recebidos
   * GET /webhook/history
   */
  getWebhookHistory = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 20, source, status, startDate, endDate } = req.query;
    const requestId = req.requestId;

    logger.info('Consultando histórico de webhooks', {
      requestId,
      filters: { page, limit, source, status, startDate, endDate }
    });

    try {
      const history = await this.webhookService.getHistory({
        page: parseInt(page),
        limit: parseInt(limit),
        source,
        status,
        startDate,
        endDate
      });

      res.status(200).json({
        status: 'sucesso',
        dados: history.webhooks,
        paginacao: {
          pagina: parseInt(page),
          limite: parseInt(limit),
          total: history.total,
          totalPaginas: Math.ceil(history.total / parseInt(limit))
        },
        filtros: { source, status, startDate, endDate },
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao consultar histórico de webhooks', {
        requestId,
        error: error.message
      });

      throw new AppError(
        'Erro ao consultar histórico de webhooks',
        500,
        'WEBHOOK_HISTORY_ERROR'
      );
    }
  });

  /**
   * Obtém estatísticas de webhooks
   * GET /webhook/stats
   */
  getWebhookStats = asyncErrorHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    const requestId = req.requestId;

    logger.info('Obtendo estatísticas de webhooks', {
      requestId,
      period
    });

    try {
      const stats = await this.webhookService.getStats(period);

      res.status(200).json({
        status: 'sucesso',
        dados: stats,
        periodo: period,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de webhooks', {
        requestId,
        error: error.message,
        period
      });

      throw new AppError(
        'Erro ao obter estatísticas de webhooks',
        500,
        'WEBHOOK_STATS_ERROR'
      );
    }
  });

  /**
   * Reprocessa webhook por ID
   * POST /webhook/:webhookId/reprocess
   */
  reprocessWebhook = asyncErrorHandler(async (req, res) => {
    const { webhookId } = req.params;
    const requestId = req.requestId;

    logger.info('Reprocessando webhook', {
      requestId,
      webhookId
    });

    try {
      const result = await this.webhookService.reprocessWebhook(webhookId);

      if (!result) {
        throw new AppError(
          `Webhook com ID ${webhookId} não encontrado`,
          404,
          'WEBHOOK_NOT_FOUND'
        );
      }

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Webhook reprocessado com sucesso',
        dados: result,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro ao reprocessar webhook', {
        requestId,
        webhookId,
        error: error.message
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Erro ao reprocessar webhook',
        500,
        'WEBHOOK_REPROCESS_ERROR'
      );
    }
  });

  /**
   * Testa webhook (para desenvolvimento)
   * POST /webhook/test
   */
  testWebhook = asyncErrorHandler(async (req, res) => {
    const testData = req.body;
    const requestId = req.requestId;

    logger.info('Testando webhook', {
      requestId,
      testData
    });

    try {
      const result = await this.webhookService.testWebhook(testData);

      res.status(200).json({
        status: 'sucesso',
        mensagem: 'Teste de webhook executado com sucesso',
        dados: result,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Erro no teste de webhook', {
        requestId,
        error: error.message,
        testData
      });

      throw new AppError(
        'Erro no teste de webhook',
        500,
        'WEBHOOK_TEST_ERROR'
      );
    }
  });
}

module.exports = WebhookController;