require('dotenv').config();

const connectDB = require('../config/db');
const Student = require('../models/Student');
const Message = require('../models/Message');

// One-time backfill for the Student.lastMessageAt field (added so the
// Students list can sort by most-recent-conversation). For every student,
// set it to the createdAt of their newest Group Chat message, or — if they
// have no messages — to the student record's own createdAt. New students
// and every message sent from now on keep it current automatically; this
// only exists to seed records that predate the field.
const run = async () => {
  await connectDB();

  const students = await Student.find().select('_id createdAt lastMessageAt');
  let updated = 0;

  for (const student of students) {
    const latest = await Message.findOne({ student: student._id })
      .sort({ createdAt: -1 })
      .select('createdAt');

    const nextValue = latest ? latest.createdAt : student.createdAt;
    if (student.lastMessageAt && student.lastMessageAt.getTime() === nextValue.getTime()) continue;

    await Student.updateOne({ _id: student._id }, { $set: { lastMessageAt: nextValue } });
    updated += 1;
  }

  console.log(`Backfilled lastMessageAt on ${updated} of ${students.length} student(s).`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
