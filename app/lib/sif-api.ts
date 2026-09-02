import { API_BASE_URL } from '@/constants/config';

export type LorRecommender = {
  professorName: string;
  contactPhone: string;
  contactEmail: string;
  degreeStudied: string;
  cgpa: string;
  subjectsTopics: string;
  projects: string;
  internshipsActivities: string;
};

export type SopDetails = {
  courseName: string;
  motivation: string;
  additionalInfo: string;
  expectationsToLearn: string;
  futurePlans: string;
};

// Study-preference answers carried over from the CRM Student Interest Form,
// pre-filled when the account is provisioned and editable here afterwards.
export type InterestForm = {
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
};

// Personal / passport details — the middle block of the paper SIF, filled
// by the student in the app.
export type PersonalDetails = {
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
};

export type AcademicQualification = {
  level: string;
  specializationSubjects: string;
  yearOfPassing: string;
  percentage: string;
  backlogs: string;
  schoolCollegeName: string;
  boardUniversity: string;
};

// Fixed row labels for the Academic Qualification table (mirrors the paper form).
export const ACADEMIC_LEVELS = [
  '10',
  '11/12',
  'Diploma',
  'Graduation',
  'Post Graduation',
  'Other Qualification',
  'Gaps between education (if any)',
];

// One row of the "Internship / Industry Experience" table.
export type InternshipRow = {
  nameOfEmployer: string;
  addressOfEmployer: string;
  designation: string;
  salaryMonthly: string;
  dateFrom: string;
  dateTo: string;
};

// "Document Ready With You" checklist row.
export type DocumentChecklistItem = {
  key: string;
  name: string;
  format: string;
  ready: '' | 'yes' | 'no';
};

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

export type Sif = {
  lor: LorRecommender[];
  interestForm: InterestForm;
  personalDetails: PersonalDetails;
  academicQualifications: AcademicQualification[];
  internshipExperience: InternshipRow[];
  documentChecklist: DocumentChecklistItem[];
  sop: SopDetails;
  updatedAt?: string | null;
  updatedByName?: string | null;
};

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

// The default table — one empty row per fixed level.
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

const strArray = (v: any): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

function normalizeInterestForm(raw: any): InterestForm {
  return {
    ...EMPTY_INTEREST_FORM,
    ...(raw ?? {}),
    preferredCountries: strArray(raw?.preferredCountries),
    preferredStreams: strArray(raw?.preferredStreams),
    entranceTestSupport: strArray(raw?.entranceTestSupport),
    admissionSupport: strArray(raw?.admissionSupport),
    agreedToTerms: raw?.agreedToTerms === true,
  };
}

function normalizeAcademicQualifications(raw: any): AcademicQualification[] {
  const rows: AcademicQualification[] = Array.isArray(raw)
    ? raw.map((r: any) => ({ ...EMPTY_ACADEMIC_QUALIFICATION, ...(r ?? {}) }))
    : [];
  if (!rows.length) return buildDefaultAcademicQualifications();
  // Make sure every fixed level is represented (in order), keeping any
  // extra custom rows the student added at the end.
  const byLevel = new Map(rows.map((r) => [r.level, r]));
  const ordered = ACADEMIC_LEVELS.map(
    (level) => byLevel.get(level) ?? { ...EMPTY_ACADEMIC_QUALIFICATION, level },
  );
  const extras = rows.filter((r) => !ACADEMIC_LEVELS.includes(r.level));
  return [...ordered, ...extras];
}

function normalizeDocumentChecklist(raw: any): DocumentChecklistItem[] {
  const saved = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((r) => r?.key).map((r) => [r.key, r]) : [],
  );
  return DOCUMENT_CHECKLIST_TEMPLATE.map(({ key, name, format }) => {
    const r = saved.get(key);
    const ready = r?.ready === 'yes' || r?.ready === 'no' ? r.ready : '';
    return { key, name, format, ready };
  });
}

function normalizeSif(raw: any): Sif {
  return {
    lor: Array.isArray(raw?.lor)
      ? raw.lor.map((r: any) => ({ ...EMPTY_LOR_RECOMMENDER, ...(r ?? {}) }))
      : [],
    interestForm: normalizeInterestForm(raw?.interestForm),
    personalDetails: { ...EMPTY_PERSONAL_DETAILS, ...(raw?.personalDetails ?? {}) },
    academicQualifications: normalizeAcademicQualifications(raw?.academicQualifications),
    internshipExperience: Array.isArray(raw?.internshipExperience)
      ? raw.internshipExperience.map((r: any) => ({ ...EMPTY_INTERNSHIP_ROW, ...(r ?? {}) }))
      : [],
    documentChecklist: normalizeDocumentChecklist(raw?.documentChecklist),
    sop: { ...EMPTY_SOP, ...(raw?.sop ?? {}) },
    updatedAt: raw?.updatedAt ?? null,
    updatedByName: raw?.updatedByName ?? null,
  };
}

export async function fetchMySif(token: string): Promise<Sif> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/sif`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  // 404 = nothing saved yet (or the endpoint isn't live) — treat it as an
  // empty form rather than an error, so the questions always render.
  if (response.status === 404) return normalizeSif(null);

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to load your information form right now.');
  }
  return normalizeSif(data.sif);
}

export async function updateMySif(token: string, sif: Sif): Promise<Sif> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/student/sif`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sif }),
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Unable to save your information form right now.');
  }
  return normalizeSif(data.sif);
}
