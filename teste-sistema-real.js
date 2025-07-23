const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const config = require('./config/config');
const { logger, logErro, logSucesso, logConsultaMonday } = require('./logs/logger');

/**
 * Script para testar o sistema com dados reais do Monday.com
 * Verifica se os IDs estão sendo processados corretamente
 */
async function testarSistemaReal() {
  try {
    logger.info('=== TESTE DO SISTEMA COM DADOS REAIS ===');
    
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Testa a conexão
    logger.info('Testando conexão com Monday.com...');
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('Falha na conexão com Monday.com');
    }
    
    // Busca todas as farmácias BOT
    logger.info('Buscando farmácias BOT...');
    const farmaciasBOT = await mondayClient.buscarFarmaciasBOT();
    logger.info(`Encontradas ${farmaciasBOT.length} farmácias BOT`);
    
    // Mostra detalhes de cada farmácia encontrada
    farmaciasBOT.forEach((farmacia, index) => {
      logger.info(`\n--- Farmácia ${index + 1} ---`);
      logger.info(`ID: ${farmacia.id}`);
      logger.info(`Nome: ${farmacia.elemento}`);
      logger.info(`Produto: ${farmacia.produto}`);
      logger.info(`Principal Produto: ${farmacia.principalProduto}`);
      logger.info(`Status Original: ${farmacia.statusOriginal}`);
      logger.info(`Status Normalizado: ${farmacia.statusNormalizado}`);
      logger.info(`Campos extras:`, farmacia.campos);
      
      // Verifica se seria processada pelo sistema
      const seriaProcessada = (
        (farmacia.statusOriginal === 'Na Fila' || farmacia.statusNormalizado === 'na fila') && 
        (farmacia.principalProduto === 'Fórmula Certa' || farmacia.principalProduto === 'Phusion')
      );
      
      logger.info(`Seria processada pelo sistema: ${seriaProcessada ? 'SIM' : 'NÃO'}`);
      
      if (seriaProcessada) {
        const codigoCliente = farmacia.campos?.codigoCliente || farmacia.id;
        logger.info(`Código do cliente que seria usado: ${codigoCliente}`);
        
        // Gera o caminho que seria criado
        try {
          const caminho = config.gerarCaminhoPasta(farmacia.principalProduto, codigoCliente);
          logger.info(`Caminho que seria criado: ${caminho}`);
        } catch (error) {
          logger.error(`Erro ao gerar caminho: ${error.message}`);
        }
      }
    });
    
    // Filtra farmácias que seriam processadas
    const farmaciasFiltradas = farmaciasBOT.filter(farmacia => {
      return (
        (farmacia.statusOriginal === 'Na Fila' || farmacia.statusNormalizado === 'na fila') && 
        (farmacia.principalProduto === 'Fórmula Certa' || farmacia.principalProduto === 'Phusion')
      );
    });
    
    logger.info(`\n=== RESUMO ===`);
    logger.info(`Total de farmácias BOT: ${farmaciasBOT.length}`);
    logger.info(`Farmácias que seriam processadas: ${farmaciasFiltradas.length}`);
    
    if (farmaciasFiltradas.length > 0) {
      logger.info('\n=== FARMÁCIAS QUE SERIAM PROCESSADAS ===');
      farmaciasFiltradas.forEach((farmacia, index) => {
        const codigoCliente = farmacia.campos?.codigoCliente || farmacia.id;
        logger.info(`${index + 1}. ${farmacia.elemento} (ID: ${farmacia.id}) - Código: ${codigoCliente}`);
      });
    }
    
    // Análise dos códigos de cliente extraídos
     logger.info(`\n=== ANÁLISE DOS CÓDIGOS DE CLIENTE ===`);
     farmaciasBOT.forEach((farmacia, index) => {
       // Simula a lógica atualizada do sistema
       let codigoClienteAtualizado = farmacia.campos?.codigoCliente;
       
       if (!codigoClienteAtualizado) {
         const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
         codigoClienteAtualizado = nomeMatch ? nomeMatch[1] : farmacia.id;
       }
       
       const codigoClienteAntigo = farmacia.campos?.codigoCliente || farmacia.id;
       const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
       const codigoDoNome = nomeMatch ? nomeMatch[1] : null;
       
       logger.info(`Farmácia ${index + 1}: ${farmacia.elemento}`);
       logger.info(`  - ID do Monday: ${farmacia.id}`);
       logger.info(`  - Código extraído do nome: ${codigoDoNome || 'Não encontrado'}`);
       logger.info(`  - Código usado ANTES da correção: ${codigoClienteAntigo}`);
       logger.info(`  - Código usado APÓS a correção: ${codigoClienteAtualizado}`);
       logger.info(`  - Método de extração: ${farmacia.campos?.codigoCliente ? 'Campo codigoCliente' : (codigoDoNome ? 'Nome do item' : 'ID do Monday')}`);
       logger.info(`  - Correção aplicada: ${codigoClienteAntigo !== codigoClienteAtualizado ? 'SIM' : 'NÃO'}`);
     });
    
    logger.info('\n=== TESTE CONCLUÍDO COM SUCESSO ===');
    
  } catch (error) {
    logErro('Teste do sistema real', error);
  }
}

// Executa o teste
testarSistemaReal().catch(error => {
  logErro('Execução do teste', error);
  process.exit(1);
});