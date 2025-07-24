# 🚀 Guia de Deploy em Produção

Monday.com API Automation - Sistema de Webhook para Automação de Farmácias

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Acesso ao Monday.com com token de API válido
- Porta 10000 disponível (ou configurar outra no .env.production)

## ⚙️ Configuração Inicial

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.production` e configure as seguintes variáveis:

```bash
# Monday.com API
MONDAY_API_TOKEN=seu_token_aqui
MONDAY_BOARD_ID=seu_board_id_aqui

# Caminhos do sistema
BASE_USER_PATH=/tmp
MODEL_FILE_PATH=/tmp/modelo.vsdx

# Servidor
PORT=10000
NODE_ENV=production
```

### 2. Instalar Dependências

```bash
npm install --production
```

## 🎯 Métodos de Deploy

### Método 1: Script PowerShell (Windows)

```powershell
.\start-production.ps1
```

**Características:**
- ✅ Verificação automática de pré-requisitos
- ✅ Instalação de dependências
- ✅ Execução de testes básicos
- ✅ Logs coloridos e informativos
- ✅ Configuração automática de diretórios

### Método 2: Script Bash (Linux/Mac)

```bash
chmod +x start-production.sh
./start-production.sh
```

**Características:**
- ✅ Verificação de versão do Node.js
- ✅ Criação automática de .env.production se necessário
- ✅ Validação de dependências
- ✅ Estrutura de logs organizada

### Método 3: NPM Scripts

```bash
# Iniciar em produção
npm run start:prod

# Apenas o webhook
npm run start:webhook

# Deploy completo
npm run deploy

# Testar detecção de novos itens
npm run test-detection
```

### Método 4: PM2 (Recomendado para Produção)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Monitorar
pm2 monit

# Logs
pm2 logs monday-webhook-prod

# Parar
pm2 stop monday-webhook-prod

# Reiniciar
pm2 restart monday-webhook-prod
```

**Vantagens do PM2:**
- ✅ Auto-restart em caso de falha
- ✅ Gerenciamento de logs automático
- ✅ Monitoramento em tempo real
- ✅ Controle de memória
- ✅ Clustering (se necessário)

### Método 5: Docker

```bash
# Build da imagem
docker build -t monday-webhook .

# Executar container
docker run -d \
  --name monday-webhook-prod \
  -p 10000:10000 \
  --env-file .env.production \
  -v $(pwd)/logs:/app/logs \
  monday-webhook

# Logs
docker logs -f monday-webhook-prod

# Parar
docker stop monday-webhook-prod
```

### Método 6: Docker Compose (Recomendado)

```bash
# Iniciar
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar
docker-compose -f docker-compose.prod.yml down

# Rebuild e restart
docker-compose -f docker-compose.prod.yml up -d --build
```

**Vantagens do Docker:**
- ✅ Ambiente isolado e consistente
- ✅ Fácil deploy em qualquer servidor
- ✅ Health checks automáticos
- ✅ Controle de recursos
- ✅ Logs estruturados

## 🔍 Endpoints Disponíveis

### Webhook Principal
```
POST http://localhost:10000/webhook/monday
```
- Recebe eventos do Monday.com
- Processa novos itens e atualizações
- Detecta produtos 'BOT' automaticamente

### Health Check
```
GET http://localhost:10000/health
```
- Verifica se o servidor está funcionando
- Testa conexão com Monday.com
- Retorna status da aplicação

### Status do Webhook
```
GET http://localhost:10000/webhook/status
```
- Informações sobre o webhook
- Estatísticas de processamento
- Configurações ativas

### Teste Manual de Item
```
GET http://localhost:10000/test-item/:itemId
```
- Testa processamento de um item específico
- Útil para debugging
- Simula o fluxo completo

## 📊 Monitoramento

### Logs

Todos os métodos geram logs estruturados:

```
logs/
├── app.log          # Logs da aplicação
├── error.log        # Apenas erros
├── pm2-combined.log # Logs do PM2 (se usado)
├── pm2-error.log    # Erros do PM2
└── pm2-out.log      # Output do PM2
```

### Health Checks

- **HTTP**: `GET /health` retorna status 200 se tudo OK
- **Docker**: Health check automático a cada 30s
- **PM2**: Restart automático se a aplicação falhar

## 🔧 Troubleshooting

### Porta em Uso
```bash
# Windows
netstat -ano | findstr :10000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:10000 | xargs kill -9
```

### Problemas de Conexão Monday.com
1. Verificar token de API no .env.production
2. Confirmar Board ID correto
3. Testar endpoint: `GET /health`

### Logs Não Aparecem
1. Verificar permissões da pasta `logs/`
2. Confirmar variável NODE_ENV=production
3. Reiniciar aplicação

### Docker Issues
```bash
# Limpar containers parados
docker container prune

# Limpar imagens não utilizadas
docker image prune

# Rebuild completo
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## 🚦 Configuração do Webhook no Monday.com

1. Acesse seu board no Monday.com
2. Vá em **Integrations** > **Webhooks**
3. Adicione novo webhook:
   - **URL**: `http://seu-servidor:10000/webhook/monday`
   - **Events**: `create_pulse`, `change_column_value`
   - **Columns**: Selecione a coluna 'produto'

## 📈 Otimizações de Produção

### Performance
- Use PM2 com clustering se necessário
- Configure limits de memória
- Monitore uso de CPU

### Segurança
- Use HTTPS em produção
- Configure firewall para porta 10000
- Mantenha tokens seguros
- Use usuário não-root no Docker

### Backup
- Faça backup regular dos logs
- Mantenha cópia do .env.production
- Documente configurações específicas

## 🎉 Deploy Realizado!

Após seguir um dos métodos acima, sua aplicação estará rodando em produção e pronta para receber webhooks do Monday.com!

**URLs importantes:**
- Webhook: `http://seu-servidor:10000/webhook/monday`
- Health: `http://seu-servidor:10000/health`
- Status: `http://seu-servidor:10000/webhook/status`