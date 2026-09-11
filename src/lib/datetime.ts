/**
 * "5m ago" / "2h ago" / "3d ago" for list chips, em-dash for never.
 *
 * Hand-rolled on purpose: this repo has no date-fns, and one truncating
 * division per unit does not justify adding a dependency. Truncation (not
 * rounding) so "1h 59m" reads "1h ago" — an age never overstates itself.
 * A timestamp slightly in the future (clock skew between server and
 * browser) degrades to "just now" rather than a negative age.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** The timezone every date this platform reports in is bucketed by, server-side. */
export const REPORTING_TIMEZONE = 'Asia/Kolkata';

const IST_DAY_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: REPORTING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The IST calendar day (`YYYY-MM-DD`) an instant falls on.
 *
 * Not `toISOString().slice(0, 10)`: that is the UTC day, and every signup
 * between 00:00 and 05:30 IST lands on the previous one. The growth API reads
 * a bare `YYYY-MM-DD` as an IST day, so a UTC-derived bound would ask for a
 * different window than the one on screen — and a browser in another timezone
 * would ask for a different one again.
 */
export function toISTDate(iso: string | number | Date | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const parts = IST_DAY_PARTS.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's IST calendar day, whatever timezone the browser is in. */
export function istToday(): string {
  return toISTDate(new Date());
}

/** The IST calendar day `days` before today — 0 is today. */
export function istDaysAgo(days: number): string {
  return toISTDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

/** Whole days between two `YYYY-MM-DD` days, inclusive of both ends. */
export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

/** For `<input type="datetime-local" />` value from an ISO string. */
export function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
