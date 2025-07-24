require('dotenv').config({ path: '.env.production' });
const { logger, logErro, logSucesso } = require('./logs/logger');
const MondayClient = require('./monday/mondayClient');
const config = require('./config/config');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

/**
 * Script de deploy para produção
 * Configura o ambiente de produção e inicia o servidor webhook
 */

// Configuração da API para receber notificações do Monday.com
app.use(express.json());

// Middleware de logging para produção
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Endpoint principal do webhook
app.post('/webhook/monday', async (req, res) => {
  try {
    const { event } = req.body;
    
    logger.info(`Webhook recebido - Tipo: ${event?.type}, Item ID: ${event?.pulseId}`, {
      event: event,
      headers: req.headers
    });
    
    // Verifica se é um evento de criação de item
    if (event && event.type === 'create_pulse') {
      const itemId = event.pulseId;
      logger.info(`Novo item criado: ${itemId} - Aguardando 15 segundos para processamento`);
      
      // Aguarda 15 segundos para que todos os campos sejam preenchidos
      setTimeout(async () => {
        try {
          await processarNovoItem(itemId);
        } catch (error) {
          logErro('Processamento de novo item', error, { itemId });
        }
      }, 15000);
    }
    
    // Verifica se é um evento de atualização de coluna e se a coluna é 'produto'
    if (event && event.type === 'change_column_value' && event.columnId === 'produto') {
      const itemId = event.pulseId;
      logger.info(`Recebida notificação de atualização do produto para o item ${itemId}`);
      
      // Processa o item atualizado
      await processarItemAtualizado(itemId);
    }
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logErro('Webhook Monday', error, { body: req.body });
    res.status(500).json({ 
      status: 'error', 
      message: 'Erro ao processar webhook',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version
  });
});

// Endpoint para verificar status do webhook
app.get('/webhook/status', (req, res) => {
  res.status(200).json({
    status: 'ativo',
    environment: 'production',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook/monday',
      health: '/health',
      status: '/webhook/status'
    },
    config: {
      boardId: config.monday.boardId,
      port: PORT
    }
  });
});

// Endpoint para teste manual (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.post('/test-item/:itemId', async (req, res) => {
    try {
      const { itemId } = req.params;
      logger.info(`Teste manual solicitado para item ${itemId}`);
      
      await processarNovoItem(itemId);
      
      res.status(200).json({ 
        sucesso: true, 
        mensagem: `Item ${itemId} processado com sucesso` 
      });
    } catch (error) {
      logErro('Teste manual de item', error);
      res.status(500).json({ 
        sucesso: false, 
        erro: error.message 
      });
    }
  });
}

/**
 * Processa um novo item criado no Monday.com
 */
async function processarNovoItem(itemId) {
  try {
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Busca os detalhes do item
    const item = await mondayClient.buscarItemPorId(itemId);
    
    logger.info(`Verificando novo item ${itemId}: Produto="${item?.produto}", Principal Produto="${item?.principalProduto}", Status="${item?.status}"`);
    
    // Verifica se o item tem produto BOT ou se ainda não foi preenchido
    if (item && (item.produto === 'BOT' || !item.produto)) {
      // Se o produto ainda não foi definido, agenda uma nova verificação em 30 segundos
      if (!item.produto) {
        logger.info(`Item ${itemId} ainda não tem produto definido. Reagendando verificação em 30 segundos.`);
        setTimeout(async () => {
          try {
            await processarNovoItem(itemId);
          } catch (error) {
            logErro('Reprocessamento de novo item', error, { itemId });
          }
        }, 30000);
        return;
      }
      
      // Se o produto é BOT, processa imediatamente
      if (item.produto === 'BOT') {
        logger.info(`Novo item ${itemId} com produto BOT detectado`);
        
        // Aguarda 10 segundos adicionais para garantir que todos os campos estejam preenchidos
        logger.info('Aguardando 10 segundos adicionais para garantir preenchimento completo...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await processarFarmaciaBOT(item, mondayClient);
      }
    } else {
      logger.info(`Item ${itemId} não é BOT (produto: "${item?.produto}"). Ignorando.`);
    }
  } catch (error) {
    logErro('Processamento de novo item', error, { itemId });
  }
}

/**
 * Processa um item específico que teve o produto BOT atualizado
 */
async function processarItemAtualizado(itemId) {
  try {
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Busca os detalhes do item
    const item = await mondayClient.buscarItemPorId(itemId);
    
    if (item && item.produto === 'BOT') {
      logger.info(`Processando item ${itemId} com produto BOT`);
      
      // Aguarda 10 segundos após detectar o produto BOT
      logger.info('Aguardando 10 segundos após o preenchimento do produto "BOT"...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      logger.info('Continuando o processamento após o atraso de 10 segundos');
      
      await processarFarmaciaBOT(item, mondayClient);
    }
  } catch (error) {
    logErro('Processamento de item atualizado', error, { itemId });
  }
}

/**
 * Processa uma farmácia com produto BOT
 * @param {Object} farmacia - Objeto com informações da farmácia
 * @param {MondayClient} mondayClient - Cliente do Monday.com
 */
async function processarFarmaciaBOT(farmacia, mondayClient) {
  try {
    // Verifica se o principal produto é Fórmula Certa ou Phusion
    if (!farmacia.principalProduto || 
        (farmacia.principalProduto !== 'Fórmula Certa' && farmacia.principalProduto !== 'Phusion')) {
      logger.info(`Farmácia ${farmacia.id} não tem produto principal válido: ${farmacia.principalProduto}`);
      return;
    }
    
    // Verifica se o status é "Na Fila"
    if (!farmacia.status || farmacia.status !== 'Na Fila') {
      logger.info(`Farmácia ${farmacia.id} não está com status "Na Fila": ${farmacia.status}`);
      return;
    }
    
    logger.info(`Processando farmácia BOT: ${farmacia.elemento} (ID: ${farmacia.id}) - Produto principal: ${farmacia.principalProduto}`);
    
    // Em produção, não criamos pastas físicas, apenas atualizamos o Monday.com
    if (process.env.NODE_ENV === 'production') {
      logger.info('Ambiente de produção: Apenas atualizando Monday.com, sem criar pastas físicas');
    }
    
    // Extrai o código do cliente - prioriza campo específico, depois nome, depois ID
    let codigoCliente = farmacia.campos?.codigoCliente;
    
    if (!codigoCliente) {
      // Tenta extrair do nome usando regex (formato: "1234 - Nome da Farmácia")
      const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
      codigoCliente = nomeMatch ? nomeMatch[1] : farmacia.id;
    }
    
    // Determina o responsável com base no produto principal
    const emailResponsavel = config.obterResponsavel(farmacia.principalProduto);
    if (!emailResponsavel) {
      throw new Error(`Não foi possível determinar o responsável para o produto ${farmacia.principalProduto}`);
    }
    
    // Atualiza o item no Monday.com
    await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavel);
    
    // Adiciona observação
    const observacao = process.env.NODE_ENV === 'production' 
      ? "🤖 Item processado automaticamente via webhook em produção."
      : "🗂️ Pasta criada automaticamente e modelo de fluxo copiado com base no status 'Na Fila'.";
    await mondayClient.adicionarObservacao(farmacia.id, observacao);
    
    // Atualiza o status para "Em andamento"
    await mondayClient.atualizarStatus(farmacia.id, "Em andamento");
    
    logSucesso({ 
      operacao: 'Processamento de farmácia BOT', 
      resultado: `Farmácia ${farmacia.elemento} (ID: ${farmacia.id}) processada com sucesso em produção`,
      codigoCliente,
      responsavel: emailResponsavel
    });
    
  } catch (error) {
    logErro('Processamento de farmácia BOT', error, { farmacia: `${farmacia.elemento} (ID: ${farmacia.id})` });
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logErro('Erro não capturado', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logErro('Promise rejeitada não tratada', reason, { promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM. Encerrando servidor graciosamente...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});

// Inicia o servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor de produção iniciado na porta ${PORT}`);
  logger.info(`🌐 Webhook Monday.com: http://0.0.0.0:${PORT}/webhook/monday`);
  logger.info(`❤️  Health check: http://0.0.0.0:${PORT}/health`);
  logger.info(`📊 Status do webhook: http://0.0.0.0:${PORT}/webhook/status`);
  logger.info(`🏭 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Testa a conexão com Monday.com na inicialização
  setTimeout(async () => {
    try {
      const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
      const conexaoOk = await mondayClient.testarConexao();
      if (conexaoOk) {
        logSucesso({ operacao: 'Inicialização', resultado: 'Conexão com Monday.com estabelecida com sucesso' });
      } else {
        logErro('Inicialização', new Error('Falha na conexão com Monday.com'));
      }
    } catch (error) {
      logErro('Teste de conexão inicial', error);
    }
  }, 2000);
});

module.exports = app;