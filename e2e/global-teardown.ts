import { releaseSuiteLock } from './suite-lock';

/**
 * Releases the one-suite-at-a-time lock taken in global-setup.
 *
 * Only for the tidy case: the lock is a session advisory lock, so a killed or
 * crashed run drops its connection and Postgres releases it regardless.
 */
export default async function globalTeardown(): Promise<void> {
  await releaseSuiteLock();
}
