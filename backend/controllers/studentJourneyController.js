const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');

// @desc    Get the current student's study-abroad journey (read-only —
//          only Admin-side tooling is meant to ever change stage status)
// @route   GET /api/student/journey
// @access  Private/Student
const getMyJourney = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('journey');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const savedByTitle = new Map(student.journey.map((stage) => [stage.title, stage]));

  const journey = JOURNEY_STAGES.map((title) => {
    const saved = savedByTitle.get(title);
    return {
      title,
      status: saved?.status || 'pending',
      updatedAt: saved?.updatedAt || null,
    };
  });

  res.status(200).json({ success: true, journey });
});

module.exports = { getMyJourney };
