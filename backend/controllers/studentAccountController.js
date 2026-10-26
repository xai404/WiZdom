const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const { sendMail } = require('../utils/mailer');
const { buildStudentPasswordResetEmailHtml } = require('../utils/emailTemplates');
const { generateStrongPassword } = require('../utils/generatePassword');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

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

// @desc    Student changes their own password — must supply the current
//          password; the new one must meet the password policy.
// @route   POST /api/student/change-password
// @access  Private/Student
const changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Please fill in all the password fields.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ success: false, message: PASSWORD_POLICY_MESSAGE });
  }

  const student = await Student.findById(req.user.id).select('+password');
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const isMatch = await student.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Your current password is incorrect.' });
  }
  if (await student.comparePassword(newPassword)) {
    return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
  }

  student.password = newPassword;
  await student.save({ validateModifiedOnly: true });

  res.status(200).json({ success: true, message: 'Your password has been changed.' });
});

module.exports = { resetMyPassword, changeMyPassword };
