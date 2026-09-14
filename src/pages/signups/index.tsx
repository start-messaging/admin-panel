import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, Loader2, TriangleAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { useAdminGrowth } from '@/hooks/admin';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  daysBetween,
  istDaysAgo,
  istToday,
  toISTDate,
} from '@/lib/datetime';
import { SIGNUPS_SECTION_HELP, SIGNUPS_STAT_HELP } from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type {
  GrowthAsOf,
  GrowthGranularity,
  GrowthResponse,
  GrowthWindow,
  SignupBucket,
} from '@/types';
import { CallingSection } from './calling-section';
import { EmailSection } from './email-section';
import {
  formatBucketLabel,
  formatBucketTick,
  formatIstDateTime,
  formatIstDay,
  inclusiveEndDay,
} from './formatting';
import { VerificationFunnel } from './verification-funnel';

/**
 * Past a quarter, daily bars stop being readable long before the server's
 * 400-bucket ceiling refuses them. Presets that cross it open on weeks; the
 * granularity control is right there to go back to days.
 */
const WEEKLY_ABOVE_DAYS = 92;

function granularityFor(from: string, to: string): GrowthGranularity {
  return daysBetween(from, to) > WEEKLY_ABOVE_DAYS ? 'week' : 'day';
}

interface WindowPreset {
  id: string;
  label: string;
  from: string;
  to: string;
  granularity: GrowthGranularity;
}

/**
 * The default preset sends no dates at all rather than computing "30 days
 * ago" here. The server owns that default, and a URL carrying today's date
 * would quietly mean something different tomorrow while claiming to be the
 * same link.
 */
function buildPresets(asOf: GrowthAsOf | undefined): WindowPreset[] {
  const presets: WindowPreset[] = [
    { id: 'default', label: 'Last 30 days', from: '', to: '', granularity: 'day' },
    {
      id: '90d',
      label: 'Last 90 days',
      from: istDaysAgo(89),
      to: istToday(),
      granularity: 'day',
    },
    {
      id: '12m',
      label: 'Last 12 months',
      from: istDaysAgo(364),
      to: istToday(),
      granularity: 'week',
    },
  ];

  const earliest = toISTDate(asOf?.earliestSignupAt);
  if (earliest) {
    const to = istToday();
    presets.push({
      id: 'all',
      label: 'Full history',
      from: earliest,
      to,
      granularity: granularityFor(earliest, to),
    });
  }

  return presets;
}

function WindowControls({
  filters,
  asOf,
  onPreset,
  onDates,
  onGranularity,
}: {
  filters: { from: string; to: string; granularity: GrowthGranularity };
  asOf: GrowthAsOf | undefined;
  onPreset: (preset: WindowPreset) => void;
  onDates: (from: string, to: string) => void;
  onGranularity: (granularity: GrowthGranularity) => void;
}) {
  const presets = buildPresets(asOf);

  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-3">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
          {presets.map((preset) => {
            // Matched on the dates alone: flipping day/week is a rendering
            // choice, and deselecting the range under it would be a lie about
            // which window is on screen.
            const active =
              filters.from === preset.from && filters.to === preset.to;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPreset(preset)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="growth-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <input
            id="growth-from"
            type="date"
            value={filters.from}
            // The server rejects from > to (a cross-field DTO rule), so the
            // inputs bound each other rather than letting an operator compose
            // a 400 and read it as "the report is broken".
            max={filters.to || undefined}
            onChange={(e) => onDates(e.target.value, filters.to)}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="growth-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <input
            id="growth-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => onDates(filters.from, e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          {/* Not wrapped in a <label>: the tooltip trigger is itself
              focusable, and nesting it inside a label would put a second tab
              stop in front of the select it names. The select carries its own
              accessible name instead. */}
          <HeaderTooltip
            label="Buckets"
            help={SIGNUPS_SECTION_HELP.granularity}
            className="text-xs font-medium text-muted-foreground"
          />
          <select
            id="growth-granularity"
            aria-label="Bucket width"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={filters.granularity}
            onChange={(e) => onGranularity(e.target.value as GrowthGranularity)}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {SIGNUPS_SECTION_HELP.window}
      </p>
    </div>
  );
}

function SignupsGraph({
  series,
  total,
  // Not named `window`: shadowing the global inside a component is the kind of
  // thing that reads fine until someone adds a `window.confirm` to it.
  growthWindow,
}: {
  series: SignupBucket[];
  total: number;
  growthWindow: GrowthWindow;
}) {
  const busiest = series.reduce<SignupBucket | null>(
    (best, bucket) =>
      bucket.count > 0 && (!best || bucket.count > best.count) ? bucket : best,
    null,
  );

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Signups over time</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {SIGNUPS_SECTION_HELP.graph}
          </p>
        </div>
        <div className="flex shrink-0 gap-6">
          <div>
            <HeaderTooltip
              label="In window"
              help={SIGNUPS_STAT_HELP.totalSignups}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            />
            <p className="text-2xl font-bold tabular-nums">
              {total.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <HeaderTooltip
              label="Busiest"
              help={SIGNUPS_STAT_HELP.busiest}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            />
            {busiest ? (
              <p className="text-2xl font-bold tabular-nums">
                {busiest.count.toLocaleString('en-IN')}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  on {formatBucketTick(busiest.bucket)}
                </span>
              </p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* A chart with no buckets at all would render as an empty frame that
          looks like a failed load. Zero signups across real buckets is a
          different thing and still draws — a flat line at zero. */}
      {series.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          This window resolved to no buckets at all — narrow or widen the dates.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="bucket"
                axisLine={false}
                tickLine={false}
                fontSize={12}
                minTickGap={28}
                tickFormatter={formatBucketTick}
                dy={8}
              />
              {/* Signups are whole accounts: a "2.5" gridline would be a number
                  this axis can never take. */}
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={12}
                allowDecimals={false}
                width={44}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                labelFormatter={(label) =>
                  formatBucketLabel(String(label), growthWindow.granularity)
                }
              />
              {/* One series, so no legend — the heading names it. */}
              <Area
                name="Signups"
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#signupsFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {formatIstDay(growthWindow.from)} –{' '}
        {inclusiveEndDay(growthWindow.toExclusive)} ·{' '}
        {growthWindow.buckets.toLocaleString('en-IN')}{' '}
        {growthWindow.granularity === 'week' ? 'weekly' : 'daily'} buckets ·{' '}
        {growthWindow.timezone}
        {growthWindow.defaulted && ' · default window'}
      </p>
    </section>
  );
}

function EmptyWindowNotice({
  data,
  onShowFullHistory,
}: {
  data: GrowthResponse;
  onShowFullHistory: (() => void) | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            No customer signed up between {formatIstDay(data.window.from)} and{' '}
            {inclusiveEndDay(data.window.toExclusive)}.
          </p>
          {/* The reason every rate below reads as an em dash. Without this
              line the screen looks broken rather than empty. */}
          <p className="mt-1 text-sm text-amber-800">
            Every rate below is undefined rather than zero for that reason —
            there is no cohort to measure.
            {data.asOf.earliestSignupAt && (
              <>
                {' '}
                Signups run from {formatIstDay(data.asOf.earliestSignupAt)} to{' '}
                {formatIstDay(data.asOf.latestSignupAt)}.
              </>
            )}
          </p>
        </div>
      </div>
      {onShowFullHistory && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 bg-background"
          onClick={onShowFullHistory}
        >
          Show full history
        </Button>
      )}
    </div>
  );
}

export function SignupsPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    isPlaceholderData,
    filters,
    setWindow,
    setGranularity,
    resetFilters,
  } = useAdminGrowth();

  const applyPreset = (preset: WindowPreset) => {
    if (preset.id === 'default') {
      resetFilters();
      return;
    }
    setWindow(preset.from, preset.to, preset.granularity);
  };

  const applyDates = (from: string, to: string) => {
    // Only auto-switch buckets when the operator has actually widened past
    // what daily bars can show. Overriding a granularity they picked by hand
    // on every date tweak would fight them.
    const next =
      from && to && granularityFor(from, to) === 'week' && filters.granularity === 'day'
        ? 'week'
        : undefined;
    setWindow(from, to, next);
  };

  const earliest = toISTDate(data?.asOf.earliestSignupAt);
  const showFullHistory = earliest
    ? () => {
        const to = istToday();
        setWindow(earliest, to, granularityFor(earliest, to));
      }
    : null;

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Signups &amp; onboarding
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Who signed up, where they stalled in verification, who we called and
            what they wrote down, and what we emailed them. Customer accounts
            only — admin and referrer logins are excluded everywhere on this
            screen.
          </p>
        </div>
        {data && (
          <div className="shrink-0 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              <HelpBadge help={SIGNUPS_STAT_HELP.customersAllTime}>
                {data.asOf.customersAllTime.toLocaleString('en-IN')} customers
                all time
              </HelpBadge>
            </span>
            <span className="mt-1 block">
              <HelpBadge help={SIGNUPS_STAT_HELP.dataRange}>
                Signups {formatIstDay(data.asOf.earliestSignupAt)} –{' '}
                {formatIstDay(data.asOf.latestSignupAt)}
              </HelpBadge>
            </span>
            <span className="mt-1 block">
              Generated {formatIstDateTime(data.asOf.generatedAt)}
            </span>
          </div>
        )}
      </div>

      <WindowControls
        filters={filters}
        asOf={data?.asOf}
        onPreset={applyPreset}
        onDates={applyDates}
        onGranularity={setGranularity}
      />

      {isError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">
              {getApiErrorMessage(error)}
            </p>
            {filters.granularity === 'day' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-background"
                onClick={() => setGranularity('week')}
              >
                Switch to weekly buckets
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className={cn('space-y-8', isPlaceholderData && 'opacity-60')}>
          {!data.asOf.windowHasData && (
            <EmptyWindowNotice data={data} onShowFullHistory={showFullHistory} />
          )}

          <SignupsGraph
            series={data.signups.series}
            total={data.signups.total}
            growthWindow={data.window}
          />

          <VerificationFunnel funnel={data.funnel} />

          <CallingSection calling={data.calling} />

          <EmailSection email={data.email} />
        </div>
      ) : null}
    </div>
  );
}
