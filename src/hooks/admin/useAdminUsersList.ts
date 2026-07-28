import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUsers, type UserListSortBy } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import type { KycStatus } from '@/types';

const DEFAULT_LIMIT = 20;

export const USER_SORT_OPTIONS = [
  'created_at',
  'name',
  'email',
  'last_called',
  'last_login',
  'kyc_status',
  'role',
] as const satisfies readonly UserListSortBy[];

export const ACCOUNT_STATUS_OPTIONS = ['', 'active', 'suspended'] as const;

export const KYC_STATUS_OPTIONS = [
  '',
  'not_submitted',
  'pending',
  'approved',
  'rejected',
] as const;

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const USER_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(DEFAULT_LIMIT),
  search: stringParam(''),
  status: enumParam(ACCOUNT_STATUS_OPTIONS, ''),
  kycStatus: enumParam(KYC_STATUS_OPTIONS, ''),
  sortBy: enumParam(USER_SORT_OPTIONS, 'created_at'),
  sortOrder: enumParam(['asc', 'desc'] as const, 'desc'),
} as const;

/**
 * Admin customer list, with every filter mirrored into the URL so a view can be
 * refreshed, bookmarked and shared — "the pending-KYC accounts sorted by signup
 * date" becomes a link rather than a list of instructions.
 */
export function useAdminUsersList() {
  const { filters, setFilters, resetFilters, hasActiveFilters } =
    useUrlFilters(USER_FILTER_SCHEMA);

  const query = useQuery({
    queryKey: adminQueryKeys.usersList(filters),
    queryFn: () =>
      getUsers({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        kycStatus: (filters.kycStatus || undefined) as KycStatus | undefined,
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
