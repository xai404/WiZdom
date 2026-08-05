const express = require('express');
const rateLimit = require('express-rate-limit');
const { getMyJourney } = require('../controllers/studentJourneyController');
const { getMyChat, postChatReply, markChatRead } = require('../controllers/studentChatController');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/studentNotificationController');
const { registerPushToken } = require('../controllers/studentPushController');
const { resetMyPassword } = require('../controllers/studentAccountController');
const { getHelplineContact, getSupportContacts } = require('../controllers/supportContactsController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Unauthenticated endpoint (no token to gate it with) — throttled so it
// can't be hammered/scraped from a single source.
const helplineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/journey', protect, requireRole('student'), getMyJourney);

router.get('/chat', protect, requireRole('student'), getMyChat);
router.post('/chat/reply', protect, requireRole('student'), postChatReply);
router.post('/chat/read', protect, requireRole('student'), markChatRead);

router.get('/notifications', protect, requireRole('student'), getMyNotifications);
router.post('/notifications/:id/read', protect, requireRole('student'), markNotificationRead);
router.post('/notifications/read-all', protect, requireRole('student'), markAllNotificationsRead);

router.post('/push-token', protect, requireRole('student'), registerPushToken);

router.post('/reset-password', protect, requireRole('student'), resetMyPassword);

// No auth — used pre-login, before there's a token to gate with.
router.get('/helpline', helplineLimiter, getHelplineContact);

// Post-login call picker — WiZdom (super admin), Editing Team, Application Team.
router.get('/support-contacts', protect, requireRole('student'), getSupportContacts);

module.exports = router;
