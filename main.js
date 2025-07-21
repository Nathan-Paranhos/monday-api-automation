const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const config = require('./config/config');
const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const { logInicioProcessamento, logSucesso, logErro, logValidacao } = require('./logs/logger');

/**
 * API principal para automação de criação de estrutura de pastas
 * baseada em demandas do Monday.com
 * 
 * Desenvolvido por: Nathan Silva - Fagron Tech
 * Email: nathan.silva@fagrontech.com.br
 * 
 * @author Nathan Silva - Fagron Tech
 * @version 1.0.0
 */
class MondayAutomationAPI {
  constructor() {
    this.app = express();
    this.mondayClient = new MondayClient();
    this.fileManager = new FileManager();
    
    this.configurarMiddlewares();
    this.configurarRotas();
    this.configurarTratamentoErros();
  }

  /**
   * Configura middlewares do Express
   */
  configurarMiddlewares() {
    // Parse JSON
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parse URL encoded
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS básico
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    // Log de requisições
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configura todas as rotas da API
   */
  configurarRotas() {
    // Rota raiz - redireciona para documentação
    this.app.get('/', (req, res) => {
      res.redirect('/api-docs');
    });

    // Documentação Swagger
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Monday API Automation - Documentação',
      customCss: '.swagger-ui .topbar { display: none }',
      customfavIcon: '/favicon.ico'
    }));

    // Rota de health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'monday-api-automation',
        developer: 'Nathan Silva - Fagron Tech'
      });
    });

    // Rota principal de automação
    this.app.post('/automatizar', this.processarAutomacao.bind(this));
    
    // Rota para testar conexão com Monday
    this.app.get('/test-monday', this.testarConexaoMonday.bind(this));
    
    // Rota para consultar produto por ID
    this.app.get('/produto/:id', this.consultarProduto.bind(this));
    
    // Rota para buscar farmácias com produto BOT
    this.app.get('/api/farmacias/bot', this.buscarFarmaciasBOT.bind(this));
    
    // Rota para listar configurações (sem dados sensíveis)
    this.app.get('/config', this.obterConfiguracoes.bind(this));
  }

  /**
   * Processa a automação principal
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async processarAutomacao(req, res) {
    try {
      // Validação dos dados de entrada
      const { id_cliente, nome_farmacia } = req.body;
      
      const validacao = this.validarEntrada(id_cliente, nome_farmacia);
      if (!validacao.valido) {
        logValidacao('Entrada da API', false, { id_cliente, nome_farmacia, erro: validacao.erro });
        return res.status(400).json({
          status: 'erro',
          erro: validacao.erro,
          codigo: 'DADOS_INVALIDOS'
        });
      }

      logInicioProcessamento(id_cliente, nome_farmacia);

      // Etapa 1: Consultar produto no Monday.com
      let produto;
      try {
        produto = await this.mondayClient.consultarProdutoPorCliente(id_cliente);
      } catch (error) {
        // Tenta buscar por nome da farmácia como fallback
        try {
          produto = await this.mondayClient.consultarProdutoPorNome(nome_farmacia);
        } catch (fallbackError) {
          throw new Error(`Não foi possível encontrar o produto. Erro principal: ${error.message}. Erro fallback: ${fallbackError.message}`);
        }
      }

      // Etapa 2: Criar estrutura de pastas e copiar arquivo
      const resultadoArquivos = await this.fileManager.processarCliente(produto, id_cliente);

      // Etapa 3: Obter responsável pelo produto
      const responsavel = config.obterResponsavel(produto);

      // Monta resposta de sucesso
      const resultado = {
        status: 'ok',
        produto: produto,
        pasta: resultadoArquivos.caminhoPasta,
        arquivo_modelo: resultadoArquivos.caminhoArquivo,
        responsavel: responsavel,
        cliente: {
          id: id_cliente,
          nome_farmacia: nome_farmacia
        },
        timestamp: new Date().toISOString()
      };

      logSucesso(resultado);
      
      res.json(resultado);

    } catch (error) {
      logErro('Processamento da automação', error, { body: req.body });
      
      // Determina o código de erro apropriado
      let statusCode = 500;
      let codigoErro = 'ERRO_INTERNO';
      
      if (error.message.includes('não encontrada') || error.message.includes('não encontrado')) {
        statusCode = 404;
        codigoErro = 'DEMANDA_NAO_ENCONTRADA';
      } else if (error.message.includes('inválido')) {
        statusCode = 400;
        codigoErro = 'DADOS_INVALIDOS';
      } else if (error.message.includes('conexão') || error.message.includes('Network')) {
        statusCode = 503;
        codigoErro = 'ERRO_CONEXAO';
      } else if (error.message.includes('permissão') || error.message.includes('EACCES')) {
        statusCode = 403;
        codigoErro = 'ERRO_PERMISSAO';
      }
      
      res.status(statusCode).json({
        status: 'erro',
        erro: error.message,
        codigo: codigoErro,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Testa a conexão com o Monday.com
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async testarConexaoMonday(req, res) {
    try {
      const conexaoOk = await this.mondayClient.testarConexao();
      
      res.json({
        status: conexaoOk ? 'ok' : 'erro',
        monday_conectado: conexaoOk,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'erro',
        monday_conectado: false,
        erro: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Consulta produto por ID do cliente
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async consultarProduto(req, res) {
    try {
      const idCliente = parseInt(req.params.id);
      
      if (!idCliente || idCliente <= 0) {
        return res.status(400).json({
          status: 'erro',
          erro: 'ID do cliente inválido',
          codigo: 'ID_INVALIDO'
        });
      }

      const produto = await this.mondayClient.consultarProdutoPorCliente(idCliente);
      const responsavel = config.obterResponsavel(produto);
      
      res.json({
        status: 'ok',
        id_cliente: idCliente,
        produto: produto,
        responsavel: responsavel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(404).json({
        status: 'erro',
        erro: error.message,
        codigo: 'PRODUTO_NAO_ENCONTRADO',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Busca farmácias com produto BOT
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async buscarFarmaciasBOT(req, res) {
    try {
      const farmaciasBOT = await this.mondayClient.buscarFarmaciasBOT();
      
      res.json({
        status: 'ok',
        total: farmaciasBOT.length,
        farmacias: farmaciasBOT,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logErro('Busca farmácias BOT', error);
      res.status(500).json({
        status: 'erro',
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        detalhes: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Retorna configurações da aplicação (sem dados sensíveis)
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  obterConfiguracoes(req, res) {
    res.json({
      produtos_validos: config.produtosValidos,
      responsaveis: config.responsaveis,
      caminhos_produtos: config.paths.products,
      servidor: {
        porta: config.server.port,
        ambiente: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Valida os dados de entrada da API
   * @param {number} idCliente - ID do cliente
   * @param {string} nomeFarmacia - Nome da farmácia
   * @returns {object} Resultado da validação
   */
  validarEntrada(idCliente, nomeFarmacia) {
    if (!idCliente) {
      return { valido: false, erro: 'Campo "id_cliente" é obrigatório' };
    }
    
    if (typeof idCliente !== 'number' || idCliente <= 0) {
      return { valido: false, erro: 'Campo "id_cliente" deve ser um número positivo' };
    }
    
    if (!nomeFarmacia) {
      return { valido: false, erro: 'Campo "nome_farmacia" é obrigatório' };
    }
    
    if (typeof nomeFarmacia !== 'string' || nomeFarmacia.trim().length === 0) {
      return { valido: false, erro: 'Campo "nome_farmacia" deve ser uma string não vazia' };
    }
    
    return { valido: true };
  }

  /**
   * Configura tratamento global de erros
   */
  configurarTratamentoErros() {
    // Middleware de tratamento de erros
    this.app.use((error, req, res, next) => {
      logErro('Erro não tratado', error, { url: req.url, method: req.method });
      
      res.status(500).json({
        status: 'erro',
        erro: 'Erro interno do servidor',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date().toISOString()
      });
    });

    // Rota 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: 'erro',
        erro: 'Rota não encontrada',
        codigo: 'ROTA_NAO_ENCONTRADA',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Inicia o servidor
   */
  iniciar() {
    const porta = config.server.port;
    
    this.app.listen(porta, () => {
      console.log(`🚀 Servidor Monday API Automation rodando em http://localhost:${porta}`);
      console.log(`👨‍💻 Desenvolvido por: Nathan Silva - Fagron Tech`);
      console.log(`📋 Rotas disponíveis:`);
      console.log(`   📚 GET  /api-docs - Documentação Swagger`);
      console.log(`   🔄 POST /automatizar - Automação principal`);
      console.log(`   ❤️  GET  /health - Health check`);
      console.log(`   🔗 GET  /test-monday - Teste de conexão Monday`);
      console.log(`   🔍 GET  /produto/:id - Consultar produto por ID`);
      console.log(`   ⚙️  GET  /config - Configurações da aplicação`);
      console.log(`⏰ ${new Date().toISOString()}`);
      console.log(`📖 Acesse a documentação em: http://localhost:${porta}/api-docs`);
    });
  }
}

/**
 * Valida se todas as variáveis de ambiente necessárias estão configuradas
 */
function validarVariaveisAmbiente() {
  const variaveisObrigatorias = [
    'MONDAY_API_TOKEN',
    'MONDAY_BOARD_ID'
  ];
  
  const variaveisFaltando = variaveisObrigatorias.filter(variavel => !process.env[variavel]);
  
  if (variaveisFaltando.length > 0) {
    console.error('❌ Erro ao inicializar a aplicação: Variáveis de ambiente obrigatórias não configuradas:');
    variaveisFaltando.forEach(variavel => {
      console.error(`   - ${variavel}`);
    });
    console.error('\n💡 Verifique se as variáveis estão configuradas no arquivo .env ou no ambiente de produção.');
    throw new Error(`Variáveis de ambiente não configuradas: ${variaveisFaltando.join(', ')}`);
  }
  
  console.log('✅ Todas as variáveis de ambiente obrigatórias estão configuradas');
}

// Inicialização da aplicação
if (require.main === module) {
  try {
    // Valida variáveis de ambiente antes de inicializar
    validarVariaveisAmbiente();
    
    const api = new MondayAutomationAPI();
    api.iniciar();
  } catch (error) {
    console.error('❌ Erro ao inicializar a aplicação:', error.message);
    process.exit(1);
  }
}

module.exports = MondayAutomationAPI;