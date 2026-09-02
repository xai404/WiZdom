// Must stay in sync with backend/models/Employee.js's DEPARTMENTS list.
// Used as the "tag a team" picker's default/fallback — group-chat.tsx
// replaces this with the server's staffed-only list once
// GET /api/student/departments resolves (see lib/departments-api.ts), but
// falls back to showing every team if that request hasn't landed yet
// (e.g. the backend route isn't deployed) rather than showing nothing.
export const DEPARTMENTS = ['Editing', 'Application', 'Counselling', 'Admin', 'Visa', 'Finance'] as const;

export type Department = (typeof DEPARTMENTS)[number];
