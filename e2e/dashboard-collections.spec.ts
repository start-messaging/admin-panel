import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedCustomer, sql } from './helpers/db';

/**
 * Collections on the dashboard: the card, and the daily chart.
 *
 * The bug behind it: a payment received outside the app and credited by hand
 * never showed in collections, because only app checkouts were read. The card
 * must now include it, and the chart must show both sources and whether the
 * business is growing. The server's own spec owns the counting rules and the
 * day boundaries; this one is about what a person sees.
 */

let token: string;
let walletId: string;

/** A credit `daysAgo` days back, at noon IST so it never sits on a day edge. */
async function credit(
  daysAgo: number,
  amount: number,
  referenceType: 'payment' | 'admin_payment' | 'admin_topup',
  description = 'seeded',
) {
  await sql(
    `INSERT INTO wallet_transactions
       ("walletId","type","amount","balanceBefore","balanceAfter",
        "referenceType","referenceId","description","createdAt")
     VALUES ($1,'credit',$2,0,$2,$3,$4,$5,
             (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
               - make_interval(days => $6::int) + interval '12 hours')
               AT TIME ZONE 'Asia/Kolkata')`,
    [walletId, amount, referenceType, randomUUID(), description, daysAgo],
  );
}

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();

  const userId = await seedCustomer({
    email: 'payer@example.com',
    firstName: 'Pia',
    lastName: 'Payer',
  });
  const [w] = await sql<{ id: string }>(
    `INSERT INTO wallets ("userId") VALUES ($1) RETURNING id`,
    [userId],
  );
  walletId = w.id;

  // The previous 30 days (31–60 ago): a thin ₹2,000.
  await credit(40, 1000, 'payment');
  await credit(50, 1000, 'payment');

  // The last 30 days: growing. App checkouts, plus payments credited by hand.
  await credit(20, 1000, 'payment');
  await credit(12, 2000, 'payment');
  await credit(6, 1000, 'admin_payment', 'Payment received — credited to your wallet');
  await credit(3, 3000, 'payment');
  await credit(0, 2000, 'admin_payment', 'Payment received — credited to your wallet');

  // Given away, never a collection.
  await credit(2, 5000, 'admin_topup', 'Goodwill credit for the outage');
});

test.afterAll(async () => {
  await closeDb();
});

test('the Collections card counts payments credited by hand, not goodwill', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/dashboard');

  // 1,000 + 1,000 earlier, then 1,000 + 2,000 + 1,000 + 3,000 + 2,000 = 11,000
  // across seven payments; the ₹5,000 goodwill credit is not in it.
  const card = page.locator('a').filter({ hasText: 'Collections' }).first();
  await expect(card).toContainText('₹11,000');
  await expect(card).toContainText('7 payments');
  // Today: the ₹2,000 credited by hand.
  await expect(card).toContainText('₹2,000 today');
});

test('the chart shows the period, how it compares with the one before, and the split', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/dashboard');

  const chart = page
    .locator('div.rounded-xl')
    .filter({ hasText: 'Daily collections' })
    .last();
  await expect(chart).toBeVisible();

  // Last 30 days: 1,000 + 2,000 + 1,000 + 3,000 + 2,000 = 9,000, against
  // 2,000 before it: up 350%.
  await expect(chart.getByText('Last 30 days')).toBeVisible();
  await expect(chart.getByText('₹9,000').first()).toBeVisible();
  await expect(chart.getByText('₹2,000').first()).toBeVisible();
  await expect(chart.getByText('350%')).toBeVisible();

  // Both sources are named, with their own totals: 6,000 from the app and
  // 3,000 credited by hand.
  await expect(chart.getByText('App checkouts · ₹6,000')).toBeVisible();
  await expect(chart.getByText('Custom payments · ₹3,000')).toBeVisible();

  // The chart actually drew bars, one stacked bar group per day with money.
  await expect(chart.locator('.recharts-bar-rectangle').first()).toBeVisible();

  // The card on its own: the page scrolls inside the layout, so a full-page
  // capture cuts the bars off. Kept for a human to look at, not asserted on.
  // Recharts draws its bars and line in over about a second; capture after.
  await page.waitForTimeout(2000);
  await chart.screenshot({ path: 'test-results/collections-chart.png' });

  // A shorter range: the last 7 days hold ₹6,000 (6, 3 and 0 days ago).
  await chart.getByRole('button', { name: '7d' }).click();
  await expect(chart.getByText('Last 7 days')).toBeVisible();
  await expect(chart.getByText('₹6,000').first()).toBeVisible();
});
