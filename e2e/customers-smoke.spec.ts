import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedCustomer } from './helpers/db';

/**
 * Regression canary for the pre-existing customers list: seeded users must
 * come back as rendered rows. Nothing fancy on purpose — if this page stops
 * listing customers, every deeper admin workflow is broken with it.
 */

let token: string;
let ashaId: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();

  ashaId = await seedCustomer({
    email: 'asha@example.com',
    firstName: 'Asha',
    lastName: 'Patel',
  });
  await seedCustomer({
    email: 'rohan@example.com',
    firstName: 'Rohan',
    lastName: 'Mehta',
  });
});

test.afterAll(async () => {
  await closeDb();
});

test('renders the seeded customers as rows', async ({ page }) => {
  await signInAs(page, token);
  await page.goto('/customers');

  // 2 seeded customers + the suite's own admin account.
  await expect(page.locator('tbody tr')).toHaveCount(3);

  const asha = page.locator('tbody tr').filter({ hasText: 'asha@example.com' });
  await expect(asha).toBeVisible();
  await expect(asha.getByText('Asha Patel')).toBeVisible();
  await expect(
    asha.getByRole('link', { name: /Asha Patel/ }),
  ).toHaveAttribute('href', `/customers/${ashaId}`);

  const rohan = page
    .locator('tbody tr')
    .filter({ hasText: 'rohan@example.com' });
  await expect(rohan).toBeVisible();
  await expect(rohan.getByText('Rohan Mehta')).toBeVisible();
});
