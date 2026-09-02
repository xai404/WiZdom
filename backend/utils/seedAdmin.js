require('dotenv').config();

const connectDB = require('../config/db');
const Admin = require('../models/Admin');

const seed = async () => {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  // Only one Admin account is ever meant to exist — the app's "call super
  // admin" lookups (supportContactsController.js) grab it with a plain
  // findOne(), so a second admin with a different email silently breaks that.
  const existing = await Admin.findOne();
  if (existing) {
    console.log(`Admin already exists: ${existing.email} — refusing to create a second admin account.`);
    process.exit(0);
  }

  await Admin.create({ name, email, password });
  console.log(`Admin created: ${email}`);
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
