const { formatSuccess } = require('../utils/responseFormatter');

class VersionController {
  getVersionInfo(req, res) {
    const versionInfo = {
      api: '2.0.0',
      moby: '2.0.0.58',
      sync: '1.1.6.42',
    };
    formatSuccess(res, versionInfo, 'Versão da API recuperada com sucesso');
  }
}

module.exports = VersionController;