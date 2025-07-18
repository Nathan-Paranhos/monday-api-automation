# 🚀 Deploy no Render - Monday API Automation

**Desenvolvido por: Nathan Silva - Fagron Tech**

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Repositório Git (GitHub, GitLab, ou Bitbucket)
3. Token válido do Monday.com
4. Board ID válido do Monday.com

## 🔧 Configuração do Deploy

### 1. Preparar o Repositório

```bash
# Inicializar repositório Git (se ainda não foi feito)
git init
git add .
git commit -m "Initial commit - Monday API Automation"

# Adicionar repositório remoto
git remote add origin <URL_DO_SEU_REPOSITORIO>
git push -u origin main
```

### 2. Configurar no Render

1. **Acesse o Render Dashboard**
   - Vá para [render.com](https://render.com)
   - Faça login ou crie uma conta

2. **Criar Novo Web Service**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório Git
   - Selecione o repositório da API

3. **Configurações do Serviço**
   ```
   Name: monday-api-automation
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

### 3. Variáveis de Ambiente

Configure as seguintes variáveis no Render:

```env
NODE_ENV=production
MONDAY_API_TOKEN=seu_token_aqui
MONDAY_BOARD_ID=seu_board_id_aqui
BASE_USER_PATH=/tmp
MODEL_FILE_PATH=/tmp/modelo.vsdx
PORT=3000
```

### 4. Configurações Avançadas

- **Health Check Path**: `/health`
- **Auto-Deploy**: Habilitado
- **Plan**: Free (ou conforme necessário)

## 🔍 Verificação do Deploy

Após o deploy, teste os endpoints:

1. **Health Check**
   ```
   GET https://seu-app.onrender.com/health
   ```

2. **Documentação Swagger**
   ```
   GET https://seu-app.onrender.com/api-docs
   ```

3. **Teste de Conexão Monday**
   ```
   GET https://seu-app.onrender.com/test-monday
   ```

## ⚠️ Considerações Importantes

### Limitações do Plano Free
- **Sleep Mode**: Aplicação "dorme" após 15 minutos de inatividade
- **Cold Start**: Primeiro request após sleep pode demorar 30+ segundos
- **Recursos**: 512MB RAM, 0.1 CPU

### Sistema de Arquivos
- **Temporário**: Arquivos em `/tmp` são perdidos a cada deploy
- **Persistência**: Para arquivos permanentes, considere usar:
  - AWS S3
  - Google Cloud Storage
  - Cloudinary

### Logs
- Acesse logs em tempo real no Render Dashboard
- Logs são mantidos por tempo limitado no plano free

## 🔧 Troubleshooting

### Erro de Build
```bash
# Verificar versão do Node.js
node --version
npm --version

# Limpar cache npm
npm cache clean --force
```

### Erro de Conexão Monday.com
- Verificar se o token está correto
- Confirmar se o Board ID existe
- Testar token em ambiente local primeiro

### Timeout na Inicialização
- Verificar se todas as dependências estão no package.json
- Confirmar se o comando start está correto
- Revisar logs de erro no Render

## 📞 Suporte

Para suporte técnico:
- **Desenvolvedor**: Nathan Silva - Fagron Tech
- **Documentação**: Consulte o README.md
- **Logs**: Sempre inclua logs completos ao reportar problemas

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```

O Render fará o deploy automaticamente após o push.

---

**✅ Deploy Concluído!** Sua API estará disponível em: `https://seu-app.onrender.com`