const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { STAFF_ROLES } = require('../constants/roles');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/adminNotificationController');

router.use(protect, requireRole(...STAFF_ROLES));

router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
