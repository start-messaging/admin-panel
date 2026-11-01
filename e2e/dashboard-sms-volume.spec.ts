import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedCustomer, sql } from './helpers/db';

/**
 * Daily SMS volume on the dashboard: the mean, median and mode, and the chart.
 *
 * The server's own spec owns the arithmetic and the day boundaries; this one is
 * about what a person sees. The data is deterministic so the figures can be
 * checked exactly: 29 complete days of 1,000–1,400 messages (a repeating
 * pattern), and 40 so far today.
 */

let token: string;
let userId: string;

/** `n` messages of one status, `daysAgo` IST days back, at noon IST. */
async function seed(daysAgo: number, status: string, n: number) {
  await sql(
    `INSERT INTO messages
       ("userId","phoneNumber","content","provider","status","costAmount","createdAt","updatedAt")
     SELECT $1, '+919000000000', 'OTP 123456', 'console', $2, 0.25, t, t
       FROM (SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                     - make_interval(days => $3::int) + interval '12 hours')
                     AT TIME ZONE 'Asia/Kolkata' AS t) base,
            generate_series(1, $4::int)`,
    [userId, status, daysAgo, n],
  );
}

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();
  userId = await seedCustomer({
    email: 'sender@example.com',
    firstName: 'Sam',
    lastName: 'Sender',
  });

  // Days 1–29 ago: totals of 1,000 / 1,100 / 1,200 / 1,300 / 1,400 in rotation
  // (i % 5), each with 50 failed. Totals: five 1,000s and six each of the rest.
  for (let i = 1; i <= 29; i++) {
    const total = 1000 + (i % 5) * 100;
    await seed(i, 'delivered', total - 50);
    await seed(i, 'failed', 50);
  }
  // Today, unfinished.
  await seed(0, 'delivered', 36);
  await seed(0, 'failed', 4);
});

test.afterAll(async () => {
  await closeDb();
});

test('shows the mean, median and mode of the daily volume, and leaves today out of them', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/dashboard');

  const section = page
    .locator('div.rounded-xl')
    .filter({ hasText: 'Daily SMS volume' })
    .last();
  await expect(section).toBeVisible();

  // A tile's own number: scoped to paragraphs, since the chart's axis labels
  // spell some of the same figures.
  const figure = (text: string) =>
    section.locator('p', { hasText: new RegExp(`^${text}$`) });

  // 35,000 over 29 complete days = 1,206.9. Today's 40 is not in it.
  await expect(section.getByText('Mean per day')).toBeVisible();
  await expect(figure('1,207')).toBeVisible();
  // Sorted, the 15th of 29 days is 1,200.
  await expect(figure('1,200')).toBeVisible();
  // Four bands tie at six days; the one nearest the median (1,200–1,249) wins.
  await expect(figure('1,200–1,249')).toBeVisible();
  await expect(section.getByText('most common · 6 of 29 days')).toBeVisible();
  // Busiest and quietest.
  await expect(figure('1,400')).toBeVisible();
  await expect(figure('1,000')).toBeVisible();
  // Today, on its own.
  await expect(section.getByText('Today so far')).toBeVisible();
  await expect(figure('40')).toBeVisible();
  await expect(section.getByText('36 delivered')).toBeVisible();
  // Nothing older than 29 days exists, so there is nothing to compare against.
  await expect(section.getByText('no earlier period')).toBeVisible();

  // Recharts draws its bars in over about a second; capture after.
  await page.waitForTimeout(2000);
  await section.screenshot({ path: 'test-results/sms-volume-section.png' });

  // The chart drew, with the mean line and the shaded mode band.
  await expect(section.locator('.recharts-bar-rectangle').first()).toBeVisible();
  // A horizontal line has no height, which Playwright counts as hidden, so it is
  // asserted as drawn (dashed, in the mean colour) rather than as visible.
  await expect(section.locator('.recharts-reference-line line')).toHaveAttribute(
    'stroke-dasharray',
    '5 4',
  );
  await expect(section.locator('.recharts-reference-area-rect')).toBeAttached();

  // A shorter range: seven days, six complete (1–6 ago: 1,100; 1,200; 1,300;
  // 1,400; 1,000; 1,100) = 7,100 / 6 = 1,183.3.
  await section.getByRole('button', { name: '7d' }).click();
  await expect(figure('1,183')).toBeVisible();
});
