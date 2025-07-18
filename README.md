# Monday API Automation

API Node.js para automatizar a criação de estrutura de pastas baseada em demandas do Monday.com, definindo analistas responsáveis por produto.

## 🎯 Objetivo

Automatizar via RPA a criação de uma estrutura de pastas para extensão de sistemas baseada em demandas no Monday.com, definindo o analista responsável por produto.

## 📋 Funcionalidades

- ✅ Consulta automática ao Monday.com via GraphQL
- ✅ Criação de estrutura de pastas baseada no produto
- ✅ Cópia de arquivo modelo (.vsdx)
- ✅ Associação de responsáveis por produto
- ✅ Sistema completo de logs com Winston
- ✅ Tratamento robusto de erros
- ✅ API RESTful com Express

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- Acesso à API do Monday.com
- Permissões de escrita nas pastas de destino

### Deploy no Render 🌐

Para deploy em produção no Render, consulte o arquivo [DEPLOY.md](./DEPLOY.md) com instruções detalhadas.

**Quick Deploy:**
1. Fork este repositório
2. Conecte no [Render](https://render.com)
3. Configure as variáveis de ambiente
4. Deploy automático! ✨

### Passos

1. **Clone ou baixe o projeto**
   ```bash
   cd monday-api
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Copie o arquivo de exemplo e configure:
   
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   # Monday.com API Configuration
   MONDAY_API_TOKEN=seu_token_aqui
   MONDAY_BOARD_ID=seu_board_id_aqui
   
   # Base paths (ajuste conforme ambiente)
   BASE_USER_PATH=C:\\Users\\{User}\\OneDrive
   MODEL_FILE_PATH=C:\\OneDrive\\Onboarding\\#Backoffice\\#BOT Extensão\\Modelo Fluxo.vsdx
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Inicie o servidor**
   ```bash
   npm start
   ```
   
   Para desenvolvimento com auto-reload:
   ```bash
   npm run dev
   ```

## ⚙️ Configuração

### Monday.com

1. **Obter Token da API**
   - Acesse Monday.com → Avatar → Admin → API
   - Gere um novo token
   - Cole no arquivo `.env` em `MONDAY_API_TOKEN`

2. **Obter Board ID**
   - Acesse o board desejado no Monday.com
   - O ID está na URL: `https://company.monday.com/boards/BOARD_ID`
   - Cole no arquivo `.env` em `MONDAY_BOARD_ID`

### Estrutura de Pastas

A API criará pastas nos seguintes caminhos:

- **Fórmula Certa**: `C:\Users\{User}\OneDrive\#FCERTA EXTENSÃO\{ID}`
- **Phusion**: `C:\Users\{User}\OneDrive\#PHUSION EXTENSÃO\{ID}`

### Arquivo Modelo

Certifique-se de que o arquivo modelo existe em:
```
C:\OneDrive\Onboarding\#Backoffice\#BOT Extensão\Modelo Fluxo.vsdx
```

## 📡 API Endpoints

### POST /automatizar

**Automação principal** - Cria estrutura de pastas baseada em demanda do Monday.com

**Request:**
```json
{
  "id_cliente": 12345,
  "nome_farmacia": "Farmácia Exemplo"
}
```

**Response (Sucesso):**
```json
{
  "status": "ok",
  "produto": "Fórmula Certa",
  "pasta": "C:\\Users\\Usuario\\OneDrive\\#FCERTA EXTENSÃO\\12345",
  "arquivo_modelo": "C:\\Users\\Usuario\\OneDrive\\#FCERTA EXTENSÃO\\12345\\Fluxo_Cliente_12345.vsdx",
  "responsavel": "Pedro.Ribeiro@fagrontech.com.br",
  "cliente": {
    "id": 12345,
    "nome_farmacia": "Farmácia Exemplo"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response (Erro):**
```json
{
  "status": "erro",
  "erro": "Demanda não encontrada para o cliente ID: 12345",
  "codigo": "DEMANDA_NAO_ENCONTRADA",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /health

**Health check** - Verifica se a API está funcionando

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "monday-api-automation"
}
```

### GET /test-monday

**Teste de conexão** - Verifica conectividade com Monday.com

**Response:**
```json
{
  "status": "ok",
  "monday_conectado": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /produto/:id

**Consultar produto** - Busca produto por ID do cliente

**Response:**
```json
{
  "status": "ok",
  "id_cliente": 12345,
  "produto": "Fórmula Certa",
  "responsavel": "Pedro.Ribeiro@fagrontech.com.br",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /config

**Configurações** - Retorna configurações da aplicação (sem dados sensíveis)

**Response:**
```json
{
  "produtos_validos": ["Fórmula Certa", "Phusion"],
  "responsaveis": {
    "Fórmula Certa": "Pedro.Ribeiro@fagrontech.com.br",
    "Phusion": "Bruno.Vaz@fagrontech.com.br"
  },
  "caminhos_produtos": {
    "Fórmula Certa": "#FCERTA EXTENSÃO",
    "Phusion": "#PHUSION EXTENSÃO"
  },
  "servidor": {
    "porta": 3000,
    "ambiente": "development"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Estrutura do Projeto

```
monday-api/
├── config/
│   └── config.js          # Configurações centralizadas
├── fileManager/
│   └── fileManager.js     # Gerenciamento de arquivos e pastas
├── logs/
│   ├── logger.js          # Configuração do Winston
│   ├── combined.log       # Log geral (gerado automaticamente)
│   └── error.log          # Log de erros (gerado automaticamente)
├── monday/
│   └── mondayClient.js    # Cliente GraphQL para Monday.com
├── .env                   # Variáveis de ambiente
├── main.js               # API principal Express
├── package.json          # Dependências e scripts
└── README.md            # Este arquivo
```

## 📊 Sistema de Logs

Todos os logs são salvos na pasta `logs/`:

- **combined.log**: Log geral de todas as operações
- **error.log**: Log específico de erros
- **Console**: Output colorido para desenvolvimento

### Exemplo de Log
```json
{
  "level": "info",
  "message": "Processamento concluído com sucesso",
  "service": "monday-api-automation",
  "timestamp": "2024-01-15 10:30:00",
  "resultado": {
    "status": "ok",
    "produto": "Fórmula Certa",
    "pasta": "C:\\Users\\Usuario\\OneDrive\\#FCERTA EXTENSÃO\\12345"
  }
}
```

## ⚠️ Tratamento de Erros

A API trata os seguintes tipos de erro:

| Código | Descrição | Status HTTP |
|--------|-----------|-------------|
| `DADOS_INVALIDOS` | Dados de entrada inválidos | 400 |
| `DEMANDA_NAO_ENCONTRADA` | Demanda não encontrada no Monday | 404 |
| `ERRO_CONEXAO` | Erro de conexão com Monday.com | 503 |
| `ERRO_PERMISSAO` | Sem permissão para criar pastas/arquivos | 403 |
| `ERRO_INTERNO` | Erro interno do servidor | 500 |
| `ROTA_NAO_ENCONTRADA` | Endpoint não existe | 404 |

## 🧪 Testando a API

### Usando curl

```bash
# Health check
curl http://localhost:3000/health

# Teste de conexão Monday
curl http://localhost:3000/test-monday

# Automação principal
curl -X POST http://localhost:3000/automatizar \
  -H "Content-Type: application/json" \
  -d '{"id_cliente": 12345, "nome_farmacia": "Farmácia Teste"}'

# Consultar produto
curl http://localhost:3000/produto/12345
```

### Usando Postman

1. Importe a collection (se disponível)
2. Configure a base URL: `http://localhost:3000`
3. Teste os endpoints conforme documentação acima

## 🔐 Segurança

- ✅ Tokens sensíveis em variáveis de ambiente
- ✅ Validação de entrada rigorosa
- ✅ Logs não expõem dados sensíveis
- ✅ Tratamento seguro de caminhos de arquivo
- ✅ CORS configurado

## 🚨 Troubleshooting

### Erro: "Token do Monday.com não configurado"
- Verifique se `MONDAY_API_TOKEN` está definido no `.env`
- Confirme se o token é válido no Monday.com

### Erro: "Arquivo modelo não encontrado"
- Verifique se o arquivo existe no caminho configurado
- Confirme as permissões de leitura

### Erro: "Sem permissão para criar pasta"
- Execute como administrador (se necessário)
- Verifique permissões da pasta de destino

### Erro: "Demanda não encontrada"
- Confirme se o ID do cliente existe no Monday.com
- Verifique se o board ID está correto
- Confirme se o campo "Produto" existe no board

## 📞 Suporte

Para suporte técnico:
- Verifique os logs em `logs/error.log`
- Teste a conexão com `/test-monday`
- Valide as configurações com `/config`

## 📝 Licença

ISC License - Fagron Tech