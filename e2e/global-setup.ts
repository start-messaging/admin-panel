import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from 'ioredis';

import { REDIS_URL, REDIS_KEY_PREFIX, DB } from './helpers/test-env';
import { acquireSuiteLock } from './suite-lock';

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(E2E_DIR, '../../server');

/**
 * Refuses to run against a server build older than the server source.
 *
 * This suite boots `../server/dist/main.js` and never builds it, so an
 * un-rebuilt dist means the browser is driving the previous commit's API while
 * every assertion still passes. That is not hypothetical: it happened while
 * verifying the change that moved BullMQ onto the logical DB in REDIS_URL —
 * the old build wrote its queues to db 0 anyway and the suite said nothing.
 */
function assertServerBuildIsCurrent(): void {
  const main = path.join(SERVER_DIR, 'dist', 'main.js');
  const built = statSync(main, { throwIfNoEntry: false })?.mtimeMs;
  if (built === undefined) {
    throw new Error(
      `${main} is missing — this suite runs the compiled API. Run \`npm run build\` in ../server first.`,
    );
  }

  let newest = 0;
  let newestFile = '';
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        const { mtimeMs } = statSync(full);
        if (mtimeMs > newest) {
          newest = mtimeMs;
          newestFile = path.relative(SERVER_DIR, full);
        }
      }
    }
  };
  walk(path.join(SERVER_DIR, 'src'));

  if (newest > built) {
    throw new Error(
      `../server/dist is older than ../server/src (${newestFile} changed after dist/main.js). ` +
        'This suite runs the compiled API, so it would drive the previous build and pass. ' +
        'Run `npm run build` in ../server first.',
    );
  }
}

/**
 * Clears this suite's BullMQ namespace once, before the API starts.
 *
 * helpers/db.ts deliberately spares `${REDIS_KEY_PREFIX}:bull*` between tests:
 * unlinking a queue's keys under a running worker leaves it blocked on a stream
 * that no longer exists, and the next spec times out on work that never moves.
 * Nothing is attached yet here, which is the whole reason the same sweep is
 * safe at this point and not at that one.
 *
 * Something has to do it. Queues used to land on logical DB 0 because the
 * BullMQ factory dropped the `/N` from REDIS_URL, so this suite's own DB never
 * accumulated any; now that the connection honours the path they live here, and
 * delayed, failed and repeat jobs from the last run would otherwise be
 * processed against tables the next run has just truncated.
 */
export default async function globalSetup(): Promise<void> {
  assertServerBuildIsCurrent();

  // One suite at a time: this one and the other two TRUNCATE the same tables,
  // and an overlap surfaces as unrelated-looking assertion failures rather
  // than as a collision. See suite-lock.ts.
  await acquireSuiteLock(
    {
      host: DB.host,
      port: DB.port,
      database: DB.name,
      user: DB.username,
      password: DB.password,
    },
    'the admin-panel e2e suite',
  );

  // Logical DB 0 is shared with unrelated local projects, so a URL without an
  // explicit non-zero `/N` is refused rather than swept.
  const dbIndex = new URL(REDIS_URL).pathname.replace('/', '');
  if (!dbIndex || dbIndex === '0') {
    throw new Error(
      `Refusing to clear BullMQ keys at "${REDIS_URL}": this suite needs its own logical DB.`,
    );
  }

  // The prefix is the only thing scoping the MATCH below, and a glob character
  // in it would reach past this suite entirely.
  if (!/^[A-Za-z0-9_-]+$/.test(REDIS_KEY_PREFIX)) {
    throw new Error(
      `Refusing to clear BullMQ keys with REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX}": expected [A-Za-z0-9_-]+.`,
    );
  }

  const redis = new Redis(REDIS_URL, {
    // Fail fast: nothing is running yet, so an unreachable Redis should say so
    // here rather than surface as the far vaguer webServer health-check timeout.
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
  });
  redis.on('error', () => {});

  try {
    let cursor = '0';
    do {
      // SCAN, not KEYS: another API may be pointed at this Redis, and KEYS
      // blocks the server for every one of its clients.
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${REDIS_KEY_PREFIX}:bull*`,
        'COUNT',
        500,
      );
      cursor = next;
      if (keys.length) await redis.unlink(...keys);
    } while (cursor !== '0');
  } finally {
    // disconnect(), not quit(): quit() sends a command, and on a connection
    // that never came up it waits for a reply that is not coming.
    redis.disconnect();
  }
}
