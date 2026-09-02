const mongoose = require('mongoose');

// One row per event the student should see in their in-app feed (and, via
// utils/notify.js, an Expo push alongside it). Deliberately denormalized
// (title/body baked in at creation time) rather than derived at read-time —
// keeps the feed stable even if the underlying stage/message is edited later.
const notificationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['stage_status', 'remark', 'message', 'department_tag'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      default: null,
    },
    // Set = this is a staff-facing notification for the given department
    // (see adminNotificationController.js); null = the existing
    // student-facing notification, unchanged.
    department: {
      type: String,
      default: null,
    },
    // Student-facing feed only (department: null): a single account owns the
    // row, so one boolean is enough. Staff-facing rows (department set) use
    // `readBy` below instead — every staff account sees the same row and
    // each marks it read independently.
    read: {
      type: Boolean,
      default: false,
    },
    // Per-account read tracking for STAFF-facing notifications. Holds the
    // Admin/Employee _id of every staff member who has marked this row read;
    // the admin bell derives its per-user `read` flag and unread count from
    // whether the requesting account's id is in here. Never used for
    // student-facing rows.
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
