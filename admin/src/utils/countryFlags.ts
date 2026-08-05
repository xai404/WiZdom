import type { Student } from '../types';

// Mirrors the exact country list in StudentForm.tsx's `COUNTRIES` array —
// keep both in sync if that list ever changes.
export const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸',
  UK: '🇬🇧',
  Canada: '🇨🇦',
  Australia: '🇦🇺',
  Germany: '🇩🇪',
  Ireland: '🇮🇪',
  'New Zealand': '🇳🇿',
  'Czech Republic': '🇨🇿',
  'Dubai (UAE)': '🇦🇪',
  Finland: '🇫🇮',
  Cyprus: '🇨🇾',
  Denmark: '🇩🇰',
  France: '🇫🇷',
  Italy: '🇮🇹',
};

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatIntakeLine(
  student: Pick<Student, 'countryInterested' | 'intakeMonth' | 'intakeYear'>
): string {
  const country = student.countryInterested?.[0];
  const monthLabel =
    student.intakeMonth && student.intakeMonth >= 1 && student.intakeMonth <= 12
      ? MONTH_SHORT[student.intakeMonth - 1]
      : null;
  const intakeLabel = monthLabel && student.intakeYear ? `${monthLabel} ${student.intakeYear} Intake` : null;

  if (!country && !intakeLabel) return 'Country & intake not set';

  const flag = country ? COUNTRY_FLAGS[country] : null;
  const countryPart = country ? `${flag ? `${flag} ` : ''}${country}` : null;

  return [countryPart, intakeLabel].filter(Boolean).join(' • ');
}
