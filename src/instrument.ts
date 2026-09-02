import * as Sentry from '@sentry/react';

/**
 * Errors-only Sentry: no tracing or replay integrations — PostHog owns
 * session recording, and double-instrumenting the same sessions would just
 * double the bundle and the noise. An empty DSN (local dev, forks without
 * the var) means the SDK is never initialised and every capture is a no-op.
 *
 * Imported first in main.tsx so module-evaluation errors in the rest of the
 * app are already catchable.
 */
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}
