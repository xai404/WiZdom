const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { buildRemarksByStage } = require('../utils/journeyRemarks');
const { buildJourney } = require('../utils/journeySteps');

// @desc    Get the current student's study-abroad journey (read-only —
//          only Admin-side tooling is meant to ever change stage status).
//          7 steps, each with its sub-steps and a status derived from them
//          (see utils/journeySteps), plus the step's staff remarks —
//          `remarks` is the full list, `latestRemark` the newest text.
// @route   GET /api/student/journey
// @access  Private/Student
const getMyJourney = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('journey');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const remarksFor = await buildRemarksByStage(student, { forStudent: true });
  const journey = buildJourney(student, remarksFor);

  // Same reasoning as studentChatController.getMyChat — without this, a
  // cache sitting anywhere between the app and this endpoint (mobile OS
  // network cache, intermediate proxy/CDN) can serve a stale response to a
  // repeated identical GET, making a manual refresh look like it did
  // nothing.
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, journey });
});

module.exports = { getMyJourney };
