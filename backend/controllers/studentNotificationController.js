const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get the current student's notification feed (newest first, capped)
// @route   GET /api/student/notifications
// @access  Private/Student
const getMyNotifications = asyncHandler(async (req, res) => {
  // `department: null` scopes this to the original student-facing rows
  // only — department-tag notifications (department set) are the staff
  // accountability bell's data, added later on the *same* collection (see
  // Notification.js), and must never reach the student: the app has no
  // renderer for that notification type and neither should it, per the
  // Students module accountability-system plan ("students never see
  // internal departments/assignments").
  const notifications = await Notification.find({ student: req.user.id, department: null })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, notifications });
});

// @desc    Mark a single notification as read
// @route   POST /api/student/notifications/:id/read
// @access  Private/Student
const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, student: req.user.id, department: null },
    { $set: { read: true } }
  );
  res.status(200).json({ success: true });
});

// @desc    Mark every notification for the current student as read
// @route   POST /api/student/notifications/read-all
// @access  Private/Student
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { student: req.user.id, read: false, department: null },
    { $set: { read: true } }
  );
  res.status(200).json({ success: true });
});

module.exports = { getMyNotifications, markNotificationRead, markAllNotificationsRead };
