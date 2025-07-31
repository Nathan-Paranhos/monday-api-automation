# Monday API Automation - Documentação de Uso

## 📋 Visão Geral

A **Monday API Automation** é uma API desenvolvida para automatizar a criação de estrutura de pastas baseada em demandas do Monday.com, definindo analistas responsáveis por produto e processando automaticamente farmácias com produto BOT.

**Desenvolvido por:** Nathan Silva - Fagron Tech  
**Email:** nathan.silva@fagrontech.com.br  
**Versão:** 1.0.0

## 🌐 URLs da API

### Produção (Render)
- **URL Base:** `https://monday-api-automation.onrender.com`
- **Documentação Swagger:** `https://monday-api-automation.onrender.com/api-docs`
- **Health Check:** `https://monday-api-automation.onrender.com/health`

### Desenvolvimento Local
- **URL Base:** `http://localhost:10000`
- **Documentação Swagger:** `http://localhost:10000/api-docs`
- **Health Check:** `http://localhost:10000/health`

## 🚀 Endpoints Principais

### 1. Health Check
```http
GET /health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "monday-api-automation",
  "developer": "Nathan Silva - Fagron Tech"
}
```

### 2. Teste de Conexão Monday.com
```http
GET /test-monday
```

**Resposta (Sucesso):**
```json
{
  "status": "ok",
  "monday_conectado": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Resposta (Erro):**
```json
{
  "status": "erro",
  "monday_conectado": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Configurações da Aplicação
```http
GET /config
```

**Resposta:**
```json
{
  "produtos_validos": ["Fórmula Certa", "Phusion", "BOT"],
  "status_validos": ["Na Fila", "Em andamento", "Concluído"],
  "responsaveis": {
    "Fórmula Certa": ["analista1@fagron.com", "analista2@fagron.com"],
    "Phusion": ["analista3@fagron.com", "analista4@fagron.com"]
  },
  "caminhos_produtos": {
    "Fórmula Certa": "C:\\Fagron\\Formula Certa",
    "Phusion": "C:\\Fagron\\Phusion"
  },
  "servidor": {
    "porta": 10000,
    "ambiente": "production"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Automação Principal
```http
POST /automatizar
```

**Body:**
```json
{
  "id_cliente": 12345,
  "nome_farmacia": "Farmácia Exemplo"
}
```

**Resposta (Sucesso):**
```json
{
  "status": "ok",
  "produto": "Fórmula Certa",
  "principal_produto": "Fórmula Certa",
  "status": {
    "original": "Na Fila",
    "normalizado": "Na Fila"
  },
  "pasta": "C:\\Fagron\\Formula Certa\\12345 - Farmácia Exemplo",
  "arquivo_modelo": "C:\\Fagron\\Formula Certa\\12345 - Farmácia Exemplo\\modelo.xlsx",
  "responsavel": ["analista1@fagron.com", "analista2@fagron.com"],
  "elemento": "12345 - Farmácia Exemplo",
  "campos": {},
  "cliente": {
    "id": 12345,
    "nome_farmacia": "Farmácia Exemplo"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Consultar Produto por ID
```http
GET /produto/:id
```

**Exemplo:**
```http
GET /produto/12345
```

### 6. Webhook Monday.com
```http
POST /webhook/monday
```

**Body (Exemplo):**
```json
{
  "event": {
    "type": "create_pulse",
    "pulseId": "12345"
  }
}
```

## 🤖 Serviço de Monitoramento 24h

### Iniciar Monitoramento
```http
POST /monitoring/start
```

### Parar Monitoramento
```http
POST /monitoring/stop
```

### Status do Monitoramento
```http
GET /monitoring/status
```

### Limpar Cache
```http
POST /monitoring/clear-cache
```

### Configurar Intervalo
```http
POST /monitoring/interval
```

**Body:**
```json
{
  "intervalMs": 30000
}
```

## 🔧 Configuração para Produção

### Variáveis de Ambiente Obrigatórias

```env
# Monday.com API
MONDAY_API_TOKEN=seu_token_aqui
MONDAY_BOARD_ID=seu_board_id_aqui

# Servidor
PORT=10000
NODE_ENV=production

# Caminhos base
BASE_PATH_FORMULA_CERTA=C:\Fagron\Formula Certa
BASE_PATH_PHUSION=C:\Fagron\Phusion
BASE_PATH_BOT=C:\Fagron\BOT
```

### Configuração do Webhook no Monday.com

1. Acesse seu board no Monday.com
2. Vá em **Integrations** > **Webhooks**
3. Configure o webhook com:
   - **URL:** `https://monday-api-automation.onrender.com/webhook/monday`
   - **Eventos:** 
     - `create_pulse` (criação de item)
     - `change_column_value` (mudança na coluna produto)

### Deploy no Render

1. Conecte o repositório ao Render
2. Configure as variáveis de ambiente
3. Use o comando de build: `npm install`
4. Use o comando de start: `npm start`

## 📊 Monitoramento e Logs

### Logs Disponíveis
- **Início de processamento:** Quando uma automação é iniciada
- **Sucesso:** Quando uma automação é concluída com sucesso
- **Erro:** Quando ocorre algum erro no processamento
- **Validação:** Quando há problemas de validação de dados
- **Consulta Monday:** Logs das consultas à API do Monday.com

### Estrutura de Logs
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Processamento iniciado",
  "data": {
    "id_cliente": 12345,
    "nome_farmacia": "Farmácia Exemplo"
  }
}
```

## 🔄 Fluxo de Automação BOT

### Processo Automático
1. **Webhook recebido** do Monday.com
2. **Verificação** se é produto BOT
3. **Aguardo** de 10-15 segundos para preenchimento completo
4. **Validação** do produto principal (Fórmula Certa ou Phusion)
5. **Verificação** do status (deve ser "Na Fila")
6. **Criação** da estrutura de pastas
7. **Cópia** do arquivo modelo
8. **Atualização** do status no Monday.com para "Em andamento"
9. **Envio** de notificação por email aos responsáveis

### Produtos Suportados
- **Fórmula Certa**
- **Phusion**
- **BOT** (produto especial para automação)

### Status Válidos
- **Na Fila:** Item aguardando processamento
- **Em andamento:** Item sendo processado
- **Concluído:** Item finalizado

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js >= 18.0.0
- npm >= 8.0.0

### Instalação
```bash
# Clone o repositório
git clone <repository-url>

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

### Scripts Disponíveis
```bash
npm start          # Inicia o servidor de produção
npm run dev        # Inicia o servidor de desenvolvimento com nodemon
npm test           # Executa os testes
npm run build      # Prepara para produção
npm run deploy     # Build + start de produção
```

## 🔒 Segurança

### Autenticação
- A API utiliza token de autenticação do Monday.com
- Webhooks são validados por assinatura (quando configurado)

### Rate Limiting
- Implementado rate limiting para prevenir abuso
- Limite padrão: 100 requisições por 15 minutos por IP

### CORS
- Configurado para aceitar requisições de origens específicas
- Headers de segurança implementados via Helmet.js

## 📞 Suporte

### Contato
- **Desenvolvedor:** Nathan Silva - Fagron Tech
- **Email:** nathan.silva@fagrontech.com.br

### Troubleshooting

#### Erro de Conexão Monday.com
- Verifique se o token da API está correto
- Confirme se o Board ID está configurado corretamente
- Teste a conexão via endpoint `/test-monday`

#### Erro de Permissão de Arquivos
- Verifique se os caminhos base estão corretos
- Confirme as permissões de escrita nas pastas
- Verifique se os templates existem

#### Webhook não Funciona
- Confirme a URL do webhook no Monday.com
- Verifique se a API está acessível publicamente
- Teste manualmente via endpoint `/test-item/:itemId`

## 📈 Métricas e Performance

### Endpoints de Monitoramento
- `/health` - Status geral da aplicação
- `/monitoring/status` - Status do serviço de monitoramento
- `/config` - Configurações atuais

### Logs de Performance
- Tempo de resposta das requisições
- Tempo de processamento das automações
- Taxa de sucesso/erro das operações

---

**Última atualização:** Janeiro 2024  
**Versão da documentação:** 1.0.0