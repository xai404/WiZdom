const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { sendPushToStudent } = require('./pushService');
const { emitStaffNotification, emitStudentNotification } = require('../socket');

// Central "something happened to this student" hook — writes the in-app
// Notification row and best-effort fires an Expo push. Never throws: a
// notification failure must never fail the admin action that triggered it
// (stage update / chat message), same defensive posture as sendMail calls
// elsewhere in this codebase.
async function createNotification({ student: studentId, type, title, body, stage = null, department = null }) {
  try {
    const notification = await Notification.create({ student: studentId, type, title, body, stage, department });
    console.log(`[notify] created notification student=${studentId} type=${type} department=${department ?? 'null'}`);

    // Department notifications are staff-facing (read via the admin
    // notification bell) — there's no push channel for staff, so skip the
    // student push entirely for these, and instead nudge the bell over the
    // socket so it updates in real time. Student-facing notifications
    // (department left null) keep the existing push behavior unchanged.
    if (department) {
      emitStaffNotification(notification);
    } else {
      // Real-time nudge to the student's app (bell + Notifications screen),
      // independent of the Expo push below which can silently never arrive.
      emitStudentNotification(notification, studentId);

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
