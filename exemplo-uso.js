/**
 * Exemplo de uso da Monday API Automation
 * Este arquivo demonstra como usar a API para automatizar a criação de pastas
 */

const axios = require('axios');

// Configuração da API
const API_BASE_URL = 'http://localhost:3000';

/**
 * Exemplo de uso da automação principal
 */
async function exemploAutomacao() {
  try {
    console.log('🚀 Testando automação principal...');
    
    const dadosCliente = {
      id_cliente: 12345,
      nome_farmacia: "Farmácia Exemplo Teste"
    };
    
    const response = await axios.post(`${API_BASE_URL}/automatizar`, dadosCliente);
    
    console.log('✅ Automação executada com sucesso!');
    console.log('📋 Resultado:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro na automação:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo de teste de conexão com Monday.com
 */
async function testarConexaoMonday() {
  try {
    console.log('🔗 Testando conexão com Monday.com...');
    
    const response = await axios.get(`${API_BASE_URL}/test-monday`);
    
    if (response.data.monday_conectado) {
      console.log('✅ Conexão com Monday.com OK!');
    } else {
      console.log('❌ Falha na conexão com Monday.com');
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo de consulta de produto por ID
 */
async function consultarProduto(idCliente) {
  try {
    console.log(`🔍 Consultando produto para cliente ${idCliente}...`);
    
    const response = await axios.get(`${API_BASE_URL}/produto/${idCliente}`);
    
    console.log('✅ Produto encontrado!');
    console.log('📦 Dados:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao consultar produto:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo de verificação de health da API
 */
async function verificarHealth() {
  try {
    console.log('🏥 Verificando health da API...');
    
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    console.log('✅ API está funcionando!');
    console.log('📊 Status:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ API não está respondendo:', error.message);
    throw error;
  }
}

/**
 * Exemplo de obtenção de configurações
 */
async function obterConfiguracoes() {
  try {
    console.log('⚙️ Obtendo configurações da API...');
    
    const response = await axios.get(`${API_BASE_URL}/config`);
    
    console.log('✅ Configurações obtidas!');
    console.log('🔧 Config:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao obter configurações:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Execução de exemplo completo
 */
async function exemploCompleto() {
  console.log('🎯 Iniciando exemplo completo da Monday API Automation\n');
  
  try {
    // 1. Verificar se a API está funcionando
    await verificarHealth();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. Obter configurações
    await obterConfiguracoes();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. Testar conexão com Monday
    await testarConexaoMonday();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. Consultar produto (exemplo)
    try {
      await consultarProduto(12345);
    } catch (error) {
      console.log('ℹ️ Produto não encontrado (normal se não existir no Monday)');
    }
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. Executar automação principal (comentado para evitar criação desnecessária)
    console.log('ℹ️ Automação principal comentada para evitar criação desnecessária de pastas');
    console.log('ℹ️ Descomente a linha abaixo para testar:');
    console.log('// await exemploAutomacao();');
    
    console.log('\n🎉 Exemplo completo executado com sucesso!');
    
  } catch (error) {
    console.error('\n💥 Erro no exemplo completo:', error.message);
  }
}

/**
 * Função para testar diferentes cenários de erro
 */
async function testarCenariosErro() {
  console.log('🧪 Testando cenários de erro...');
  
  // Teste 1: Dados inválidos
  try {
    await axios.post(`${API_BASE_URL}/automatizar`, {
      id_cliente: 'invalid',
      nome_farmacia: ''
    });
  } catch (error) {
    console.log('✅ Erro de dados inválidos capturado:', error.response?.data?.codigo);
  }
  
  // Teste 2: Rota inexistente
  try {
    await axios.get(`${API_BASE_URL}/rota-inexistente`);
  } catch (error) {
    console.log('✅ Erro de rota não encontrada capturado:', error.response?.data?.codigo);
  }
  
  console.log('🧪 Testes de erro concluídos!');
}

// Execução principal
if (require.main === module) {
  exemploCompleto()
    .then(() => {
      console.log('\n🏁 Execução finalizada!');
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error.message);
      process.exit(1);
    });
}

// Exporta as funções para uso em outros arquivos
module.exports = {
  exemploAutomacao,
  testarConexaoMonday,
  consultarProduto,
  verificarHealth,
  obterConfiguracoes,
  exemploCompleto,
  testarCenariosErro
};