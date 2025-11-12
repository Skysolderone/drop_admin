import express from 'express';

import {
  reportNodeStatus,
  getConfigVersion,
  reportNodeUpdate,
  getAllNodes,
  updateConfigVersion,
  broadcastReloadMessage,
  getBroadcastStatus
} from '../controllers/reload.js';

const router = express.Router();

// Node status management
router.post('/node/report-status', reportNodeStatus);
router.post('/node/report-update', reportNodeUpdate);
router.get('/node/list', getAllNodes);

// Config center version management
router.get('/config/version', getConfigVersion);
router.post('/config/update-version', updateConfigVersion);

// Broadcast reload message
router.get('/reload', broadcastReloadMessage);
router.get('/broadcast/status', getBroadcastStatus);

export default router;
