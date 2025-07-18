const winston = require('winston');
const path = require('path');

/**
 * Configuração do sistema de logs usando Winston
 * Registra todas as etapas da automação com diferentes níveis de log
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'monday-api-automation' },
  transports: [
    // Log de erros em arquivo separado
    new winston.transports.File({ 
      filename: path.join(__dirname, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Log geral combinado
    new winston.transports.File({ 
      filename: path.join(__dirname, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Log no console para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Métodos auxiliares para logging específico da aplicação
 */
const loggerHelper = {
  /**
   * Log de início de processamento
   * @param {number} idCliente - ID do cliente
   * @param {string} nomeFarmacia - Nome da farmácia
   */
  logInicioProcessamento(idCliente, nomeFarmacia) {
    logger.info('Iniciando processamento', {
      idCliente,
      nomeFarmacia,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de consulta ao Monday
   * @param {number} idCliente - ID do cliente
   * @param {string} produto - Produto encontrado
   */
  logConsultaMonday(idCliente, produto) {
    logger.info('Consulta ao Monday realizada', {
      idCliente,
      produto,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de criação de pasta
   * @param {string} caminhoPasta - Caminho da pasta criada
   * @param {string} produto - Produto relacionado
   */
  logCriacaoPasta(caminhoPasta, produto) {
    logger.info('Pasta criada com sucesso', {
      caminhoPasta,
      produto,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de cópia de arquivo
   * @param {string} origem - Caminho de origem
   * @param {string} destino - Caminho de destino
   */
  logCopiaArquivo(origem, destino) {
    logger.info('Arquivo copiado com sucesso', {
      origem,
      destino,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de sucesso completo
   * @param {object} resultado - Resultado final da operação
   */
  logSucesso(resultado) {
    logger.info('Processamento concluído com sucesso', {
      resultado,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de erro
   * @param {string} operacao - Operação que falhou
   * @param {Error} erro - Objeto de erro
   * @param {object} contexto - Contexto adicional
   */
  logErro(operacao, erro, contexto = {}) {
    logger.error('Erro durante processamento', {
      operacao,
      erro: erro.message,
      stack: erro.stack,
      contexto,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de validação
   * @param {string} tipo - Tipo de validação
   * @param {boolean} sucesso - Se a validação passou
   * @param {object} dados - Dados validados
   */
  logValidacao(tipo, sucesso, dados) {
    const nivel = sucesso ? 'info' : 'warn';
    logger[nivel]('Validação realizada', {
      tipo,
      sucesso,
      dados,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logger,
  ...loggerHelper
};