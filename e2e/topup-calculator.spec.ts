import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedCustomer, sql } from './helpers/db';

/**
 * The custom payment calculator on Manual top-up.
 *
 * It must show what to ask a customer to pay for a given credit, and what to
 * credit for a given payment — both from the server, so they cannot drift from
 * the in-app checkout. The suite's API runs the shipped flat 2% rule, so a
 * ₹1,000 credit is a ₹1,020 payment.
 */

let token: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();
});

test.afterAll(async () => {
  await closeDb();
});

test('shows what to charge for a credit, and what to credit for a payment', async ({
  page,
}) => {
  await signInAs(page, token);
  await page.goto('/topup');

  // The card, not the heading inside it: the outermost box that holds both the
  // title and the inputs below it.
  const calculator = page
    .locator('div.rounded-xl')
    .filter({ hasText: 'Custom payment calculator' });
  await expect(calculator).toBeVisible();

  // Nothing typed yet: an instruction, not a made-up figure.
  await expect(
    calculator.getByText('Enter the amount to credit above'),
  ).toBeVisible();

  await page.getByPlaceholder('500').fill('1000');
  await expect(calculator.getByText('create the payment for')).toBeVisible();
  await expect(calculator.getByText('₹1,020.00').first()).toBeVisible();
  await expect(calculator.getByText(/₹20\.00 gateway fee/)).toBeVisible();

  // The other direction, and handing the answer back to the form.
  await calculator.getByPlaceholder(/Amount they paid/).fill('1020');
  await expect(calculator.getByText('→ credit')).toBeVisible();
  await page.getByPlaceholder('500').fill('7');
  await calculator.getByRole('button', { name: 'Use as amount' }).click();
  await expect(page.getByPlaceholder('500')).toHaveValue('1000');
});

test('a payment credited through Manual top-up shows up in dashboard collections', async ({
  page,
}) => {
  // The bug this guards: a payment received outside the app and credited by
  // hand was never counted as collected. Done here the way a person does it —
  // through the form, with the "Payment received" reason — and then read back
  // from the dashboard.
  const userId = await seedCustomer({
    email: 'custom-payer@example.com',
    firstName: 'Cora',
    lastName: 'Custom',
  });
  await sql(`INSERT INTO wallets ("userId") VALUES ($1)`, [userId]);

  await signInAs(page, token);
  await page.goto('/topup');

  await page
    .getByPlaceholder(/Search by name, email/)
    .fill('custom-payer@example.com');
  await page.getByPlaceholder('500').fill('1000');
  await page.getByRole('button', { name: 'Payment received' }).click();
  await page.getByRole('button', { name: /^Credit ₹1,000/ }).click();
  await expect(page.getByText(/Credited ₹1,000/)).toBeVisible();

  await page.goto('/dashboard');
  const card = page.locator('a').filter({ hasText: 'Collections' }).first();
  await expect(card).toContainText('₹1,000');
  await expect(card).toContainText('1 payments');

  const chart = page
    .locator('div.rounded-xl')
    .filter({ hasText: 'Daily collections' })
    .last();
  await expect(chart.getByText('Custom payments · ₹1,000')).toBeVisible();
});
