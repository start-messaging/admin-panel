import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Target,
  Users,
  Send,
  MailCheck,
  MessageCircleReply,
  Download,
  Mail,
  MapPin,
  Phone,
  MessageCircle,
  RefreshCw,
  Wifi,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { ExternalLink } from '@/components/common/external-link';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { Pagination } from '@/components/ui/pagination';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatRelativeTime } from '@/lib/datetime';
import {
  INGEST_RUN_STATUS_HELP,
  LEAD_ENRICHMENT_HELP,
  LEAD_LIVENESS_HELP,
  LEADS_ACTION_HELP,
  LEADS_COLUMN_HELP,
  LEADS_STAT_HELP,
} from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type { Lead, LeadIngestRun, LeadSortBy } from '@/apis/leads.api';
import {
  useAdminLeadsList,
  useAdminLeadStats,
  useEnrichLead,
  useRunLeadIngest,
} from '@/hooks/admin';
import {
  LEAD_ENRICHMENT_OPTIONS,
  LEAD_HAS_CONTACT_OPTIONS,
  LEAD_INDIA_OPTIONS,
  LEAD_LIVENESS_OPTIONS,
  LEAD_SORT_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from '@/hooks/admin/useAdminLeadsList';
import {
  enrichOutcomeMessage,
  LEAD_ENRICHMENT_BADGE,
  LEAD_ENRICHMENT_LABEL,
} from './lead-badges';

const STATUS_FILTER_OPTIONS: {
  value: (typeof LEAD_STATUS_OPTIONS)[number];
  label: string;
}[] = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'queued', label: 'Queued' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'converted', label: 'Converted' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'disqualified', label: 'Disqualified' },
];

const ENRICHMENT_FILTER_OPTIONS: {
  value: (typeof LEAD_ENRICHMENT_OPTIONS)[number];
  label: string;
}[] = [
  { value: '', label: 'All enrichment' },
  { value: 'pending', label: 'Pending' },
  { value: 'enriched', label: 'Enriched' },
  { value: 'no_contact', label: 'No contact' },
  { value: 'failed', label: 'Failed' },
];

const SORT_PRESETS: { value: string; label: string }[] = [
  { value: 'createdAt:DESC', label: 'Added: newest first' },
  { value: 'createdAt:ASC', label: 'Added: oldest first' },
  { value: 'registeredOn:DESC', label: 'Registered: newest first' },
  { value: 'registeredOn:ASC', label: 'Registered: oldest first' },
  { value: 'qualificationScore:DESC', label: 'Signals: most first' },
  { value: 'qualificationScore:ASC', label: 'Signals: fewest first' },
  { value: 'teamRating:DESC', label: 'Team rating: highest first' },
  { value: 'teamRating:ASC', label: 'Team rating: lowest first' },
  { value: 'domain:ASC', label: 'Domain: A → Z' },
  { value: 'domain:DESC', label: 'Domain: Z → A' },
];

function parseSortPreset(preset: string): {
  sortBy: LeadSortBy;
  sortOrder: 'ASC' | 'DESC';
} {
  const [by, ord] = preset.split(':');
  const sortBy = (LEAD_SORT_OPTIONS as readonly string[]).includes(by)
    ? (by as LeadSortBy)
    : 'createdAt';
  const sortOrder = ord === 'ASC' ? 'ASC' : 'DESC';
  return { sortBy, sortOrder };
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** The Crawled chip's tooltip: absolute crawl time plus the last liveness probe. */
function crawlTimesHelp(lead: Lead): string {
  const abs = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never';
  return `Crawled: ${abs(lead.enrichedAt)} · Last probed: ${abs(lead.livenessCheckedAt)}`;
}

const INGEST_RUN_BADGE: Record<LeadIngestRun['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function LastIngestLine({ run }: { run: LeadIngestRun | undefined }) {
  if (!run) {
    return (
      <p className="text-xs text-muted-foreground">
        No ingest runs yet — run one to pull in newly registered domains.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        Last ingest{' '}
        <span className="font-medium text-foreground">{formatDate(run.fileDate)}</span>:
      </span>
      <span className="tabular-nums">
        <strong className="text-foreground">
          {run.insertedDomains.toLocaleString('en-IN')}
        </strong>{' '}
        new · {run.matchedDomains.toLocaleString('en-IN')} matched ·{' '}
        {run.totalDomains.toLocaleString('en-IN')} total
      </span>
      <HelpBadge
        help={INGEST_RUN_STATUS_HELP[run.status]}
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
          INGEST_RUN_BADGE[run.status],
        )}
      >
        {run.status}
      </HelpBadge>
      {run.status === 'failed' && run.error && (
        <span className="text-red-600">{run.error}</span>
      )}
    </p>
  );
}

function ContactSummaryCell({ lead }: { lead: Lead }) {
  const emails = lead.contactEmails.length;
  const phones = lead.contactPhones.length;
  const whatsapp = lead.contactWhatsapp.length;

  if (emails + phones + whatsapp === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {emails > 0 && (
        <span className="inline-flex items-center gap-1">
          <Mail className="size-3" />
          <span className="tabular-nums font-medium text-foreground">{emails}</span>
        </span>
      )}
      {phones > 0 && (
        <span className="inline-flex items-center gap-1">
          <Phone className="size-3" />
          <span className="tabular-nums font-medium text-foreground">{phones}</span>
        </span>
      )}
      {whatsapp > 0 && (
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3" />
          <span className="tabular-nums font-medium text-foreground">{whatsapp}</span>
        </span>
      )}
    </span>
  );
}

export function LeadsPage() {
  const {
    data,
    isLoading,
    isPlaceholderData,
    filters,
    setFilters,
    setPage,
    setLimit,
    resetFilters,
    hasActiveFilters,
  } = useAdminLeadsList();

  const { data: stats } = useAdminLeadStats();
  const runIngest = useRunLeadIngest();
  const enrichRow = useEnrichLead();

  // One mutation instance serves every row; `variables` says which row is
  // mid-crawl, so only that button spins while the rest just disable.
  function handleRowRecrawl(lead: Lead) {
    enrichRow.mutate(
      { leadId: lead.id },
      {
        onSuccess: (data) => {
          toast.success(enrichOutcomeMessage(data, `${lead.domain} re-crawled`));
        },
        onError: (e) => toast.error(getApiErrorMessage(e)),
      },
    );
  }

  // The search box is uncontrolled between submissions: firing a request per
  // keystroke against a substring search is wasteful, so the URL (and the
  // query) only update on Enter or the Search button.
  const [searchInput, setSearchInput] = useState(filters.search);

  const sortPreset = `${filters.sortBy}:${filters.sortOrder}`;
  const leads = data?.data ?? [];
  const pagination = data?.pagination;

  function applySearch() {
    setFilters({ search: searchInput.trim() });
  }

  function handleRunIngest() {
    runIngest.mutate(undefined, {
      onSuccess: ({ fileDate }) => {
        toast.success(
          fileDate
            ? `Ingest for ${fileDate} enqueued — the run will show up here shortly.`
            : 'Ingest enqueued — the run will show up here shortly.',
        );
      },
      onError: (e) => toast.error(getApiErrorMessage(e)),
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pagination
                ? `${pagination.totalItems.toLocaleString('en-IN')} leads match`
                : 'Newly registered domains worth an outreach email'}
            </p>
          </div>
          <ActionTooltip help={LEADS_ACTION_HELP.runIngest}>
            {(props) => (
              <Button
                {...props}
                size="sm"
                className="gap-2"
                disabled={runIngest.isPending}
                onClick={handleRunIngest}
              >
                {runIngest.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Run ingest
              </Button>
            )}
          </ActionTooltip>
        </div>

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <StatCard
              icon={Target}
              label="Total leads"
              value={stats.totals.all.toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.total}
            />
            <StatCard
              icon={Wifi}
              label="Live sites"
              value={(stats.byLiveness.live ?? 0).toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.live}
            />
            <StatCard
              icon={Users}
              label="With contact"
              value={stats.totals.withContact.toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.withContact}
            />
            <StatCard
              icon={MapPin}
              label="India"
              value={stats.totals.india.toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.india}
            />
            <StatCard
              icon={Send}
              label="Queued"
              value={(stats.byStatus.queued ?? 0).toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.queued}
            />
            <StatCard
              icon={MailCheck}
              label="Contacted"
              value={(stats.byStatus.contacted ?? 0).toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.contacted}
            />
            <StatCard
              icon={MessageCircleReply}
              label="Replied"
              value={(stats.byStatus.replied ?? 0).toLocaleString('en-IN')}
              help={LEADS_STAT_HELP.replied}
            />
          </div>
        )}

        <LastIngestLine run={stats?.recentRuns[0]} />

        {/* Filters */}
        <div className="min-w-0 rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-3">
            <div className="flex min-w-[min(100%,200px)] max-w-[260px] flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Domain or site title…"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 shrink-0"
              onClick={applySearch}
            >
              Search
            </Button>
            <div className="flex w-[min(100%,160px)] min-w-[140px] flex-col gap-1 sm:w-auto">
              {/* The table hides the status column (mostly "new"); the filter
                  is where "show replied" happens, so the funnel help lives here. */}
              <label className="text-xs font-medium text-muted-foreground">
                <HeaderTooltip label="Status" help={LEADS_COLUMN_HELP.status} />
              </label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    status: e.target.value as (typeof LEAD_STATUS_OPTIONS)[number],
                  })
                }
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[min(100%,150px)] min-w-[130px] flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground">
                <HeaderTooltip label="Liveness" help={LEADS_COLUMN_HELP.liveness} />
              </label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.liveness}
                onChange={(e) =>
                  setFilters({
                    liveness: e.target.value as (typeof LEAD_LIVENESS_OPTIONS)[number],
                  })
                }
              >
                <option value="">Any</option>
                <option value="live">Live</option>
                <option value="inactive">Inactive</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="flex w-[min(100%,160px)] min-w-[140px] flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground">Enrichment</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.enrichmentStatus}
                onChange={(e) =>
                  setFilters({
                    enrichmentStatus: e.target
                      .value as (typeof LEAD_ENRICHMENT_OPTIONS)[number],
                  })
                }
              >
                {ENRICHMENT_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-[min(100%,150px)] min-w-[130px] flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground">Contact</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.hasContact}
                onChange={(e) =>
                  setFilters({
                    hasContact: e.target
                      .value as (typeof LEAD_HAS_CONTACT_OPTIONS)[number],
                  })
                }
              >
                <option value="">Any</option>
                <option value="true">With contact</option>
                <option value="false">Without contact</option>
              </select>
            </div>
            <div className="flex w-[min(100%,140px)] min-w-[120px] flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-muted-foreground">
                <HeaderTooltip label="Country" help={LEADS_COLUMN_HELP.country} />
              </label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.india}
                onChange={(e) =>
                  setFilters({
                    india: e.target.value as (typeof LEAD_INDIA_OPTIONS)[number],
                  })
                }
              >
                <option value="">Any</option>
                <option value="true">India</option>
                <option value="false">Not sure</option>
              </select>
            </div>
            <div className="flex min-w-[180px] max-w-[min(100%,240px)] flex-col gap-1 sm:max-w-[240px]">
              <label className="text-xs font-medium text-muted-foreground">Sort</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={sortPreset}
                onChange={(e) => setFilters(parseSortPreset(e.target.value))}
              >
                {SORT_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 text-muted-foreground"
                onClick={() => {
                  setSearchInput('');
                  resetFilters();
                }}
              >
                <X className="mr-1 size-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <Target className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No leads found</p>
        </div>
      ) : (
        <div className="max-w-full overflow-hidden rounded-xl border">
          <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="min-w-[200px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Domain" help={LEADS_COLUMN_HELP.domain} />
                  </th>
                  <th className="min-w-[96px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Country" help={LEADS_COLUMN_HELP.country} />
                  </th>
                  <th className="min-w-[72px] px-4 py-3 text-right font-medium text-muted-foreground">
                    <HeaderTooltip label="Signals" help={LEADS_COLUMN_HELP.signals} />
                  </th>
                  <th className="min-w-[72px] px-4 py-3 text-right font-medium text-muted-foreground">
                    <HeaderTooltip label="Rating" help={LEADS_COLUMN_HELP.rating} />
                  </th>
                  <th className="min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Registered" help={LEADS_COLUMN_HELP.registered} />
                  </th>
                  <th className="min-w-[90px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Liveness" help={LEADS_COLUMN_HELP.liveness} />
                  </th>
                  <th className="min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Enrichment" help={LEADS_COLUMN_HELP.enrichment} />
                  </th>
                  <th className="min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Contacts" help={LEADS_COLUMN_HELP.contacts} />
                  </th>
                  <th className="min-w-[96px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Crawled" help={LEADS_COLUMN_HELP.lastCrawled} />
                  </th>
                  <th className="min-w-[96px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Added" help={LEADS_COLUMN_HELP.added} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="min-w-[200px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/leads/${lead.id}`} className="block min-w-0 flex-1">
                          <p className="truncate font-medium hover:underline">{lead.domain}</p>
                          {lead.siteTitle && (
                            <p className="max-w-[280px] truncate text-xs text-muted-foreground">
                              {lead.siteTitle}
                            </p>
                          )}
                        </Link>
                        {/* The "verify from the list" flow: eyeball the site
                            in a new tab without losing your place here — the
                            domain text keeps navigating to the detail page. */}
                        <ExternalLink
                          href={`https://${lead.domain}`}
                          icon
                          aria-label="Open site"
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        />
                        <ActionTooltip help={LEADS_ACTION_HELP.reEnrich}>
                          {(props) => (
                            <Button
                              {...props}
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Re-crawl ${lead.domain}`}
                              disabled={enrichRow.isPending}
                              onClick={() => handleRowRecrawl(lead)}
                            >
                              {enrichRow.isPending &&
                              enrichRow.variables?.leadId === lead.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <RefreshCw className="size-4" />
                              )}
                            </Button>
                          )}
                        </ActionTooltip>
                      </div>
                    </td>
                    <td className="min-w-[96px] px-4 py-3">
                      {lead.isIndian === true ? (
                        <span className="font-medium">India</span>
                      ) : (
                        <span className="text-muted-foreground">Not sure</span>
                      )}
                    </td>
                    <td className="min-w-[72px] px-4 py-3 text-right font-medium tabular-nums">
                      {lead.qualificationScore}
                    </td>
                    <td className="min-w-[72px] px-4 py-3 text-right tabular-nums">
                      {lead.teamRating !== null ? (
                        <span className="font-medium">{lead.teamRating}/5</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="min-w-[110px] px-4 py-3 text-muted-foreground">
                      {formatDate(lead.registeredOn)}
                    </td>
                    <td className="min-w-[90px] px-4 py-3">
                      {lead.liveness === 'live' ? (
                        <HelpBadge
                          help={LEAD_LIVENESS_HELP.live}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700"
                        >
                          <span className="size-1.5 rounded-full bg-green-500" />
                          Live
                        </HelpBadge>
                      ) : lead.liveness === 'inactive' ? (
                        // The tooltip carries the reason and the probe clock —
                        // "why is it inactive" answered without a click.
                        <HelpBadge
                          help={`${lead.livenessDetail ?? 'No answer'} — last checked ${formatDate(lead.livenessCheckedAt)}. ${LEAD_LIVENESS_HELP.inactive}`}
                          className="text-xs text-muted-foreground"
                        >
                          Inactive
                        </HelpBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="min-w-[110px] px-4 py-3">
                      <HelpBadge
                        help={LEAD_ENRICHMENT_HELP[lead.enrichmentStatus]}
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          LEAD_ENRICHMENT_BADGE[lead.enrichmentStatus],
                        )}
                      >
                        {LEAD_ENRICHMENT_LABEL[lead.enrichmentStatus]}
                      </HelpBadge>
                    </td>
                    <td className="min-w-[110px] px-4 py-3">
                      <ContactSummaryCell lead={lead} />
                    </td>
                    <td className="min-w-[96px] px-4 py-3">
                      {lead.enrichedAt ? (
                        <HelpBadge
                          help={crawlTimesHelp(lead)}
                          className="text-xs text-muted-foreground"
                        >
                          {formatRelativeTime(lead.enrichedAt)}
                        </HelpBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="min-w-[96px] px-4 py-3 text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isPlaceholderData}
        itemLabel="leads"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  help,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        {help ? (
          <HeaderTooltip
            label={label}
            help={help}
            className="text-[10px] font-bold uppercase tracking-wider"
          />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        )}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
