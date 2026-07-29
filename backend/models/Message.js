const mongoose = require('mongoose');
const { JOURNEY_STAGES } = require('../constants/journeyStages');

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
    readByStudent: {
      type: Boolean,
      default: function defaultReadByStudent() {
        return this.sender === 'student';
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
