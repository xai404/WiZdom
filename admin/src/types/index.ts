export type UserRole = 'super_admin' | 'counsellor' | 'application_team' | 'editing_team';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
}
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
}
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
}

export interface NewEmployee {
  name: string;
  email: string;
  phone: string;
  department: string;
  password: string;
}
export interface DashboardStats {
  totalEmployees: number;
  byDepartment: { department: string; count: number }[];
}
export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  countryInterested?: string[];
  course?: string;
  intakeMonth?: number;
  intakeYear?: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}