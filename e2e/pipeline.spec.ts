import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, sql } from './helpers/db';
import { API_URL } from './helpers/test-env';

/**
 * The pipeline page against the real API: cron rows with their auto-run
 * state (database-operated runtime settings), and live queue counts from the
 * suite's own Redis. No gate is switched on in the e2e environment, so the
 * pills must render the disabled state — asserting "Auto on" at rest here
 * would mean the suite had started running crons against the shared feed.
 */

let token: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();
});

/**
 * Nulls every runtime knob through the API. PATCH rather than SQL because
 * the server holds a short settings cache and only its own update path
 * drops it — an SQL reset can be served stale for up to the cache TTL.
 */
async function resetPipelineSettings(): Promise<void> {
  const res = await fetch(`${API_URL}/admin/leads/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ingestEnabled: null,
      livenessEnabled: null,
      enrichEnabled: null,
      enrichBatchPerSweep: null,
      enrichConcurrency: null,
      enrichRecrawlHours: null,
    }),
  });
  if (!res.ok) {
    throw new Error(`settings reset failed: HTTP ${res.status}`);
  }
}

test.afterAll(async () => {
  await closeDb();
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, token);
});

test('renders cron rows with gate state and live queue counts', async ({
  page,
}) => {
  // Deterministic gates: a leftover 'on' from an earlier failed run would
  // flip a pill and fail the count below for the wrong reason.
  await resetPipelineSettings();
  await page.goto('/leads/pipeline');

  await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible();

  // All three crons appear in flow order, each with a rerun button; every
  // auto-run gate is off in this environment, so every pill says so.
  // exact: the settings card's "Liveness probe · auto-run" label would
  // otherwise also match and trip strict mode.
  await expect(page.getByText('Daily domain ingest', { exact: true })).toBeVisible();
  await expect(page.getByText('Liveness probe', { exact: true })).toBeVisible();
  await expect(page.getByText('Enrichment drain', { exact: true })).toBeVisible();
  await expect(page.getByText('Auto off')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Run now' })).toHaveCount(3);

  // Redis is up for this suite, so real counts render (zeros after the
  // beforeAll flush) rather than the Redis-unavailable fallback.
  await expect(page.getByText('Waiting', { exact: true })).toBeVisible();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Queue counts unavailable')).toBeHidden();
});

test('crawler card shows the drain state and its order book', async ({
  page,
}) => {
  await page.goto('/leads/pipeline');

  // Nothing is running in this environment, and the DB is empty — the
  // readouts must say so honestly rather than render blanks.
  await expect(page.getByText('Idle')).toBeVisible();
  await expect(
    page.getByText('No completed runs since the server started.'),
  ).toBeVisible();
  await expect(page.getByText('Never crawled')).toBeVisible();
  await expect(page.getByText('Stale re-crawl')).toBeVisible();
  await expect(page.getByText('Parked recheck')).toBeVisible();
  await expect(page.getByText('Crawled 24h')).toBeVisible();
});

test('settings edit what runs, and a save lands in the database row', async ({
  page,
}) => {
  // SEMANTIC CHANGE from the first version of this test: the editor no
  // longer surfaces an "env default vs override" split — the pipeline is
  // operated from the database, and the form shows/edits the EFFECTIVE
  // values directly (deployment defaults only pre-fill fields nobody has
  // ever saved). No ".env" ever appears in the UI.
  //
  // Deterministic start: null every knob THROUGH THE API, whatever any
  // earlier test (or an earlier FAILED run of this one) left behind. Via
  // PATCH rather than SQL on purpose — the server keeps a short settings
  // cache, and only its own update path drops it.
  await resetPipelineSettings();
  await page.goto('/leads/pipeline');

  // Three auto-run gates, all off in this environment, and the three
  // numeric knobs pre-filled with what actually runs.
  await expect(page.getByRole('combobox')).toHaveCount(3);
  for (const gate of await page.getByRole('combobox').all()) {
    await expect(gate).toHaveValue('off');
  }
  const numbers = page.getByRole('spinbutton');
  await expect(numbers).toHaveCount(3);
  await expect(numbers.nth(0)).toHaveValue('500');
  await expect(numbers.nth(1)).toHaveValue('4');
  await expect(numbers.nth(2)).toHaveValue('48');

  // Change one number and one gate, save.
  await numbers.nth(0).fill('800');
  await page.getByRole('combobox').nth(1).selectOption('on'); // liveness auto-run
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    page.getByText('Settings saved — the pipeline obeys them within seconds'),
  ).toBeVisible();

  // The form remounts on the fresh effective values…
  await expect(page.getByRole('spinbutton').nth(0)).toHaveValue('800');

  // …the cron pill for the enabled stage flips within a couple of poll
  // cycles (5s polling + the save's own invalidation)…
  await expect(page.getByText('Auto on')).toHaveCount(1, { timeout: 20_000 });

  // …and the singleton row stores exactly what was changed, nothing else.
  const [row] = await sql<{
    enrichBatchPerSweep: number | null;
    enrichConcurrency: number | null;
    enrichEnabled: boolean | null;
    livenessEnabled: boolean | null;
    ingestEnabled: boolean | null;
  }>(
    `SELECT "enrichBatchPerSweep", "enrichConcurrency", "enrichEnabled",
            "livenessEnabled", "ingestEnabled"
       FROM lead_pipeline_settings WHERE "isSingleton" = true`,
  );
  expect(Number(row.enrichBatchPerSweep)).toBe(800);
  expect(row.livenessEnabled).toBe(true);
  expect(row.enrichConcurrency).toBeNull();
  expect(row.enrichEnabled).toBeNull();
  expect(row.ingestEnabled).toBeNull();

  // Tidy up through the API so nothing keeps auto-running after this suite
  // (a failed run skips this; the next run's deterministic reset covers it).
  await resetPipelineSettings();
});
