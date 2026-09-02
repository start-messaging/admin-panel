import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';
import type { PaginatedResponse } from '@/types';

// ── Types ──────────────────────────────────────────────

export type LeadStatus =
  | 'new'
  | 'queued'
  | 'contacted'
  | 'replied'
  | 'converted'
  | 'unsubscribed'
  | 'bounced'
  | 'disqualified';

export type LeadEnrichment =
  | 'pending'
  | 'enriched'
  | 'no_contact'
  /**
   * Registrar parking page — a business bought the name but hasn't launched.
   * Contacts/signals are zeroed (a parked page's content belongs to the
   * registrar) and the sweep rechecks weekly to catch the launch.
   */
  | 'parked'
  | 'failed';

/**
 * Tier-0 liveness: whether the domain answers at all. Owned by the prober
 * alone — the crawler only spends on 'live' sites. There is deliberately no
 * terminal "dead": 'inactive' is a wait state on a re-probe backoff (daily,
 * then weekly, then monthly), because a day-old domain that is down today is
 * usually a business that just hasn't launched.
 */
export type LeadLiveness = 'unknown' | 'live' | 'inactive';

/** A structurally-verified marker the crawler found on the site — never a mere text mention. */
export type QualificationSignal =
  | 'payments'
  | 'auth'
  | 'ecommerce'
  | 'whatsapp'
  | 'mobile_app';

export interface Lead {
  /** Also the PostHog lead id — the person distinct id is `lead_<id>`. */
  id: string;
  createdAt: string;
  updatedAt: string;
  /** "example.in", lowercase — carries its own TLD; there is no separate column */
  domain: string;
  source: 'nrd' | 'manual';
  /** "YYYY-MM-DD" — date of the NRD file it came from */
  registeredOn: string | null;
  /** Keyword score from ingest — internal crawl-priority plumbing, not shown in the UI */
  score: number;
  /** COUNT (0–5) of structurally-verified signals — one per entry in qualificationSignals */
  qualificationScore: number;
  qualificationSignals: QualificationSignal[];
  /**
   * true = India (.in/.co.in or India-evidenced site). false/null = "not
   * sure" — there is deliberately no "not India" state, only absent evidence.
   */
  isIndian: boolean | null;
  /** The team's own 1–5 judgment after looking at the site; null = unrated */
  teamRating: number | null;
  status: LeadStatus;
  liveness: LeadLiveness;
  /** WHY the tag says what it says: 'ok', 'no_dns', 'http_500', 'fetch_error: …', 'parking_ns' */
  livenessDetail: string | null;
  /** When the prober last looked — the re-probe backoff's clock. */
  livenessCheckedAt: string | null;
  enrichmentStatus: LeadEnrichment;
  enrichmentAttempts: number;
  enrichedAt: string | null;
  enrichmentError: string | null;
  siteTitle: string | null;
  siteDescription: string | null;
  /** null = not checked yet */
  hasMx: boolean | null;
  contactEmails: string[];
  contactPhones: string[];
  /** wa.me / api.whatsapp.com numbers */
  contactWhatsapp: string[];
  /** The address outreach was queued to */
  outreachEmail: string | null;
  outreachProviderRef: string | null;
  queuedAt: string | null;
  contactedAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  notes: string | null;
}

export interface LeadOutreachEvent {
  id: string;
  leadId: string;
  type:
    | 'queued'
    | 'sent'
    | 'opened'
    | 'clicked'
    | 'replied'
    | 'bounced'
    | 'unsubscribed'
    | 'failed';
  /** 'smartlead' | 'console' */
  provider: string;
  payload: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
}

export interface LeadIngestRun {
  id: string;
  /** "YYYY-MM-DD" */
  fileDate: string;
  status: 'pending' | 'completed' | 'failed';
  /** Lines in the NRD file */
  totalDomains: number;
  /** Survived TLD/lexical filters */
  matchedDomains: number;
  /** Actually new (not already present) */
  insertedDomains: number;
  error: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export type SuppressionReason = 'unsubscribed' | 'bounced' | 'complaint' | 'manual';

export interface OutreachSuppression {
  id: string;
  email: string;
  reason: SuppressionReason;
  notes: string | null;
  createdAt: string;
}

export type LeadSortBy =
  | 'createdAt'
  | 'registeredOn'
  | 'qualificationScore'
  | 'teamRating'
  | 'domain';

export interface LeadListParams {
  page?: number;
  limit?: number;
  /** Matches domain and siteTitle, case-insensitive substring */
  search?: string;
  status?: LeadStatus;
  liveness?: LeadLiveness;
  enrichmentStatus?: LeadEnrichment;
  /** true = at least one email/phone/whatsapp, false = none */
  hasContact?: boolean;
  /** true = confirmed India (isIndian IS TRUE), false = everything else ("not sure") */
  india?: boolean;
  sortBy?: LeadSortBy;
  sortOrder?: 'ASC' | 'DESC';
}

export interface LeadStats {
  totals: { all: number; withContact: number; india: number };
  /** Statuses with zero may be absent. */
  byStatus: Partial<Record<LeadStatus, number>>;
  byEnrichment: Partial<Record<LeadEnrichment, number>>;
  byLiveness: Partial<Record<LeadLiveness, number>>;
  /** Last 7 by fileDate desc */
  recentRuns: LeadIngestRun[];
}

export type LeadDetail = Lead & { events: LeadOutreachEvent[] };

export interface UpdateLeadPayload {
  /** Manual transitions only; the pipeline owns the rest (queued/contacted/unsubscribed/bounced). */
  status?: 'new' | 'replied' | 'converted' | 'disqualified';
  /** Max 5000 characters */
  notes?: string;
  outreachEmail?: string;
  /** 1–5, or null to clear back to unrated. */
  teamRating?: number | null;
}

export interface SuppressionListParams {
  page?: number;
  limit?: number;
  /** Email substring */
  search?: string;
}

export interface AddSuppressionPayload {
  email: string;
  /** Defaults to 'manual' on the server. */
  reason?: SuppressionReason;
  notes?: string;
}

// ── API functions ──────────────────────────────────────

export function getLeads(params?: LeadListParams): Promise<PaginatedResponse<Lead>> {
  return apiGet<PaginatedResponse<Lead>>('/admin/leads', { params });
}

export function getLeadStats(): Promise<LeadStats> {
  return apiGet<LeadStats>('/admin/leads/stats');
}

export function getLeadIngestRuns(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LeadIngestRun>> {
  return apiGet<PaginatedResponse<LeadIngestRun>>('/admin/leads/ingest-runs', { params });
}

/**
 * Enqueues the NRD ingest job; the run appears in ingest-runs shortly after.
 * Always safe to re-run — completed days short-circuit and known domains
 * dedupe. `fileDate` is present for single-date runs; backfills return only
 * the `fileDates` list.
 */
export function runLeadIngest(
  date?: string,
): Promise<{ enqueued: boolean; fileDate?: string; fileDates: string[] }> {
  return apiPost<{ enqueued: boolean; fileDate?: string; fileDates: string[] }>(
    '/admin/leads/ingest/run',
    date ? { date } : {},
  );
}

/** Enqueues one enrichment sweep right now (claims the next priority batch). */
export function runEnrichSweep(): Promise<{ enqueued: boolean }> {
  return apiPost<{ enqueued: boolean }>('/admin/leads/enrich-sweep/run');
}

/** Enqueues one liveness sweep right now (unknowns + due inactive re-probes). */
export function runLivenessSweep(): Promise<{ enqueued: boolean }> {
  return apiPost<{ enqueued: boolean }>('/admin/leads/liveness-sweep/run');
}

/**
 * Probes the domain now — DNS plus one homepage fetch — and returns the
 * updated lead. Synchronous like enrich; the pipeline also probes
 * automatically on a backoff.
 */
export function probeLead(id: string): Promise<Lead> {
  return apiPost<Lead>(`/admin/leads/${id}/probe`);
}

// ── Pipeline visibility ────────────────────────────────

export interface PipelineCron {
  id: 'leads-nrd-sweep' | 'leads-enrich-sweep' | (string & {});
  label: string;
  /**
   * Whether this stage auto-runs — the effective runtime setting from the
   * Settings editor (database-operated). Manual runs always work.
   */
  enabled: boolean;
  /** Human-readable schedule text from the server. */
  schedule: string;
  /** ISO timestamp of the next scheduled run; null when the scheduler is not registered. */
  next: string | null;
}

export interface PipelineJobView {
  id: string | null;
  name: string;
  leadId?: string;
  domain?: string | null;
  fileDate?: string;
  failedReason?: string;
  timestamp: number;
}

/** The enrich-local settings block embedded in the pipeline readout. */
export interface EffectiveEnrichSettings {
  enabled: boolean;
  batchPerSweep: number;
  concurrency: number;
  recrawlHours: number;
}

/**
 * Every runtime knob the pipeline obeys — all three stage gates plus the
 * drain's numbers, database-operated. One flat key set shared by
 * effective/stored/defaults, so form logic is a single loop.
 */
export interface EffectivePipelineSettings {
  /** Auto-run for the daily NRD import. Manual runs bypass. */
  ingestEnabled: boolean;
  /** Auto-run for the hourly liveness probe sweep. Manual runs bypass. */
  livenessEnabled: boolean;
  /** Auto-run for the enrichment drain. Manual runs bypass. */
  enrichEnabled: boolean;
  enrichBatchPerSweep: number;
  enrichConcurrency: number;
  enrichRecrawlHours: number;
}

/** Same keys, nullable: null = no explicit value stored yet for that field. */
export type StoredPipelineSettings = {
  [K in keyof EffectivePipelineSettings]: EffectivePipelineSettings[K] | null;
};

/**
 * The settings editor's view. `effective` is what actually runs — the UI
 * renders and edits that; `stored`/`defaults` exist for completeness (a
 * field never explicitly saved falls back to the deployment default).
 */
export interface PipelineSettingsView {
  effective: EffectivePipelineSettings;
  stored: StoredPipelineSettings;
  defaults: EffectivePipelineSettings;
}

/**
 * PATCH body: absent = leave alone, a value = save it. Ranges are DTO- and
 * CHECK-enforced: batch 1–10000, concurrency 1–20, recrawlHours 1–8760.
 * (null clears a field back to the deployment default — the editor does not
 * expose that; it always saves explicit values.)
 */
export interface UpdatePipelineSettingsPayload {
  ingestEnabled?: boolean | null;
  livenessEnabled?: boolean | null;
  enrichEnabled?: boolean | null;
  enrichBatchPerSweep?: number | null;
  enrichConcurrency?: number | null;
  enrichRecrawlHours?: number | null;
}

/** The drain's live progress and order book, from the pipeline endpoint. */
export interface EnrichmentReadout {
  running: boolean;
  startedAt: string | null;
  processedThisRun: number;
  lastRun: {
    startedAt: string;
    finishedAt: string;
    processed: number;
    /** 'drained' = ran out of eligible leads; the others name the stop. */
    stoppedBecause: 'drained' | 'disabled' | 'max-per-run';
  } | null;
  /** What the drain WILL do, per eligibility pool. */
  todo: { pendingLive: number; staleRecrawl: number; parkedRecheckDue: number };
  /** What it DID. */
  done: { crawledLast24h: number };
  settings: EffectiveEnrichSettings;
}

export interface LeadsPipeline {
  crons: PipelineCron[];
  /** Empty object when Redis is briefly away — render gracefully, never error. */
  counts: Partial<
    Record<'waiting' | 'active' | 'delayed' | 'failed' | 'completed', number>
  >;
  /** First 20 of each backlog. */
  jobs: {
    active: PipelineJobView[];
    waiting: PipelineJobView[];
    delayed: PipelineJobView[];
    failed: PipelineJobView[];
  };
  enrichment: EnrichmentReadout;
}

export function getLeadsPipeline(): Promise<LeadsPipeline> {
  return apiGet<LeadsPipeline>('/admin/leads/pipeline');
}

export function getLeadsSettings(): Promise<PipelineSettingsView> {
  return apiGet<PipelineSettingsView>('/admin/leads/settings');
}

/** Applies live within seconds — no redeploy; a disable stops even a running drain. */
export function updateLeadsSettings(
  payload: UpdatePipelineSettingsPayload,
): Promise<PipelineSettingsView> {
  return apiPatch<PipelineSettingsView>('/admin/leads/settings', payload);
}

export function getLeadSuppressions(
  params?: SuppressionListParams,
): Promise<PaginatedResponse<OutreachSuppression>> {
  return apiGet<PaginatedResponse<OutreachSuppression>>('/admin/leads/suppressions', { params });
}

/** 409 CONFLICT if the email is already suppressed. */
export function addLeadSuppression(payload: AddSuppressionPayload): Promise<OutreachSuppression> {
  return apiPost<OutreachSuppression>('/admin/leads/suppressions', payload);
}

export function removeLeadSuppression(id: string): Promise<{ removed: boolean }> {
  return apiDelete<{ removed: boolean }>(`/admin/leads/suppressions/${id}`);
}

export function getLeadDetail(id: string): Promise<LeadDetail> {
  return apiGet<LeadDetail>(`/admin/leads/${id}`);
}

export function updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
  return apiPatch<Lead>(`/admin/leads/${id}`, payload);
}

/**
 * Synchronously crawls the domain — may take a few seconds, so callers should
 * show a spinner. Never 500s on an unreachable site: the failure lands in
 * `enrichmentStatus: 'failed'` / `enrichmentError`.
 *
 * `browser: true` renders the site in headless Chromium instead — reads
 * JS-built pages the plain crawl can't, and can take ~20 seconds. Answers
 * 503 LEADS_BROWSER_UNAVAILABLE when no browser tier exists in this
 * environment.
 */
export function enrichLead(id: string, browser = false): Promise<Lead> {
  return apiPost<Lead>(`/admin/leads/${id}/enrich`, browser ? { browser: true } : {});
}

export interface QueueOutreachPayload {
  email: string;
  /** Optional subject override, max 200 chars. Omit for the default. */
  subject?: string;
  /**
   * Optional custom HTML body, max 20000 chars. The server always appends
   * the unsubscribe footer and tracking, whatever is sent here.
   */
  bodyHtml?: string;
}

/**
 * Queues cold outreach to the given address. Errors:
 * 409 LEAD_ALREADY_QUEUED (status is not `new`),
 * 409 LEAD_SUPPRESSED (address is on the suppression list),
 * 429 OUTREACH_DAILY_CAP_REACHED (today's OUTREACH_DAILY_CAP is spent),
 * 503 OUTREACH_NOT_CONFIGURED (no provider in this environment).
 */
export function queueLeadOutreach(id: string, payload: QueueOutreachPayload): Promise<Lead> {
  return apiPost<Lead>(`/admin/leads/${id}/queue-outreach`, payload);
}
