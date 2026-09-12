import * as Sentry from '@sentry/react';
import { deploymentEnvironment } from '@/lib/deployment-environment';

/**
 * Errors-only Sentry. No tracing and no replay integrations — PostHog owns
 * session replay here, and running both recorders would double the payload on
 * every page for no extra signal.
 *
 * PRODUCTION ONLY, and enforced on the hostname rather than on the DSN simply
 * being absent elsewhere. The DSN is inlined at build time, so "staging just
 * won't have one" depends on whoever runs the build remembering; the hostname
 * cannot be got wrong at deploy time. A staging bundle that somehow carries a
 * production DSN still reports nothing, because stage-admin.startmessaging.com
 * resolves to 'staging' and is refused here.
 *
 * PII is left off (`sendDefaultPii` defaults to false), so IP addresses,
 * cookies and request headers are never collected as a side effect. The one
 * identity that matters for debugging is attached deliberately on sign-in by
 * useAuth, which is both narrower and more useful.
 */
const environment = deploymentEnvironment(window.location.hostname);
const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn && environment === 'production') {
  Sentry.init({ dsn, environment });
}
