const express = require('express');
const { getMyJourney } = require('../controllers/studentJourneyController');
const { getMyChat, postChatReply, markChatRead } = require('../controllers/studentChatController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/journey', protect, requireRole('student'), getMyJourney);

router.get('/chat', protect, requireRole('student'), getMyChat);
router.post('/chat/reply', protect, requireRole('student'), postChatReply);
router.post('/chat/read', protect, requireRole('student'), markChatRead);

module.exports = router;
