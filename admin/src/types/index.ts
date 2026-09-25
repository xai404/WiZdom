export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'co_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profilePicture?: string | null;
  createdAt: string;
}

export interface WaitingStudent {
  id: string;
  name: string;
  responsibleDepartment: string | null;
  awaitingSince: string | null;
}

export interface DashboardStats {
  totalStudents?: number;
  activeStudents?: number;
  totalEmployees?: number;
  activeEmployees?: number;
  byDepartment?: { department: string; count: number }[];
  waitingStudents?: WaitingStudent[];
}

export const EMPLOYEE_DEPARTMENTS = ['Editing', 'Application', 'Counselling', 'Admin', 'Visa', 'Finance'] as const;
export type EmployeeDepartment = (typeof EMPLOYEE_DEPARTMENTS)[number];

export type EmployeeRole = 'admin' | 'manager' | 'staff' | 'co_admin';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation?: string;
  role?: EmployeeRole;
  profilePicture?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export const STUDENT_STATUSES = ['Active', 'Inactive', 'Closed'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const PAYMENT_STATUSES = ['Paid in Full', 'Half Payment', 'Free'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Denormalized audit snapshot — who created/last updated a student record.
// Shared shape for both createdBy and updatedBy.
export interface StudentAuditor {
  id: string;
  name: string;
  role: string;
}

// Response-status accountability layer — 'awaiting' always overrides
// 'resolved' even if the journey happens to be complete (someone still
// needs to reply right now). See backend/models/Student.js.
export type ResponseStatus = 'awaiting' | 'in_progress' | 'resolved';

export interface ResponseHandler {
  id: string;
  name: string;
  department: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string | null;
  gender?: string;
  countryInterested?: string[];
  intakeMonth?: number;
  intakeYear?: number;
  isActive: boolean;
  status?: StudentStatus;
  // Free-text "Counselled By" name — not a ref to an Employee record.
  assignedCounsellor?: string;
  // Free-text batch/cohort label — shown above the student's own name on
  // StudentCard.
  groupName?: string;
  paymentStatus?: PaymentStatus | null;
  createdBy?: StudentAuditor | null;
  updatedBy?: StudentAuditor | null;
  updatedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  responsibleDepartment?: string | null;
  awaitingReply: boolean;
  awaitingSince?: string | null;
  awaitingSinceMessageId?: string | null;
  lastHandledBy?: ResponseHandler | null;
  lastHandledAt?: string | null;
  journeyCompleted: boolean;
  responseStatus: ResponseStatus;
  // Raw per-stage progress — used by StudentCard to derive its
  // pipeline-milestone outline (Documentation/Offer/Visa). Absent stages
  // default to 'pending' server-side, so this can be a sparse/empty array.
  journey?: JourneyStage[];
  // LOR/SOP intake notes captured on the SIF tab. Admin-facing only.
  sif?: Sif;
}

// Student Information Form — free-text notes staff collect to draft the
// student's LOR(s) and SOP. See backend/models/Student.js sifSchema.
export interface LorRecommender {
  professorName: string;
  contactPhone: string;
  contactEmail: string;
  degreeStudied: string;
  cgpa: string;
  subjectsTopics: string;
  projects: string;
  internshipsActivities: string;
}

export interface SopDetails {
  courseName: string;
  motivation: string;
  additionalInfo: string;
  expectationsToLearn: string;
  futurePlans: string;
}

// Study-preference answers carried over from the CRM Student Interest Form,
// pre-filled when the account is provisioned on lead conversion and
// editable here afterwards. See backend/models/Student.js interestFormSchema.
export interface InterestForm {
  applicantName: string;
  mobile: string;
  email: string;
  preferredCountries: string[];
  preferredStreams: string[];
  budget: string;
  preferredIntake: string;
  hearAboutUs: string;
  giftChoice: string;
  entranceTestSupport: string[];
  admissionSupport: string[];
  alternateContact: string;
  agreedToTerms: boolean;
  sourcedFromCrmAt?: string | null;
}

// Personal / passport details + academic history — the middle block of the
// paper SIF, filled by the student in the app and viewable/editable by
// staff here. See backend/models/Student.js personalDetailsSchema.
export interface PersonalDetails {
  dateOfBirth: string;
  address: string;
  previousVisaRejection: '' | 'yes' | 'no';
  previousVisaRejectionDetails: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  maritalStatus: '' | 'Single' | 'Married';
  spouseDetails: string;
  passportNumber: string;
  passportDateOfIssue: string;
  passportDateOfExpiry: string;
}

export interface AcademicQualification {
  level: string;
  specializationSubjects: string;
  yearOfPassing: string;
  percentage: string;
  backlogs: string;
  schoolCollegeName: string;
  boardUniversity: string;
}

export const ACADEMIC_LEVELS = [
  '10',
  '11/12',
  'Diploma',
  'Graduation',
  'Post Graduation',
  'Other Qualification',
  'Gaps between education (if any)',
];

export interface InternshipRow {
  nameOfEmployer: string;
  addressOfEmployer: string;
  designation: string;
  salaryMonthly: string;
  dateFrom: string;
  dateTo: string;
}

export interface DocumentChecklistItem {
  key: string;
  name: string;
  format: string;
  ready: '' | 'yes' | 'no';
}

export const DOCUMENT_CHECKLIST_TEMPLATE: {
  key: string;
  name: string;
  format: string;
  optional: boolean;
  section: 'core' | 'developed';
}[] = [
  { key: 'marksheet_10', name: '10th Marksheet', format: 'YOURNAME_10th.pdf', optional: false, section: 'core' },
  { key: 'marksheet_12', name: '12th Marksheet', format: 'YOURNAME_12th.pdf', optional: false, section: 'core' },
  { key: 'ug_semesters', name: 'UG All semesters', format: 'YOURNAME_UG_Semesters.pdf', optional: false, section: 'core' },
  { key: 'ug_transcript', name: 'UG Transcript', format: 'YOURNAME_UG_Transcript.pdf', optional: false, section: 'core' },
  { key: 'convocation', name: 'Convocation Certificate', format: 'YOURNAME_Convocation.pdf', optional: false, section: 'core' },
  { key: 'ielts_toefl', name: 'IELTS/TOEFL Score Card', format: 'YOURNAME_IELTS.pdf', optional: true, section: 'core' },
  { key: 'gre_gmat', name: 'GRE/GMAT Score Card', format: 'YOURNAME_GRE.pdf', optional: true, section: 'core' },
  { key: 'work_exp_1', name: 'Work Experience Certificate', format: 'YOURNAME_WE1.pdf', optional: true, section: 'core' },
  { key: 'work_exp_2', name: 'Work Experience Certificate', format: 'YOURNAME_WE2.pdf', optional: true, section: 'core' },
  { key: 'work_exp_3', name: 'Work Experience Certificate', format: 'YOURNAME_WE3.pdf', optional: true, section: 'core' },
  { key: 'passport_copy', name: 'Passport copy', format: 'YOURNAME_PP.pdf', optional: false, section: 'core' },
  { key: 'photograph', name: 'Photograph [passport size]', format: 'YOURNAME_Pic.jpg', optional: false, section: 'core' },
  { key: 'lor_1', name: 'Letter of Recommendation - 1', format: 'YOURNAME_LOR1.pdf', optional: false, section: 'developed' },
  { key: 'lor_2', name: 'Letter of Recommendation - 2', format: 'YOURNAME_LOR2.pdf', optional: false, section: 'developed' },
  { key: 'lor_3', name: 'Letter of Recommendation - 3', format: 'YOURNAME_LOR3.pdf', optional: false, section: 'developed' },
  { key: 'cv', name: 'Updated CV', format: 'YOURNAME_CV.doc', optional: false, section: 'developed' },
  { key: 'sop', name: 'Statement of Purpose (SOP)', format: 'YOURNAME_SOP.doc', optional: false, section: 'developed' },
  { key: 'visa_sop', name: 'Visa SOP post Admission', format: 'YOURNAME_VisaSOP.doc', optional: true, section: 'developed' },
];

export interface Sif {
  lor: LorRecommender[];
  interestForm: InterestForm;
  personalDetails: PersonalDetails;
  academicQualifications: AcademicQualification[];
  internshipExperience: InternshipRow[];
  documentChecklist: DocumentChecklistItem[];
  sop: SopDetails;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

export const EMPTY_LOR_RECOMMENDER: LorRecommender = {
  professorName: '',
  contactPhone: '',
  contactEmail: '',
  degreeStudied: '',
  cgpa: '',
  subjectsTopics: '',
  projects: '',
  internshipsActivities: '',
};

export const EMPTY_SOP: SopDetails = {
  courseName: '',
  motivation: '',
  additionalInfo: '',
  expectationsToLearn: '',
  futurePlans: '',
};

export const EMPTY_INTEREST_FORM: InterestForm = {
  applicantName: '',
  mobile: '',
  email: '',
  preferredCountries: [],
  preferredStreams: [],
  budget: '',
  preferredIntake: '',
  hearAboutUs: '',
  giftChoice: '',
  entranceTestSupport: [],
  admissionSupport: [],
  alternateContact: '',
  agreedToTerms: false,
  sourcedFromCrmAt: null,
};

export const EMPTY_PERSONAL_DETAILS: PersonalDetails = {
  dateOfBirth: '',
  address: '',
  previousVisaRejection: '',
  previousVisaRejectionDetails: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  maritalStatus: '',
  spouseDetails: '',
  passportNumber: '',
  passportDateOfIssue: '',
  passportDateOfExpiry: '',
};

export const EMPTY_ACADEMIC_QUALIFICATION: AcademicQualification = {
  level: '',
  specializationSubjects: '',
  yearOfPassing: '',
  percentage: '',
  backlogs: '',
  schoolCollegeName: '',
  boardUniversity: '',
};

export const buildDefaultAcademicQualifications = (): AcademicQualification[] =>
  ACADEMIC_LEVELS.map((level) => ({ ...EMPTY_ACADEMIC_QUALIFICATION, level }));

export const EMPTY_INTERNSHIP_ROW: InternshipRow = {
  nameOfEmployer: '',
  addressOfEmployer: '',
  designation: '',
  salaryMonthly: '',
  dateFrom: '',
  dateTo: '',
};

export const buildDefaultDocumentChecklist = (): DocumentChecklistItem[] =>
  DOCUMENT_CHECKLIST_TEMPLATE.map(({ key, name, format }) => ({ key, name, format, ready: '' as const }));

export type JourneyStageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface JourneyStage {
  title: string;
  status: JourneyStageStatus;
  updatedAt: string | null;
}

export type MessageSender = 'admin' | 'student';

export interface ChatMessage {
  _id: string;
  sender: MessageSender;
  senderName: string;
  senderRole: string | null;
  // The Admin/Employee account id that sent this (null for student
  // messages) — used to tell "a message I sent" apart from "a message a
  // different staff member sent" for chat bubble alignment.
  senderId: string | null;
  text: string;
  stage: string | null;
  department: string | null;
  readByStudent: boolean;
  readByAdmin: boolean;
  // True once every OTHER participant (every other active staff account,
  // plus the student when the sender is staff) has read this message —
  // the WhatsApp-group "blue tick" condition. Computed fresh per request
  // server-side; drives the tick color instead of the simpler
  // readByStudent/readByAdmin booleans, which only mean "read by someone".
  fullyRead: boolean;
  deleted: boolean;
  edited: boolean;
  replyTo: string | null;
  pinned: boolean;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: 'stage_status' | 'remark' | 'message' | 'department_tag';
  title: string;
  body: string;
  stage: string | null;
  department: string | null;
  student: { _id: string; name: string } | null;
  read: boolean;
  createdAt: string;
}
