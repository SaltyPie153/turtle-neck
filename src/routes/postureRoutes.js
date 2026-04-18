const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const postureController = require('../controllers/postureController');

router.post('/analyze', authenticateToken, postureController.analyzePosture);
router.post('/heartbeat', authenticateToken, postureController.processHeartbeat);

module.exports = router;
