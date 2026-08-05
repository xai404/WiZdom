import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 5000;
const ANDROID_EMULATOR_URL = `http://10.0.2.2:${BACKEND_PORT}`;
const LOCALHOST_URL = `http://localhost:${BACKEND_PORT}`;

// Bare origin (no /api — every call site under app/lib appends its own
// "/api/..." path), matching what a production backend build is deployed at.
const PRODUCTION_API_ORIGIN = 'https://api.wizjobs.org';

/**
 * When running through Metro (Expo Go / dev client), Constants exposes the
 * LAN address the bundler was loaded from (e.g. "192.168.0.115:8081"). A
 * physical device can't reach "localhost" or the emulator-only "10.0.2.2" —
 * it needs this actual host IP, so we derive the API URL from it.
 */
function getDevServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(':')[0] ?? null;
}

function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const devHost = getDevServerHost();
  if (devHost) return `http://${devHost}:${BACKEND_PORT}`;

  // No dev server (Metro) attached and no explicit override — this is a
  // release build (TestFlight/Play Store/EAS production profile), not a
  // local dev client, so point at the deployed backend instead of localhost.
  if (!__DEV__) return PRODUCTION_API_ORIGIN;

  return Platform.OS === 'android' ? ANDROID_EMULATOR_URL : LOCALHOST_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
