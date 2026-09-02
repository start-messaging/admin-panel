import type { Lead, LeadEnrichment, LeadLiveness, LeadStatus } from '@/apis/leads.api';

/**
 * What a just-finished crawl actually concluded, as a toast line. A "success"
 * response can still carry a bad verdict: failed means the retry budget is
 * spent, parked means the page belongs to the registrar, and a set
 * enrichmentError with status still pending means this run errored but the
 * automatic sweep will try again — saying "re-crawled" there would be a lie.
 */
export function enrichOutcomeMessage(lead: Lead, successMessage: string): string {
  if (lead.enrichmentStatus === 'failed') {
    return 'Enrichment ran, but the site could not be crawled';
  }
  if (lead.enrichmentStatus === 'parked') {
    return 'Enrichment ran — the domain is parked, no real site yet';
  }
  if (lead.enrichmentError) {
    return 'Crawl failed — left pending for the automatic sweep to retry';
  }
  return successMessage;
}

/** Shared between the list and detail pages so a status never changes colour between views. */
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  replied: 'bg-green-100 text-green-700',
  converted: 'bg-emerald-100 text-emerald-700',
  unsubscribed: 'bg-gray-100 text-gray-500',
  bounced: 'bg-red-100 text-red-700',
  disqualified: 'bg-gray-100 text-gray-500',
};

export const LEAD_LIVENESS_BADGE: Record<LeadLiveness, string> = {
  unknown: 'bg-gray-100 text-gray-500',
  live: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-200 text-gray-600',
};

export const LEAD_LIVENESS_LABEL: Record<LeadLiveness, string> = {
  unknown: 'Not probed',
  live: 'Live',
  inactive: 'Inactive',
};

export const LEAD_ENRICHMENT_BADGE: Record<LeadEnrichment, string> = {
  pending: 'bg-amber-100 text-amber-700',
  enriched: 'bg-green-100 text-green-700',
  no_contact: 'bg-gray-100 text-gray-500',
  // Muted but distinct from no_contact: parked is "no site yet", not "site
  // without contacts".
  parked: 'bg-slate-200 text-slate-600',
  failed: 'bg-red-100 text-red-700',
};

/** "no_contact" reads like a database column; these are the human labels. */
export const LEAD_ENRICHMENT_LABEL: Record<LeadEnrichment, string> = {
  pending: 'Pending',
  enriched: 'Enriched',
  no_contact: 'No contact',
  parked: 'Parked',
  failed: 'Failed',
};
