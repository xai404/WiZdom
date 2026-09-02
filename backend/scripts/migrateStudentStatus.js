require('dotenv').config();

const connectDB = require('../config/db');
const Student = require('../models/Student');

// One-time migration for the Student.status enum, which was narrowed from
// ['Active', 'Inactive', 'Converted', 'Lead', 'Follow Up', 'Closed'] down to
// ['Active', 'Inactive', 'Closed']. Any legacy record still holding a retired
// value renders the wrong option in StudentForm and never matches the
// status/milestone filters. Map the retired pipeline labels onto 'Active'
// (they were all "still an active student, somewhere in the funnel" — none of
// them disabled login, unlike Inactive/Closed).
//
// Run once, after deploying the narrowed enum:  node scripts/migrateStudentStatus.js
const RETIRED = ['Converted', 'Lead', 'Follow Up'];

const run = async () => {
  await connectDB();

  const res = await Student.updateMany(
    { status: { $in: RETIRED } },
    { $set: { status: 'Active' } }
  );

  console.log(`Migrated ${res.modifiedCount} student(s) off a retired status value.`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
