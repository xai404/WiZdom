const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { resolveAccount } = require('../utils/resolveAccount');

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// @desc    Get a student's journey (same shape studentJourneyController
//          returns to the student themselves — reused so the Admin Panel's
//          Journey tab and the Student App never drift apart).
// @route   GET /api/students/:id/journey
// @access  Private/SuperAdmin
const getStudentJourney = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select('journey');
  if (!student) throw new ApiError(404, 'Student not found');

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

// @desc    Set a stage's status for a student — the only write path onto
//          Student.journey (it's documented as read-only everywhere else).
// @route   PATCH /api/students/:id/journey
// @access  Private/SuperAdmin
const updateStudentJourneyStage = asyncHandler(async (req, res) => {
  const { title, status } = req.body;

  if (!title || !JOURNEY_STAGES.includes(title)) {
    throw new ApiError(400, 'Invalid stage title');
  }
  if (!status || !STATUS_LABELS[status]) {
    throw new ApiError(400, 'Invalid stage status');
  }

  const student = await Student.findById(req.params.id).select('name journey pushTokens updatedBy');
  if (!student) throw new ApiError(404, 'Student not found');

  const existing = student.journey.find((stage) => stage.title === title);
  if (existing) {
    existing.status = status;
    existing.updatedAt = new Date();
  } else {
    student.journey.push({ title, status, updatedAt: new Date() });
  }

  student.updatedBy = await resolveAccount(req.user);

  // Drives the card's Green ("Resolved") state — true only once every one
  // of the 21 stages is completed.
  const savedByTitle = new Map(student.journey.map((stage) => [stage.title, stage]));
  student.journeyCompleted = JOURNEY_STAGES.every((t) => savedByTitle.get(t)?.status === 'completed');

  await student.save();

  await createNotification({
    student: student._id,
    type: 'stage_status',
    title: 'Journey Updated',
    body: `${title} is now ${STATUS_LABELS[status]}.`,
    stage: title,
  });

  res.status(200).json({ success: true, journey: student.journey });
});

module.exports = { getStudentJourney, updateStudentJourneyStage };
