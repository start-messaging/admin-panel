import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb } from './helpers/db';

let token: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();
});

test.afterAll(async () => {
  await closeDb();
});

test('visiting /leads without a token lands on /sign-in', async ({ page }) => {
  await page.goto('/leads');

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole('heading', { name: 'Admin Sign In' }),
  ).toBeVisible();
});

test('with an injected token /customers renders past the guard', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/customers');

  // The guard's pass is real, not mocked: ProtectedRoute only renders the
  // outlet after /users/me answers with role admin for this token.
  //
  // The subject used to be /leads. That page left with the growth pipeline, and
  // this test is about the GUARD rather than about any one screen — so it now
  // asserts on Customers, which is the page an admin lands on anyway.
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
  await expect(page).toHaveURL(/\/customers$/);
});
