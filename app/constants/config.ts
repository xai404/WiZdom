// Bare origin (no /api — every call site under app/lib appends its own
// "/api/..." path). Defaults to the deployed backend for every build.
//
// To point the app at a locally-running backend (e.g. to test routes that
// aren't deployed yet), create an `app/.env` file with:
//   EXPO_PUBLIC_API_URL=http://localhost:5000
// then restart `expo start`. Expo inlines EXPO_PUBLIC_* vars at bundle time.
// On a physical device use your machine's LAN IP instead of localhost;
// on the Android emulator use http://10.0.2.2:5000.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.wizjobs.org';
