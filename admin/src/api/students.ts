import api from './client';
import type { ChatMessage, JourneyStage, JourneyStageStatus, Student, StudentStatus } from '../types';
import type { PaginationMeta } from '../components/ui';

const normalize = (s: any): Student => ({
  id: s.id ?? s._id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  gender: s.gender,
  countryInterested: s.countryInterested,
  intakeMonth: s.intakeMonth,
  intakeYear: s.intakeYear,
  isActive: s.isActive,
  status: s.status,
  assignedCounsellor: s.assignedCounsellor ?? '',
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
  responseStatus: s.responseStatus ?? 'in_progress',
});

export interface FetchStudentsParams {
  search?: string;
  status?: StudentStatus | '';
  intakeYear?: number | '';
  intakeMonth?: number | '';
  assignedCounsellor?: string;
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

export const updateStudentJourneyStage = async (
  id: string,
  title: string,
  status: JourneyStageStatus
): Promise<void> => {
  await api.patch(`/students/${id}/journey`, { title, status });
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
  department: string | null = null
): Promise<ChatMessage> => {
  const res = await api.post(`/students/${id}/chat`, { text, stage, replyTo, department });
  return res.data.message;
};

export const deleteStudentChatMessage = async (id: string, messageId: string): Promise<ChatMessage> => {
  const res = await api.delete(`/students/${id}/chat/${messageId}`);
  return res.data.message;
};

export const toggleMessagePin = async (id: string, messageId: string): Promise<ChatMessage> => {
  const res = await api.patch(`/students/${id}/chat/${messageId}/pin`);
  return res.data.message;
};
