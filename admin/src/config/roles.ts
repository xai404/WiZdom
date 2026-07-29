import type { UserRole } from '../types';

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  super_admin: '/dashboard',
  counsellor: '/dashboard',
  application_team: '/dashboard',
  editing_team: '/dashboard',
};