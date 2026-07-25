/**
 * Money helpers. The server stores/returns every amount as integer **micros**
 * (1 rupee = 1,000,000 micros). Format micros as ₹ currency for display.
 */
export const MICROS_PER_UNIT = 1_000_000;

export function fromMicros(micros: number | string | null | undefined): number {
  if (micros === null || micros === undefined || micros === '') return 0;
  return Number(micros) / MICROS_PER_UNIT;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

/** Format an integer micros value as ₹ currency. */
export function formatMicros(
  micros: number | string | null | undefined,
): string {
  return inrFormatter.format(fromMicros(micros));
}
