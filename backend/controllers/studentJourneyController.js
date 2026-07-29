const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');

// @desc    Get the current student's study-abroad journey (read-only —
//          only Admin-side tooling is meant to ever change stage status).
//          Each stage's remark is simply the latest Group Chat message
//          tagged with that stage — there is no separate remark to manage.
// @route   GET /api/student/journey
// @access  Private/Student
const getMyJourney = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('journey');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const savedByTitle = new Map(student.journey.map((stage) => [stage.title, stage]));

  // One latest tagged message per stage, in a single query.
  const latestByStage = await Message.aggregate([
    { $match: { student: student._id, stage: { $ne: null } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$stage', text: { $first: '$text' }, createdAt: { $first: '$createdAt' } } },
  ]);
  const remarkByStage = new Map(latestByStage.map((row) => [row._id, row]));

  const journey = JOURNEY_STAGES.map((title) => {
    const saved = savedByTitle.get(title);
    const remark = remarkByStage.get(title);
    return {
      title,
      status: saved?.status || 'pending',
      latestRemark: remark?.text || null,
      updatedAt: remark?.createdAt || saved?.updatedAt || null,
    };
  });

  res.status(200).json({ success: true, journey });
});

module.exports = { getMyJourney };
