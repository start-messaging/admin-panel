import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCustomerTransactions, type TransactionSortBy } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';

const DEFAULT_LIMIT = 20;

export const ADMIN_TRANSACTION_TYPE_OPTIONS = [
  'all',
  'credit',
  'debit',
  'refund',
] as const;

export const ADMIN_TRANSACTION_SORT_OPTIONS = [
  'created_at',
  'amount',
  'type',
  'balance_after',
] as const satisfies readonly TransactionSortBy[];

/** Prefixed with `tx` so it paginates independently of the other tabs. */
const TRANSACTION_FILTER_SCHEMA = {
  txPage: numberParam(1),
  txLimit: numberParam(DEFAULT_LIMIT),
  txType: enumParam(ADMIN_TRANSACTION_TYPE_OPTIONS, 'all'),
  txFrom: stringParam(''),
  txTo: stringParam(''),
  txSearch: stringParam(''),
  txSortBy: enumParam(ADMIN_TRANSACTION_SORT_OPTIONS, 'created_at'),
  txSortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

export function useAdminCustomerTransactions(params: {
  userId: string | undefined;
  enabled: boolean;
}) {
  const { userId, enabled } = params;
  const { filters, setFilters, resetFilters, hasActiveFilters } = useUrlFilters(
    TRANSACTION_FILTER_SCHEMA,
    { pageKey: 'txPage' },
  );

  const query = useQuery({
    queryKey: userId
      ? adminQueryKeys.customerTransactions(userId, filters)
      : (['admin', 'user-transactions', '__pending__'] as const),
    queryFn: () =>
      getCustomerTransactions(userId!, {
        page: filters.txPage,
        limit: filters.txLimit,
        type: filters.txType === 'all' ? undefined : filters.txType,
        startDate: filters.txFrom || undefined,
        endDate: filters.txTo || undefined,
        search: filters.txSearch || undefined,
        sortBy: filters.txSortBy,
        sortOrder: filters.txSortOrder,
      }),
    enabled: !!userId && enabled,
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    hasActiveFilters,
    resetFilters,
    setPage: (txPage: number) => setFilters({ txPage }, { keepPage: true }),
    setLimit: (txLimit: number) => setFilters({ txLimit }),
    setType: (txType: (typeof ADMIN_TRANSACTION_TYPE_OPTIONS)[number]) =>
      setFilters({ txType }),
    setSearch: (txSearch: string) =>
      setFilters({ txSearch }, { replace: true }),
    setDateRange: (txFrom: string, txTo: string) =>
      setFilters({ txFrom, txTo }),
    setSort: (
      txSortBy: (typeof ADMIN_TRANSACTION_SORT_OPTIONS)[number],
      txSortOrder: 'ASC' | 'DESC',
    ) => setFilters({ txSortBy, txSortOrder }),
  };
}
