const mongoose = require('mongoose');

// Lazy, isolated, read-only connection to the CRM's MongoDB. Used only to
// pull a student's Student Interest Form answers across on a phone-number
// match (see utils/crmSif.js) — WiZdom never writes to the CRM.
//
// Deliberately separate from the app's own connection (config/db.js) via
// mongoose.createConnection() so a CRM outage or a missing CRM_MONGO_URI
// can never take down WiZdom's own DB — in that case the SIF screen simply
// renders without the pre-filled interest-form block.
let cachedConnection = null;

const getCrmConnection = () => {
  if (cachedConnection) return cachedConnection;

  const uri = process.env.CRM_MONGO_URI;
  if (!uri) return null;

  cachedConnection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 3000,
    family: 4,
  });
  cachedConnection.on('error', (err) => {
    console.error('[CRM DB] connection error:', err.message);
  });

  return cachedConnection;
};

module.exports = { getCrmConnection };
