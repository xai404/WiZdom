const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const { isLocked, lockRemainingMinutes, registerFailedAttempt, clearFailedAttempts } = require('../utils/loginThrottle');
const { sendMail } = require('../utils/mailer');
const { buildPasswordResetOtpEmailHtml, buildForgotPasswordNewPasswordEmailHtml } = require('../utils/emailTemplates');
const { generateStrongPassword } = require('../utils/generatePassword');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check Admin collection first
    let account = await Admin.findOne({ email: normalizedEmail }).select('+password');
    let accountType = 'admin';

    // 2. Fall back to Employee collection
    if (!account) {
      account = await Employee.findOne({ email: normalizedEmail }).select('+password');
      accountType = 'employee';
    }

    // 3. Fall back to Student collection (includes accounts the CRM
    // provisions on lead conversion — see Student.js's crmStudentId field)
    if (!account) {
      account = await Student.findOne({ email: normalizedEmail }).select('+password');
      accountType = 'student';
    }

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (accountType !== 'admin' && account.isActive === false) {
      const message =
        accountType === 'student'
          ? 'Your account has been closed. Please contact the helpline for assistance.'
          : 'This account has been closed by the administrator';
      return res.status(403).json({ success: false, message });
    }

    if (isLocked(account)) {
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Try again in ${lockRemainingMinutes(account)} minute(s).`,
      });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      await registerFailedAttempt(account);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    clearFailedAttempts(account);
    account.lastLoginAt = new Date();
    // validateModifiedOnly: some Employee records predate the current
    // department/role enum (e.g. legacy "counsellor"/"application_team").
    // A full-document save() here would fail on that stale field and block
    // login entirely, even though only lastLoginAt is being touched.
    await account.save({ validateModifiedOnly: true });

    const token = generateToken(account._id, account.role);

    return res.status(200).json({
      success: true,
      token,
      user: account.toSafeObject(),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    // req.user is expected to be set by the `protect` middleware after verifying the JWT
    const { id, role } = req.user;

    const model = role === 'super_admin' ? Admin : role === 'student' ? Student : Employee;
    const account = await model.findById(id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user: account.toSafeObject() });
  } catch (err) {
    console.error('Fetch current user error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};

// @desc    Update the logged-in account's own profile (name/phone/photo).
//          Works for whichever collection the JWT role maps to — same
//          role-to-model routing as getMe.
// @route   PATCH /api/auth/me
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const model = role === 'super_admin' ? Admin : role === 'student' ? Student : Employee;
    const account = await model.findById(id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone } = req.body;
    if (name !== undefined) account.name = name;
    if (phone !== undefined) account.phone = phone;
    if (req.file) account.profilePicture = `/uploads/profiles/${req.file.filename}`;

    // Same reasoning as login(): don't let a stale, pre-enum
    // department/role value on this record block an unrelated self-edit.
    await account.save({ validateModifiedOnly: true });

    return res.status(200).json({ success: true, user: account.toSafeObject() });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};
// @desc    Forgot password, step 1 — the email must match an existing
//          student account. Emails a 6-digit OTP (hash stored on the
//          student, valid for OTP_EXPIRY_MINUTES).
// @route   POST /api/auth/forgot-password
// @access  Public (rate-limited in authRoutes)
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const normalizedEmail = req.body.email.trim().toLowerCase();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }
    if (student.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been closed. Please contact the helpline for assistance.',
      });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    student.resetOtpHash = await bcrypt.hash(otp, 10);
    student.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    student.resetOtpAttempts = 0;
    await student.save({ validateModifiedOnly: true });

    try {
      await sendMail({
        to: student.email,
        subject: 'Your WiZdom Password Reset Code',
        html: buildPasswordResetOtpEmailHtml(student, otp, OTP_EXPIRY_MINUTES),
      });
    } catch (mailErr) {
      console.error(`[Mailer] student=${student._id} - password reset OTP email failed:`, mailErr);
      return res.status(502).json({ success: false, message: 'Could not send the verification code. Please try again.' });
    }

    return res.status(200).json({ success: true, message: `A verification code has been sent to ${student.email}.` });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Forgot password, step 2 — verifies the OTP, then generates a new
//          password, sets it and emails it to the student.
// @route   POST /api/auth/verify-reset-otp
// @access  Public (rate-limited in authRoutes)
exports.verifyResetOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const normalizedEmail = req.body.email.trim().toLowerCase();
    const otp = String(req.body.otp).trim();
    const student = await Student.findOne({ email: normalizedEmail }).select(
      '+resetOtpHash +resetOtpExpires +resetOtpAttempts'
    );

    if (!student || !student.resetOtpHash || !student.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code. Please request a new one.' });
    }
    if (student.resetOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    }
    if (student.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(otp, student.resetOtpHash);
    if (!isMatch) {
      student.resetOtpAttempts += 1;
      await student.save({ validateModifiedOnly: true });
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    const newPassword = generateStrongPassword();
    student.password = newPassword;
    student.resetOtpHash = null;
    student.resetOtpExpires = null;
    student.resetOtpAttempts = 0;
    // A successful reset also lifts any login lockout.
    clearFailedAttempts(student);
    await student.save({ validateModifiedOnly: true });

    try {
      await sendMail({
        to: student.email,
        subject: 'Your New WiZdom Password',
        html: buildForgotPasswordNewPasswordEmailHtml(student, newPassword),
      });
    } catch (mailErr) {
      console.error(`[Mailer] student=${student._id} - new password email failed:`, mailErr);
    }

    // Echoed back once (same reasoning as studentAccountController's
    // reset): the email may not arrive, so the response is the only
    // guaranteed way the student sees the new password.
    return res.status(200).json({ success: true, password: newPassword });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};
