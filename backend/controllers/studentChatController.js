const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');

// @desc    Get the current student's single Group Chat thread
// @route   GET /api/student/chat
// @access  Private/Student
const getMyChat = asyncHandler(async (req, res) => {
  const messages = await Message.find({ student: req.user.id }).sort({ createdAt: 1 });
  res.status(200).json({ success: true, messages });
});

// @desc    Student reply inside the Group Chat, optionally tagged to a stage
// @route   POST /api/student/chat/reply
// @access  Private/Student
const postChatReply = asyncHandler(async (req, res) => {
  const { text, stage } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }
  if (stage && !JOURNEY_STAGES.includes(stage)) {
    throw new ApiError(400, 'Invalid stage');
  }

  const student = await Student.findById(req.user.id).select('name');
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  const message = await Message.create({
    student: req.user.id,
    sender: 'student',
    senderName: student.name,
    text: text.trim(),
    stage: stage || null,
  });

  res.status(201).json({ success: true, message });
});

// @desc    Mark every admin message in the current student's chat as read
// @route   POST /api/student/chat/read
// @access  Private/Student
const markChatRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { student: req.user.id, sender: 'admin', readByStudent: false },
    { $set: { readByStudent: true } }
  );
  res.status(200).json({ success: true });
});

module.exports = { getMyChat, postChatReply, markChatRead };
