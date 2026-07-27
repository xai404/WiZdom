const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const ApiError = require('../utils/ApiError');

// @desc    Login admin or student
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }

  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);

  res.status(200).json({
    success: true,
    token,
    user,
  });
});

// @desc    Get currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = { login, getMe };
