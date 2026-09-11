import { REPORTING_TIMEZONE } from '@/lib/datetime';
import type { GrowthGranularity } from '@/types';

/**
 * Every date on this screen is formatted in IST, explicitly.
 *
 * The server buckets signups by IST calendar day and reads a bare
 * `YYYY-MM-DD` bound as an IST day. Formatting with the browser's zone would
 * put the axis labels a day off the buckets they name for anyone travelling —
 * the chart would still be right and its labels would be lying.
 */
const DAY = new Intl.DateTimeFormat('en-IN', {
  timeZone: REPORTING_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DAY_SHORT = new Intl.DateTimeFormat('en-IN', {
  timeZone: REPORTING_TIMEZONE,
  day: 'numeric',
  month: 'short',
});

const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: REPORTING_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "26 Jul 2026", or an em dash for nothing. */
export function formatIstDay(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DAY.format(date);
}

/** "26 Jul 2026, 02:30 pm", or an em dash for nothing. */
export function formatIstDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME.format(date);
}

/**
 * Axis tick for one bucket.
 *
 * A bare `YYYY-MM-DD` parses as UTC midnight, which is 05:30 the same day in
 * IST — so formatting it in IST recovers the day the server meant. Parsing it
 * as local time (`new Date(2026, 4, 10)`) would not survive a browser west of
 * Greenwich.
 */
export function formatBucketTick(bucket: string): string {
  const date = new Date(bucket);
  return Number.isNaN(date.getTime()) ? bucket : DAY_SHORT.format(date);
}

/** Tooltip heading for one bucket — says "week of" when the bars are weeks. */
export function formatBucketLabel(
  bucket: string,
  granularity: GrowthGranularity,
): string {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  return granularity === 'week'
    ? `Week of ${DAY.format(date)}`
    : DAY.format(date);
}

/** The inclusive last day of a half-open `toExclusive` bound, for display. */
export function inclusiveEndDay(toExclusive: string): string {
  const date = new Date(toExclusive);
  if (Number.isNaN(date.getTime())) return '—';
  // The bound is exclusive: a window ending "2026-07-27T00:00+05:30" covers
  // the 26th. Showing the raw bound would tell an operator the report includes
  // a day it deliberately excludes.
  return DAY.format(new Date(date.getTime() - 1));
}
