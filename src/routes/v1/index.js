const express = require('express');
const automationRoutes = require('./automation');
const mondayRoutes = require('./monday');
const webhookRoutes = require('./webhook');
const healthRoutes = require('../health');
const configRoutes = require('../config');
const versionRoutes = require('./version');

const router = express.Router();

router.use('/automation', automationRoutes);
router.use('/monday', mondayRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/health', healthRoutes);
router.use('/config', configRoutes);
router.use('/version', versionRoutes);

module.exports = router;