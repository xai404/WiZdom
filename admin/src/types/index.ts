export type UserRole = 'admin' | 'student';

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
