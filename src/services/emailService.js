const nodemailer = require('nodemailer');
const { logger } = require('../../logs/logger');

/**
 * Serviço de notificação por email
 * Envia notificações quando pastas são criadas automaticamente
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializa o transportador de email
   */
  initializeTransporter() {
    try {
      // Configuração para Gmail/Outlook (pode ser ajustada conforme necessário)
      this.transporter = nodemailer.createTransporter({
        service: 'gmail', // ou 'outlook' para Outlook
        auth: {
          user: process.env.EMAIL_USER || 'seu-email@gmail.com',
          pass: process.env.EMAIL_PASSWORD || 'sua-senha-de-app'
        }
      });

      logger.info('Serviço de email inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar serviço de email:', error);
    }
  }

  /**
   * Envia notificação de pasta criada
   * @param {Object} dados - Dados da notificação
   * @param {string} dados.farmacia - Nome da farmácia
   * @param {string} dados.produto - Produto principal
   * @param {string} dados.caminhoPasta - Caminho da pasta criada
   * @param {Array} dados.responsaveis - Lista de emails dos responsáveis
   * @param {string} dados.itemId - ID do item no Monday.com
   */
  async enviarNotificacaoPastaCriada(dados) {
    try {
      const { farmacia, produto, caminhoPasta, responsaveis, itemId } = dados;
      
      const assunto = `🗂️ Pasta criada automaticamente - ${farmacia}`;
      
      const corpoEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0073ea;">📁 Nova Pasta Criada Automaticamente</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Detalhes da Criação:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>🏪 Farmácia:</strong> ${farmacia}</li>
              <li style="margin: 10px 0;"><strong>📦 Produto:</strong> ${produto}</li>
              <li style="margin: 10px 0;"><strong>📂 Caminho:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${caminhoPasta}</code></li>
              <li style="margin: 10px 0;"><strong>🆔 Item Monday.com:</strong> ${itemId}</li>
            </ul>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>✅ Ação Realizada:</strong> A pasta foi criada automaticamente e o modelo de fluxo foi copiado com base no status "Na Fila".
            </p>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>📋 Próximos Passos:</strong>
            </p>
            <ul style="color: #856404; margin: 10px 0;">
              <li>Verificar a pasta criada no caminho indicado</li>
              <li>Revisar o modelo de fluxo copiado</li>
              <li>Atualizar o status no Monday.com conforme o progresso</li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #6c757d; font-size: 12px; text-align: center;">
            Esta é uma notificação automática do sistema de monitoramento BOT.<br>
            Gerada em: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      `;

      // Envia para todos os responsáveis
      const emailsDestino = Array.isArray(responsaveis) ? responsaveis : [responsaveis];
      
      for (const email of emailsDestino) {
        try {
          await this.transporter.sendMail({
            from: process.env.EMAIL_USER || 'sistema-bot@fagrontech.com.br',
            to: email,
            subject: assunto,
            html: corpoEmail
          });
          
          logger.info(`Email enviado com sucesso para ${email}`, { farmacia, itemId });
        } catch (error) {
          logger.error(`Erro ao enviar email para ${email}:`, error);
        }
      }
      
    } catch (error) {
      logger.error('Erro ao enviar notificação de pasta criada:', error);
      throw error;
    }
  }

  /**
   * Testa a configuração de email
   * @returns {Promise<boolean>} true se o teste for bem-sucedido
   */
  async testarConfiguracao() {
    try {
      if (!this.transporter) {
        throw new Error('Transportador de email não inicializado');
      }
      
      await this.transporter.verify();
      logger.info('Configuração de email testada com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao testar configuração de email:', error);
      return false;
    }
  }
}

module.exports = EmailService;