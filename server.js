require('dotenv').config();
const { logger } = require('./logs/logger');
const App = require('./src/app');

/**
 * Servidor principal da API
 * Inicializa a aplicação e configura o servidor HTTP
 */

// Configurações do servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Função para inicializar o servidor
async function startServer() {
  try {
    // Cria instância da aplicação
    const app = new App();
    
    // Inicializa a aplicação
    await app.initialize();
    
    // Obtém a instância do Express
    const expressApp = app.getApp();
    
    // Inicia o servidor
    const server = expressApp.listen(PORT, HOST, () => {
      logger.info('🚀 Servidor iniciado com sucesso', {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        pid: process.pid,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
      
      // Log das rotas disponíveis em desenvolvimento
      if (NODE_ENV === 'development') {
        logger.info('📋 Rotas disponíveis:', {
          health: `http://${HOST}:${PORT}/health`,
          docs: `http://${HOST}:${PORT}/api-docs`,
          automation: `http://${HOST}:${PORT}/api/automation`,
          monday: `http://${HOST}:${PORT}/api/monday`,
          webhooks: `http://${HOST}:${PORT}/api/webhooks`,
          config: `http://${HOST}:${PORT}/api/config`
        });
      }
    });
    
    // Configurações do servidor
    server.timeout = parseInt(process.env.SERVER_TIMEOUT) || 30000;
    server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000;
    server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT) || 6000;
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`📴 Recebido sinal ${signal}, iniciando shutdown graceful...`);
      
      // Para de aceitar novas conexões
      server.close(async (err) => {
        if (err) {
          logger.error('Erro durante o shutdown do servidor', { error: err.message });
          process.exit(1);
        }
        
        try {
          // Cleanup da aplicação
          await app.cleanup();
          
          logger.info('✅ Servidor finalizado com sucesso');
          process.exit(0);
        } catch (cleanupError) {
          logger.error('Erro durante cleanup da aplicação', { 
            error: cleanupError.message 
          });
          process.exit(1);
        }
      });
      
      // Força o shutdown após timeout
      setTimeout(() => {
        logger.error('⚠️ Forçando shutdown após timeout');
        process.exit(1);
      }, parseInt(process.env.SHUTDOWN_TIMEOUT) || 10000);
    };
    
    // Handlers para sinais de sistema
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handler para erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('❌ Exceção não capturada', {
        error: error.message,
        stack: error.stack
      });
      
      // Tenta fazer shutdown graceful
      gracefulShutdown('uncaughtException');
    });
    
    // Handler para promises rejeitadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Promise rejeitada não tratada', {
        reason: reason?.message || reason,
        stack: reason?.stack
      });
      
      // Tenta fazer shutdown graceful
      gracefulShutdown('unhandledRejection');
    });
    
    // Handler para avisos
    process.on('warning', (warning) => {
      logger.warn('⚠️ Aviso do Node.js', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });
    
    // Log de informações do processo em desenvolvimento
    if (NODE_ENV === 'development') {
      logger.debug('🔧 Informações do processo', {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      });
    }
    
    return server;
    
  } catch (error) {
    logger.error('❌ Erro ao inicializar servidor', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  }
}

// Função para verificar dependências
function checkDependencies() {
  const requiredEnvVars = [
    'MONDAY_API_TOKEN',
    'MONDAY_BOARD_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('❌ Variáveis de ambiente obrigatórias não encontradas', {
      missing: missingVars,
      help: 'Verifique o arquivo .env ou as variáveis de ambiente do sistema'
    });
    
    process.exit(1);
  }
  
  logger.info('✅ Dependências verificadas com sucesso');
}

// Função principal
async function main() {
  try {
    // Banner da aplicação
    console.log(`
🚀 Monday.com API Server
`);
    console.log(`📅 Versão: ${process.env.npm_package_version || '1.0.0'}`);
    console.log(`🌍 Ambiente: ${NODE_ENV}`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log(`📍 PID: ${process.pid}\n`);
    
    // Verifica dependências
    checkDependencies();
    
    // Inicia o servidor
    await startServer();
    
  } catch (error) {
    logger.error('❌ Erro fatal na inicialização', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  }
}

// Inicia a aplicação apenas se este arquivo for executado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  startServer,
  checkDependencies
};