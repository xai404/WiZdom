require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

const run = async () => {
  await connectDB();

  const result = await mongoose.connection.collection('admins').updateOne(
    { email: process.env.SEED_ADMIN_EMAIL },
    { $set: { role: 'super_admin' } }
  );

  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});