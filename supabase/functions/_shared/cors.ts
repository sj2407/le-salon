// Shared CORS utility — restrict origins to known domains
// Non-browser clients (iOS Shortcuts, curl) send no Origin header and are unaffected by CORS

const ALLOWED_ORIGINS = [
  'https://le-salon.vercel.app',
  'http://localhost:5173',      // Vite dev
  'http://localhost:4173',      // Vite preview
  'capacitor://localhost',      // iOS Capacitor app
  'http://localhost',           // iOS Capacitor fallback
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');

  // Non-browser clients (Shortcuts, curl, cron) — no Origin header, CORS irrelevant
  if (!origin) {
    return {
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    };
  }

  // Known origin — reflect it back
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    };
  }

  // Unknown browser origin — no ACAO header means browser blocks the response
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  };
}
