// Dev-only helper: there is no Admin UI yet for tagging Group Chat messages
// to a stage, so this seeds a realistic conversation directly into MongoDB
// for a given student — enough to see tagged remarks and smart-scroll
// navigation working end-to-end. Not wired into the server; run manually:
//
//   node utils/seedChatDemo.js student@example.com
//
require('dotenv').config();

const connectDB = require('../config/db');
const Student = require('../models/Student');
const Message = require('../models/Message');

const COUNSELLOR_NAME = 'Aditi Sharma';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(msAgo) {
  return new Date(Date.now() - msAgo);
}

const JOURNEY_OVERRIDES = [
  { title: 'Career Counselling', status: 'completed' },
  { title: 'Country & Course Guidance', status: 'completed' },
  { title: 'Student Registration', status: 'completed' },
  { title: 'Test Prep', status: 'completed' },
  { title: 'Documentation', status: 'in_progress' },
  { title: 'University Shortlisting', status: 'in_progress' },
  { title: 'Offer Letters', status: 'completed' },
];

function buildMessages(studentId, studentName) {
  const admin = (text, stage, msAgo) => ({
    student: studentId,
    sender: 'admin',
    senderName: COUNSELLOR_NAME,
    text,
    stage: stage || null,
    readByStudent: false,
    createdAt: ago(msAgo),
  });
  const student = (text, stage, msAgo) => ({
    student: studentId,
    sender: 'student',
    senderName: studentName,
    text,
    stage: stage || null,
    readByStudent: true,
    createdAt: ago(msAgo),
  });

  return [
    admin(`Hi ${studentName}, welcome aboard! I'm Aditi, your counsellor — I'll be with you at every step.`, null, 6 * DAY),
    student("Thank you so much, looking forward to it!", null, 6 * DAY - 20 * MIN),

    admin('Congratulations! Your offer letter has arrived.', 'Offer Letters', 5 * DAY + 6 * HOUR),
    student("That's amazing news, thank you!", 'Offer Letters', 5 * DAY + 5 * HOUR + 50 * MIN),
    admin('Great. Once verified we will continue.', 'Offer Letters', 5 * DAY + 5 * HOUR + 30 * MIN),

    admin('Hello, please upload your passport copy.', 'Documentation', 2 * DAY + 3 * HOUR),
    student("Sure, I'll upload it today.", 'Documentation', 2 * DAY + 2 * HOUR + 48 * MIN),
    admin('Great. Once verified we will continue.', 'Documentation', 2 * DAY + 2 * HOUR + 25 * MIN),
    admin('Passport uploaded?', 'Documentation', 3 * HOUR),

    admin("We're shortlisting a few strong-fit universities for you based on your scores.", 'University Shortlisting', 26 * HOUR),

    admin('Need updated bank statement.', 'Visa Documentation', 22 * HOUR),
  ].map((entry) => ({ ...entry }));
}

async function seed() {
  await connectDB();

  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node utils/seedChatDemo.js <studentEmail>');
    process.exit(1);
  }

  const student = await Student.findOne({ email });
  if (!student) {
    console.error(`No student found with email: ${email}`);
    process.exit(1);
  }

  const existingCount = await Message.countDocuments({ student: student._id });
  if (existingCount > 0) {
    console.log(`${email} already has ${existingCount} chat messages — skipping (delete them first to reseed).`);
    process.exit(0);
  }

  student.journey = JOURNEY_OVERRIDES.map((entry) => ({ ...entry, updatedAt: new Date() }));
  await student.save();

  const messages = buildMessages(student._id, student.name);
  await Message.insertMany(messages);

  console.log(`Seeded ${messages.length} chat messages and journey statuses for ${email}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
