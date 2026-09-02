const mongoose = require('mongoose');
const { JOURNEY_STAGES } = require('../constants/journeyStages');
const Employee = require('./Employee');

// The single Group Chat thread lives here — one document per message, all
// scoped to a student. `stage` is the only thing that ties a message back to
// the journey: when set, that message *is* the stage's latest remark (see
// studentJourneyController.getMyJourney). There is deliberately no separate
// "remark" model — duplicating that data would let it drift from the chat.
const messageSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['admin', 'student'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    // The actual Admin/Employee account that sent this (null for student
    // messages) — lets the Admin Panel tell "a message I sent" apart from
    // "a message a different staff member sent", which senderName/senderRole
    // alone can't do (two staff can share a display name or department).
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Student-facing label for who sent this ("Admin", "Counselling",
    // "Editing"...) — set only for sender:'admin' messages. The Student App
    // shows this instead of senderName, so an individual staff member's
    // personal name is never exposed to a student; the Admin Panel's own
    // chat view still shows senderName for internal accountability.
    senderRole: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
    stage: {
      type: String,
      enum: [...JOURNEY_STAGES, null],
      default: null,
    },
    // Department tag — orthogonal to `stage` (a message can carry either,
    // both, or neither). Setting this is what puts the student's
    // accountability status into "awaiting reply" — see
    // adminChatController.postAdminMessage.
    department: {
      type: String,
      enum: [...Employee.DEPARTMENTS, null],
      default: null,
    },
    // Whether the student has read this message — only meaningful for
    // admin-sent messages (a student's own message is trivially "read" by
    // them already).
    readByStudent: {
      type: Boolean,
      default: function defaultReadByStudent() {
        return this.sender === 'student';
      },
    },
    // Mirror of the above for the other direction — whether staff have read
    // this message. Only meaningful for student-sent messages (an admin's
    // own message is trivially "read" by them). Drives the sent/read tick
    // color in the Student App, same as readByStudent drives the unread
    // badge there.
    readByAdmin: {
      type: Boolean,
      default: function defaultReadByAdmin() {
        return this.sender === 'admin';
      },
    },
    // Soft delete — the row (and its text) is kept for the internal audit
    // trail; only the frontend enforces hiding it, always rendering a
    // tombstone in place of `text` when this is true.
    deleted: {
      type: Boolean,
      default: false,
    },
    // Set once a staff member edits their own message's text within the
    // 10-minute edit window (see adminChatController.editAdminMessage) —
    // surfaced as an "edited" label next to the timestamp so the change
    // isn't silent.
    edited: {
      type: Boolean,
      default: false,
    },
    // Structural reply — the quoted message. Resolved client-side against
    // the already-loaded thread rather than populated here, so a later
    // soft-delete of the quoted message is reflected live.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Staff-only bookmark, surfaced as a banner at the top of the Admin
    // Panel's chat view — any staff member can pin/unpin any message
    // (either side's), it's non-destructive so there's no need to restrict
    // it the way delete is. Never shown in the Student App.
    pinned: {
      type: Boolean,
      default: false,
    },
    // Every participant (the student's own id, or an Employee/Admin _id)
    // who has read this message — seeded with the sender's own identity at
    // creation (trivially "read" by whoever sent it), then grown via
    // $addToSet whenever another participant views the thread. Compared
    // against the CURRENT set of active participants to compute the
    // WhatsApp-group-style "read by everyone" blue tick — see
    // utils/chatReadStatus.js. Internal only; never sent to clients as-is.
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
