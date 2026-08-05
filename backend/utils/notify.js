const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { sendPushToStudent } = require('./pushService');

// Central "something happened to this student" hook — writes the in-app
// Notification row and best-effort fires an Expo push. Never throws: a
// notification failure must never fail the admin action that triggered it
// (stage update / chat message), same defensive posture as sendMail calls
// elsewhere in this codebase.
async function createNotification({ student: studentId, type, title, body, stage = null, department = null }) {
  try {
    await Notification.create({ student: studentId, type, title, body, stage, department });

    // Department notifications are staff-facing (read via the admin
    // notification bell) — there's no push channel for staff, so skip the
    // student push entirely for these. Student-facing notifications
    // (department left null) keep the existing push behavior unchanged.
    if (!department) {
      const student = await Student.findById(studentId).select('pushTokens');
      if (student) {
        await sendPushToStudent(student, { title, body, data: { type, stage } });
      }
    }
  } catch (err) {
    console.error(`[notify] student=${studentId} type=${type} - failed:`, err);
  }
}

module.exports = { createNotification };
