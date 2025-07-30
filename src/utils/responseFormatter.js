function formatSuccess(res, data, message = 'Operação bem-sucedida', statusCode = 200) {
  res.status(statusCode).json({
    status: 'sucesso',
    mensagem: message,
    timestamp: new Date().toISOString(),
    dados: data,
  });
}

function formatError(res, message = 'Ocorreu um erro', statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
  res.status(statusCode).json({
    status: 'erro',
    mensagem: message,
    codigo_erro: errorCode,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  formatSuccess,
  formatError,
};