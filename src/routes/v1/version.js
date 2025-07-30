const express = require('express');
const VersionController = require('../../controllers/versionController');

const router = express.Router();
const versionController = new VersionController();

router.get('/', (req, res) => {
  versionController.getVersionInfo(req, res);
});

module.exports = router;