const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { login, getMe, updateMe } = require('../controllers/authController');
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

router.get('/me', protect, getMe);
router.patch('/me', protect, profileUpload.single('profilePicture'), verifyUploadedImage, updateMe);

module.exports = router;
