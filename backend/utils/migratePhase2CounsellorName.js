require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// One-off, idempotent migration for the "Counselled By" field change.
// assignedCounsellor used to be an ObjectId ref to Employee (resolved to a
// name via .populate()); it's now a free-text name field. Any student
// created/last-saved before that change still has the raw Employee id
// stored — with no more populate(), that now renders as a raw Mongo id
// instead of a name. This resolves each one to the employee's actual name
// (or clears it if that employee no longer exists). Operates on raw
// collections, independent of the current Mongoose schema, since older
// records may still have the field stored as an actual ObjectId type
// rather than a string. Safe to re-run.
const run = async () => {
  await connectDB();

  const students = mongoose.connection.collection('students');
  const employees = mongoose.connection.collection('employees');

  const stale = await students
    .find({
      $or: [{ assignedCounsellor: { $type: 'objectId' } }, { assignedCounsellor: { $regex: OBJECT_ID_PATTERN } }],
    })
    .toArray();

  console.log(`Found ${stale.length} student(s) with a raw Employee id in assignedCounsellor.`);

  let resolved = 0;
  let cleared = 0;

  for (const student of stale) {
    const employee = await employees.findOne({ _id: new mongoose.Types.ObjectId(student.assignedCounsellor) });
    const nextValue = employee?.name || '';
    await students.updateOne({ _id: student._id }, { $set: { assignedCounsellor: nextValue } });
    if (employee) resolved += 1;
    else cleared += 1;
  }

  console.log(`Resolved to a name: ${resolved}. Cleared (employee no longer exists): ${cleared}.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
