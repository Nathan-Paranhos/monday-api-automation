const crypto = require('crypto');
const { logger } = require('../../logs/logger');

function verifyMondaySignature(req, res, next) {
  const signature = req.headers['x-monday-signature'];
  const body = req.rawBody;
  const signingSecret = process.env.MONDAY_SIGNING_SECRET;

  if (!signature) {
    logger.warn('Webhook sem assinatura recebido');
    return res.status(401).json({ error: 'Assinatura não fornecida' });
  }

  if (!signingSecret) {
    logger.error('MONDAY_SIGNING_SECRET não configurado no ambiente');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('Assinatura de webhook inválida', { received: signature, expected: expectedSignature });
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  next();
}

module.exports = { verifyMondaySignature };