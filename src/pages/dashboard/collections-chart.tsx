import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';
import { getCollections, type CollectionsDay } from '@/apis/admin.api';
import { adminQueryKeys } from '@/hooks/admin';
import { cn } from '@/lib/utils';

/**
 * Daily collections: money received, per day, and whether it is growing.
 *
 * Two sources are stacked because they answer different questions — app
 * checkouts are the product working, payments credited by hand are the
 * customers who paid outside it — and a total that blurs them hides which one
 * is growing. The line is a trailing seven-day average: daily collections are
 * lumpy (a ₹1,000 day beside a ₹0 day), and the average is the line that shows
 * the direction.
 *
 * Every figure comes from the server, which buckets days in IST and fills the
 * empty ones. Nothing is summed or bucketed here except the moving average,
 * which is presentation.
 */

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const RAZORPAY_COLOR = '#0ea5e9';
const MANUAL_COLOR = '#f59e0b';
const AVERAGE_COLOR = '#7c3aed';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

/** ₹1.2k style, for the axis where space is tight. */
const inrCompact = (n: number) =>
  n === 0
    ? '₹0'
    : `₹${new Intl.NumberFormat('en-IN', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)}`;

/** `2026-10-27` as a calendar date, never through the browser's timezone. */
function parseDay(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const fmtDay = (date: string, opts: Intl.DateTimeFormatOptions) =>
  parseDay(date).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

/** Trailing seven-day average (or as many days as exist so far). */
function withAverage(days: CollectionsDay[]) {
  return days.map((d, i) => {
    const slice = days.slice(Math.max(0, i - 6), i + 1);
    const avg = slice.reduce((a, x) => a + x.total, 0) / slice.length;
    return { ...d, average: Math.round(avg * 100) / 100 };
  });
}

function Growth({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> no earlier period to compare
      </span>
    );
  }
  const up = percent > 0;
  const flat = percent === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        flat
          ? 'bg-muted text-muted-foreground'
          : up
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700',
      )}
    >
      <Icon className="size-3.5" />
      {Math.abs(percent).toLocaleString('en-IN')}%
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CollectionsDay & { average: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 text-xs shadow-md">
      <p className="mb-1.5 font-semibold">
        {fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
      <div className="space-y-1 tabular-nums">
        <p className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm"
              style={{ background: RAZORPAY_COLOR }}
            />
            App checkouts
          </span>
          {inr(d.razorpay)}
        </p>
        <p className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm"
              style={{ background: MANUAL_COLOR }}
            />
            Custom payments
          </span>
          {inr(d.manual)}
        </p>
        <p className="flex items-center justify-between gap-6 border-t pt-1 font-semibold">
          <span>Total · {d.count} payment{d.count === 1 ? '' : 's'}</span>
          {inr(d.total)}
        </p>
        <p className="flex items-center justify-between gap-6 text-muted-foreground">
          <span>7-day average</span>
          {inr(d.average)}
        </p>
      </div>
    </div>
  );
}

export function CollectionsChart() {
  const [range, setRange] = useState<Range>(30);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: adminQueryKeys.collections(range),
    queryFn: () => getCollections(range),
    // Switching range keeps the old chart on screen until the new one lands,
    // rather than collapsing to a spinner and back.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const series = data ? withAverage(data.days) : [];
  const empty = !!data && data.totals.total === 0;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daily collections
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Money received per day, IST. App checkouts and payments credited by
            hand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  range === r
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <p className="py-16 text-center text-sm text-red-700">
          Could not load collections.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Last {range} days
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
                {inr(data.totals.total)}
              </p>
              <p className="mt-1">
                <Growth percent={data.growthPercent} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Previous {range} days
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {inr(data.previous.total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.previous.count} payment{data.previous.count === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average per day</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {inr(data.totals.averagePerDay)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totals.count} payment{data.totals.count === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Best day</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {data.totals.bestDay ? inr(data.totals.bestDay.total) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totals.bestDay
                  ? fmtDay(data.totals.bestDay.date, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'nothing yet'}
              </p>
            </div>
          </div>

          {empty ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No collections in the last {range} days.
            </p>
          ) : (
            <div
              className="mt-6 h-72 w-full"
              role="img"
              aria-label={`Daily collections for the last ${range} days`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} barCategoryGap="20%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    dy={8}
                    minTickGap={range === 7 ? 0 : 24}
                    tickFormatter={(v: string) =>
                      range === 7
                        ? fmtDay(v, { weekday: 'short' })
                        : fmtDay(v, { day: 'numeric', month: 'short' })
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    width={48}
                    tickFormatter={inrCompact}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={<ChartTooltip />}
                  />
                  <Bar
                    dataKey="razorpay"
                    name="App checkouts"
                    stackId="c"
                    fill={RAZORPAY_COLOR}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="manual"
                    name="Custom payments"
                    stackId="c"
                    fill={MANUAL_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    name="7-day average"
                    stroke={AVERAGE_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-sm"
                style={{ background: RAZORPAY_COLOR }}
              />
              App checkouts · {inr(data.totals.razorpay)}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-sm"
                style={{ background: MANUAL_COLOR }}
              />
              Custom payments · {inr(data.totals.manual)}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 rounded"
                style={{ background: AVERAGE_COLOR }}
              />
              7-day average
            </span>
          </div>
        </>
      )}
    </div>
  );
}
