import Redis from 'ioredis';
import { Client } from 'pg';
import { DB, REDIS_KEY_PREFIX, REDIS_URL } from './test-env';

/**
 * Direct database access for the browser e2e suite.
 *
 * Tests assert against the stored rows as well as the rendered page, because
 * the defects worth catching here are the ones where the screen looks right
 * and the database does not (and vice versa).
 *
 * Same shape as server/tests/e2e/helpers/db.ts — guard first, truncate in
 * FK-safe order — and now the same guard too, since both suites share
 * `startmessaging_test`.
 */

let client: Client | null = null;

export async function db(): Promise<Client> {
  if (client) return client;

  // A guard, not a formality. Every reset in this file truncates, and `sm_db`
  // on the same Postgres is the development database, holding real users,
  // messages and leads. Only a name that reads as a test database passes.
  if (!/e2e|test/i.test(DB.name)) {
    throw new Error(
      `Refusing to run UI e2e tests against database "${DB.name}". ` +
        `The suite truncates tables; point it at the startmessaging_test database.`,
    );
  }

  client = new Client({
    host: DB.host,
    port: DB.port,
    database: DB.name,
    user: DB.username,
    password: DB.password,
  });
  await client.connect();
  return client;
}

export async function closeDb(): Promise<void> {
  await client?.end();
  client = null;
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const c = await db();
  const res = await c.query(text, params);
  return res.rows as T[];
}

/**
 * Clears this suite's Redis keys — everything under REDIS_KEY_PREFIX except
 * BullMQ's namespace.
 *
 * The register/login throttles (5/min per IP) are counted there; each spec
 * file registers its own admin, so without this a re-run inside a minute
 * would 429 for a reason unrelated to anything the test asserts.
 *
 * It was a FLUSHDB until the queues moved. That only ever looked safe: BullMQ
 * built its connection from the parsed REDIS_URL and dropped the `/12`, so
 * every queue in every environment sat on logical DB 0 and there was nothing
 * of BullMQ's on this DB to wipe. Now that the path is honoured the queues
 * live here, and deleting their keys under the running API leaves its workers
 * blocked on a BRPOPLPUSH against a list that no longer exists — jobs that
 * were already queued are simply gone, and the spec waiting on the effect
 * fails on its timeout with nothing in the logs. So queue keys are left alone
 * between tests; they belong to a process that is still alive.
 */
export async function flushRedis(): Promise<void> {
  const url = new URL(REDIS_URL);

  // Same guard as the database: never touch a Redis DB that is not the
  // suite's own. Anything without an explicit non-zero logical DB is refused.
  const dbIndex = url.pathname.replace('/', '');
  if (!dbIndex || dbIndex === '0') {
    throw new Error(
      `Refusing to clear Redis at "${REDIS_URL}": the e2e suite needs its own logical DB (e.g. /12).`,
    );
  }

  // An empty prefix collapses the pattern below to `*`, which is the FLUSHDB
  // this function exists to stop being, and a glob metacharacter in the prefix
  // widens the scan the same way. Joi checks this pattern too
  // (server/src/config/validation.ts), but that runs in the API process and
  // this deletion runs in the Playwright one, so it is checked again here.
  if (!/^[A-Za-z0-9_-]+$/.test(REDIS_KEY_PREFIX)) {
    throw new Error(
      `Refusing to clear Redis with REDIS_KEY_PREFIX "${REDIS_KEY_PREFIX}": ` +
        'only [A-Za-z0-9_-] is allowed, so the scan cannot reach past this suite.',
    );
  }

  // Exactly the prefix BullMQ is handed in server/src/app.module.ts.
  const queues = `${REDIS_KEY_PREFIX}:bull`;

  const redis = new Redis(REDIS_URL, {
    // No reconnect loop. A Redis that is down should fail the first spec
    // outright, not stall every one of them for the default retry budget.
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
  });
  // ioredis emits 'error' as well as rejecting the command. Unhandled it does
  // not throw — silentEmit prints "[ioredis] Unhandled error event" and a
  // connect stack trace to stderr — but that lands in the middle of whichever
  // spec is running and reads like the failure. The rejection below is the
  // report worth keeping.
  redis.on('error', () => {});

  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${REDIS_KEY_PREFIX}:*`,
        'COUNT',
        500,
      );
      cursor = next;
      const doomed = keys.filter((k) => k !== queues && !k.startsWith(`${queues}:`));
      if (doomed.length > 0) await redis.unlink(...doomed);
    } while (cursor !== '0');
  } finally {
    // disconnect(), not quit(): quit() on a connection that never came up
    // rejects and would mask the SCAN error that got us here.
    redis.disconnect();
  }
}

/**
 * Tables the suite owns, ordered so truncation never trips a foreign key.
 * Mirrors the server e2e suite's list; `affiliate_settings` is a self-healing
 * singleton the migrations seeded and no test here touches, so it stays.
 */
const TABLES = [
  'lead_outreach_events',
  'lead_ingest_runs',
  // Self-healing singleton (the settings service recreates it on read), so
  // truncating is safe — and required: a stray override from a previous run
  // would poison this run's "from env" assertions.
  'lead_pipeline_settings',
  'leads',
  'outreach_suppressions',
  'partner_commissions',
  'partner_payouts',
  'referral_clicks',
  'referrals',
  'partners',
  'messages',
  'wallet_transactions',
  'payments',
  'wallets',
  'api_keys',
  'users',
];

/** Returns the database (and the throttle counters in Redis) to a known state. */
export async function resetDb(): Promise<void> {
  await flushRedis();
  const c = await db();
  const existing = await sql<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const present = new Set(existing.map((r) => r.tablename));
  const targets = TABLES.filter((t) => present.has(t));

  await c.query(
    `TRUNCATE TABLE ${targets.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

// ── Seed functions ─────────────────────────────────────────────────────────

export interface SeedLeadInput {
  domain: string;
  status?:
    | 'new'
    | 'queued'
    | 'contacted'
    | 'replied'
    | 'converted'
    | 'unsubscribed'
    | 'bounced'
    | 'disqualified';
  enrichmentStatus?: 'pending' | 'enriched' | 'no_contact' | 'parked' | 'failed';
  liveness?: 'unknown' | 'live' | 'inactive';
  livenessDetail?: string | null;
  contactEmails?: string[];
  contactPhones?: string[];
  contactWhatsapp?: string[];
  isIndian?: boolean | null;
  siteTitle?: string | null;
  score?: number;
  /** Count (0–5) of verified signals — keep it equal to qualificationSignals.length. */
  qualificationScore?: number;
  qualificationSignals?: string[];
  teamRating?: number | null;
  /** "YYYY-MM-DD" */
  registeredOn?: string | null;
  notes?: string | null;
}

/** Inserts one lead and returns its id. */
export async function seedLead(input: SeedLeadInput): Promise<string> {
  const enrichmentStatus = input.enrichmentStatus ?? 'pending';
  // An enriched/no_contact/failed lead has by definition been crawled.
  const enrichedAt = enrichmentStatus === 'pending' ? null : new Date();
  const liveness = input.liveness ?? 'unknown';
  // A probed lead has by definition a probe timestamp.
  const livenessCheckedAt = liveness === 'unknown' ? null : new Date();
  const [row] = await sql<{ id: string }>(
    `INSERT INTO leads
       ("domain", "source", "status", "enrichmentStatus",
        "liveness", "livenessDetail", "livenessCheckedAt",
        "contactEmails", "contactPhones", "contactWhatsapp",
        "isIndian", "siteTitle", "score", "qualificationScore",
        "qualificationSignals", "teamRating",
        "registeredOn", "notes", "enrichedAt")
     VALUES ($1, 'nrd', $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb,
             $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18)
     RETURNING id`,
    [
      input.domain,
      input.status ?? 'new',
      enrichmentStatus,
      liveness,
      input.livenessDetail ?? null,
      livenessCheckedAt,
      JSON.stringify(input.contactEmails ?? []),
      JSON.stringify(input.contactPhones ?? []),
      JSON.stringify(input.contactWhatsapp ?? []),
      input.isIndian ?? null,
      input.siteTitle ?? null,
      input.score ?? 0,
      input.qualificationScore ?? 0,
      JSON.stringify(input.qualificationSignals ?? []),
      input.teamRating ?? null,
      input.registeredOn ?? null,
      input.notes ?? null,
      enrichedAt,
    ],
  );
  return row.id;
}

export interface SeedCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
}

/** Inserts one customer-role user (no password — list views never need one). */
export async function seedCustomer(input: SeedCustomerInput): Promise<string> {
  const [row] = await sql<{ id: string }>(
    `INSERT INTO users ("email", "firstName", "lastName", "role")
     VALUES ($1, $2, $3, 'customer')
     RETURNING id`,
    [input.email, input.firstName, input.lastName],
  );
  return row.id;
}
