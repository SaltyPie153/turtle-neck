const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/me', authenticateToken, userController.getMyProfile);
router.patch('/me', authenticateToken, userController.updateMyProfile);

module.exports = router;