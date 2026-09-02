import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLeads, type LeadSortBy } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';

const DEFAULT_LIMIT = 20;

export const LEAD_STATUS_OPTIONS = [
  '',
  'new',
  'queued',
  'contacted',
  'replied',
  'converted',
  'unsubscribed',
  'bounced',
  'disqualified',
] as const;

export const LEAD_LIVENESS_OPTIONS = ['', 'live', 'inactive', 'unknown'] as const;

export const LEAD_ENRICHMENT_OPTIONS = [
  '',
  'pending',
  'enriched',
  'no_contact',
  'parked',
  'failed',
] as const;

/** '' = any; the API's boolean `hasContact` is only sent for the other two. */
export const LEAD_HAS_CONTACT_OPTIONS = ['', 'true', 'false'] as const;

/**
 * '' = any; 'true' = India; 'false' = everything that is not confirmed India
 * ("not sure" — there is deliberately no "not India" state).
 */
export const LEAD_INDIA_OPTIONS = ['', 'true', 'false'] as const;

export const LEAD_SORT_OPTIONS = [
  'createdAt',
  'registeredOn',
  'qualificationScore',
  'teamRating',
  'domain',
] as const satisfies readonly LeadSortBy[];

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const LEAD_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(DEFAULT_LIMIT),
  search: stringParam(''),
  status: enumParam(LEAD_STATUS_OPTIONS, ''),
  liveness: enumParam(LEAD_LIVENESS_OPTIONS, ''),
  enrichmentStatus: enumParam(LEAD_ENRICHMENT_OPTIONS, ''),
  hasContact: enumParam(LEAD_HAS_CONTACT_OPTIONS, ''),
  india: enumParam(LEAD_INDIA_OPTIONS, ''),
  sortBy: enumParam(LEAD_SORT_OPTIONS, 'createdAt'),
  sortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

/**
 * Admin leads list, with every filter mirrored into the URL so a view can be
 * refreshed, bookmarked and shared — "the enriched .in leads with a contact"
 * becomes a link rather than a list of instructions.
 */
export function useAdminLeadsList() {
  const { filters, setFilters, resetFilters, hasActiveFilters } =
    useUrlFilters(LEAD_FILTER_SCHEMA);

  const query = useQuery({
    queryKey: adminQueryKeys.leadsList(filters),
    queryFn: () =>
      getLeads({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        liveness: filters.liveness || undefined,
        enrichmentStatus: filters.enrichmentStatus || undefined,
        hasContact:
          filters.hasContact === '' ? undefined : filters.hasContact === 'true',
        india: filters.india === '' ? undefined : filters.india === 'true',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    // Holds the current page on screen while the next one loads, so paging
    // does not blank the table on every click.
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    setPage: (page: number) => setFilters({ page }, { keepPage: true }),
    setLimit: (limit: number) => setFilters({ limit }),
    // Replace rather than push: a search box should not add one history entry
    // per keystroke.
    setSearch: (search: string) => setFilters({ search }, { replace: true }),
  };
}
