import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'green' | 'slate' | 'blue' | 'amber' | 'purple' | 'red';

const toneClasses: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/10',
  red: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/10',
};

const Badge = ({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
      toneClasses[tone]
    )}
  >
    {children}
  </span>
);

export const STUDENT_STATUS_TONE: Record<string, BadgeTone> = {
  Active: 'green',
  Inactive: 'slate',
  Converted: 'blue',
  Lead: 'amber',
  'Follow Up': 'purple',
  Closed: 'red',
};

export const EMPLOYEE_ROLE_TONE: Record<string, BadgeTone> = {
  admin: 'blue',
  manager: 'purple',
  staff: 'slate',
  co_admin: 'green',
};

export default Badge;
