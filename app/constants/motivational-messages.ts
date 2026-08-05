// Shared by the Progress screen's hero banner and its "One stage at a
// time…" strip below the filter pills, so both rotate through the exact
// same daily quote instead of picking independently.
export const MOTIVATIONAL_MESSAGES = [
  'Every completed step brings you closer to your dream university ✈️',
  'Small progress each day adds up to a big journey abroad. 🌍',
  'Your future campus is waiting — keep going! 🎓',
  'One stage at a time, one step closer to departure. 🧳',
  'Consistency today, admission letter tomorrow. 📄',
  'Great journeys are built stage by stage. 🚀',
  'Stay patient, stay consistent — you are doing great. 🌟',
] as const;

export function todaysMessage(): string {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
  return MOTIVATIONAL_MESSAGES[dayOfYear % MOTIVATIONAL_MESSAGES.length];
}
