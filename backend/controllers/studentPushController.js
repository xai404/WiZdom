const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

// @desc    Register (or refresh) this device's Expo push token. Idempotent —
//          safe to call on every app foreground/login.
// @route   POST /api/student/push-token
// @access  Private/Student
const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'A push token is required');
  }

  await Student.updateOne(
    { _id: req.user.id },
    { $addToSet: { pushTokens: token } }
  );

  res.status(200).json({ success: true });
});

module.exports = { registerPushToken };
