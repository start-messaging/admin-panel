import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

import { API_ENV, API_URL, APP_PORT, APP_URL } from './helpers/test-env';

/**
 * Browser-level e2e suite: real Chromium against the built admin panel
 * (vite preview on 4174) talking to the real compiled API (3020) over the
 * shared startmessaging_test database. Run with `npm run test:e2e` — and not alongside the
 * server or dashboard e2e suites, which truncate the same database.
 */

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_PANEL_DIR = path.resolve(E2E_DIR, '..');
const SERVER_MAIN = path.resolve(
  ADMIN_PANEL_DIR,
  '../server/dist/main.js',
);

export default defineConfig({
  testDir: E2E_DIR,
  // Runs before the webServer entries below: it refuses a stale ../server/dist
  // (this suite never builds it) and clears leftover BullMQ jobs while no
  // worker is attached. See the file for why that sweep is safe only here.
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  // Serial: every spec truncates the shared database in beforeAll, so
  // parallel workers would interfere by construction.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['line']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
  },

  webServer: [
    {
      // The compiled artifact, exactly what a deploy runs — same idiom as
      // server/playwright.config.ts. cwd is this e2e folder on purpose: the
      // server's dotenv looks for .env in cwd, so nothing from server/.env
      // (which points at other databases) is ever loaded; every setting the
      // suite depends on arrives through the explicit env below, which wins
      // over dotenv in any case.
      command: `node ${SERVER_MAIN}`,
      cwd: E2E_DIR,
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: API_ENV,
    },
    {
      // build:e2e skips `tsc -b` deliberately: the regular `build` script owns
      // typechecking (and the Verify step still runs it); rebuilding types here
      // would only slow every test run down. What matters is that the bundle
      // is compiled with VITE_API_BASE_URL pointing at the suite's API — Vite
      // inlines env at build time, so a stale dist/ would silently talk to
      // localhost:3000 instead.
      command: `npm run build:e2e && npx vite preview --port ${APP_PORT} --strictPort`,
      cwd: ADMIN_PANEL_DIR,
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
