import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, sql } from './helpers/db';

/**
 * The suppression list is the do-not-contact safety net for cold outreach,
 * so both directions are checked against the table AND the row store: an
 * entry that renders but was never written would not actually block a send.
 */

let token: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();
});

test.afterAll(async () => {
  await closeDb();
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, token);
});

test('adds a suppression via the dialog', async ({ page }) => {
  await page.goto('/leads/suppressions');
  await expect(page.getByText('No suppressed addresses')).toBeVisible();

  await page.getByRole('button', { name: 'Add suppression' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Add suppression' }),
  ).toBeVisible();

  await dialog
    .getByPlaceholder('person@example.com')
    .fill('blocked@example.com');
  await dialog.getByRole('combobox').selectOption('bounced');
  await dialog
    .getByPlaceholder('Why this address must not be contacted…')
    .fill('Hard bounce on the first send.');
  await dialog.getByRole('button', { name: 'Add suppression' }).click();

  await expect(
    page.getByText('blocked@example.com added to the suppression list'),
  ).toBeVisible();

  const row = page
    .locator('tbody tr')
    .filter({ hasText: 'blocked@example.com' });
  await expect(row).toBeVisible();
  await expect(row.getByText('bounced', { exact: true })).toBeVisible();
  await expect(row.getByText('Hard bounce on the first send.')).toBeVisible();

  const stored = await sql<{ reason: string; notes: string | null }>(
    `SELECT reason, notes FROM outreach_suppressions WHERE email = $1`,
    ['blocked@example.com'],
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].reason).toBe('bounced');
  expect(stored[0].notes).toBe('Hard bounce on the first send.');
});

test('removes a suppression after the confirm', async ({ page }) => {
  await page.goto('/leads/suppressions');
  await expect(
    page.locator('tbody tr').filter({ hasText: 'blocked@example.com' }),
  ).toBeVisible();

  // Removal goes through window.confirm — accept it when it fires.
  page.once('dialog', (confirm) => void confirm.accept());
  await page
    .getByRole('button', {
      name: 'Remove blocked@example.com from the suppression list',
    })
    .click();

  await expect(
    page.getByText('blocked@example.com removed from the suppression list'),
  ).toBeVisible();
  await expect(page.getByText('No suppressed addresses')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);

  const remaining = await sql(
    `SELECT id FROM outreach_suppressions WHERE email = $1`,
    ['blocked@example.com'],
  );
  expect(remaining).toHaveLength(0);
});
