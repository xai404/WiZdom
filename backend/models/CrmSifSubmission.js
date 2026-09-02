const mongoose = require('mongoose');
const { getCrmConnection } = require('../config/crmDb');

// Read-only view of the CRM's `sifsubmissions` collection (see
// E:\CRM\backend\models\SifSubmission.js). Only the fields WiZdom mirrors
// into Student.sif.interestForm are declared; strict:false keeps the rest.
const crmSifSubmissionSchema = new mongoose.Schema(
  {
    applicantName: String,
    mobile: String,
    alternateContact: String,
    email: String,
    preferredCountries: [String],
    preferredStreams: [String],
    budget: String,
    preferredIntake: String,
    hearAboutUs: String,
    giftChoice: String,
    entranceTestSupport: [String],
    admissionSupport: [String],
    agreedToTerms: Boolean,
    createdAt: Date,
  },
  { collection: 'sifsubmissions', strict: false }
);

let cachedModel = null;

// null when CRM_MONGO_URI isn't configured — callers must handle that and
// carry on without the pre-filled block.
const getCrmSifSubmissionModel = () => {
  if (cachedModel) return cachedModel;

  const connection = getCrmConnection();
  if (!connection) return null;

  cachedModel =
    connection.models.CrmSifSubmission ||
    connection.model('CrmSifSubmission', crmSifSubmissionSchema);
  return cachedModel;
};

module.exports = { getCrmSifSubmissionModel };
