const express = require('express');
const { getStats } = require('../controllers/dashboardController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, requireRole('admin'), getStats);

module.exports = router;
