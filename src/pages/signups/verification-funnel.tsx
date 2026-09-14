import { Link } from 'react-router-dom';
import { ArrowRight, TrendingDown, TriangleAlert } from 'lucide-react';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { RateValue } from '@/components/common/rate-value';
import {
  FUNNEL_COLUMN_HELP,
  FUNNEL_STAGE_HELP,
  SIGNUPS_SECTION_HELP,
} from '@/lib/help-copy';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { GrowthFunnel } from '@/types';

/**
 * Where a stage's number can be opened as a list, and the caveat that comes
 * with it.
 *
 * Only two stages have an honest destination. The customer list filters on KYC
 * state alone — it has no "mobile verified" filter and no window — so linking
 * every row would hand an operator four lists whose totals disagree with the
 * bars they came from, with no way to tell which of the two is wrong. Where a
 * link does exist the caveat says exactly how the two differ.
 */
const STAGE_LINKS: Record<string, { to: string; caveat: string }> = {
  signed_up: {
    to: ROUTES.CUSTOMERS,
    caveat:
      'Opens the full customer list. That list is not limited to this window and includes admin accounts, so its total will be larger than this number.',
  },
  kyc_approved: {
    to: `${ROUTES.CUSTOMERS}?kycStatus=approved`,
    caveat:
      'Opens every approved account, all time. This bar counts only accounts that signed up inside the window AND cleared every earlier stage, so the list will show more.',
  },
};

export function VerificationFunnel({ funnel }: { funnel: GrowthFunnel }) {
  const cohort = funnel.stages[0]?.reached ?? 0;
  const dropOffTo = funnel.biggestDropOff?.to ?? null;
  const labelOf = (key: string) =>
    funnel.stages.find((s) => s.key === key)?.label ?? key;

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Verification funnel</h2>
        <span className="text-xs text-muted-foreground">
          Signups in this window only
        </span>
      </div>
      <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
        {SIGNUPS_SECTION_HELP.funnel}
      </p>

      {/* Asserted by the server on every request. It cannot be false while the
          stages are a strict conjunction, which is exactly why a false here is
          worth shouting about rather than rendering quietly. */}
      {!funnel.monotone && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            The API reported this funnel as non-monotone — a later stage counts
            more accounts than an earlier one. The ladder is not measuring what
            this screen says it is; do not act on these numbers until it is
            fixed.
          </p>
        </div>
      )}

      {funnel.biggestDropOff && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <TrendingDown className="size-4 shrink-0" />
          <span>
            <span className="font-semibold">Biggest drop:</span>{' '}
            {labelOf(funnel.biggestDropOff.from)}
            <ArrowRight className="mx-1 inline size-3" aria-label="to" />
            {labelOf(funnel.biggestDropOff.to)} —{' '}
            <span className="font-semibold tabular-nums">
              {funnel.biggestDropOff.lost.toLocaleString('en-IN')}
            </span>{' '}
            {funnel.biggestDropOff.lost === 1 ? 'account' : 'accounts'} lost.
          </span>
        </div>
      )}

      <ol className="space-y-5">
        {funnel.stages.map((stage, index) => {
          // A width, not a rate: nothing is rendered as a percentage from
          // this, so a zero cohort collapses the bars rather than printing
          // "0%" over an empty window.
          const width = cohort > 0 ? (stage.reached / cohort) * 100 : 0;
          const link = STAGE_LINKS[stage.key];
          const isBiggestDrop = stage.key === dropOffTo;

          return (
            <li key={stage.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <HelpBadge
                    help={FUNNEL_STAGE_HELP[stage.key]}
                    className="text-sm font-medium"
                  >
                    {stage.label}
                  </HelpBadge>
                  {isBiggestDrop && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      biggest drop
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-bold tabular-nums">
                    {stage.reached.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <RateValue rate={stage.conversionFromSignup} /> of signups
                  </span>
                </div>
              </div>

              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-300',
                    isBiggestDrop ? 'bg-amber-500' : 'bg-blue-600',
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {index > 0 && (
                  <span>
                    <HeaderTooltip
                      label="From previous"
                      help={FUNNEL_COLUMN_HELP.fromPrevious}
                    />
                    : <RateValue rate={stage.conversionFromPrevious} />
                  </span>
                )}
                {index > 0 && stage.lostFromPrevious > 0 && (
                  <span className="font-medium text-red-600">
                    {stage.lostFromPrevious.toLocaleString('en-IN')} lost here
                  </span>
                )}
                {/* Only when the two disagree. Printing "matched" beside every
                    row would read as a second, competing count of the same
                    thing; printing it only where it differs is the anomaly
                    itself, which is the part worth reading. */}
                {stage.matched !== stage.reached && (
                  <span>
                    <HeaderTooltip
                      label={`${stage.matched.toLocaleString('en-IN')} match this stage alone`}
                      help={FUNNEL_COLUMN_HELP.matched}
                    />
                  </span>
                )}
                {link && (
                  <ActionTooltip help={link.caveat} side="top">
                    {(props) => (
                      <Link
                        {...props}
                        to={link.to}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Open in customer list
                        <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </ActionTooltip>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
