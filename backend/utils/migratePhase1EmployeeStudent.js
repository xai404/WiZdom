require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

// One-off, idempotent migration for the Phase 1 Employee/Student data model
// changes (department taxonomy expansion, independent permission-level
// role, student pipeline status). Operates on raw collections so it's
// independent of in-flight model changes — safe to run before or after
// deploying the updated Employee.js/Student.js. Safe to re-run.
const run = async () => {
  await connectDB();

  const employees = mongoose.connection.collection('employees');
  const students = mongoose.connection.collection('students');

  const steps = [
    [
      "employees: department 'Counsoller' -> 'Counselling'",
      () => employees.updateMany({ department: 'Counsoller' }, { $set: { department: 'Counselling' } }),
    ],
    [
      "employees: department 'Other' -> 'Support'",
      () => employees.updateMany({ department: 'Other' }, { $set: { department: 'Support' } }),
    ],
    [
      "employees: backfill role -> 'staff' for all existing docs",
      () => employees.updateMany({}, { $set: { role: 'staff' } }),
    ],
    [
      "employees: backfill designation -> '' where missing",
      () => employees.updateMany({ designation: { $exists: false } }, { $set: { designation: '' } }),
    ],
    [
      "students: isActive true -> status 'Active'",
      () => students.updateMany({ isActive: true }, { $set: { status: 'Active' } }),
    ],
    [
      "students: isActive not true -> status 'Inactive'",
      () => students.updateMany({ isActive: { $ne: true } }, { $set: { status: 'Inactive' } }),
    ],
  ];

  for (const [label, run] of steps) {
    const result = await run();
    console.log(`${label} — Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
