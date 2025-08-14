# Monday API Automation

## 📋 Descrição

API para automatizar a criação de estrutura de pastas baseada em demandas do Monday.com. O sistema consulta informações de produtos no Monday.com e cria automaticamente a estrutura de pastas necessária para cada cliente.

**🔗 Produção:** https://monday-api-automation.onrender.com  
**📂 GitHub:** https://github.com/Nathan-Paranhos/monday-api-automation  
**👨‍💻 Desenvolvido por:** Nathan Silva - Fagron Tech

## 🎯 Campo Elemento

O sistema identifica automaticamente o campo **'elemento'** do Monday.com, que contém:
- **Código do Cliente** 
- **Nome da Farmácia**
- **Formato:** `CÓDIGO - NOME_FARMACIA`

Este campo é essencial para o processamento automático e está presente em todas as respostas da API.

## 🎯 Objetivo

Automatizar via RPA a criação de uma estrutura de pastas para extensão de sistemas baseada em demandas no Monday.com, definindo o analista responsável por produto, atualizando o status das demandas e adicionando observações relevantes. Especificamente, o sistema identifica clientes com status "Na Fila", grupo BOT, e produto Fórmula Certa ou Phusion, cria a estrutura de pastas apropriada, copia o modelo de fluxo de atendimento, atribui o responsável adequado e atualiza o status para "Em Andamento".

## 📋 Funcionalidades

- ✅ Consulta automática ao Monday.com via GraphQL
- ✅ Criação de estrutura de pastas baseada no produto
- ✅ Cópia de arquivo modelo (.vsdx)
- ✅ **Suporte a múltiplos responsáveis por produto** 🆕
- ✅ **Tratamento tolerante de emails não encontrados** 🆕
- ✅ Atualização automática de status no Monday.com
- ✅ Adição de observações nos itens do Monday.com
- ✅ Filtragem de itens por status "Na Fila" e produtos específicos
- ✅ **Extração automática de código de cliente do nome do item** 🆕
- ✅ **Sistema de webhook para processamento automático** 🆕
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
- **BOT**: `C:\Users\{User}\OneDrive\#BOT EXTENSÃO\{ID}`

### Arquivo Modelo

Certifique-se de que o arquivo modelo existe em:
```
C:\OneDrive\Onboarding\#Backoffice\#BOT Extensão\Modelo Fluxo.vsdx
```

### 👥 Múltiplos Responsáveis

**Nova funcionalidade!** O sistema agora suporta múltiplos responsáveis por produto:

- **Configuração**: Defina arrays de emails no arquivo `config/config.js`
- **Tolerância a falhas**: Emails não encontrados são ignorados com avisos
- **Atribuição simultânea**: Todos os responsáveis válidos são atribuídos automaticamente
- **Logs detalhados**: Informações sobre emails válidos e ignorados

**Exemplo de configuração:**
```javascript
responsaveis: {
  'BOT': [
    'Nathan.silva@fagrontech.com.br',
    'Pedro.Ribeiro@fagrontech.com.br',
    'Bruno.Vaz@fagrontech.com.br',
    'Jean.Vencigueri@fagrontech.com.br'
  ],
  'Fórmula Certa': ['responsavel1@email.com', 'responsavel2@email.com'],
  'Phusion': ['responsavel3@email.com']
}
```

## 🔄 Sistema de Webhook

**Nova funcionalidade!** O sistema agora inclui processamento automático via webhook:

- **Endpoint**: `POST /webhook` - Recebe notificações do Monday.com
- **Processamento automático**: Detecta atualizações em produtos BOT
- **Delay inteligente**: Aguarda 10 segundos antes de processar para evitar múltiplas execuções
- **Filtragem automática**: Processa apenas itens com status "Na Fila" e produtos válidos
- **Extração de código**: Extrai automaticamente códigos de cliente do nome do item

### Configuração do Webhook no Monday.com

1. Acesse Monday.com → Configurações → Integrações → Webhooks
2. Adicione novo webhook com URL: `https://seu-dominio.com/webhook`
3. Configure para disparar em: "Item Updated"
4. Selecione o board apropriado

## 📡 API Endpoints

### POST /webhook

**Webhook do Monday.com** - Processa automaticamente atualizações de itens

**Request (Monday.com):**
```json
{
  "event": {
    "type": "update_column_value",
    "pulseId": 12345,
    "boardId": 67890
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Webhook processado com sucesso",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

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
  "produto": "BOT",
  "pasta": "C:\\Users\\Usuario\\OneDrive\\#BOT EXTENSÃO\\12345",
  "arquivo_modelo": "C:\\Users\\Usuario\\OneDrive\\#BOT EXTENSÃO\\12345\\Fluxo_Cliente_12345.vsdx",
  "responsaveis": [
    "Nathan.silva@fagrontech.com.br",
    "Pedro.Ribeiro@fagrontech.com.br",
    "Bruno.Vaz@fagrontech.com.br",
    "Jean.Vencigueri@fagrontech.com.br"
  ],
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
  "produto": "BOT",
  "responsaveis": [
    "Nathan.silva@fagrontech.com.br",
    "Jean.Vencigueri@fagrontech.com.br"
  ],
  "emails_ignorados": [
    "Pedro.Ribeiro@fagrontech.com.br",
    "Bruno.Vaz@fagrontech.com.br"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /config

**Configurações** - Retorna configurações da aplicação (sem dados sensíveis)

**Response:**
```json
{
  "produtos_validos": ["BOT"],
  "status_validos": ["na fila", "em andamento", "concluido"],
  "responsaveis": {
    "BOT": [
     "responsavel"
    ],
    "Fórmula Certa": [
     "responsavel"
    ],
    "Phusion": [
     "responsavel"
    ]
  },
  "caminhos_produtos": {
    "BOT": "#BOT EXTENSÃO"
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
│   └── config.js                    # Configurações centralizadas
├── fileManager/
│   └── fileManager.js               # Gerenciamento de arquivos e pastas
├── logs/
│   ├── logger.js                    # Configuração do Winston
│   ├── combined.log                 # Log geral (gerado automaticamente)
│   └── error.log                    # Log de erros (gerado automaticamente)
├── monday/
│   └── mondayClient.js              # Cliente GraphQL para Monday.com
├── tests/                           # 🆕 Scripts de teste
│   ├── teste-bot.js                 # Teste específico para BOT
│   ├── teste-campos-pastas.js       # Teste de campos e pastas
│   ├── teste-configuracao.js        # Teste de configuração
│   ├── teste-multiplos-responsaveis.js # Teste múltiplos responsáveis
│   ├── teste-nova-demanda.js        # Teste nova demanda
│   ├── teste-sistema-real.js        # Teste sistema real
│   ├── teste-status-real.js         # Teste status real
│   └── teste-webhook-pulseId.js     # Teste webhook
├── .env                             # Variáveis de ambiente
├── main.js                         # API principal Express
├── package.json                    # Dependências e scripts
└── README.md                      # Este arquivo
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

### Scripts de Teste Automatizados 🆕

O projeto inclui vários scripts de teste para validar funcionalidades:

```bash
# Teste múltiplos responsáveis
node teste-multiplos-responsaveis.js

# Teste configuração geral
node teste-configuracao.js

# Teste sistema real
node teste-sistema-real.js

# Teste webhook
node teste-webhook-pulseId.js

# Teste específico BOT
node teste-bot.js
```

### Usando curl

```bash
# Health check
curl http://localhost:3000/health

# Teste de conexão Monday
curl http://localhost:3000/test-monday

# Webhook (simulação Monday.com)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"type": "update_column_value", "pulseId": 12345, "boardId": 67890}}'

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

### 🆕 Múltiplos responsáveis - alguns emails ignorados
- **Normal**: Sistema ignora emails não encontrados no Monday.com
- **Verificar logs**: Procure por avisos sobre emails ignorados
- **Solução**: Confirme se os emails estão corretos e existem no Monday.com

### 🆕 Webhook não funciona
- Verifique se a URL do webhook está correta no Monday.com
- Confirme se o servidor está acessível externamente
- Teste com `ngrok` para desenvolvimento local

### 🆕 Extração de código de cliente falha
- Verifique se o nome do item contém números
- Formato esperado: "Nome do Cliente 12345" ou "12345 - Descrição"
- Logs mostrarão se a extração foi bem-sucedida

## 📋 Changelog

### v2.0.0 - Julho 2025 🆕

**Novas Funcionalidades:**
- ✅ **Múltiplos responsáveis por produto**: Suporte a arrays de emails
- ✅ **Tratamento tolerante de emails**: Ignora emails não encontrados com avisos
- ✅ **Sistema de webhook**: Processamento automático via Monday.com
- ✅ **Extração automática de código**: Detecta códigos de cliente no nome do item
- ✅ **Scripts de teste**: 8 scripts automatizados para validação
- ✅ **Logs aprimorados**: Informações detalhadas sobre processamento

**Melhorias:**
- 🔧 **Função `atribuirResponsavel`**: Aceita strings ou arrays
- 🔧 **Função `obterResponsavel`**: Retorna strings ou arrays
- 🔧 **Configuração `config.js`**: Suporte a múltiplos formatos
- 🔧 **Tratamento de erros**: Mais robusto e informativo

**Arquivos Modificados:**
- `config/config.js` - Configuração de múltiplos responsáveis
- `utils/mondayClient.js` - Lógica de atribuição aprimorada
- `index.js` - Endpoint de webhook adicionado
- `README.md` - Documentação completa atualizada

### v1.0.0 - junho 2025

**Funcionalidades Iniciais:**
- ✅ Consulta automática ao Monday.com
- ✅ Criação de estrutura de pastas
- ✅ Cópia de arquivo modelo
- ✅ Atribuição de responsáveis (único)
- ✅ Sistema de logs com Winston
- ✅ API RESTful com Express

## 📞 Suporte

Para suporte técnico:
- Verifique os logs em `logs/error.log`
- Teste a conexão com `/test-monday`
- Valide as configurações com `/config`

**Equipe de desenvolvimento:**
- **Nathan Silva**
- **Jean Vencigueri**
## 📝 Licença

ISC License - Fagron Tech

---

**Última atualização**: Julho 2025  
**Versão**: 2.0.0  
**Desenvolvido por**: Equipe Fagron Tech
