const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// Staff-facing notifications only (department != null) — the student-facing
// feed (department: null) has its own controller
// (studentNotificationController.js) and is never mixed in here. Every staff
// account (super_admin and every employee role) sees every staff-facing
// notification: a student message must reach the whole team, not just one
// department, so nothing sits unseen because the one person who'd get it is
// away. The `department` on each row still labels which team (or 'General')
// it concerns — see the bell UI — it just no longer filters who sees it.
//
// Read state is PER ACCOUNT: the shared `read` boolean is meaningless here
// (one person reading it would clear the badge for the whole company), so
// each staff member's read status lives in the row's `readBy` array instead.
const STAFF_FACING = { department: { $ne: null } };

// @desc    Get the current staff account's department-tag notifications
// @route   GET /api/notifications
// @access  Private/Staff (super_admin + every employee role)
const getMyNotifications = asyncHandler(async (req, res) => {
  const rows = await Notification.find(STAFF_FACING)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('student', 'name')
    .lean();

  // Collapse this account's entry in `readBy` down to the per-user `read`
  // flag the bell UI expects; don't leak the raw readBy list to the client.
  const notifications = rows.map(({ readBy, ...n }) => ({
    ...n,
    read: (readBy ?? []).some((id) => String(id) === String(req.user.id)),
  }));

  // Unread badge is derived from the same 50-row window the dropdown shows,
  // not a global countDocuments: a brand-new staff account is in no row's
  // `readBy` yet, and an unbounded count would show them every staff
  // notification ever created as unread until they hit "mark all read".
  const unreadCount = notifications.filter((n) => !n.read).length;

  res.status(200).json({ success: true, notifications, unreadCount });
});

// @desc    Mark one department notification as read for THIS account only
// @route   PATCH /api/notifications/:id/read
// @access  Private/Staff (super_admin + every employee role)
const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user.id } });
  res.status(200).json({ success: true });
});

// @desc    Mark every department notification read for THIS account only
// @route   PATCH /api/notifications/read-all
// @access  Private/Staff (super_admin + every employee role)
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  // Scope the write to the same 50-row window the bell actually shows (see
  // getMyNotifications) — an unbounded updateMany over STAFF_FACING would
  // touch every staff notification ever created on each click and grow
  // every row's readBy toward one entry per staff account permanently.
  const recent = await Notification.find(STAFF_FACING)
    .sort({ createdAt: -1 })
    .limit(50)
    .select('_id')
    .lean();
  await Notification.updateMany(
    { _id: { $in: recent.map((n) => n._id) } },
    { $addToSet: { readBy: req.user.id } }
  );
  res.status(200).json({ success: true });
});

module.exports = { getMyNotifications, markNotificationRead, markAllNotificationsRead };
