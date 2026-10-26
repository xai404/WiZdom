import api from './client';
import {
  ACADEMIC_LEVELS,
  buildDefaultAcademicQualifications,
  DOCUMENT_CHECKLIST_TEMPLATE,
  EMPTY_ACADEMIC_QUALIFICATION,
  EMPTY_INTEREST_FORM,
  EMPTY_INTERNSHIP_ROW,
  EMPTY_PERSONAL_DETAILS,
  EMPTY_SOP,
  EMPTY_PROFESSIONAL_DETAILS,
  type AcademicQualification,
  type ChatMessage,
  type DocumentChecklistItem,
  type JourneyStage,
  type Sif,
  type Student,
  type StudentStatus,
} from '../types';
import type { PaginationMeta } from '../components/ui';

const normalizeAcademics = (raw: any): AcademicQualification[] => {
  const rows: AcademicQualification[] = Array.isArray(raw)
    ? raw.map((r: any) => ({ ...EMPTY_ACADEMIC_QUALIFICATION, ...(r ?? {}) }))
    : [];
  if (!rows.length) return buildDefaultAcademicQualifications();
  const byLevel = new Map(rows.map((r) => [r.level, r]));
  const ordered = ACADEMIC_LEVELS.map(
    (level) => byLevel.get(level) ?? { ...EMPTY_ACADEMIC_QUALIFICATION, level },
  );
  const extras = rows.filter((r) => !ACADEMIC_LEVELS.includes(r.level));
  return [...ordered, ...extras];
};

const normalizeDocuments = (raw: any): DocumentChecklistItem[] => {
  const saved = new Map<string, any>(
    Array.isArray(raw) ? raw.filter((r) => r?.key).map((r) => [r.key, r]) : [],
  );
  return DOCUMENT_CHECKLIST_TEMPLATE.map(({ key, name, format }) => {
    const r = saved.get(key);
    const ready = r?.ready === 'yes' || r?.ready === 'no' ? r.ready : '';
    return { key, name, format, ready };
  });
};

const normalizeSif = (s: any): Sif => ({
  lor: Array.isArray(s?.lor)
    ? s.lor.map((r: any) => ({
        professorName: r?.professorName ?? '',
        contactPhone: r?.contactPhone ?? '',
        contactEmail: r?.contactEmail ?? '',
        degreeStudied: r?.degreeStudied ?? '',
        cgpa: r?.cgpa ?? '',
        subjectsTopics: r?.subjectsTopics ?? '',
        projects: r?.projects ?? '',
        internshipsActivities: r?.internshipsActivities ?? '',
      }))
    : [],
  interestForm: {
    ...EMPTY_INTEREST_FORM,
    ...(s?.interestForm ?? {}),
    preferredCountries: Array.isArray(s?.interestForm?.preferredCountries) ? s.interestForm.preferredCountries : [],
    preferredStreams: Array.isArray(s?.interestForm?.preferredStreams) ? s.interestForm.preferredStreams : [],
    entranceTestSupport: Array.isArray(s?.interestForm?.entranceTestSupport) ? s.interestForm.entranceTestSupport : [],
    admissionSupport: Array.isArray(s?.interestForm?.admissionSupport) ? s.interestForm.admissionSupport : [],
    agreedToTerms: s?.interestForm?.agreedToTerms === true,
  },
  personalDetails: { ...EMPTY_PERSONAL_DETAILS, ...(s?.personalDetails ?? {}) },
  academicQualifications: normalizeAcademics(s?.academicQualifications),
  internshipExperience: Array.isArray(s?.internshipExperience)
    ? s.internshipExperience.map((r: any) => ({ ...EMPTY_INTERNSHIP_ROW, ...(r ?? {}) }))
    : [],
  industryExperience: Array.isArray(s?.industryExperience)
    ? s.industryExperience.map((r: any) => ({ ...EMPTY_INTERNSHIP_ROW, ...(r ?? {}) }))
    : [],
  professionalDetails: { ...EMPTY_PROFESSIONAL_DETAILS, ...(s?.professionalDetails ?? {}) },
  lorAssistance: s?.lorAssistance === 'yes' || s?.lorAssistance === 'no' ? s.lorAssistance : '',
  sopAssistance: s?.sopAssistance === 'yes' || s?.sopAssistance === 'no' ? s.sopAssistance : '',
  documentChecklist: normalizeDocuments(s?.documentChecklist),
  sop: { ...EMPTY_SOP, ...(s?.sop ?? {}) },
  termsAcceptedAt: s?.termsAcceptedAt ?? null,
  updatedAt: s?.updatedAt ?? null,
  updatedByName: s?.updatedByName ?? null,
});

const normalize = (s: any): Student => ({
  id: s.id ?? s._id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  profilePicture: s.profilePicture ?? null,
  gender: s.gender,
  countryInterested: s.countryInterested,
  intakeMonth: s.intakeMonth,
  intakeYear: s.intakeYear,
  isActive: s.isActive,
  status: s.status,
  assignedCounsellor: s.assignedCounsellor ?? '',
  groupName: s.groupName ?? '',
  paymentStatus: s.paymentStatus ?? null,
  paymentRemark: s.paymentRemark ?? '',
  createdBy: s.createdBy,
  updatedBy: s.updatedBy,
  updatedAt: s.updatedAt,
  lastLoginAt: s.lastLoginAt,
  createdAt: s.createdAt,
  responsibleDepartment: s.responsibleDepartment ?? null,
  awaitingReply: s.awaitingReply ?? false,
  awaitingSince: s.awaitingSince ?? null,
  awaitingSinceMessageId: s.awaitingSinceMessageId ?? null,
  lastHandledBy: s.lastHandledBy?.id ? { id: s.lastHandledBy.id, name: s.lastHandledBy.name, department: s.lastHandledBy.department } : null,
  lastHandledAt: s.lastHandledAt ?? null,
  journeyCompleted: s.journeyCompleted ?? false,
  // Per-viewer count of unread student messages — drives the number badge
  // on the list card. Only the list endpoint sends it.
  unreadCount: typeof s.unreadCount === 'number' ? s.unreadCount : 0,
  responseStatus: s.responseStatus ?? 'in_progress',
  journey: s.journey ?? [],
  sif: normalizeSif(s.sif),
});

export type StudentMilestoneFilter =
  | 'documentation_completed'
  | 'offer_received'
  | 'visa_approved'
  | 'visa_rejected'
  | 'inactive'
  | 'closed';

export interface FetchStudentsParams {
  search?: string;
  status?: StudentStatus | '';
  intakeYear?: number | '';
  intakeMonth?: number | '';
  assignedCounsellor?: string;
  milestone?: StudentMilestoneFilter | '';
  page?: number;
  limit?: number;
}

export interface FetchStudentsResult {
  data: Student[];
  pagination: PaginationMeta;
}

export const fetchStudents = async (params: FetchStudentsParams = {}): Promise<FetchStudentsResult> => {
  const res = await api.get('/students', { params });
  return { data: res.data.data.map(normalize), pagination: res.data.pagination };
};

export const fetchStudentById = async (id: string): Promise<Student> => {
  const res = await api.get(`/students/${id}`);
  return normalize(res.data);
};

// The backend never echoes the plaintext password back — it's delivered to
// the student by email only.
export const createStudent = async (payload: Record<string, unknown>): Promise<Student> => {
  const res = await api.post('/students', payload);
  return normalize(res.data);
};

export const updateStudent = async (id: string, payload: Record<string, unknown>): Promise<Student> => {
  const res = await api.patch(`/students/${id}`, payload);
  return normalize(res.data);
};

export const deleteStudent = async (id: string): Promise<void> => {
  await api.delete(`/students/${id}`);
};

export const fetchStudentJourney = async (id: string): Promise<JourneyStage[]> => {
  const res = await api.get(`/students/${id}/journey`);
  return res.data.journey;
};

// `substepKey` is a JourneySubstep.key; `status` one of its options' values.
export const updateStudentJourneyStage = async (id: string, substepKey: string, status: string): Promise<void> => {
  await api.patch(`/students/${id}/journey`, { title: substepKey, status });
};

export const addStudentJourneyRemark = async (id: string, title: string, text: string): Promise<void> => {
  await api.post(`/students/${id}/journey/remarks`, { title, text });
};

export const deleteStudentJourneyRemark = async (id: string, remarkId: string): Promise<void> => {
  await api.delete(`/students/${id}/journey/remarks/${remarkId}`);
};

export const fetchStudentChat = async (id: string): Promise<ChatMessage[]> => {
  const res = await api.get(`/students/${id}/chat`);
  return res.data.messages;
};

export const postStudentChatMessage = async (
  id: string,
  text: string,
  stage: string | null,
  replyTo: string | null = null,
  department: string | null = null,
  mentionStudent = false
): Promise<ChatMessage> => {
  const res = await api.post(`/students/${id}/chat`, { text, stage, replyTo, department, mentionStudent });
  return res.data.message;
};

export const deleteStudentChatMessage = async (id: string, messageId: string): Promise<ChatMessage> => {
  const res = await api.delete(`/students/${id}/chat/${messageId}`);
  return res.data.message;
};

export const editStudentChatMessage = async (id: string, messageId: string, text: string): Promise<ChatMessage> => {
  const res = await api.patch(`/students/${id}/chat/${messageId}`, { text });
  return res.data.message;
};

export const clearStudentChat = async (id: string): Promise<void> => {
  await api.delete(`/students/${id}/chat`);
};

export const toggleMessagePin = async (id: string, messageId: string): Promise<ChatMessage> => {
  const res = await api.patch(`/students/${id}/chat/${messageId}/pin`);
  return res.data.message;
};
