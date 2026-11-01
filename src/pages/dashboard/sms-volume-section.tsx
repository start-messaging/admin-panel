import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';
import { getSmsVolume, type SmsVolumeDay } from '@/apis/admin.api';
import { adminQueryKeys } from '@/hooks/admin';
import { cn } from '@/lib/utils';

/**
 * Daily SMS volume: how much is handled per day, and what a usual day looks like.
 *
 * The mean is the average day; the median is the middle day, which a single
 * spike does not move; the mode is the most common volume band. Daily counts
 * almost never repeat exactly, so the mode is a band (1,000–1,199) rather than a
 * single number — it is shaded on the chart so "a usual day" can be seen as well
 * as read. All of it is over complete days: today is unfinished, so it is drawn
 * (fainter) and listed on its own, but never averaged in.
 *
 * Every figure is computed by the server, in IST. Nothing is summed or banded
 * here.
 */

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const DELIVERED = '#7c3aed';
const FAILED = '#ef4444';
const OTHER = '#f59e0b';
const MEAN = '#0f172a';
const MODE_BAND = '#10b981';

const num = (n: number) => n.toLocaleString('en-IN');

/** `2026-10-27` as a calendar date, never through the browser's timezone. */
function parseDay(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const fmtDay = (date: string, opts: Intl.DateTimeFormatOptions) =>
  parseDay(date).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

function Change({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> no earlier period
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

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SmsVolumeDay }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: [string, string, number][] = [
    ['Delivered', DELIVERED, d.delivered],
    ['Failed', FAILED, d.failed],
    ['In progress / other', OTHER, d.other],
  ];
  return (
    <div className="rounded-lg border bg-card p-3 text-xs shadow-md">
      <p className="mb-1.5 font-semibold">
        {fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
        {d.partial && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            · today, so far
          </span>
        )}
      </p>
      <div className="space-y-1 tabular-nums">
        {rows.map(([label, color, value]) => (
          <p key={label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: color }} />
              {label}
            </span>
            {num(value)}
          </p>
        ))}
        <p className="flex items-center justify-between gap-6 border-t pt-1 font-semibold">
          <span>Total</span>
          {num(d.total)}
        </p>
      </div>
    </div>
  );
}

export function SmsVolumeSection() {
  const [range, setRange] = useState<Range>(30);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: adminQueryKeys.smsVolume(range),
    queryFn: () => getSmsVolume(range),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const stats = data?.stats ?? null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daily SMS volume
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            How many SMS are handled per day, IST. The averages cover complete
            days; today is unfinished, so it is shown but not counted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <div
            className="inline-flex rounded-lg border p-0.5"
            role="group"
            aria-label="SMS volume range"
          >
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
          Could not load SMS volume.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="col-span-2 lg:col-span-1">
              <p className="text-xs text-muted-foreground">Mean per day</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
                {stats ? num(Math.round(stats.mean)) : '—'}
              </p>
              <p className="mt-1">
                <Change percent={data.changePercent} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Median</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {stats ? num(Math.round(stats.median)) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">the middle day</p>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <p className="text-xs text-muted-foreground">Mode</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {stats
                  ? stats.mode.width === 1
                    ? num(stats.mode.from)
                    : `${num(stats.mode.from)}–${num(stats.mode.to)}`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats
                  ? `most common · ${stats.mode.days} of ${stats.completeDays} days`
                  : 'needs a complete day'}
              </p>
              {stats?.exactMode && (
                <p className="text-xs text-muted-foreground">
                  exactly {num(stats.exactMode.value)} on {stats.exactMode.days}{' '}
                  days
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Busiest day</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {stats ? num(stats.max.total) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats
                  ? fmtDay(stats.max.date, { day: 'numeric', month: 'short' })
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quietest day</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {stats ? num(stats.min.total) : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats
                  ? fmtDay(stats.min.date, { day: 'numeric', month: 'short' })
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today so far</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {num(data.today.total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {num(data.today.delivered)} delivered
              </p>
            </div>
          </div>

          <div
            className="mt-6 h-72 w-full"
            role="img"
            aria-label={`Daily SMS volume for the last ${range} days`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.days} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
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
                  width={44}
                  tickFormatter={(v: number) => num(v)}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<VolumeTooltip />} />

                {stats && (
                  <ReferenceArea
                    y1={stats.mode.from}
                    y2={stats.mode.to + 1}
                    fill={MODE_BAND}
                    fillOpacity={0.1}
                    stroke={MODE_BAND}
                    strokeOpacity={0.35}
                    strokeDasharray="2 3"
                    ifOverflow="extendDomain"
                  />
                )}

                {(
                  [
                    ['delivered', DELIVERED],
                    ['failed', FAILED],
                    ['other', OTHER],
                  ] as const
                ).map(([key, color]) => (
                  <Bar key={key} dataKey={key} stackId="v" fill={color}>
                    {data.days.map((d) => (
                      <Cell key={d.date} fill={color} fillOpacity={d.partial ? 0.4 : 1} />
                    ))}
                  </Bar>
                ))}

                {stats && (
                  <ReferenceLine
                    y={stats.mean}
                    stroke={MEAN}
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    ifOverflow="extendDomain"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: DELIVERED }} />
              Delivered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: FAILED }} />
              Failed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: OTHER }} />
              In progress / other
            </span>
            {stats && (
              <>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0 w-4 border-t-2 border-dashed"
                    style={{ borderColor: MEAN }}
                  />
                  Mean · {num(Math.round(stats.mean))}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-4 rounded-sm border"
                    style={{ background: `${MODE_BAND}1a`, borderColor: MODE_BAND }}
                  />
                  Mode band · {num(stats.mode.from)}–{num(stats.mode.to)}
                </span>
              </>
            )}
            <span>Faded bar = today, unfinished</span>
          </div>
        </>
      )}
    </div>
  );
}
