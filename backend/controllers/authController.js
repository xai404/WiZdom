const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
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

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (accountType === 'employee' && account.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    account.lastLoginAt = new Date();
    await account.save();

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

    const model = role === 'super_admin' ? Admin : Employee;
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