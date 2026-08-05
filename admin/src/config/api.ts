const PRODUCTION_API_URL = 'https://api.wizjobs.org/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

// Hostnames the admin panel is actually deployed to — the custom domain plus
// the platform-provided *.vercel.app / *.netlify.app preview & prod URLs.
const PRODUCTION_HOSTNAME_PATTERNS = [/(^|\.)admin\.wizjobs\.org$/, /\.vercel\.app$/, /\.netlify\.app$/];

const isProductionHost = (hostname: string): boolean =>
  PRODUCTION_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));

function resolveApiBaseUrl(): string {
  // VITE_API_URL stays as an explicit override (e.g. staging) when set.
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined' && isProductionHost(window.location.hostname)) {
    return PRODUCTION_API_URL;
  }

  return LOCAL_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

// Origin without the trailing /api — used to build absolute URLs for static
// assets served from the backend (e.g. /uploads/employees/*.jpg).
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
