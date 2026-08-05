import type { UserRole } from '../types';

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  super_admin: '/dashboard',
  admin: '/dashboard',
  manager: '/dashboard',
  staff: '/dashboard',
  co_admin: '/dashboard',
};

// super_admin + every employee role — every employee gets the same access
// to view/search students, open a profile, track/update their journey, and
// edit a student's record (EMPLOYEE ACCESS spec). Creating and deleting a
// student stays super_admin-only.
export const STAFF_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'staff', 'co_admin'];
