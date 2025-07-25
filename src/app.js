const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

// Importar middlewares customizados
const { requestLogger } = require('./middlewares/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { validateEnvironment } = require('./middlewares/validation');

// Importar rotas
const automationRoutes = require('./routes/automation');
const mondayRoutes = require('./routes/monday');
const webhookRoutes = require('./routes/webhook');
const healthRoutes = require('./routes/health');
const configRoutes = require('./routes/config');

/**
 * Classe principal da aplicação Monday API Automation
 * Organizada seguindo padrões de arquitetura limpa
 * 
 * @author Nathan Silva - Fagron Tech
 * @version 2.0.0
 */
class App {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configura middlewares globais da aplicação
   */
  setupMiddlewares() {
    // Segurança
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS configurado
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP
      message: {
        status: 'erro',
        erro: 'Muitas requisições. Tente novamente em 15 minutos.',
        codigo: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Compressão
    this.app.use(compression());

    // Parse de dados
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logger de requisições
    this.app.use(requestLogger);

    // Validação de ambiente
    this.app.use(validateEnvironment);
  }

  /**
   * Configura todas as rotas da aplicação
   */
  setupRoutes() {
    // Rota raiz - redireciona para documentação
    this.app.get('/', (req, res) => {
      res.redirect('/api-docs');
    });

    // Documentação Swagger
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Monday API Automation - Documentação v2.0',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1f4e79 }
        .swagger-ui .scheme-container { background: #f8f9fa }
      `,
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
      }
    }));

    // Rotas da API
    this.app.use('/health', healthRoutes);
    this.app.use('/config', configRoutes);
    this.app.use('/api/automation', automationRoutes);
    this.app.use('/api/monday', mondayRoutes);
    this.app.use('/webhook', webhookRoutes);

    // Manter compatibilidade com rotas antigas
    this.app.use('/automatizar', automationRoutes);
    this.app.use('/test-monday', mondayRoutes);
    this.app.use('/produto', mondayRoutes);
  }

  /**
   * Configura tratamento de erros
   */
  setupErrorHandling() {
    // Handler para rotas não encontradas
    this.app.use(notFoundHandler);

    // Handler global de erros
    this.app.use(errorHandler);
  }

  /**
   * Inicializa a aplicação
   * Executa verificações e configurações necessárias
   */
  async initialize() {
    try {
      // Verificar variáveis de ambiente obrigatórias
      const requiredEnvVars = ['MONDAY_API_TOKEN', 'MONDAY_BOARD_ID'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missingVars.join(', ')}`);
      }
      
      // Verificar se os diretórios necessários existem
      const fs = require('fs-extra');
      const path = require('path');
      
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.ensureDir(logsDir);
      
      console.log('✅ Aplicação inicializada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização:', error.message);
      throw error;
    }
  }
  
  /**
   * Cleanup da aplicação
   * Executa limpeza de recursos antes do shutdown
   */
  async cleanup() {
    try {
      console.log('🧹 Executando cleanup da aplicação...');
      
      // Aqui você pode adicionar limpeza de:
      // - Conexões de banco de dados
      // - Cache
      // - Timers/Intervals
      // - Arquivos temporários
      
      console.log('✅ Cleanup executado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro no cleanup:', error.message);
      throw error;
    }
  }
  
  /**
   * Retorna a instância do Express
   */
  getApp() {
    return this.app;
  }

  /**
   * Inicia o servidor
   */
  start() {
    const port = process.env.PORT || 3000;
    const environment = process.env.NODE_ENV || 'development';
    
    this.app.listen(port, () => {
      console.log('🚀 ===================================');
      console.log('🚀 Monday API Automation v2.0');
      console.log('🚀 ===================================');
      console.log(`🌐 Servidor: http://localhost:${port}`);
      console.log(`📚 Docs: http://localhost:${port}/api-docs`);
      console.log(`🔧 Ambiente: ${environment}`);
      console.log(`👨‍💻 Desenvolvido por: Nathan Silva - Fagron Tech`);
      console.log('🚀 ===================================');
      console.log('📋 Rotas disponíveis:');
      console.log('   📚 GET  /api-docs - Documentação Swagger');
      console.log('   ❤️  GET  /health - Health check');
      console.log('   ⚙️  GET  /config - Configurações');
      console.log('   🔄 POST /api/automation - Automação principal');
      console.log('   🔗 GET  /api/monday/* - Endpoints Monday.com');
      console.log('   📥 POST /webhook/* - Webhooks');
      console.log('🚀 ===================================');
      console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);
    });
  }
}

module.exports = App;