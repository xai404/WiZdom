const nodemailer = require('nodemailer');

// Built lazily (on first send, not at import time) because dotenv.config()
// in server.js runs after this module's require()s are resolved — reading
// process.env.SMTP_* at the top level here would capture undefined values.
let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email is not configured — set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASS in backend/.env.'
    );
  }

  // Hostinger Business Email SMTP — SMTP_USER/SMTP_PASS are the mailbox's
  // normal login credentials (no app password involved).
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  return cachedTransporter;
};

// Single reusable send function — every feature that needs to email
// someone (student welcome emails, future notifications) goes through here.
const sendMail = async ({ to, subject, html }) => {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: '"WiZdom" <support@wizdomed.in>',
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  });
};

module.exports = { sendMail };
