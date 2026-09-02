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

/** For `<input type="datetime-local" />` value from an ISO string. */
export function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
