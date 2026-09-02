const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const { isLocked, lockRemainingMinutes, registerFailedAttempt, clearFailedAttempts } = require('../utils/loginThrottle');

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