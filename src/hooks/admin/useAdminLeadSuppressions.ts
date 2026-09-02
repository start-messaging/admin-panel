import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLeadSuppressions } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';
import { numberParam, stringParam, useUrlFilters } from '@/hooks/useUrlFilters';

const DEFAULT_LIMIT = 20;

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const SUPPRESSION_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(DEFAULT_LIMIT),
  search: stringParam(''),
} as const;

export function useAdminLeadSuppressions() {
  const { filters, setFilters, resetFilters, hasActiveFilters } = useUrlFilters(
    SUPPRESSION_FILTER_SCHEMA,
  );

  const query = useQuery({
    queryKey: adminQueryKeys.leadSuppressions(filters),
    queryFn: () =>
      getLeadSuppressions({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
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
