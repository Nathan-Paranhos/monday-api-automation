const { logger } = require('../../logs/logger');
const { AppError, asyncErrorHandler } = require('../middlewares/errorHandler');
const config = require('../../config/config');

/**
 * Controlador para configurações da aplicação
 * Gerencia obtenção e atualização de configurações
 */
class ConfigController {
  constructor() {
    this.sensitiveKeys = [
      'MONDAY_API_TOKEN',
      'DATABASE_PASSWORD',
      'JWT_SECRET',
      'API_KEY',
      'SECRET'
    ];
  }

  /**
   * Obtém configurações públicas da aplicação
   * GET /config
   */
  getPublicConfig = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Configurações públicas solicitadas', { requestId });

    const publicConfig = {
      application: {
        name: 'Monday API Automation',
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        author: 'Nathan Silva - Fagron Tech'
      },
      api: {
        version: 'v2.0',
        baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
        documentation: '/api-docs',
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutos
          max: 100 // requests por IP
        }
      },
      features: {
        automation: true,
        webhooks: true,
        fileManagement: true,
        monitoring: true,
        swagger: true
      },
      monday: {
        boardId: process.env.MONDAY_BOARD_ID || 'não configurado',
        workspaceId: process.env.MONDAY_WORKSPACE_ID || 'não configurado',
        apiVersion: '2023-10'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        destination: 'file'
      },
      cors: {
        enabled: true,
        origins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
      },
      security: {
        helmet: true,
        rateLimit: true,
        compression: true
      }
    };

    res.status(200).json({
      status: 'sucesso',
      dados: publicConfig,
      requestId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtém configurações detalhadas (apenas em desenvolvimento)
   * GET /config/detailed
   */
  getDetailedConfig = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;
    const environment = process.env.NODE_ENV || 'development';

    logger.info('Configurações detalhadas solicitadas', { requestId, environment });

    // Apenas permitir em desenvolvimento
    if (environment === 'production') {
      throw new AppError(
        'Configurações detalhadas não disponíveis em produção',
        403,
        'FORBIDDEN_IN_PRODUCTION'
      );
    }

    const detailedConfig = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        BASE_URL: process.env.BASE_URL
      },
      monday: {
        API_TOKEN: this.maskSensitiveValue(process.env.MONDAY_API_TOKEN),
        BOARD_ID: process.env.MONDAY_BOARD_ID,
        WORKSPACE_ID: process.env.MONDAY_WORKSPACE_ID
      },
      logging: {
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FILE: process.env.LOG_FILE
      },
      security: {
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX
      },
      paths: {
        PASTA_RAIZ: process.env.PASTA_RAIZ,
        PASTA_LOGS: process.env.PASTA_LOGS
      }
    };

    res.status(200).json({
      status: 'sucesso',
      dados: detailedConfig,
      aviso: 'Configurações detalhadas - apenas para desenvolvimento',
      requestId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valida configurações da aplicação
   * GET /config/validate
   */
  validateConfig = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Validação de configurações solicitada', { requestId });

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {
        environment: this.validateEnvironmentVars(),
        monday: this.validateMondayConfig(),
        paths: this.validatePaths(),
        security: this.validateSecurityConfig()
      }
    };

    // Compilar erros e avisos
    Object.values(validation.checks).forEach(check => {
      if (check.errors) {
        validation.errors.push(...check.errors);
      }
      if (check.warnings) {
        validation.warnings.push(...check.warnings);
      }
    });

    validation.valid = validation.errors.length === 0;

    const statusCode = validation.valid ? 200 : 400;

    res.status(statusCode).json({
      status: validation.valid ? 'sucesso' : 'erro',
      dados: validation,
      requestId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtém informações sobre variáveis de ambiente
   * GET /config/env-info
   */
  getEnvInfo = asyncErrorHandler(async (req, res) => {
    const requestId = req.requestId;

    logger.info('Informações de ambiente solicitadas', { requestId });

    const envInfo = {
      defined: [],
      missing: [],
      masked: []
    };

    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'MONDAY_API_TOKEN',
      'MONDAY_BOARD_ID',
      'MONDAY_WORKSPACE_ID'
    ];

    const optionalVars = [
      'BASE_URL',
      'LOG_LEVEL',
      'ALLOWED_ORIGINS',
      'PASTA_RAIZ'
    ];

    // Verificar variáveis obrigatórias
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        if (this.isSensitive(varName)) {
          envInfo.masked.push({
            name: varName,
            value: this.maskSensitiveValue(process.env[varName]),
            required: true
          });
        } else {
          envInfo.defined.push({
            name: varName,
            value: process.env[varName],
            required: true
          });
        }
      } else {
        envInfo.missing.push({
          name: varName,
          required: true
        });
      }
    });

    // Verificar variáveis opcionais
    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        envInfo.defined.push({
          name: varName,
          value: process.env[varName],
          required: false
        });
      }
    });

    res.status(200).json({
      status: 'sucesso',
      dados: envInfo,
      summary: {
        total: envInfo.defined.length + envInfo.missing.length + envInfo.masked.length,
        defined: envInfo.defined.length,
        missing: envInfo.missing.length,
        masked: envInfo.masked.length
      },
      requestId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valida variáveis de ambiente
   */
  validateEnvironmentVars() {
    const errors = [];
    const warnings = [];

    const required = ['MONDAY_API_TOKEN', 'MONDAY_BOARD_ID'];
    const recommended = ['NODE_ENV', 'PORT', 'LOG_LEVEL'];

    required.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Variável obrigatória ${varName} não definida`);
      }
    });

    recommended.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Variável recomendada ${varName} não definida`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Valida configurações do Monday.com
   */
  validateMondayConfig() {
    const errors = [];
    const warnings = [];

    if (!process.env.MONDAY_API_TOKEN) {
      errors.push('Token da API do Monday.com não configurado');
    } else if (process.env.MONDAY_API_TOKEN.length < 10) {
      warnings.push('Token da API do Monday.com parece ser muito curto');
    }

    if (!process.env.MONDAY_BOARD_ID) {
      errors.push('ID do board do Monday.com não configurado');
    }

    return { errors, warnings };
  }

  /**
   * Valida caminhos e diretórios
   */
  validatePaths() {
    const errors = [];
    const warnings = [];

    // Adicionar validações de caminhos conforme necessário
    if (process.env.PASTA_RAIZ && !require('fs').existsSync(process.env.PASTA_RAIZ)) {
      warnings.push('Pasta raiz configurada não existe');
    }

    return { errors, warnings };
  }

  /**
   * Valida configurações de segurança
   */
  validateSecurityConfig() {
    const errors = [];
    const warnings = [];

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*') {
        warnings.push('CORS configurado para aceitar qualquer origem em produção');
      }
    }

    return { errors, warnings };
  }

  /**
   * Verifica se uma chave é sensível
   */
  isSensitive(key) {
    return this.sensitiveKeys.some(sensitive => 
      key.toUpperCase().includes(sensitive.toUpperCase())
    );
  }

  /**
   * Mascara valores sensíveis
   */
  maskSensitiveValue(value) {
    if (!value) return value;
    if (value.length <= 8) return '***';
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }
}

module.exports = ConfigController;