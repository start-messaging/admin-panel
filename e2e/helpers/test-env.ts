/**
 * The single source of truth for the e2e environment.
 *
 * The Playwright config uses API_ENV to boot the API child process, and the
 * pg/auth helpers read the same constants to reach that API's database — one
 * object, so the server under test and the assertions against its storage can
 * never point at different places.
 *
 * The ports and the Redis logical DB are dedicated to this suite: API on 3020,
 * preview on 4174, Redis logical DB 12. 3000/3005/3010/3021/5173/5174/5175/
 * 4173 belong to other environments — never reuse them here.
 *
 * Postgres is the exception: `sm_test` is shared with the server API e2e suite
 * and the dashboard e2e suite. Every spec truncates it, so those suites cannot
 * run concurrently with this one — run them one at a time.
 */

export const API_PORT = 3020;
export const APP_PORT = 4174;

export const API_URL = `http://localhost:${API_PORT}`;
export const APP_URL = `http://localhost:${APP_PORT}`;

export const DB = {
  host: '127.0.0.1',
  port: 5432,
  name: 'sm_test',
  username: 'postgres',
  password: 'postgres',
} as const;

export const REDIS_URL = 'redis://127.0.0.1:6379/12';

/**
 * Namespaces every Redis key the API under test writes — throttle counters,
 * cached values and BullMQ's own `${prefix}:bull` tree.
 *
 * Exported rather than inlined into API_ENV because db.ts scopes its cleanup
 * to exactly this prefix: two copies of the literal that drift apart would
 * leave the suite deleting nothing and 429-ing on the sixth registration.
 */
export const REDIS_KEY_PREFIX = 'uiadmin';

/**
 * Environment for the API child process (Playwright merges it over the
 * parent's process.env). The server's own dotenv also loads server/.env, but
 * variables set here always win — dotenv never overrides an existing variable.
 */
export const API_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  DATABASE_HOST: DB.host,
  DATABASE_PORT: String(DB.port),
  DATABASE_NAME: DB.name,
  DATABASE_USERNAME: DB.username,
  DATABASE_PASSWORD: DB.password,
  DATABASE_SSL: 'false',
  REDIS_URL,
  REDIS_KEY_PREFIX,
  JWT_SECRET: 'ui-admin-jwt-secret-000',
  PARTNER_JWT_SECRET: 'ui-admin-partner-secret-111',
  // 4 is the schema minimum — fast hashing, since these credentials only ever
  // guard a throwaway test database.
  BCRYPT_ROUNDS: '4',
  SMS_CONSOLE_PROVIDER: 'true',
  OUTREACH_CONSOLE_PROVIDER: 'true',
  OUTREACH_PUBLIC_BASE_URL: API_URL,
  POSTHOG_API_KEY: '',
  SENTRY_DSN: '',
  MAILGUN_API_KEY: 'ui-disabled',
  MAILGUN_DOMAIN: 'ui.invalid',
  // The preview origin is NOT in the server's default CORS list — without
  // this, every request from the browser dies in preflight.
  CORS_ORIGINS: APP_URL,
  AFFILIATE_SCHEDULER_ENABLED: 'false',
  SMS_RECONCILE_ENABLED: 'false',
};
