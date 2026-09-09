import type { Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/lib/constants';
import { sql } from './db';
import { API_URL } from './test-env';

/**
 * Mints a real admin access token by driving the API the way a person would,
 * with the one step no API offers — becoming an admin — done in SQL:
 *
 *   1. POST /auth/register        (a normal customer signup)
 *   2. UPDATE users …             (role → admin, verification flags → done)
 *   3. POST /auth/login           (a fresh token that embeds role: 'admin')
 *
 * The second login is not optional: the role lives inside the JWT payload
 * (see server jwt.strategy.ts), so the register-time token would still say
 * 'customer' no matter what the row says.
 *
 * Call after resetDb() — the register throttle is 5/min per IP and the reset
 * flushes its Redis counter, so one registration per spec file always fits.
 */

const ADMIN_EMAIL = 'e2e-admin@example.com';
const ADMIN_PASSWORD = 'e2e-admin-password-1';

export async function mintAdminToken(): Promise<string> {
  const register = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: 'E2E',
      lastName: 'Admin',
    }),
  });
  if (!register.ok) {
    throw new Error(
      `Registering the e2e admin failed (${register.status}): ${await register.text()}`,
    );
  }

  await sql(
    `UPDATE users
        SET "role" = 'admin',
            "mobileVerified" = true,
            "kycStatus" = 'approved',
            "hasCompletedOnboarding" = true
      WHERE "email" = $1`,
    [ADMIN_EMAIL],
  );

  const login = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!login.ok) {
    throw new Error(
      `Logging in the e2e admin failed (${login.status}): ${await login.text()}`,
    );
  }

  // Responses are wrapped by the server's TransformResponseInterceptor:
  // { success, data: { accessToken, user } }.
  const body = (await login.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
}

/**
 * Injects the token before any app code runs on every navigation of this
 * page. Sign-in in the UI is Google-only (a real OAuth popup), so seeding
 * localStorage is the only headless path into the app — the ProtectedRoute
 * guard then validates the token against the real /users/me endpoint.
 */
export async function signInAs(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEYS.ACCESS_TOKEN, token] as const,
  );
}
