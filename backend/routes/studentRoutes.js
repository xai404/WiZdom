const express = require('express');
const { getMyJourney } = require('../controllers/studentJourneyController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/journey', protect, requireRole('student'), getMyJourney);

module.exports = router;
