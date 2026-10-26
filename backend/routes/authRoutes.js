const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { login, getMe, updateMe, forgotPassword, verifyResetOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { profileUpload, verifyUploadedImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Per-IP throttle, on top of the per-account lockout in authController.login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts from this device. Please try again later.' },
});

router.post(
  '/login',
  loginLimiter,
  [
    // Deliberately no .normalizeEmail() — validator's default Gmail rules
    // strip dots/+suffixes (e.g. "priya.sharma@gmail.com" ->
    // "priyasharma@gmail.com"), which doesn't match how emails are actually
    // stored (schemas only lowercase+trim). authController.login does its
    // own trim().toLowerCase() that matches storage instead.
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// Forgot-password OTP flow — unauthenticated, so throttled per IP.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().withMessage('A valid email is required')],
  forgotPassword
);

router.post(
  '/verify-reset-otp',
  forgotPasswordLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your email'),
  ],
  verifyResetOtp
);

router.get('/me', protect, getMe);
router.patch('/me', protect, profileUpload.single('profilePicture'), verifyUploadedImage, updateMe);

module.exports = router;
