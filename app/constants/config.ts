// Bare origin (no /api — every call site under app/lib appends its own
// "/api/..." path). All builds, dev and release, target the deployed backend.
export const API_BASE_URL = 'https://api.wizjobs.org';
