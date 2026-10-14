require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

// One-off, idempotent migration for the department taxonomy change to
// Application / Editing / Loan and Forex / Admin / Visa:
//   Finance      -> Loan and Forex
//   Counselling  -> Admin (Counselling department removed)
// Run this BEFORE (or right after) deploying the updated Employee.js —
// Employee.department, Message.department and Student.responsibleDepartment
// are enum-validated, so a doc still holding an old value fails its next
// save. Operates on raw collections; safe to re-run.
const RENAMES = [
  ['Finance', 'Loan and Forex'],
  ['Counselling', 'Admin'],
];

const run = async () => {
  await connectDB();

  const db = mongoose.connection;
  const targets = [
    ['employees', 'department'],
    ['messages', 'department'],
    // Student-facing sender label — stores the department name for staff
    // messages, so old threads would otherwise still show "Finance" etc.
    ['messages', 'senderRole'],
    ['notifications', 'department'],
    ['students', 'responsibleDepartment'],
  ];

  for (const [collection, field] of targets) {
    for (const [from, to] of RENAMES) {
      const result = await db
        .collection(collection)
        .updateMany({ [field]: from }, { $set: { [field]: to } });
      console.log(
        `${collection}.${field}: '${from}' -> '${to}' — Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
      );
    }
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
