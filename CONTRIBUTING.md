# Guia de Contribuição

## 👋 Bem-vindo!

Obrigado por considerar contribuir para o Monday API Automation! Este documento fornece diretrizes para contribuir com o projeto.

## 🚀 Como Contribuir

### 1. Configurando o Ambiente

1. **Fork o repositório**
   - Clique no botão "Fork" no canto superior direito da página do GitHub

2. **Clone seu fork**
   ```bash
   git clone https://github.com/SEU-USUARIO/monday-api-automation.git
   cd monday-api-automation
   ```

3. **Configure o ambiente de desenvolvimento**
   ```bash
   npm install
   cp .env.example .env
   # Configure as variáveis de ambiente no arquivo .env
   ```

4. **Adicione o repositório original como remote**
   ```bash
   git remote add upstream https://github.com/Nathan-Paranhos/monday-api-automation.git
   ```

### 2. Criando uma Branch

Crie uma branch para suas alterações:

```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

### 3. Fazendo Alterações

1. **Implemente suas alterações**
   - Siga os padrões de código existentes
   - Adicione testes para novas funcionalidades
   - Atualize a documentação conforme necessário

2. **Teste suas alterações**
   ```bash
   npm test
   ```

3. **Verifique o funcionamento local**
   ```bash
   npm run dev
   ```

### 4. Enviando uma Pull Request

1. **Commit suas alterações**
   ```bash
   git add .
   git commit -m "feat: adiciona nova funcionalidade X"
   # ou
   git commit -m "fix: corrige problema Y"
   ```

2. **Push para seu fork**
   ```bash
   git push origin feature/nome-da-feature
   ```

3. **Crie uma Pull Request**
   - Vá para o [repositório original](https://github.com/Nathan-Paranhos/monday-api-automation)
   - Clique em "New Pull Request"
   - Selecione "compare across forks"
   - Selecione seu fork e a branch com suas alterações
   - Preencha o template da PR com detalhes sobre suas alterações

## 📋 Padrões de Código

### Convenções de Commit

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Alterações na documentação
- `style:` - Formatação, ponto e vírgula faltando, etc.
- `refactor:` - Refatoração de código
- `test:` - Adição ou correção de testes
- `chore:` - Tarefas de manutenção

### Estilo de Código

- Use 2 espaços para indentação
- Use ponto e vírgula no final das declarações
- Prefira aspas simples para strings
- Siga as boas práticas de ES6+

## 🧪 Testes

- Adicione testes para novas funcionalidades
- Certifique-se de que todos os testes passam antes de enviar uma PR
- Use mocks para APIs externas

## 📝 Documentação

- Atualize o README.md para novas funcionalidades
- Adicione comentários JSDoc para funções públicas
- Mantenha a documentação atualizada

## 🔄 Processo de Review

1. Pelo menos um mantenedor deve aprovar a PR
2. Todos os testes automatizados devem passar
3. O código deve seguir os padrões do projeto
4. A documentação deve estar atualizada

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

## 🙏 Agradecimentos

Sua contribuição é muito valorizada! Juntos, podemos tornar este projeto ainda melhor.