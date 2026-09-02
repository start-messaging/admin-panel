import { expect, test, type Page } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedLead, sql } from './helpers/db';

/**
 * The leads list against a seeded pipeline: stat cards, row rendering, and
 * the URL-owned filter state (filters must land in the query string, not in
 * component memory — that is the page's contract).
 */

let token: string;
let acmeId: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();

  // 8 leads: withContact = 5 (acme, bharat, chai, delta, golf),
  // india = 5 (acme, bharat, chai, foxtrot, hotel),
  // queued = 1, contacted = 1, replied = 1.
  acmeId = await seedLead({
    domain: 'acme-widgets.in',
    status: 'new',
    enrichmentStatus: 'enriched',
    contactEmails: ['hi@acme-widgets.in'],
    isIndian: true,
    siteTitle: 'Acme Widgets',
    score: 7,
    qualificationScore: 3,
    qualificationSignals: ['payments', 'auth', 'whatsapp'],
    teamRating: 4,
    liveness: 'live',
    registeredOn: '2026-08-01',
  });
  await seedLead({
    domain: 'bharat-pay.co.in',
    status: 'queued',
    enrichmentStatus: 'enriched',
    contactEmails: ['founders@bharat-pay.co.in'],
    contactPhones: ['+919812345678'],
    isIndian: true,
  });
  await seedLead({
    domain: 'chai-store.in',
    status: 'contacted',
    enrichmentStatus: 'enriched',
    contactPhones: ['+919898989898'],
    isIndian: true,
  });
  await seedLead({
    domain: 'delta-shop.com',
    status: 'replied',
    enrichmentStatus: 'enriched',
    contactEmails: ['owner@delta-shop.com'],
    isIndian: false,
  });
  await seedLead({
    domain: 'echo-labs.com',
    status: 'new',
    enrichmentStatus: 'pending',
    isIndian: null,
  });
  await seedLead({
    domain: 'foxtrot-otp.in',
    status: 'new',
    enrichmentStatus: 'no_contact',
    isIndian: true,
  });
  await seedLead({
    domain: 'golf-app.com',
    status: 'converted',
    enrichmentStatus: 'enriched',
    contactEmails: ['dev@golf-app.com'],
    isIndian: false,
  });
  await seedLead({
    domain: 'hotel-jaipur.in',
    status: 'new',
    enrichmentStatus: 'failed',
    isIndian: true,
    liveness: 'inactive',
    livenessDetail: 'no_dns',
  });
});

test.afterAll(async () => {
  await closeDb();
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, token);
});

/** The value <p> of the stat card whose label matches exactly. */
function statValue(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=../following-sibling::p[1]');
}

test('stat cards show the seeded totals', async ({ page }) => {
  await page.goto('/leads');

  await expect(statValue(page, 'Total leads')).toHaveText('8');
  await expect(statValue(page, 'Live sites')).toHaveText('1');
  await expect(statValue(page, 'With contact')).toHaveText('5');
  await expect(statValue(page, 'India')).toHaveText('5');
  await expect(statValue(page, 'Queued')).toHaveText('1');
  await expect(statValue(page, 'Contacted')).toHaveText('1');
  await expect(statValue(page, 'Replied')).toHaveText('1');
});

test('table rows render domains as links to the detail page', async ({
  page,
}) => {
  await page.goto('/leads');

  await expect(page.locator('tbody tr')).toHaveCount(8);
  await expect(
    page.getByRole('link', { name: /acme-widgets\.in/ }),
  ).toHaveAttribute('href', `/leads/${acmeId}`);
  await expect(
    page.getByRole('link', { name: /hotel-jaipur\.in/ }),
  ).toBeVisible();

  // The row carries the new columns honestly: a verified-signal count, the
  // team's rating, and country as India-or-not-sure (never "not India").
  const acmeRow = page.locator('tbody tr').filter({ hasText: 'acme-widgets.in' });
  await expect(acmeRow.getByText('India', { exact: true })).toBeVisible();
  await expect(acmeRow.getByText('4/5')).toBeVisible();
  await expect(acmeRow.getByText('Live', { exact: true })).toBeVisible();
  // The Crawled chip is relative time; acme was seeded enriched moments ago.
  await expect(acmeRow.getByText('just now')).toBeVisible();
  const echoRow = page.locator('tbody tr').filter({ hasText: 'echo-labs.com' });
  await expect(echoRow.getByText('Not sure')).toBeVisible();
  // Inactive renders muted; the reason lives in the tooltip, not the cell.
  const hotelRow = page.locator('tbody tr').filter({ hasText: 'hotel-jaipur.in' });
  await expect(hotelRow.getByText('Inactive', { exact: true })).toBeVisible();
});

test('status filter updates the URL and the row set', async ({ page }) => {
  await page.goto('/leads');
  await expect(page.locator('tbody tr')).toHaveCount(8);

  await page
    .getByRole('combobox')
    .filter({ hasText: 'All statuses' })
    .selectOption('queued');

  // URL-owned filter state: the selection must become a query param.
  await expect(page).toHaveURL(/\/leads\?status=queued$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: /bharat-pay\.co\.in/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /acme-widgets\.in/ }),
  ).toBeHidden();
});

test('country filter updates the URL and the row set', async ({ page }) => {
  await page.goto('/leads');
  await expect(page.locator('tbody tr')).toHaveCount(8);

  await page
    .getByRole('combobox')
    .filter({ hasText: 'Not sure' })
    .selectOption('true');

  await expect(page).toHaveURL(/\/leads\?india=true$/);
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await expect(
    page.getByRole('link', { name: /delta-shop\.com/ }),
  ).toBeHidden();
  await expect(
    page.getByRole('link', { name: /foxtrot-otp\.in/ }),
  ).toBeVisible();
});

test('the search box narrows to matching domains via the URL', async ({
  page,
}) => {
  await page.goto('/leads');
  await expect(page.locator('tbody tr')).toHaveCount(8);

  await page.getByPlaceholder('Domain or site title…').fill('acme');
  await page.getByPlaceholder('Domain or site title…').press('Enter');

  await expect(page).toHaveURL(/\/leads\?search=acme$/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: /acme-widgets\.in/ }),
  ).toBeVisible();
});

// Last in the file on purpose: it adds a ninth lead, and the earlier tests
// assert the seeded set of eight.
test('re-crawls a lead from the row action', async ({ page }) => {
  // .invalid is RFC-reserved and can never resolve, so the synchronous crawl
  // fails fast and deterministically — no real third-party site is fetched.
  await seedLead({
    domain: 'recrawl-target.invalid',
    status: 'new',
    enrichmentStatus: 'pending',
  });

  await page.goto('/leads');
  await page
    .getByRole('button', { name: 'Re-crawl recrawl-target.invalid' })
    .click();

  // First attempt of a fresh lead: the retry budget is not spent, so the
  // server leaves it pending-with-error for the sweep — and the toast must
  // say that, not "re-crawled".
  await expect(
    page.getByText('Crawl failed — left pending for the automatic sweep to retry'),
  ).toBeVisible({ timeout: 15_000 });

  // The UI claim is checked against the row: the crawl really ran.
  const [row] = await sql<{
    enrichmentStatus: string;
    enrichmentAttempts: number;
    enrichmentError: string | null;
  }>(
    `SELECT "enrichmentStatus", "enrichmentAttempts", "enrichmentError"
       FROM leads WHERE domain = $1`,
    ['recrawl-target.invalid'],
  );
  expect(row.enrichmentStatus).toBe('pending');
  expect(row.enrichmentError).not.toBeNull();
  expect(Number(row.enrichmentAttempts)).toBeGreaterThanOrEqual(1);
});
