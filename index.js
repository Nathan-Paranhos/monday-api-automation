require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const config = require('./config/config');
const { logger, logErro, logSucesso } = require('./logs/logger');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração da API para receber notificações do Monday.com
app.use(express.json());

app.post('/webhook/monday', async (req, res) => {
  try {
    const { event } = req.body;
    
    logger.info(`Webhook recebido - Tipo: ${event?.type}, Item ID: ${event?.pulseId}`);
    
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
    
    res.status(200).send('Webhook recebido com sucesso');
  } catch (error) {
    logErro('Webhook Monday', error);
    res.status(500).send('Erro ao processar webhook');
  }
});

// Endpoint para testar processamento de item específico
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

// Endpoint para verificar status do webhook
app.get('/webhook/status', (req, res) => {
  res.status(200).json({
    status: 'ativo',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook/monday',
      teste: '/test-item/:itemId'
    }
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  logger.info(`Servidor API iniciado na porta ${PORT}`);
  logger.info(`Webhook Monday.com: http://localhost:${PORT}/webhook/monday`);
  logger.info(`Status do webhook: http://localhost:${PORT}/webhook/status`);
  logger.info(`Teste manual: http://localhost:${PORT}/test-item/:itemId`);
});

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
    
    // Inicializa o gerenciador de arquivos
    const fileManager = new FileManager();
    
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
    
    // Cria a estrutura de pastas e copia o arquivo modelo
    const resultado = await fileManager.processarCliente(farmacia.principalProduto, codigoCliente);
    
    if (resultado.sucesso) {
      // Atualiza o item no Monday.com
      await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavel);
      
      // Adiciona observação
      const observacao = "🗂️ Pasta criada automaticamente e modelo de fluxo copiado com base no status 'Na Fila'.";
      await mondayClient.adicionarObservacao(farmacia.id, observacao);
      
      // Atualiza o status para "Configuração"
      await mondayClient.atualizarStatus(farmacia.id, "Em andamento");
      
      logSucesso({ operacao: 'Processamento de farmácia BOT', resultado: `Farmácia ${farmacia.elemento} (ID: ${farmacia.id}) processada com sucesso` });
    } else {
      logErro('Processamento de farmácia BOT', new Error(resultado.mensagem), { farmacia });
    }
  } catch (error) {
    logErro('Processamento de farmácia BOT', error, { farmacia: `${farmacia.elemento} (ID: ${farmacia.id})` });
  }
}

/**
 * Função principal que executa o processo de criação de pastas e atualização do Monday.com
 */
async function main() {
  try {
    logger.info('Iniciando processamento de clientes BOT');
    
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Testa a conexão com o Monday.com
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('Não foi possível conectar ao Monday.com. Verifique as credenciais.');
    }
    
    // Inicializa o gerenciador de arquivos
    const fileManager = new FileManager();
    
    logger.info('Iniciando processamento de farmácias BOT existentes');
    
    // Busca as farmácias BOT
    const farmaciasBOT = await mondayClient.buscarFarmaciasBOT();
    logger.info(`Encontradas ${farmaciasBOT.length} farmácias BOT`);
    
    // Filtra apenas as farmácias com status "Na Fila" e produto principal "Fórmula Certa" ou "Phusion"
    const farmaciasFiltradas = farmaciasBOT.filter(farmacia => {
      return (
        (farmacia.statusOriginal === 'Na Fila' || farmacia.statusNormalizado === 'na fila') && 
        (farmacia.principalProduto === 'Fórmula Certa' || farmacia.principalProduto === 'Phusion')
      );
    });
    
    logger.info(`Filtradas ${farmaciasFiltradas.length} farmácias com status "Na Fila" e produto principal "Fórmula Certa" ou "Phusion"`);
    
    for (const farmacia of farmaciasFiltradas) {
      try {
        logger.info(`Processando farmácia: ${farmacia.elemento} (ID: ${farmacia.id})`);
        
        let codigoCliente = farmacia.campos?.codigoCliente;
        
        if (!codigoCliente) {
          const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
          codigoCliente = nomeMatch ? nomeMatch[1] : farmacia.id;
        }
        
        const emailResponsavel = config.obterResponsavel(farmacia.principalProduto);
        if (!emailResponsavel) {
          logErro('Processamento de farmácia', new Error(`Não foi possível determinar o responsável para o produto ${farmacia.principalProduto}`), { farmacia });
          continue;
        }
        
        const resultado = await fileManager.processarCliente(farmacia.principalProduto, codigoCliente);
        
        if (resultado.sucesso) {
     
          await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavel);
          
          const observacao = "🗂️ Pasta criada automaticamente e modelo de fluxo copiado com base no status 'Na Fila'. #Teste 2.0 Nathan";
          await mondayClient.adicionarObservacao(farmacia.id, observacao);
          
          await mondayClient.atualizarStatus(farmacia.id, "Em andamento");
          
          logSucesso({ operacao: 'Processamento de farmácia', resultado: `Farmácia ${farmacia.elemento} (ID: ${farmacia.id}) processada com sucesso` });
        } else {
          logErro('Processamento de farmácia', new Error(resultado.mensagem), { farmacia });
        }
      } catch (error) {
        logErro('Processamento de farmácia', error, { farmacia: `${farmacia.elemento} (ID: ${farmacia.id})` });
      }
    }
    
    logger.info('Processamento de clientes BOT concluído com sucesso');
  } catch (error) {
    logErro('Processamento principal', error);
  }
}

// Executa a função principal
main().catch(error => {
  logErro('Execução principal', error);
  process.exit(1);
});