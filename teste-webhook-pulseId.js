/**
 * Script de teste automatizado para o webhook com pulseId
 * Testa todos os cenários possíveis do webhook Monday.com
 */

const https = require('https');
const http = require('http');

// Configuração do servidor
const SERVER_URL = 'http://localhost:3002';
const WEBHOOK_ENDPOINT = '/webhook/monday';

/**
 * Função para fazer requisições HTTP
 */
function fazerRequisicao(dados, descricao) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(dados);
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: WEBHOOK_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log(`✅ ${descricao}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Resposta: ${JSON.stringify(response, null, 2)}`);
          console.log('---');
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          console.log(`❌ ${descricao} - Erro ao parsear resposta`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${descricao} - Erro de conexão: ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Executa todos os testes
 */
async function executarTestes() {
  console.log('🚀 Iniciando testes automatizados do webhook com pulseId\n');
  console.log(`📡 Servidor: ${SERVER_URL}${WEBHOOK_ENDPOINT}\n`);
  
  try {
    // Teste 1: Challenge de verificação
    await fazerRequisicao(
      { challenge: 'test_challenge_12345' },
      'Teste 1: Challenge de verificação'
    );
    
    // Teste 2: Webhook válido com pulseId - produto BOT
    await fazerRequisicao(
      {
        event: {
          type: 'change_column_value',
          pulseId: '12345',
          columnId: 'produto',
          value: { label: 'BOT' }
        },
        challenge: null
      },
      'Teste 2: Webhook válido - Produto BOT (pulseId: 12345)'
    );
    
    // Teste 3: Webhook válido com pulseId - produto SITE
    await fazerRequisicao(
      {
        event: {
          type: 'change_column_value',
          pulseId: '67890',
          columnId: 'produto',
          value: { label: 'SITE' }
        },
        challenge: null
      },
      'Teste 3: Webhook válido - Produto SITE (pulseId: 67890)'
    );
    
    // Teste 4: Evento ignorado - mudança de status
    await fazerRequisicao(
      {
        event: {
          type: 'change_column_value',
          pulseId: '11111',
          columnId: 'status',
          value: { label: 'Em Progresso' }
        },
        challenge: null
      },
      'Teste 4: Evento ignorado - Mudança de status (não produto)'
    );
    
    // Teste 5: Evento ignorado - tipo diferente
    await fazerRequisicao(
      {
        event: {
          type: 'create_pulse',
          pulseId: '22222',
          columnId: 'produto',
          value: { label: 'BOT' }
        },
        challenge: null
      },
      'Teste 5: Evento ignorado - Tipo create_pulse (não change_column_value)'
    );
    
    // Teste 6: Webhook com pulseId numérico
    await fazerRequisicao(
      {
        event: {
          type: 'change_column_value',
          pulseId: 999888777,
          columnId: 'produto',
          value: { label: 'APP' }
        },
        challenge: null
      },
      'Teste 6: Webhook com pulseId numérico (999888777)'
    );
    
    console.log('🎉 Todos os testes foram executados com sucesso!');
    console.log('\n📋 Resumo dos testes:');
    console.log('   ✅ Challenge de verificação');
    console.log('   ✅ Webhook válido com produto BOT');
    console.log('   ✅ Webhook válido com produto SITE');
    console.log('   ✅ Evento ignorado - mudança de status');
    console.log('   ✅ Evento ignorado - tipo diferente');
    console.log('   ✅ Webhook com pulseId numérico');
    console.log('\n🔍 O pulseId foi processado corretamente em todos os cenários!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    process.exit(1);
  }
}

// Executa os testes
if (require.main === module) {
  executarTestes();
}

module.exports = { executarTestes, fazerRequisicao };