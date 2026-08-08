import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Loader2, Mail, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCampaign, getCampaigns } from '@/apis/email.api';
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
import type { EmailCampaign, EmailCampaignStatus } from '@/types/email';

const FILTER_TABS = [
  'all',
  'draft',
  'sending',
  'sent',
  'paused',
] as const;

const SORT_OPTIONS = [
  'created_at',
  'updated_at',
  'name',
  'sent',
  'opened',
] as const;

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const CAMPAIGN_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(20),
  status: enumParam(FILTER_TABS, 'all'),
  search: stringParam(''),
  sortBy: enumParam(SORT_OPTIONS, 'created_at'),
  sortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

const STATUS_STYLES: Record<EmailCampaignStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  queued: 'bg-indigo-100 text-indigo-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-100 text-red-700',
};

function rate(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—';
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

export function EmailCampaignsPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { filters, setFilters } = useUrlFilters(CAMPAIGN_FILTER_SCHEMA);
  const [searchInput, setSearchInput] = useState(filters.search);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin', 'email', 'campaigns', filters],
    queryFn: () =>
      getCampaigns({
        page: filters.page,
        limit: filters.limit,
        status:
          filters.status === 'all'
            ? undefined
            : (filters.status as EmailCampaignStatus),
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    placeholderData: keepPreviousData,
    // A sending campaign's counters move while you watch, so the list refreshes
    // on its own rather than making the admin reload to see progress.
    refetchInterval: (query) =>
      query.state.data?.data.some((c) =>
        ['sending', 'queued'].includes(c.status),
      )
        ? 5_000
        : false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast.success('Campaign deleted');
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'email', 'campaigns'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      setDeletingId(null);
    },
  });

  const campaigns = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination
              ? `${pagination.totalItems} campaigns`
              : 'Outreach campaigns and their results'}
          </p>
        </div>
        <Link to={ROUTES.EMAIL_NEW}>
          <Button size="sm">
            <Plus className="size-4" />
            Compose
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {FILTER_TABS.map((key) => (
            <button
              key={key}
              onClick={() => setFilters({ status: key })}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                filters.status === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search name or subject…"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-64"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setFilters({ search: searchInput.trim() });
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => setFilters({ search: searchInput.trim() })}
          >
            Search
          </Button>
        </div>

        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(':');
            setFilters({
              sortBy: sortBy as (typeof SORT_OPTIONS)[number],
              sortOrder: sortOrder as 'ASC' | 'DESC',
            });
          }}
        >
          <option value="created_at:DESC">Newest first</option>
          <option value="created_at:ASC">Oldest first</option>
          <option value="updated_at:DESC">Recently updated</option>
          <option value="sent:DESC">Most sent</option>
          <option value="opened:DESC">Most opened</option>
          <option value="name:ASC">Name: A → Z</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <Mail className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No campaigns yet</p>
          <Link to={ROUTES.EMAIL_NEW} className="mt-3">
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              Write your first one
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Campaign
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Sent
                </th>
                {/* Clicks before opens: opens are inflated by Apple Mail
                    Privacy Protection, so the click column is the one worth
                    reading first. */}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Clicked
                </th>
                <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">
                  Opened
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign: EmailCampaign) => (
                <tr
                  key={campaign.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={
                        campaign.status === 'draft'
                          ? `/email/${campaign.id}/edit`
                          : `/email/${campaign.id}`
                      }
                      className="font-medium hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                      {campaign.subject}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        STATUS_STYLES[campaign.status],
                      )}
                    >
                      {campaign.status === 'sending' && (
                        <Loader2 className="size-2.5 animate-spin" />
                      )}
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {campaign.sentCount.toLocaleString('en-IN')}
                    {campaign.totalRecipients > campaign.sentCount && (
                      <span className="text-muted-foreground">
                        /{campaign.totalRecipients.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <MousePointerClick className="size-3 text-muted-foreground" />
                      {rate(campaign.clickedCount, campaign.sentCount)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">
                    {rate(campaign.openedCount, campaign.sentCount)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {new Date(campaign.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        disabled={campaign.status === 'sending'}
                        title={
                          campaign.status === 'sending'
                            ? 'Cancel the campaign before deleting it'
                            : 'Delete campaign'
                        }
                        onClick={() => setDeletingId(campaign.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingId && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Delete this campaign?
          </p>
          <p className="mt-1 text-sm text-red-600">
            Its recipient list and engagement history go with it. Mail already
            sent cannot be recalled either way.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setFilters({ page }, { keepPage: true })}
        onLimitChange={(limit) => setFilters({ limit })}
        isLoading={isPlaceholderData}
        itemLabel="campaigns"
      />
    </div>
  );
}
