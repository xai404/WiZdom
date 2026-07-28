// Canonical, ordered list of study-abroad journey stages shown in the
// Student App's "My Journey" screen. Admin-side tooling (not built yet)
// will be what actually updates a student's stage statuses — this backend
// only exposes them read-only to the app. Keep this list in sync with the
// Admin side whenever that's built.
const JOURNEY_STAGES = [
  'Career Counselling',
  'Country & Course Guidance',
  'Student Registration',
  'Test Prep',
  'Documentation',
  'University Shortlisting',
  'Profiling & Editing',
  'Application Management',
  'Offer Letters',
  'Loan Application',
  'Condition Fulfillment',
  'University Deposit Payment',
  'Financial Documents',
  'Visa Documentation',
  'Visa Appointment',
  'Visa Lodging',
  'Visa Status Update',
  'University Fee Payment',
  'Accommodation Planning',
  'Travel Planning',
  'Process Complete',
];

module.exports = { JOURNEY_STAGES };
