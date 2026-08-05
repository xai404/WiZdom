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

export const EMPLOYEE_DEPARTMENTS = [
  'Counselling',
  'Documentation',
  'Application',
  'Editing',
  'Finance',
  'Visa',
  'Admin',
  'Marketing',
  'Human Resources',
  'Support',
] as const;
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

export const STUDENT_STATUSES = ['Active', 'Inactive', 'Converted', 'Lead', 'Follow Up', 'Closed'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

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
  gender?: string;
  countryInterested?: string[];
  intakeMonth?: number;
  intakeYear?: number;
  isActive: boolean;
  status?: StudentStatus;
  // Free-text "Counselled By" name — not a ref to an Employee record.
  assignedCounsellor?: string;
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
}

export type JourneyStageStatus = 'pending' | 'in_progress' | 'completed';

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
