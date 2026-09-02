import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Chrome,
  Globe,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageCircleReply,
  Phone,
  RefreshCw,
  RotateCcw,
  Send,
  Star,
  StickyNote,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { ExternalLink } from '@/components/common/external-link';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/api-error';
import {
  LEAD_ENRICHMENT_HELP,
  LEAD_EVENT_HELP,
  LEAD_LIVENESS_HELP,
  LEAD_STATUS_HELP,
  LEADS_ACTION_HELP,
  LEADS_COLUMN_HELP,
  LEADS_DETAIL_HELP,
  OUTREACH_FIELD_HELP,
  SIGNAL_HELP,
} from '@/lib/help-copy';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Lead, LeadDetail, LeadOutreachEvent } from '@/apis/leads.api';
import {
  useAdminLeadDetail,
  useEnrichLead,
  useProbeLead,
  useQueueLeadOutreach,
  useUpdateLead,
} from '@/hooks/admin';
import {
  enrichOutcomeMessage,
  LEAD_ENRICHMENT_BADGE,
  LEAD_ENRICHMENT_LABEL,
  LEAD_LIVENESS_BADGE,
  LEAD_LIVENESS_LABEL,
  LEAD_STATUS_BADGE,
} from './lead-badges';

const EVENT_BADGE: Record<LeadOutreachEvent['type'], string> = {
  queued: 'bg-amber-100 text-amber-700',
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-sky-100 text-sky-700',
  clicked: 'bg-violet-100 text-violet-700',
  replied: 'bg-green-100 text-green-700',
  bounced: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
};

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The failure modes of queueing mean different next steps (refresh the page,
 * pick another address, wait a day, fix the environment), so each gets its
 * own message instead of the raw server line.
 */
function queueOutreachErrorMessage(error: unknown): string {
  switch (getApiErrorCode(error)) {
    case 'LEAD_ALREADY_QUEUED':
      return 'Outreach was already queued for this lead — its status is no longer "new".';
    case 'LEAD_SUPPRESSED':
      return 'That address is on the suppression list, so outreach to it is blocked.';
    case 'OUTREACH_DAILY_CAP_REACHED':
      return 'Daily outreach cap reached — try again tomorrow or raise OUTREACH_DAILY_CAP.';
    case 'OUTREACH_NOT_CONFIGURED':
      return 'No outreach provider is configured in this environment.';
    default:
      return getApiErrorMessage(error);
  }
}

function QueueOutreachModal({
  lead,
  onClose,
}: {
  lead: LeadDetail;
  onClose: () => void;
}) {
  const CUSTOM = '__custom__';
  const [selected, setSelected] = useState(lead.contactEmails[0] ?? CUSTOM);
  const [customEmail, setCustomEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const queueOutreach = useQueueLeadOutreach();

  const email = selected === CUSTOM ? customEmail.trim() : selected;

  function handleSubmit() {
    if (!email) {
      toast.error('Enter an email address to queue outreach to.');
      return;
    }
    queueOutreach.mutate(
      {
        leadId: lead.id,
        payload: {
          email,
          // Empty fields are omitted rather than sent as '', so the server
          // falls back to its default template instead of a blank email.
          subject: subject.trim() || undefined,
          bodyHtml: bodyHtml.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Outreach queued to ${email}`);
          onClose();
        },
        onError: (e) => toast.error(queueOutreachErrorMessage(e)),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-background p-5 shadow-lg"
        role="dialog"
        aria-labelledby="queue-outreach-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="queue-outreach-title" className="text-lg font-semibold">
          Queue outreach
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sends the cold-outreach email for{' '}
          <span className="font-medium text-foreground">{lead.domain}</span> to the
          address below.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Send to
            </label>
            {lead.contactEmails.length > 0 ? (
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {lead.contactEmails.map((address) => (
                  <option key={address} value={address}>
                    {address}
                  </option>
                ))}
                <option value={CUSTOM}>Custom address…</option>
              </select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No contact emails were found for this lead — enter one manually.
              </p>
            )}
          </div>
          {selected === CUSTOM && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email address
              </label>
              <input
                type="email"
                placeholder="founder@example.in"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <HeaderTooltip label="Subject" help={OUTREACH_FIELD_HELP.subject} />{' '}
              <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="Leave empty for the default template"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <HeaderTooltip
                label="Custom message (HTML)"
                help={OUTREACH_FIELD_HELP.bodyHtml}
              />{' '}
              <span className="font-normal">(optional)</span>
            </label>
            <textarea
              maxLength={20000}
              placeholder="Leave empty for the default template"
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              The unsubscribe footer and tracking are always appended by the server.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={queueOutreach.isPending}
            onClick={handleSubmit}
          >
            {queueOutreach.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Queue outreach
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamRatingControl({ lead }: { lead: LeadDetail }) {
  const updateLead = useUpdateLead();

  function setRating(teamRating: number | null) {
    updateLead.mutate(
      { leadId: lead.id, payload: { teamRating } },
      {
        onSuccess: (data) =>
          toast.success(
            data.teamRating === null ? 'Rating cleared' : `Rated ${data.teamRating}/5`,
          ),
        onError: (e) => toast.error(getApiErrorMessage(e)),
      },
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        <HeaderTooltip label="Team rating" help={LEADS_DETAIL_HELP.teamRating} />
      </p>
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rate ${value} out of 5`}
            disabled={updateLead.isPending}
            onClick={() => setRating(value)}
            className="text-muted-foreground/40 transition-colors hover:text-amber-500 disabled:opacity-50"
          >
            <Star
              className={cn(
                'size-5',
                lead.teamRating !== null &&
                  value <= lead.teamRating &&
                  'fill-amber-400 text-amber-500',
              )}
            />
          </button>
        ))}
        {lead.teamRating !== null && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear team rating"
            disabled={updateLead.isPending}
            onClick={() => setRating(null)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function LeadNotesCard({ lead }: { lead: LeadDetail }) {
  const [notesDraft, setNotesDraft] = useState(lead.notes ?? '');
  const updateLead = useUpdateLead();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Notes
      </label>
      <textarea
        className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Why this lead matters, who to talk to…"
        value={notesDraft}
        onChange={(e) => setNotesDraft(e.target.value)}
      />
      <Button
        size="sm"
        className="mt-2 gap-2"
        disabled={updateLead.isPending}
        onClick={() => {
          updateLead.mutate(
            { leadId: lead.id, payload: { notes: notesDraft.trim() } },
            {
              onSuccess: (data) => {
                toast.success('Notes saved');
                setNotesDraft(data.notes ?? '');
              },
              onError: (e) => toast.error(getApiErrorMessage(e)),
            },
          );
        }}
      >
        {updateLead.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Save notes'
        )}
      </Button>
    </div>
  );
}

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const { data: lead, isLoading } = useAdminLeadDetail(leadId);

  const enrichLead = useEnrichLead();
  const probeLead = useProbeLead();
  const updateStatus = useUpdateLead();
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);

  // Shared by both enrich buttons: a "successful" crawl can still conclude
  // the site is down or parked — the toast says what was concluded.
  function handleEnrichSuccess(data: Lead) {
    toast.success(enrichOutcomeMessage(data, 'Lead re-enriched'));
  }

  function setLeadStatus(status: 'new' | 'replied' | 'converted' | 'disqualified') {
    if (!leadId) return;
    if (
      status === 'disqualified' &&
      !window.confirm(
        'Delist this lead? Removes it from all pipeline work — probing, crawling, ' +
          "outreach. The row is kept so tomorrow's import can't re-add the domain. " +
          'Reversible via "Re-list".',
      )
    ) {
      return;
    }
    updateStatus.mutate(
      { leadId, payload: { status } },
      {
        onSuccess: (data) => toast.success(`Lead marked as ${data.status}`),
        onError: (e) => toast.error(getApiErrorMessage(e)),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="link" onClick={() => navigate(ROUTES.LEADS)}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const hasContacts =
    lead.contactEmails.length + lead.contactPhones.length + lead.contactWhatsapp.length >
    0;

  return (
    <div className="space-y-6">
      {outreachModalOpen && (
        <QueueOutreachModal lead={lead} onClose={() => setOutreachModalOpen(false)} />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.LEADS)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{lead.domain}</h1>
            <ExternalLink
              href={`https://${lead.domain}`}
              icon
              aria-label={`Open ${lead.domain} in a new tab`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            />
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Score: <strong className="tabular-nums text-foreground">{lead.score}</strong>
            </span>
            <span>
              Registered:{' '}
              <strong className="text-foreground">{formatDate(lead.registeredOn)}</strong>
            </span>
            <span>
              MX:{' '}
              <strong className="text-foreground">
                {lead.hasMx === null ? 'Not checked' : lead.hasMx ? 'Yes' : 'No'}
              </strong>
            </span>
            <span>
              Source: <strong className="text-foreground">{lead.source}</strong>
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lead.isIndian === true && (
            <HelpBadge
              help={LEADS_COLUMN_HELP.country}
              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700"
            >
              <MapPin className="size-3" />
              India
            </HelpBadge>
          )}
          <HelpBadge
            help={LEAD_STATUS_HELP[lead.status]}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
              LEAD_STATUS_BADGE[lead.status],
            )}
          >
            {lead.status}
          </HelpBadge>
          <HelpBadge
            help={LEAD_ENRICHMENT_HELP[lead.enrichmentStatus]}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
              LEAD_ENRICHMENT_BADGE[lead.enrichmentStatus],
            )}
          >
            {LEAD_ENRICHMENT_LABEL[lead.enrichmentStatus]}
          </HelpBadge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Mail className="size-4 text-muted-foreground" />
            Contacts
          </h2>
          {!hasContacts ? (
            <p className="text-sm text-muted-foreground">
              No contact details found on the site.
            </p>
          ) : (
            <div className="space-y-4">
              {lead.contactEmails.length > 0 && (
                <ContactList
                  icon={Mail}
                  label="Emails"
                  items={lead.contactEmails.map((email) => ({
                    value: email,
                    href: `mailto:${email}`,
                  }))}
                />
              )}
              {lead.contactPhones.length > 0 && (
                <ContactList
                  icon={Phone}
                  label="Phones"
                  items={lead.contactPhones.map((phone) => ({
                    value: phone,
                    href: `tel:${phone}`,
                  }))}
                />
              )}
              {lead.contactWhatsapp.length > 0 && (
                <ContactList
                  icon={MessageCircle}
                  label="WhatsApp"
                  items={lead.contactWhatsapp.map((number) => ({
                    value: number,
                    href: `https://wa.me/${number.replace(/\D/g, '')}`,
                  }))}
                />
              )}
            </div>
          )}
        </div>

        {/* Site */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Globe className="size-4 text-muted-foreground" />
              Site
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <ActionTooltip help={LEADS_ACTION_HELP.reEnrich}>
                {(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={enrichLead.isPending}
                    onClick={() => {
                      enrichLead.mutate(
                        { leadId: lead.id },
                        {
                          onSuccess: handleEnrichSuccess,
                          onError: (e) => toast.error(getApiErrorMessage(e)),
                        },
                      );
                    }}
                  >
                    {enrichLead.isPending && !enrichLead.variables?.browser ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Crawling…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4" />
                        Re-enrich
                      </>
                    )}
                  </Button>
                )}
              </ActionTooltip>
              <ActionTooltip help={LEADS_ACTION_HELP.deepReEnrich}>
                {(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={enrichLead.isPending}
                    onClick={() => {
                      enrichLead.mutate(
                        { leadId: lead.id, browser: true },
                        {
                          onSuccess: handleEnrichSuccess,
                          onError: (e) =>
                            toast.error(
                              getApiErrorCode(e) === 'LEADS_BROWSER_UNAVAILABLE'
                                ? 'Browser tier not available in this environment'
                                : getApiErrorMessage(e),
                            ),
                        },
                      );
                    }}
                  >
                    {enrichLead.isPending && enrichLead.variables?.browser ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Rendering…
                      </>
                    ) : (
                      <>
                        <Chrome className="size-4" />
                        Deep re-enrich (browser)
                      </>
                    )}
                  </Button>
                )}
              </ActionTooltip>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {/* Tier 0: whether the domain answers at all — shown before the
                crawl facts, because they are meaningless without it. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <HelpBadge
                help={LEAD_LIVENESS_HELP[lead.liveness]}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  LEAD_LIVENESS_BADGE[lead.liveness],
                )}
              >
                {lead.liveness === 'live' && (
                  <span className="size-1.5 rounded-full bg-green-500" />
                )}
                {LEAD_LIVENESS_LABEL[lead.liveness]}
              </HelpBadge>
              {lead.livenessDetail && (
                <span className="font-mono text-xs text-muted-foreground">
                  {lead.livenessDetail}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Checked: {formatDateTime(lead.livenessCheckedAt)}
              </span>
              <ActionTooltip help={LEADS_ACTION_HELP.probe}>
                {(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="xs"
                    className="gap-1.5"
                    disabled={probeLead.isPending}
                    onClick={() => {
                      probeLead.mutate(lead.id, {
                        onSuccess: (data) => {
                          toast.success(
                            data.liveness === 'live'
                              ? 'Site is live'
                              : `Site inactive — ${data.livenessDetail ?? 'no answer'}`,
                          );
                        },
                        onError: (e) => toast.error(getApiErrorMessage(e)),
                      });
                    }}
                  >
                    {probeLead.isPending ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Probing…
                      </>
                    ) : (
                      <>
                        <Wifi className="size-3" />
                        Check site now
                      </>
                    )}
                  </Button>
                )}
              </ActionTooltip>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                Title
              </p>
              <p className="font-medium">{lead.siteTitle ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                {lead.siteDescription ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                <HeaderTooltip label="Verified signals" help={LEADS_COLUMN_HELP.signals} />
              </p>
              <p className="font-medium tabular-nums">{lead.qualificationScore}/5</p>
              {lead.qualificationSignals.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {/* Evidence chips: each states the structural check it passed. */}
                  {lead.qualificationSignals.map((signal) => (
                    <HelpBadge
                      key={signal}
                      help={SIGNAL_HELP[signal]}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {signal.replace(/_/g, ' ')}
                    </HelpBadge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Enriched:{' '}
                <strong className="text-foreground">{formatDateTime(lead.enrichedAt)}</strong>
              </span>
              <span>
                Attempts:{' '}
                <strong className="tabular-nums text-foreground">
                  {lead.enrichmentAttempts}
                </strong>
              </span>
            </div>
            {lead.enrichmentStatus === 'failed' && lead.enrichmentError && (
              <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="size-4" />
                  <p className="text-xs font-semibold">Enrichment failed</p>
                </div>
                <p className="mt-1 break-words text-xs text-red-600">
                  {lead.enrichmentError}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Outreach */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Send className="size-4 text-muted-foreground" />
              Outreach
            </h2>
            {lead.status === 'new' && (
              <ActionTooltip help={LEADS_ACTION_HELP.queueOutreach}>
                {(props) => (
                  <Button
                    {...props}
                    size="sm"
                    className="gap-2"
                    onClick={() => setOutreachModalOpen(true)}
                  >
                    <Send className="size-4" />
                    Queue outreach
                  </Button>
                )}
              </ActionTooltip>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                Sent to
              </p>
              <p className="font-medium">{lead.outreachEmail ?? 'Not queued yet'}</p>
            </div>
            <dl className="space-y-1.5">
              {(
                [
                  ['Queued', lead.queuedAt],
                  ['Contacted', lead.contactedAt],
                  ['Opened', lead.openedAt],
                  ['Clicked', lead.clickedAt],
                  ['Replied', lead.repliedAt],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs text-muted-foreground">
                    {label === 'Opened' ? (
                      <HeaderTooltip label={label} help={LEADS_DETAIL_HELP.opened} />
                    ) : (
                      label
                    )}
                  </dt>
                  <dd
                    className={cn(
                      'text-xs tabular-nums',
                      value ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {formatDateTime(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {/* One honesty note is enough; it covers the timeline below too. */}
            <p className="text-[11px] italic text-muted-foreground">
              Opens are inflated by mail privacy proxies — trust replies and clicks.
            </p>
          </div>
        </div>

        {/* Notes & actions */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <StickyNote className="size-4 text-muted-foreground" />
            Notes & actions
          </h2>
          <div className="space-y-4">
            <TeamRatingControl lead={lead} />
            <LeadNotesCard key={lead.id} lead={lead} />
            <div className="flex flex-wrap gap-3 border-t pt-4">
              {lead.status === 'contacted' && (
                <ActionTooltip help={LEADS_ACTION_HELP.markReplied}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={updateStatus.isPending}
                      onClick={() => setLeadStatus('replied')}
                    >
                      <MessageCircleReply className="size-4" />
                      Mark replied
                    </Button>
                  )}
                </ActionTooltip>
              )}
              {lead.status !== 'disqualified' && (
                <ActionTooltip help={LEADS_ACTION_HELP.delist}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      disabled={updateStatus.isPending}
                      onClick={() => setLeadStatus('disqualified')}
                    >
                      <XCircle className="size-4" />
                      Delist
                    </Button>
                  )}
                </ActionTooltip>
              )}
              {lead.status !== 'converted' && (
                <ActionTooltip help={LEADS_ACTION_HELP.markConverted}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={updateStatus.isPending}
                      onClick={() => setLeadStatus('converted')}
                    >
                      <CheckCircle2 className="size-4" />
                      Mark converted
                    </Button>
                  )}
                </ActionTooltip>
              )}
              {lead.status === 'disqualified' && (
                <ActionTooltip help={LEADS_ACTION_HELP.relist}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={updateStatus.isPending}
                      onClick={() => setLeadStatus('new')}
                    >
                      <RotateCcw className="size-4" />
                      Re-list
                    </Button>
                  )}
                </ActionTooltip>
              )}
              {lead.status === 'converted' && (
                <ActionTooltip help={LEADS_ACTION_HELP.backToNew}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={updateStatus.isPending}
                      onClick={() => setLeadStatus('new')}
                    >
                      <RotateCcw className="size-4" />
                      Back to new
                    </Button>
                  )}
                </ActionTooltip>
              )}
            </div>
          </div>
        </div>

        {/* Events timeline */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <History className="size-4 text-muted-foreground" />
            Outreach events
          </h2>
          {lead.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outreach events yet.</p>
          ) : (
            <ul className="space-y-2">
              {lead.events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-2 text-sm last:border-0 last:pb-0"
                >
                  <HelpBadge
                    help={LEAD_EVENT_HELP[event.type]}
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      EVENT_BADGE[event.type],
                    )}
                  >
                    {event.type}
                  </HelpBadge>
                  <span className="text-xs text-muted-foreground">{event.provider}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactList({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof Mail;
  label: string;
  items: { value: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ value, href }) => (
          <li key={value}>
            {/* ExternalLink decides per href: wa.me is https and gets a new
                tab, mailto:/tel: stay plain and open the mail/phone app. */}
            <ExternalLink
              href={href}
              className="break-all text-sm font-medium text-primary hover:underline"
            >
              {value}
            </ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
