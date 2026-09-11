import { HelpBadge } from '@/components/common/help-badge';
import { cn } from '@/lib/utils';
import type { RateEnvelope } from '@/types';

/**
 * The only sanctioned way to put a server rate on screen.
 *
 * Every rate from `/admin/growth` arrives as
 * `{ value, numerator, denominator, sufficient, reason }` with `value` null —
 * never 0 — when the denominator is 0. The bug this component exists to make
 * impossible is `{(rate.value ?? 0).toFixed(1)}%`: "0% of signups were called"
 * and "nobody signed up" are different facts, and an operator who reads the
 * first when the second is true goes and asks the calling team what happened.
 *
 * So: null renders as an em dash carrying the server's own reason sentence,
 * and there is no prop anywhere here that turns it into a number.
 */
export function RateValue({
  rate,
  className,
}: {
  rate: RateEnvelope;
  className?: string;
}) {
  if (rate.value === null) {
    return (
      <HelpBadge
        help={rate.reason ?? 'Not enough data to compute this rate.'}
        className={cn('text-muted-foreground', className)}
      >
        <span aria-label="No value — nothing was measured">—</span>
      </HelpBadge>
    );
  }

  return (
    <HelpBadge
      help={`${rate.numerator.toLocaleString('en-IN')} of ${rate.denominator.toLocaleString('en-IN')}`}
      className={className}
    >
      {rate.value.toFixed(1)}%
    </HelpBadge>
  );
}

/**
 * The sentence that goes with an em dash, in the places where an operator is
 * reading the number rather than glancing at it. Renders nothing when the rate
 * has a value, so a callsite can always include it unconditionally.
 */
export function RateReason({
  rate,
  className,
}: {
  rate: RateEnvelope;
  className?: string;
}) {
  if (rate.value !== null || !rate.reason) return null;

  return (
    <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
      {rate.reason}
    </p>
  );
}

/** "192 of 392" — the counts behind a rate, which are true even when it is not. */
export function RateCounts({
  rate,
  unit,
  className,
}: {
  rate: RateEnvelope;
  /** Plural noun for the denominator, e.g. "signups". */
  unit: string;
  className?: string;
}) {
  return (
    <span className={cn('tabular-nums', className)}>
      {rate.numerator.toLocaleString('en-IN')} of{' '}
      {rate.denominator.toLocaleString('en-IN')} {unit}
    </span>
  );
}
