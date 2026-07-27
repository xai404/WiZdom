const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');

// @desc    Get summary stats for the admin dashboard
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getStats = asyncHandler(async (req, res) => {
  const [totalStudents, activeStudents] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalStudents,
      activeStudents,
    },
  });
});

module.exports = { getStats };
