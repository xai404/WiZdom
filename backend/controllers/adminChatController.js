const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const { createNotification } = require('../utils/notify');
const { sendPushToStudent } = require('../utils/pushService');
const { resolveAccount } = require('../utils/resolveAccount');
const { getActiveParticipantIds, attachReadStatus } = require('../utils/chatReadStatus');
const { emitChatMessage } = require('../socket');

// @desc    Get a student's Group Chat thread (admin-side view of the same
//          single shared conversation the Student App reads/writes).
//          Viewing it is treated as reading it — the viewing staff member
//          is added to every message's readBy (this, plus every OTHER
//          active staff account and the student having also read a given
//          message, is what turns its tick blue — a WhatsApp-group-style
//          "read by everyone", not just "read by someone"). readByAdmin is
//          also still bulk-set on student messages, kept for whatever else
//          still reads that simpler boolean.
// @route   GET /api/students/:id/chat
// @access  Private/Staff (super_admin + every employee role)
const getStudentChat = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).select('_id');
  if (!student) throw new ApiError(404, 'Student not found');

  // Mark read BEFORE fetching — so this viewer's own readBy entry is
  // already reflected in the fullyRead status computed below, rather than
  // showing stale (missing their own just-now read) until their next poll.
  await Promise.all([
    Message.updateMany({ student: student._id }, { $addToSet: { readBy: req.user.id } }),
    Message.updateMany(
      { student: student._id, sender: 'student', readByAdmin: false },
      { $set: { readByAdmin: true } }
    ),
  ]);

  const messages = await Message.find({ student: student._id }).sort({ createdAt: 1 });

  const participantIds = await getActiveParticipantIds(student._id);
  const withStatus = attachReadStatus(messages, participantIds, student._id);

  res.status(200).json({ success: true, messages: withStatus });
});

// @desc    Send a message into a student's Group Chat, optionally tagged to
//          a journey stage and/or a department. A stage-tagged message *is*
//          that stage's remark (see studentJourneyController.getMyJourney)
//          — an untagged message is just a normal chat message, per spec.
//          Any staff account (super_admin or any employee role) can send.
//
//          Department accountability state machine (see the Students module
//          accountability-system plan):
//          - An explicit department tag opens (or re-routes) the pending
//            request: responsibleDepartment/awaitingReply/awaitingSince are
//            set, no manual assignment needed.
//          - Otherwise, if the sender is an employee (not super_admin)
//            whose own department matches the student's current
//            responsibleDepartment, and it's still awaiting a reply, this
//            message IS that reply — it auto-resolves (awaitingReply
//            false, lastHandledBy/lastHandledAt stamped). The first
//            employee from the tagged department to reply becomes the
//            handler; nobody assigns this manually.
//          - Any other message (unrelated department, no tag) leaves the
//            accountability state untouched — it's just chat.
// @route   POST /api/students/:id/chat
// @access  Private/Staff (super_admin + every employee role)
const postAdminMessage = asyncHandler(async (req, res) => {
  const { text, stage, replyTo, department } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }
  if (stage && !JOURNEY_STAGES.includes(stage)) {
    throw new ApiError(400, 'Invalid stage');
  }
  if (department && !Employee.DEPARTMENTS.includes(department)) {
    throw new ApiError(400, 'Invalid department');
  }

  const student = await Student.findById(req.params.id).select('name responsibleDepartment awaitingReply pushTokens');
  if (!student) throw new ApiError(404, 'Student not found');

  if (replyTo) {
    const target = await Message.findOne({ _id: replyTo, student: student._id }).select('_id');
    if (!target) throw new ApiError(400, 'Invalid reply target');
  }

  const sender = await resolveAccount(req.user);
  // Employees' resolveAccount().displayRole IS their department; super_admin
  // has no department of its own, so their replies never auto-resolve a tag.
  const senderDepartment = req.user.role === 'super_admin' ? null : sender.displayRole;

  const message = await Message.create({
    student: student._id,
    sender: 'admin',
    senderName: sender.name,
    senderRole: sender.displayRole,
    senderId: sender.id,
    text: text.trim(),
    stage: stage || null,
    department: department || null,
    replyTo: replyTo || null,
    // Trivially "read" by whoever sent it — see readBy on Message.js.
    readBy: [sender.id],
  });

  const studentUpdate = {};
  let departmentTagged = false;

  // A stage-tagged message is a remark, i.e. it counts as updating the
  // student's journey — stamp the record-level audit field. An untagged
  // message is just chat, so it doesn't touch this.
  if (stage) {
    studentUpdate.updatedBy = sender;
  }

  if (department) {
    studentUpdate.responsibleDepartment = department;
    studentUpdate.awaitingReply = true;
    studentUpdate.awaitingSince = new Date();
    studentUpdate.awaitingSinceMessageId = message._id;
    departmentTagged = true;
  } else if (senderDepartment && student.responsibleDepartment === senderDepartment && student.awaitingReply) {
    studentUpdate.awaitingReply = false;
    studentUpdate.awaitingSinceMessageId = null;
    studentUpdate.lastHandledBy = { id: sender.id, name: sender.name, department: senderDepartment };
    studentUpdate.lastHandledAt = new Date();
  }

  if (Object.keys(studentUpdate).length) {
    await Student.updateOne({ _id: student._id }, { $set: studentUpdate });
  }

  // Chat messages get a phone push (so the student is alerted even when
  // the app isn't open) but deliberately do NOT create a Notification
  // document the way stage/journey updates do — the in-app Notifications
  // screen must only ever show journey/application updates, never chat
  // content (chat already has its own real-time delivery + unread badge).
  try {
    await sendPushToStudent(student, {
      title: stage ? `New remark on ${stage}` : 'New message',
      body: text.trim(),
      data: { type: 'chat_message', stage: stage || null },
    });
  } catch (err) {
    console.error(`[adminChatController] push to student=${student._id} failed:`, err);
  }

  if (departmentTagged) {
    await createNotification({
      student: student._id,
      type: 'department_tag',
      title: `${department} Team tagged`,
      body: text.trim(),
      department,
    });
  }

  const participantIds = await getActiveParticipantIds(student._id);
  const [withStatus] = attachReadStatus([message], participantIds, student._id);

  // Real-time push — only after the message is safely persisted above.
  emitChatMessage(withStatus, student._id);

  res.status(201).json({ success: true, message: withStatus });
});

// @desc    Soft-delete a message in a student's Group Chat. The row (and its
//          text) is kept in the DB for the audit trail — only the frontend
//          hides it, rendering a "This message was deleted" tombstone in
//          place of the text whenever `deleted` is true.
// @route   DELETE /api/students/:id/chat/:messageId
// @access  Private/Staff (super_admin + every employee role)
const deleteAdminMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, student: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  if (!message.deleted) {
    message.deleted = true;
    await message.save();
  }

  res.status(200).json({ success: true, message });
});

// @desc    Toggle whether a message is pinned — surfaced as a banner at the
//          top of the Admin Panel's chat view. Any staff member can
//          pin/unpin any message; it's a non-destructive bookmark, so
//          there's no "who pinned it" tracking, unlike delete.
// @route   PATCH /api/students/:id/chat/:messageId/pin
// @access  Private/Staff (super_admin + every employee role)
const togglePinMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, student: req.params.id });
  if (!message) throw new ApiError(404, 'Message not found');

  message.pinned = !message.pinned;
  await message.save();

  res.status(200).json({ success: true, message });
});

module.exports = { getStudentChat, postAdminMessage, deleteAdminMessage, togglePinMessage };
