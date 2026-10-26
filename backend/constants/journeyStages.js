// Canonical, ordered study-abroad journey: 7 steps, each broken into
// sub-steps. Only sub-steps carry a status (set by staff on the Admin
// Panel's Journey tab); a step's own status is derived from its sub-steps
// (see utils/journeySteps.js). Steps are what chat messages, remarks and
// notifications are tagged with. Keep the app's constants/journey-meta.ts
// step titles in the same order.
//
// Every status option has a `tone` — the colour bucket both clients render
// it with (pending = red, in_progress = yellow, completed = green,
// rejected = rose). A sub-step counts as done once its status' tone is
// 'completed'. The first option is each sub-step's default.

const opt = (value, label, tone) => ({ value, label, tone });

const PENDING = opt('pending', 'Pending', 'pending');
const IN_PROGRESS = opt('in_progress', 'In Progress', 'in_progress');
const COMPLETED = opt('completed', 'Completed', 'completed');
const BOOKED = opt('booked', 'Booked', 'completed');
const DEFAULT_STATUSES = [PENDING, IN_PROGRESS, COMPLETED];

const JOURNEY_STEPS = [
  {
    title: 'Career Counselling',
    substeps: [
      { label: 'Country & Course', statuses: DEFAULT_STATUSES },
      { label: 'University Shortlisting', statuses: DEFAULT_STATUSES },
      { label: 'Student Registration', statuses: DEFAULT_STATUSES },
    ],
  },
  {
    title: 'Documentation & Editing',
    substeps: [
      { label: 'Documents', statuses: DEFAULT_STATUSES },
      { label: 'CV', statuses: DEFAULT_STATUSES },
      { label: 'LOR', statuses: DEFAULT_STATUSES },
      { label: 'SOP', statuses: DEFAULT_STATUSES },
    ],
  },
  {
    title: 'Application Management',
    substeps: [
      {
        label: 'Application Status',
        statuses: [PENDING, opt('submitted', 'Submitted', 'in_progress'), opt('offer_received', 'Offer Received', 'completed')],
      },
      {
        label: 'Conditions',
        statuses: [PENDING, opt('fulfilled', 'Fulfilled', 'completed'), opt('not_applicable', 'Not Applicable', 'completed')],
      },
    ],
  },
  {
    title: 'Finance',
    substeps: [
      { label: 'Deposit Payment', statuses: [PENDING, opt('paid', 'Paid', 'completed')] },
      {
        label: 'Funds',
        statuses: [
          PENDING,
          opt('self_funding', 'Self Funding', 'completed'),
          opt('loan_in_progress', 'Loan In Progress', 'in_progress'),
          opt('loan_sanctioned', 'Loan Sanctioned', 'completed'),
        ],
      },
    ],
  },
  {
    title: 'Visa Application',
    substeps: [
      { label: 'Documentation', statuses: DEFAULT_STATUSES },
      { label: 'Application', statuses: [PENDING, opt('submitted', 'Submitted', 'completed')] },
      // The only sub-step that can end negatively — drives the admin
      // "Visa Approved" / "Visa Rejected" filters and card outlines.
      {
        label: 'Decision',
        statuses: [PENDING, opt('received', 'Received', 'completed'), opt('rejected', 'Rejected', 'rejected')],
      },
    ],
  },
  {
    title: 'Travel Plans',
    substeps: [
      { label: 'Accommodation', statuses: [PENDING, BOOKED] },
      { label: 'Flight Ticket', statuses: [PENDING, BOOKED] },
      { label: 'Forex Card', statuses: [PENDING, BOOKED] },
    ],
  },
  {
    title: 'Completed',
    substeps: [{ label: 'Process Complete', statuses: [PENDING, COMPLETED] }],
  },
];

// A sub-step's storage key in Student.journey[].title — "Step / Label", so
// two steps can reuse a label ("Documentation", "Application") safely.
for (const step of JOURNEY_STEPS) {
  for (const sub of step.substeps) sub.key = `${step.title} / ${sub.label}`;
}

// Step titles — what chat messages, remarks and notifications are tagged with.
const JOURNEY_STAGES = JOURNEY_STEPS.map((step) => step.title);

const SUBSTEP_BY_KEY = new Map(
  JOURNEY_STEPS.flatMap((step) => step.substeps.map((sub) => [sub.key, { ...sub, step: step.title }]))
);

// Admin Students-list milestone filters / card outlines. Each is a set of
// sub-step conditions that must ALL hold.
const MILESTONES = {
  documentation_completed: JOURNEY_STEPS[1].substeps.map((sub) => ({ title: sub.key, status: 'completed' })),
  offer_received: [{ title: 'Application Management / Application Status', status: 'offer_received' }],
  visa_approved: [{ title: 'Visa Application / Decision', status: 'received' }],
  visa_rejected: [{ title: 'Visa Application / Decision', status: 'rejected' }],
};

// The previous flat 21-stage journey. Used to migrate saved progress onto
// the new sub-steps (utils/journeySteps.migrateLegacyJourneys) and to file
// old stage-tagged chat messages under the right step. `substep` + `status`
// maps an old status onto the new sub-step's equivalent, where there is one.
const LEGACY_STAGES = {
  'Career Counselling': { step: 'Career Counselling' },
  'Country & Course Guidance': {
    step: 'Career Counselling',
    substep: 'Career Counselling / Country & Course',
    status: { in_progress: 'in_progress', completed: 'completed' },
  },
  'Student Registration': {
    step: 'Career Counselling',
    substep: 'Career Counselling / Student Registration',
    status: { in_progress: 'in_progress', completed: 'completed' },
  },
  'University Shortlisting': {
    step: 'Career Counselling',
    substep: 'Career Counselling / University Shortlisting',
    status: { in_progress: 'in_progress', completed: 'completed' },
  },
  'Test Prep': { step: 'Career Counselling' },
  Documentation: {
    step: 'Documentation & Editing',
    substep: 'Documentation & Editing / Documents',
    status: { in_progress: 'in_progress', completed: 'completed' },
  },
  'Profiling & Editing': { step: 'Documentation & Editing' },
  'Application Management': {
    step: 'Application Management',
    substep: 'Application Management / Application Status',
    status: { completed: 'submitted' },
  },
  'Offer Letters': {
    step: 'Application Management',
    substep: 'Application Management / Application Status',
    status: { completed: 'offer_received' },
  },
  'Condition Fulfillment': {
    step: 'Application Management',
    substep: 'Application Management / Conditions',
    status: { completed: 'fulfilled' },
  },
  'Loan Application': {
    step: 'Finance',
    substep: 'Finance / Funds',
    status: { in_progress: 'loan_in_progress', completed: 'loan_sanctioned' },
  },
  'University Deposit Payment': {
    step: 'Finance',
    substep: 'Finance / Deposit Payment',
    status: { completed: 'paid' },
  },
  'Financial Documents': { step: 'Finance' },
  'University Fee Payment': { step: 'Finance' },
  'Visa Documentation': {
    step: 'Visa Application',
    substep: 'Visa Application / Documentation',
    status: { in_progress: 'in_progress', completed: 'completed' },
  },
  'Visa Appointment': { step: 'Visa Application' },
  'Visa Lodging': {
    step: 'Visa Application',
    substep: 'Visa Application / Application',
    status: { completed: 'submitted' },
  },
  'Visa Status Update': {
    step: 'Visa Application',
    substep: 'Visa Application / Decision',
    status: { completed: 'received', rejected: 'rejected' },
  },
  'Accommodation Planning': {
    step: 'Travel Plans',
    substep: 'Travel Plans / Accommodation',
    status: { completed: 'booked' },
  },
  'Travel Planning': {
    step: 'Travel Plans',
    substep: 'Travel Plans / Flight Ticket',
    status: { completed: 'booked' },
  },
  'Process Complete': {
    step: 'Completed',
    substep: 'Completed / Process Complete',
    status: { completed: 'completed' },
  },
};

// Maps any stage tag (new step title or legacy stage title) to its step.
const stepForStageTag = (tag) => (JOURNEY_STAGES.includes(tag) ? tag : LEGACY_STAGES[tag]?.step || null);

module.exports = { JOURNEY_STEPS, JOURNEY_STAGES, SUBSTEP_BY_KEY, MILESTONES, LEGACY_STAGES, stepForStageTag };
