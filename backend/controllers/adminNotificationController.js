const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const { resolveAccount } = require('../utils/resolveAccount');

// Department-scoped notifications only (department != null) — the
// student-facing feed (department: null) has its own controller
// (studentNotificationController.js) and is never mixed in here.
// super_admin sees every department's notifications; an employee only
// sees the ones for their own department.
const scopeQuery = async (req) => {
  if (req.user.role === 'super_admin') {
    return { department: { $ne: null } };
  }
  const account = await resolveAccount(req.user);
  return { department: account.displayRole };
};

// @desc    Get the current staff account's department-tag notifications
// @route   GET /api/notifications
// @access  Private/Staff (super_admin + every employee role)
const getMyNotifications = asyncHandler(async (req, res) => {
  const query = await scopeQuery(req);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(50).populate('student', 'name'),
    Notification.countDocuments({ ...query, read: false }),
  ]);

  res.status(200).json({ success: true, notifications, unreadCount });
});

// @desc    Mark one department notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private/Staff (super_admin + every employee role)
const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id }, { $set: { read: true } });
  res.status(200).json({ success: true });
});

// @desc    Mark every department notification visible to this account as read
// @route   PATCH /api/notifications/read-all
// @access  Private/Staff (super_admin + every employee role)
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const query = await scopeQuery(req);
  await Notification.updateMany(query, { $set: { read: true } });
  res.status(200).json({ success: true });
});

module.exports = { getMyNotifications, markNotificationRead, markAllNotificationsRead };
