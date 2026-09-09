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

test('with an injected token /leads renders past the guard', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/leads');

  // The guard's pass is real, not mocked: ProtectedRoute only renders the
  // outlet after /users/me answers with role admin for this token.
  await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
  await expect(page.getByText('No leads found')).toBeVisible();
  await expect(page).toHaveURL(/\/leads$/);
});
