import type { Student } from '../types';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Compact two-line form ("AUG" / "26") for the small circle StudentCard
// shows in place of a letter avatar — null when intake isn't set, so the
// card can fall back to a neutral placeholder instead of a blank badge.
export function formatIntakeBadge(
  student: Pick<Student, 'intakeMonth' | 'intakeYear'>
): { month: string; year: string } | null {
  if (!student.intakeMonth || student.intakeMonth < 1 || student.intakeMonth > 12 || !student.intakeYear) {
    return null;
  }
  return { month: MONTH_SHORT[student.intakeMonth - 1].toUpperCase(), year: String(student.intakeYear).slice(-2) };
}
