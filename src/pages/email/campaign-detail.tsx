import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  Ban,
  Info,
  Loader2,
  MailWarning,
  MousePointerClick,
  Send,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelCampaign,
  getCampaign,
  getCampaignRecipients,
  getCampaignStats,
} from '@/apis/email.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { EmailRecipientStatus } from '@/types/email';

const RECIPIENT_STATUSES = [
  '',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'unsubscribed',
  'failed',
  'skipped',
] as const;

const RECIPIENT_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(25),
  status: enumParam(RECIPIENT_STATUSES, ''),
  search: stringParam(''),
} as const;

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  clicked: 'bg-green-100 text-green-700',
  opened: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-100 text-slate-700',
  sent: 'bg-slate-100 text-slate-600',
  pending: 'bg-slate-100 text-slate-500',
  sending: 'bg-slate-100 text-slate-500',
  bounced: 'bg-red-100 text-red-700',
  complained: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-500',
};

/**
 * One headline number.
 *
 * `muted` drops the tile out of the primary row's visual weight — used for the
 * open rate, which is not trustworthy enough to sit beside the others at equal
 * prominence.
 */
function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  muted,
  footnote,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  muted?: boolean;
  footnote?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        muted ? 'border-dashed bg-muted/20' : 'bg-background',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <p
        className={cn(
          'mt-1.5 text-2xl font-bold tabular-nums tracking-tight',
          muted && 'text-muted-foreground',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      {footnote && (
        <p className="mt-2 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          {footnote}
        </p>
      )}
    </div>
  );
}

export function CampaignDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { filters, setFilters } = useUrlFilters(RECIPIENT_FILTER_SCHEMA);
  const [searchInput, setSearchInput] = useState(filters.search);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['admin', 'email', 'campaign', id],
    queryFn: () => getCampaign(id),
    // Counters climb while a campaign drains, so the page follows along
    // instead of asking the admin to reload.
    refetchInterval: (query) =>
      ['sending', 'queued'].includes(query.state.data?.status ?? '')
        ? 5_000
        : false,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin', 'email', 'stats', id],
    queryFn: () => getCampaignStats(id),
    refetchInterval: campaign?.status === 'sending' ? 10_000 : false,
  });

  const { data: recipients, isPlaceholderData } = useQuery({
    queryKey: ['admin', 'email', 'recipients', id, filters],
    queryFn: () =>
      getCampaignRecipients(id, {
        page: filters.page,
        limit: filters.limit,
        status: (filters.status || undefined) as
          | EmailRecipientStatus
          | undefined,
        search: filters.search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelCampaign(id),
    onSuccess: () => {
      toast.success('Campaign cancelled; unsent messages will not go out');
      setConfirmingCancel(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'email'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !campaign) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const funnel = stats?.funnel;
  const rates = stats?.rates;
  const isRunning = ['sending', 'queued', 'scheduled'].includes(campaign.status);

  const timeline = (stats?.timeline ?? []).map((point) => ({
    ...point,
    label: new Date(point.bucket).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
    }),
  }));

  const maxLinkClicks = Math.max(
    1,
    ...(stats?.topLinks ?? []).map((l) => l.clicks),
  );

  return (
    <div className="viz-root space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(ROUTES.EMAIL)}
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign.subject}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="capitalize">{campaign.status}</span>
              {campaign.startedAt &&
                ` · started ${new Date(campaign.startedAt).toLocaleString('en-IN')}`}
              {campaign.completedAt &&
                ` · finished ${new Date(campaign.completedAt).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>

        {isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmingCancel(true)}
          >
            <Ban className="size-4" />
            Cancel
          </Button>
        )}
      </div>

      {campaign.errorMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {campaign.errorMessage}
        </div>
      )}

      {/* Primary metrics — clicks first. Opens are deliberately not in this
          row: they are the least trustworthy number on the page. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Clicked"
          icon={MousePointerClick}
          value={rates ? `${rates.clickRate}%` : '—'}
          sub={
            funnel
              ? `${funnel.clicked.toLocaleString('en-IN')} of ${funnel.sent.toLocaleString('en-IN')} sent`
              : undefined
          }
        />
        <StatTile
          label="Unsubscribed"
          icon={UserMinus}
          value={funnel ? funnel.unsubscribed.toLocaleString('en-IN') : '—'}
          sub={rates ? `${rates.unsubscribeRate}% of sent` : undefined}
        />
        <StatTile
          label="Bounced"
          icon={MailWarning}
          value={funnel ? funnel.bounced.toLocaleString('en-IN') : '—'}
          sub={rates ? `${rates.bounceRate}% of sent` : undefined}
        />
        <StatTile
          label="Sent"
          icon={Send}
          value={funnel ? funnel.sent.toLocaleString('en-IN') : '—'}
          sub={
            funnel
              ? `${funnel.total.toLocaleString('en-IN')} in audience${
                  funnel.skipped ? ` · ${funnel.skipped} skipped` : ''
                }`
              : undefined
          }
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Opened"
          muted
          value={rates ? `${rates.openRate}%` : '—'}
          sub={
            funnel
              ? `${funnel.opened.toLocaleString('en-IN')} unique openers`
              : undefined
          }
          footnote="Directional only. Apple Mail Privacy Protection loads the tracking pixel whether or not anyone read the message, and clients that block images undercount in the other direction."
        />
        <StatTile
          label="Click-to-open"
          muted
          value={rates ? `${rates.clickToOpenRate}%` : '—'}
          sub="Of those recorded as opening, how many clicked"
        />
        <StatTile
          label="Delivered"
          muted
          value={funnel ? funnel.delivered.toLocaleString('en-IN') : '—'}
          sub={
            funnel && funnel.failed
              ? `${funnel.failed} failed to send`
              : 'Confirmed by the provider, where it reports back'
          }
        />
      </div>

      {/* Engagement over time */}
      {timeline.length > 0 && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold">Engagement over time</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Events per hour. Clicks are the reliable line.
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--viz-grid)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  stroke="var(--viz-axis)"
                  minTickGap={24}
                />
                {/* One y-axis. Opens and clicks are both event counts, so they
                    share a scale — a second axis would let any two lines be
                    made to cross wherever the reader wanted. */}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  stroke="var(--viz-axis)"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--viz-grid)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Line
                  name="Clicked"
                  type="monotone"
                  dataKey="clicked"
                  stroke="var(--viz-series-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  name="Opened"
                  type="monotone"
                  dataKey="opened"
                  stroke="var(--viz-series-2)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top links */}
      {stats && stats.topLinks.length > 0 && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold">Most clicked links</h2>
          <div className="mt-3 space-y-2.5">
            {stats.topLinks.map((link) => (
              <div key={link.url}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-muted-foreground" title={link.url}>
                    {link.url}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-medium">{link.uniqueClicks}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      {link.uniqueClicks === 1 ? 'person' : 'people'} ·{' '}
                      {link.clicks} clicks
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((link.clicks / maxLinkClicks) * 100)}%`,
                      background: 'var(--viz-series-1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Recipients</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search name or address…"
              className="h-8 w-full rounded-md border bg-background px-2.5 text-sm sm:w-56"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  setFilters({ search: searchInput.trim() });
              }}
            />
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm capitalize"
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  status: e.target.value as (typeof RECIPIENT_STATUSES)[number],
                })
              }
            >
              {RECIPIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Recipient
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Clicks
                </th>
                <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground sm:table-cell">
                  Opens
                </th>
                <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">
                  Last activity
                </th>
              </tr>
            </thead>
            <tbody>
              {(recipients?.data ?? []).map((r) => {
                const lastActivity =
                  r.firstClickedAt ?? r.lastOpenedAt ?? r.sentAt;
                return (
                  <tr
                    key={r.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2.5">
                      {r.userId ? (
                        <Link
                          to={`/customers/${r.userId}`}
                          className="font-medium hover:underline"
                        >
                          {[r.firstName, r.lastName].filter(Boolean).join(' ') ||
                            r.email}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {[r.firstName, r.lastName].filter(Boolean).join(' ') ||
                            r.email}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                      {r.errorMessage && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {r.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          RECIPIENT_STATUS_STYLES[r.status] ??
                            'bg-slate-100 text-slate-600',
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      {r.clickCount || '—'}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {r.openCount || '—'}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                      {lastActivity
                        ? new Date(lastActivity).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={recipients?.pagination}
          onPageChange={(page) => setFilters({ page }, { keepPage: true })}
          onLimitChange={(limit) => setFilters({ limit })}
          isLoading={isPlaceholderData}
          itemLabel="recipients"
        />
      </div>

      {/* Cancel confirmation */}
      {confirmingCancel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Cancel this campaign?
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Messages already sent cannot be recalled. The{' '}
            {(campaign.totalRecipients - campaign.sentCount).toLocaleString(
              'en-IN',
            )}{' '}
            still waiting will not go out.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Yes, stop sending
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmingCancel(false)}
            >
              Keep sending
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
