// Base URL of the API, resolved once at module load.
//
// Every call site used to inline `import.meta.env.VITE_API_BASE_URL ||
// 'http://localhost:3000'`, which was wrong twice over. The port was wrong —
// the API listens on 3001 (server/.env PORT), not Nest's 3000 default — so the
// fallback never actually helped in development. And Vite inlines
// VITE_API_BASE_URL at BUILD time, so a production build that was never given
// the variable shipped a bundle hard-coded to the developer's own machine: it
// loaded fine, then failed every request in the user's browser with a
// connection error nobody on our side ever saw.
//
// A loud failure beats a localhost bundle. Throwing on import kills the app on
// its first line, in the deploy smoke test or the first page load, instead of
// letting a panel that can reach nothing look perfectly healthy.
const DEV_FALLBACK_BASE_URL = 'http://localhost:3001';

function resolveApiBaseUrl(): string {
  const configured: unknown = import.meta.env.VITE_API_BASE_URL;
  const trimmed = typeof configured === 'string' ? configured.trim() : '';

  if (trimmed) {
    return trimmed;
  }

  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_BASE_URL is missing or empty in a production build. Refusing ' +
        'to fall back to localhost: that bundle would load fine and then fail ' +
        'every request in the browser, with nothing on our side to show for it.',
    );
  }

  return DEV_FALLBACK_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
