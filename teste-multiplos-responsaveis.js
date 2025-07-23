const MondayClient = require('./monday/mondayClient');
const config = require('./config/config');
const { logSucesso, logErro } = require('./logs/logger');

/**
 * Teste para verificar a atribuição de múltiplos responsáveis
 */
async function testeMultiplosResponsaveis() {
  try {
    console.log('🔄 Iniciando teste de múltiplos responsáveis...');
    
    // Inicializa o cliente Monday
    const mondayClient = new MondayClient();
    
    // Testa a conexão
    console.log('🔗 Testando conexão com Monday.com...');
    await mondayClient.testarConexao();
    console.log('✅ Conexão com Monday.com estabelecida');
    
    // Busca farmácias BOT para teste
    console.log('🔍 Buscando farmácias BOT...');
    const farmacias = await mondayClient.buscarFarmaciasBOT();
    console.log(`📋 Encontradas ${farmacias.length} farmácias BOT`);
    
    if (farmacias.length === 0) {
      console.log('⚠️ Nenhuma farmácia BOT encontrada para teste');
      return;
    }
    
    // Para teste, usa qualquer farmácia BOT disponível
    const farmaciasTeste = farmacias.filter(f => 
      f.principalProduto === 'Fórmula Certa' || f.principalProduto === 'Phusion' || f.principalProduto === 'BOT'
    );
    
    console.log(`🎯 Encontradas ${farmaciasTeste.length} farmácias BOT para teste`);
    
    if (farmaciasTeste.length === 0) {
      console.log('⚠️ Nenhuma farmácia BOT encontrada para teste');
      return;
    }
    
    // Testa com a primeira farmácia
    const farmacia = farmaciasTeste[0];
    console.log(`\n🧪 Testando com farmácia: ${farmacia.elemento} (ID: ${farmacia.id})`);
    console.log(`📦 Produto principal: ${farmacia.principalProduto}`);
    
    // Obtém os responsáveis (agora deve ser um array)
    const responsaveis = config.obterResponsavel(farmacia.principalProduto);
    console.log(`👥 Responsáveis configurados:`, responsaveis);
    
    // Testa a atribuição de múltiplos responsáveis
    console.log('\n🔄 Testando atribuição de múltiplos responsáveis...');
    await mondayClient.atribuirResponsavel(farmacia.id, responsaveis);
    console.log('✅ Múltiplos responsáveis atribuídos com sucesso!');
    
    console.log('\n🎉 Teste de múltiplos responsáveis concluído com sucesso!');
    console.log('\n📝 Resumo do teste:');
    console.log(`   - Farmácia testada: ${farmacia.elemento}`);
    console.log(`   - Produto: ${farmacia.principalProduto}`);
    console.log(`   - Responsáveis atribuídos: ${Array.isArray(responsaveis) ? responsaveis.join(', ') : responsaveis}`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    logErro('Teste múltiplos responsáveis', error);
    process.exit(1);
  }
}

// Executa o teste
testeMultiplosResponsaveis();