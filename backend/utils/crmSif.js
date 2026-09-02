const { getCrmSifSubmissionModel } = require('../models/CrmSifSubmission');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) =>
  Array.isArray(v) ? [...new Set(v.map(str).filter(Boolean))] : [];

// True when the interest-form block still holds nothing a student or admin
// could have typed — i.e. it's safe to auto-fill from the CRM without
// clobbering someone's edits.
const isInterestFormUnseeded = (form) => {
  if (!form) return true;
  if (form.sourcedFromCrmAt) return false;
  const values = [
    form.applicantName,
    form.mobile,
    form.email,
    form.budget,
    form.preferredIntake,
    form.hearAboutUs,
    form.giftChoice,
    form.alternateContact,
    ...(form.preferredCountries || []),
    ...(form.preferredStreams || []),
    ...(form.entranceTestSupport || []),
    ...(form.admissionSupport || []),
  ];
  return !values.some((v) => str(v));
};

const buildInterestForm = (sub) => ({
  applicantName: str(sub.applicantName),
  mobile: str(sub.mobile),
  email: str(sub.email),
  preferredCountries: strList(sub.preferredCountries),
  preferredStreams: strList(sub.preferredStreams),
  budget: str(sub.budget),
  preferredIntake: str(sub.preferredIntake),
  hearAboutUs: str(sub.hearAboutUs),
  giftChoice: str(sub.giftChoice),
  entranceTestSupport: strList(sub.entranceTestSupport),
  admissionSupport: strList(sub.admissionSupport),
  alternateContact: str(sub.alternateContact),
  agreedToTerms: sub.agreedToTerms === true,
  sourcedFromCrmAt: new Date(),
});

// Circuit breaker: if a CRM lookup fails (unreachable / times out), stop
// trying for a cooldown window so we don't make every "open student", SIF
// screen load and account-creation eat the driver's server-selection
// timeout while the CRM DB is down.
const CRM_FAIL_COOLDOWN_MS = 60_000;
let crmCircuitOpenUntil = 0;

// Negative-result cache: a student whose phone has no CRM submission stays
// unseeded forever, and getStudentById runs on every 6.5s chat-poll tick
// while a detail panel is open — without this, every one of those ticks
// fires a cross-DB findOne for nothing. Keyed by phone; short TTL so a
// submission created later still gets picked up on the next open.
const CRM_MISS_TTL_MS = 10 * 60_000;
const crmMissByPhone = new Map();

// If this student's phone number matches a CRM Student Interest Form and
// their WiZdom interest-form block hasn't been filled yet, copy the CRM
// answers onto `student.sif.interestForm` and persist. No conversion / lead
// status is checked — a phone match is all it takes.
//
// Returns true if it wrote anything. Never throws: any CRM-side problem
// (unconfigured, unreachable, slow) is logged and swallowed so the SIF
// screen still loads.
const syncInterestFormFromCrm = async (student) => {
  try {
    if (!student || !student.phone) return false;
    if (Date.now() < crmCircuitOpenUntil) return false;

    const missAt = crmMissByPhone.get(student.phone);
    if (missAt && Date.now() - missAt < CRM_MISS_TTL_MS) return false;

    const currentForm =
      student.sif && student.sif.interestForm
        ? typeof student.sif.interestForm.toObject === 'function'
          ? student.sif.interestForm.toObject()
          : student.sif.interestForm
        : null;
    if (!isInterestFormUnseeded(currentForm)) return false;

    const CrmSifSubmission = getCrmSifSubmissionModel();
    if (!CrmSifSubmission) return false;

    let submission;
    try {
      submission = await CrmSifSubmission.findOne({ mobile: student.phone })
        .sort({ createdAt: -1 })
        .maxTimeMS(3000)
        .lean();
    } catch (queryErr) {
      // CRM DB unreachable / slow — trip the breaker so the next requests
      // skip it entirely instead of each waiting out the timeout.
      crmCircuitOpenUntil = Date.now() + CRM_FAIL_COOLDOWN_MS;
      throw queryErr;
    }
    if (!submission) {
      crmMissByPhone.set(student.phone, Date.now());
      return false;
    }
    crmMissByPhone.delete(student.phone);

    if (!student.sif) student.sif = {};
    student.sif.interestForm = buildInterestForm(submission);
    student.sif.updatedAt = new Date();
    student.sif.updatedByName = 'CRM';

    student.markModified('sif');
    await student.save({ validateModifiedOnly: true });
    return true;
  } catch (err) {
    console.error('[CRM SIF] pull failed:', err.message);
    return false;
  }
};

module.exports = { syncInterestFormFromCrm };
