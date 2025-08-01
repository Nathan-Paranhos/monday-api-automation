#!/usr/bin/env node

/**
 * Servidor principal da aplicação Monday API Automation
 * Integra o servidor Express com o sistema de monitoramento contínuo
 * 
 * @author Nathan Silva - Fagron Tech
 * @version 2.0.0
 */

const App = require('./src/app');
const { logger } = require('./logs/logger');
const MonitorBotService = require('./src/services/monitorBotService');

/**
 * Classe principal do servidor
 * Gerencia a inicialização da aplicação e do sistema de monitoramento
 */
class Server {
  constructor() {
    this.app = null;
    this.server = null;
    this.monitorService = null;
    this.isShuttingDown = false;
  }

  /**
   * Inicializa o servidor
   */
  async start() {
    try {
      logger.info('Iniciando servidor Monday API Automation...');

      // Inicializar aplicação Express
      this.app = new App();
      await this.app.initialize();

      // Iniciar servidor HTTP
      const port = process.env.PORT || 10000;
      this.server = this.app.getApp().listen(port, () => {
        logger.info(`Servidor iniciado na porta ${port}`, {
          ambiente: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });
      });

      // Inicializar MonitorBot apenas em produção
      if (process.env.NODE_ENV === 'production') {
        await this.initializeMonitorService();
      } else {
        logger.info('MonitorBot desabilitado em ambiente de desenvolvimento');
      }

      // Configurar handlers de shutdown
      this.setupShutdownHandlers();

      logger.info('Servidor Monday API Automation iniciado com sucesso!');

    } catch (error) {
      logger.error('Erro ao iniciar servidor:', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  /**
   * Inicializa o serviço de monitoramento
   */
  async initializeMonitorService() {
    try {
      this.monitorService = new MonitorBotService();
      await this.monitorService.iniciar();
      logger.info('MonitorBot iniciado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar MonitorBot:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Configura handlers de shutdown gracioso
   */
  setupShutdownHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          logger.warn('⚠️ Shutdown forçado!');
          process.exit(1);
        }
        
        this.isShuttingDown = true;
        logger.info(`🛑 Recebido sinal ${signal}, iniciando shutdown gracioso...`);
        
        await this.shutdown();
      });
    });
    
    // Handler para erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('💥 Erro não capturado:', error);
      this.shutdown().then(() => process.exit(1));
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Promise rejeitada não tratada:', { reason, promise });
      this.shutdown().then(() => process.exit(1));
    });
  }

  /**
   * Executa o shutdown gracioso
   */
  async shutdown() {
    try {
      logger.info('🧹 Iniciando processo de shutdown...');
      
      // Parar de aceitar novas conexões
      if (this.server) {
        this.server.close(() => {
          logger.info('🔌 Servidor HTTP fechado');
        });
      }
      
      // Parar sistema de monitoramento
      if (this.monitorService) {
        await this.monitorService.parar();
        logger.info('MonitorBot parado com sucesso');
      }
      
      // Cleanup da aplicação
      if (this.app) {
        await this.app.cleanup();
      }
      
      logger.info('✅ Shutdown concluído com sucesso');
      process.exit(0);
      
    } catch (error) {
      logger.error('❌ Erro durante shutdown:', error);
      process.exit(1);
    }
  }
}

// Inicializar servidor se executado diretamente
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;