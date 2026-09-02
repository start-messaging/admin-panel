import { expect, test } from '@playwright/test';
import { mintAdminToken, signInAs } from './helpers/auth';
import { closeDb, resetDb, seedLead, sql } from './helpers/db';

/**
 * One enriched lead, driven through the real workflow: open from the list,
 * check the extracted contacts, save a note, queue outreach. Where the UI
 * claims a state change, the database is asked whether it actually happened.
 */

let token: string;
let leadId: string;

test.beforeAll(async () => {
  await resetDb();
  token = await mintAdminToken();

  leadId = await seedLead({
    domain: 'acme-widgets.in',
    status: 'new',
    enrichmentStatus: 'enriched',
    contactEmails: ['founder@acme-widgets.in', 'sales@acme-widgets.in'],
    contactPhones: ['+919876543210'],
    contactWhatsapp: ['+91 98123 45678'],
    isIndian: true,
    siteTitle: 'Acme Widgets',
    qualificationScore: 3,
    qualificationSignals: ['payments', 'auth', 'whatsapp'],
  });
});

test.afterAll(async () => {
  await closeDb();
});

test.beforeEach(async ({ page }) => {
  await signInAs(page, token);
});

test('opens from the list link and renders the extracted contacts', async ({
  page,
}) => {
  await page.goto('/leads');
  await page.getByRole('link', { name: /acme-widgets\.in/ }).click();

  await expect(page).toHaveURL(`/leads/${leadId}`);
  await expect(
    page.getByRole('heading', { name: 'acme-widgets.in' }),
  ).toBeVisible();

  await expect(
    page.getByRole('link', { name: 'founder@acme-widgets.in' }),
  ).toHaveAttribute('href', 'mailto:founder@acme-widgets.in');
  await expect(
    page.getByRole('link', { name: '+919876543210' }),
  ).toHaveAttribute('href', 'tel:+919876543210');
  // wa.me links carry digits only, whatever spacing the site used.
  await expect(
    page.getByRole('link', { name: '+91 98123 45678' }),
  ).toHaveAttribute('href', 'https://wa.me/919812345678');

  // Verified signals: the count and the evidence chips, not a made-up score.
  await expect(page.getByText('3/5')).toBeVisible();
  await expect(page.getByText('payments', { exact: true })).toBeVisible();
  await expect(page.getByText('whatsapp', { exact: true })).toBeVisible();
});

test('saves a note and shows it again after a reload', async ({ page }) => {
  await page.goto(`/leads/${leadId}`);

  const notes = page.getByPlaceholder('Why this lead matters, who to talk to…');
  await notes.fill('Spoke to the founder — wants OTP for their checkout.');
  await page.getByRole('button', { name: 'Save notes' }).click();

  await expect(page.getByText('Notes saved')).toBeVisible();

  const [row] = await sql<{ notes: string | null }>(
    `SELECT notes FROM leads WHERE id = $1`,
    [leadId],
  );
  expect(row.notes).toBe(
    'Spoke to the founder — wants OTP for their checkout.',
  );

  await page.reload();
  await expect(notes).toHaveValue(
    'Spoke to the founder — wants OTP for their checkout.',
  );
});

test('queues outreach via the dialog and records the events', async ({
  page,
}) => {
  await page.goto(`/leads/${leadId}`);

  await page.getByRole('button', { name: 'Queue outreach' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Queue outreach' }),
  ).toBeVisible();

  // Choose the seeded address explicitly rather than trusting the default.
  await dialog.getByRole('combobox').selectOption('founder@acme-widgets.in');
  await dialog.getByRole('button', { name: 'Queue outreach' }).click();

  await expect(
    page.getByText('Outreach queued to founder@acme-widgets.in'),
  ).toBeVisible();

  // The console provider sends synchronously, so by the time the mutation
  // resolves the lead is contacted — the refetched badge must say so.
  await expect(page.getByText('contacted', { exact: true })).toBeVisible();
  await expect(page.getByText('founder@acme-widgets.in').first()).toBeVisible();

  const [lead] = await sql<{ status: string; outreachEmail: string }>(
    `SELECT status, "outreachEmail" FROM leads WHERE id = $1`,
    [leadId],
  );
  expect(lead.status).toBe('contacted');
  expect(lead.outreachEmail).toBe('founder@acme-widgets.in');

  const events = await sql<{ type: string; provider: string }>(
    `SELECT type, provider FROM lead_outreach_events
      WHERE "leadId" = $1 ORDER BY "occurredAt", "createdAt"`,
    [leadId],
  );
  expect(events.map((e) => e.type)).toEqual(['queued', 'sent']);
  expect(events.every((e) => e.provider === 'console')).toBe(true);

  // The timeline section lists both events. Scoped to the card under the
  // "Outreach events" heading — the success toast is also a list item and
  // contains the word "queued".
  const timeline = page
    .getByRole('heading', { name: 'Outreach events' })
    .locator('xpath=..');
  await expect(
    timeline.getByRole('listitem').filter({ hasText: 'queued' }),
  ).toBeVisible();
  await expect(
    timeline.getByRole('listitem').filter({ hasText: 'sent' }),
  ).toBeVisible();
});

test('delists and re-lists the lead, with the row store agreeing', async ({
  page,
}) => {
  // Runs after the outreach test, so the lead sits at "contacted" — delist
  // must work from any working state, not just "new".
  await page.goto(`/leads/${leadId}`);

  // Delisting goes through window.confirm — accept it when it fires.
  page.once('dialog', (confirm) => void confirm.accept());
  await page.getByRole('button', { name: 'Delist' }).click();

  await expect(page.getByText('Lead marked as disqualified')).toBeVisible();
  const [delisted] = await sql<{ status: string }>(
    `SELECT status FROM leads WHERE id = $1`,
    [leadId],
  );
  expect(delisted.status).toBe('disqualified');

  // The delisted lead offers the way back, and it really lands in the row.
  await page.getByRole('button', { name: 'Re-list' }).click();
  await expect(page.getByText('Lead marked as new')).toBeVisible();
  const [relisted] = await sql<{ status: string }>(
    `SELECT status FROM leads WHERE id = $1`,
    [leadId],
  );
  expect(relisted.status).toBe('new');
});
