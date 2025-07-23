require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const config = require('./config/config');
const { logger } = require('./logs/logger');

/**
 * Script de teste para verificar se o sistema está funcionando corretamente
 * com a mudança de status para "Configuração" após criar a pasta
 */
async function testarSistemaConfiguracao() {
  try {
    logger.info('=== TESTE DO SISTEMA COM STATUS CONFIGURAÇÃO ===');
    
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Testa a conexão
    logger.info('Testando conexão com Monday.com...');
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('Falha na conexão com Monday.com');
    }
    logger.info('✅ Conexão com Monday.com OK');
    
    // Busca farmácias BOT
    logger.info('Buscando farmácias BOT...');
    const farmaciasBOT = await mondayClient.buscarFarmaciasBOT();
    logger.info(`📋 Encontradas ${farmaciasBOT.length} farmácias BOT`);
    
    if (farmaciasBOT.length === 0) {
      logger.info('⚠️ Nenhuma farmácia BOT encontrada para teste');
      return;
    }
    
    // Filtra farmácias com status "Na Fila"
    const farmaciasFila = farmaciasBOT.filter(f => 
      f.statusOriginal === 'Na Fila' || f.statusNormalizado === 'na fila'
    );
    
    logger.info(`🔍 Farmácias com status "Na Fila": ${farmaciasFila.length}`);
    
    // Verifica se "Configuração" está nos status válidos
    logger.info('\n=== VERIFICAÇÃO DE CONFIGURAÇÃO ===');
    logger.info(`Status válidos: ${config.statusValidos.join(', ')}`);
    
    const configuracaoValido = config.isStatusValido('Configuração');
    logger.info(`✅ Status "Configuração" é válido: ${configuracaoValido}`);
    
    // Testa normalização de status
    const statusNormalizado = config.normalizarStatus('Configuração');
    logger.info(`✅ Status "Configuração" normalizado: "${statusNormalizado}"`);
    
    // Mostra detalhes das farmácias que seriam processadas
    logger.info('\n=== FARMÁCIAS QUE SERIAM PROCESSADAS ===');
    
    for (const farmacia of farmaciasFila) {
      if (farmacia.principalProduto === 'Fórmula Certa' || farmacia.principalProduto === 'Phusion') {
        logger.info(`\n📋 Farmácia: ${farmacia.elemento}`);
        logger.info(`   - ID Monday: ${farmacia.id}`);
        logger.info(`   - Status atual: ${farmacia.statusOriginal}`);
        logger.info(`   - Produto principal: ${farmacia.principalProduto}`);
        
        // Simula extração do código do cliente
        let codigoCliente = farmacia.campos?.codigoCliente;
        let metodoExtracao = 'Campo específico';
        
        if (!codigoCliente) {
          const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
          if (nomeMatch) {
            codigoCliente = nomeMatch[1];
            metodoExtracao = 'Nome do item';
          } else {
            codigoCliente = farmacia.id;
            metodoExtracao = 'ID Monday';
          }
        }
        
        logger.info(`   - Código do cliente: ${codigoCliente} (${metodoExtracao})`);
        logger.info(`   - Caminho da pasta: ${config.gerarCaminhoPasta(farmacia.principalProduto, codigoCliente)}`);
        logger.info(`   - Responsável: ${config.obterResponsavel(farmacia.principalProduto)}`);
        logger.info(`   - ✅ Seria processada e status mudaria para: "Configuração"`);
      }
    }
    
    logger.info('\n=== TESTE DE WEBHOOK ===');
    logger.info('Para testar o webhook:');
    logger.info('1. Crie um novo item no Monday.com');
    logger.info('2. Defina o produto como "BOT"');
    logger.info('3. Defina o produto principal como "Fórmula Certa" ou "Phusion"');
    logger.info('4. Defina o status como "Na Fila"');
    logger.info('5. O sistema deve automaticamente:');
    logger.info('   - Criar a pasta');
    logger.info('   - Copiar o modelo');
    logger.info('   - Atribuir responsável');
    logger.info('   - Adicionar observação');
    logger.info('   - Mudar status para "Configuração"');
    
    logger.info('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    logger.error('❌ Erro no teste:', error.message);
    console.error(error);
  }
}

// Executa o teste
testarSistemaConfiguracao();