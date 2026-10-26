require('dotenv').config();

const connectDB = require('../config/db');
const Student = require('../models/Student');

// Deletes every journey remark on every student (Student.journey[].remarks
// and the old single `remark` field) so remarks can start fresh. Chat
// messages are not touched. Prints counts only unless --confirm is passed:
//
//   node scripts/clearJourneyRemarks.js            (dry run)
//   node scripts/clearJourneyRemarks.js --confirm
const run = async () => {
  await connectDB();

  const hasRemarks = {
    journey: { $elemMatch: { $or: [{ 'remarks.0': { $exists: true } }, { remark: { $nin: ['', null] } }] } },
  };
  const students = await Student.find(hasRemarks).select('journey');
  const remarkCount = students.reduce(
    (sum, s) => sum + s.journey.reduce((n, e) => n + (e.remarks?.length || 0) + (e.remark ? 1 : 0), 0),
    0
  );
  console.log(`${remarkCount} remark(s) across ${students.length} student(s).`);

  if (!process.argv.includes('--confirm')) {
    console.log('Dry run — re-run with --confirm to delete them.');
    process.exit(0);
  }

  const res = await Student.updateMany(hasRemarks, {
    $set: { 'journey.$[].remarks': [], 'journey.$[].remark': '', 'journey.$[].remarkUpdatedAt': null },
  });
  console.log(`Cleared remarks on ${res.modifiedCount} student(s).`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
