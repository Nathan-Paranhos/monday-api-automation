# Dockerfile para produção
# Monday.com API Automation

FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Cria diretórios necessários
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs
RUN mkdir -p /tmp && chown -R nextjs:nodejs /tmp

# Copia o código da aplicação
COPY --chown=nextjs:nodejs . .

# Remove arquivos desnecessários em produção
RUN rm -rf teste-*.js
RUN rm -rf .env.example
RUN rm -rf README.md
RUN rm -rf .git*

# Muda para usuário não-root
USER nextjs

# Expõe a porta
EXPOSE 10000

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=10000
ENV BASE_USER_PATH=/tmp
ENV MODEL_FILE_PATH=/tmp/modelo.vsdx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar a aplicação
CMD ["node", "deploy-production.js"]