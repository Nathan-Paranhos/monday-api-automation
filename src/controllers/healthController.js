const { logger } = require('../../logs/logger');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const MondayService = require('../services/mondayService');
const FileService = require('../services/fileService');

/**
 * Controlador para health checks e monitoramento
 * Verifica status da aplicação e dependências
 */
class HealthController {
  constructor() {
    this.mondayService = new MondayService();
    this.fileService = new FileService();
    this.startTime = Date.now();
  }

  /**
   * Health check básico
   * GET /health
   */
  basicHealthCheck = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;
    const uptime = Date.now() - this.startTime;

    logger.info('Health check básico solicitado', { requestId });

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        formatted: this.formatUptime(uptime)
      },
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      requestId
    });
  });

  /**
   * Health check detalhado
   * GET /health/detailed
   */
  detailedHealthCheck = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;
    const startTime = Date.now();

    logger.info('Health check detalhado solicitado', { requestId });

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId,
      application: {
        name: 'Monday API Automation',
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: {
          ms: Date.now() - this.startTime,
          formatted: this.formatUptime(Date.now() - this.startTime)
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: {
          usage: process.cpuUsage()
        }
      },
      dependencies: {
        monday: { status: 'checking', responseTime: null, error: null },
        filesystem: { status: 'checking', responseTime: null, error: null }
      }
    };

    // Testar Monday.com
    try {
      const mondayStart = Date.now();
      await this.mondayService.testarConexao();
      healthData.dependencies.monday = {
        status: 'healthy',
        responseTime: Date.now() - mondayStart,
        error: null
      };
    } catch (error) {
      healthData.dependencies.monday = {
        status: 'unhealthy',
        responseTime: null,
        error: error.message
      };
      healthData.status = 'degraded';
    }

    // Testar sistema de arquivos
    try {
      const fsStart = Date.now();
      await this.fileService.testFileSystem();
      healthData.dependencies.filesystem = {
        status: 'healthy',
        responseTime: Date.now() - fsStart,
        error: null
      };
    } catch (error) {
      healthData.dependencies.filesystem = {
        status: 'unhealthy',
        responseTime: null,
        error: error.message
      };
      healthData.status = 'degraded';
    }

    // Calcular tempo total do health check
    healthData.checkDuration = Date.now() - startTime;

    // Determinar status HTTP baseado no resultado
    const statusCode = healthData.status === 'healthy' ? 200 : 503;

    logger.info('Health check detalhado concluído', {
      requestId,
      status: healthData.status,
      duration: healthData.checkDuration
    });

    res.status(statusCode).json(healthData);
  });

  /**
   * Health check para readiness (Kubernetes)
   * GET /health/ready
   */
  readinessCheck = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Readiness check solicitado', { requestId });

    try {
      // Verificar se todas as dependências críticas estão funcionando
      await this.mondayService.testarConexao();
      await this.fileService.testFileSystem();

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        requestId
      });

    } catch (error) {
      logger.warn('Readiness check falhou', {
        requestId,
        error: error.message
      });

      res.status(503).json({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  });

  /**
   * Health check para liveness (Kubernetes)
   * GET /health/live
   */
  livenessCheck = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Liveness check solicitado', { requestId });

    // Verificação básica se a aplicação está respondendo
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      requestId
    });
  });

  /**
   * Métricas da aplicação
   * GET /health/metrics
   */
  getMetrics = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Métricas solicitadas', { requestId });

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: await this.getEventLoopDelay()
      },
      gc: process.memoryUsage(),
      requestId
    };

    res.status(200).json(metrics);
  });

  /**
   * Formata tempo de uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Mede delay do event loop
   */
  async getEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve(Number(delta) / 1000000); // Convert to milliseconds
      });
    });
  }
}

module.exports = HealthController;