const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const { sendMail } = require('../utils/mailer');
const { buildStudentPasswordResetEmailHtml } = require('../utils/emailTemplates');
const { generateStrongPassword } = require('../utils/generatePassword');

// @desc    Student-initiated password reset — generates a new random
//          password for the student's OWN account (see /profile in the
//          app), sets it, and emails it to them. There is no "enter your
//          old password" step by design: getting here already required a
//          valid session (protect + requireRole('student')).
// @route   POST /api/student/reset-password
// @access  Private/Student
const resetMyPassword = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const newPassword = generateStrongPassword();
  student.password = newPassword;
  await student.save({ validateModifiedOnly: true });

  try {
    await sendMail({
      to: student.email,
      subject: 'Your WiZdom Password Was Reset',
      html: buildStudentPasswordResetEmailHtml(student, newPassword),
    });
  } catch (mailErr) {
    console.error(`[Mailer] student=${student._id} email=${student.email} - password reset email failed:`, mailErr);
  }

  // Echoed back once, same reasoning as the admin-initiated reset: the
  // email is fire-and-forget above and may not arrive, so the response is
  // the only guaranteed way the student sees their own new password.
  res.status(200).json({ success: true, password: newPassword });
});

module.exports = { resetMyPassword };
