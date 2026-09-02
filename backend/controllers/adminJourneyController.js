const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');

// "rejected" is a terminal negative outcome that only makes sense on the
// visa decision stage — it drives the "Visa Rejected" pipeline filter and
// card outline. Every other stage only moves pending → in_progress →
// completed.
const REJECTABLE_STAGE = 'Visa Status Update';
const { createNotification } = require('../utils/notify');
const { resolveAccount } = require('../utils/resolveAccount');
const { emitProgressUpdate } = require('../socket');

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  // Terminal negative outcome (currently only meaningful on the "Visa
  // Status Update" stage — drives the "Visa Rejected" pipeline filter and
  // card outline on the admin side). Not counted toward journeyCompleted.
  rejected: 'Rejected',
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
  if (status === 'rejected' && title !== REJECTABLE_STAGE) {
    throw new ApiError(400, `"Rejected" can only be set on the "${REJECTABLE_STAGE}" stage`);
  }

  const student = await Student.findById(req.params.id).select('name status journey pushTokens updatedBy');
  if (!student) throw new ApiError(404, 'Student not found');
  if (student.status === 'Closed') {
    throw new ApiError(403, "This student's account is closed — reopen it before updating their journey");
  }

  const updatedAt = new Date();
  const existing = student.journey.find((stage) => stage.title === title);
  if (existing) {
    existing.status = status;
    existing.updatedAt = updatedAt;
  } else {
    student.journey.push({ title, status, updatedAt });
  }

  student.updatedBy = await resolveAccount(req.user);

  // Drives the card's Green ("Resolved") state — true only once every one
  // of the 21 stages is completed.
  const savedByTitle = new Map(student.journey.map((stage) => [stage.title, stage]));
  student.journeyCompleted = JOURNEY_STAGES.every((t) => savedByTitle.get(t)?.status === 'completed');

  // validateModifiedOnly: a stale/legacy value on an untouched enum path
  // (e.g. a student whose `status` predates the narrowed Active/Inactive/
  // Closed enum) must never block an otherwise-unrelated journey edit —
  // same reasoning as studentsController.updateStudent.
  await student.save({ validateModifiedOnly: true });

  await createNotification({
    student: student._id,
    type: 'stage_status',
    title: 'Journey Updated',
    body: `${title} is now ${STATUS_LABELS[status]}.`,
    stage: title,
  });

  // Real-time push — only after the stage status is safely persisted above.
  emitProgressUpdate(student._id, { title, status, updatedAt });

  res.status(200).json({ success: true, journey: student.journey });
});

module.exports = { getStudentJourney, updateStudentJourneyStage };
