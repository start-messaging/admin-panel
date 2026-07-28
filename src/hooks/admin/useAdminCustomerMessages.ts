import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCustomerMessages, type MessageSortBy } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import type { MessageStatus } from '@/types';

const DEFAULT_LIMIT = 20;

export const ADMIN_MESSAGE_STATUS_OPTIONS = [
  'all',
  'queued',
  'sent',
  'delivered',
  'failed',
  'expired',
] as const;

export const ADMIN_MESSAGE_SORT_OPTIONS = [
  'created_at',
  'sent_at',
  'delivered_at',
  'status',
  'cost',
] as const satisfies readonly MessageSortBy[];

/**
 * Parameter names are prefixed with `msg` because the customer-detail page
 * paginates three lists at once. A shared bare `page` key would mean paging
 * the message list also jumped the transaction list.
 */
const MESSAGE_FILTER_SCHEMA = {
  msgPage: numberParam(1),
  msgLimit: numberParam(DEFAULT_LIMIT),
  msgStatus: enumParam(ADMIN_MESSAGE_STATUS_OPTIONS, 'all'),
  msgPhone: stringParam(''),
  msgFrom: stringParam(''),
  msgTo: stringParam(''),
  msgSortBy: enumParam(ADMIN_MESSAGE_SORT_OPTIONS, 'created_at'),
  msgSortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

export function useAdminCustomerMessages(params: {
  userId: string | undefined;
  enabled: boolean;
}) {
  const { userId, enabled } = params;
  const { filters, setFilters, resetFilters, hasActiveFilters } = useUrlFilters(
    MESSAGE_FILTER_SCHEMA,
    { pageKey: 'msgPage' },
  );

  const query = useQuery({
    queryKey: userId
      ? adminQueryKeys.customerMessages(userId, filters)
      : (['admin', 'user-messages', '__pending__'] as const),
    queryFn: () =>
      getCustomerMessages(userId!, {
        page: filters.msgPage,
        limit: filters.msgLimit,
        status:
          filters.msgStatus === 'all'
            ? undefined
            : (filters.msgStatus as MessageStatus),
        phoneNumber: filters.msgPhone || undefined,
        startDate: filters.msgFrom || undefined,
        endDate: filters.msgTo || undefined,
        sortBy: filters.msgSortBy,
        sortOrder: filters.msgSortOrder,
      }),
    enabled: !!userId && enabled,
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    hasActiveFilters,
    resetFilters,
    setPage: (msgPage: number) => setFilters({ msgPage }, { keepPage: true }),
    setLimit: (msgLimit: number) => setFilters({ msgLimit }),
    setStatus: (msgStatus: (typeof ADMIN_MESSAGE_STATUS_OPTIONS)[number]) =>
      setFilters({ msgStatus }),
    setPhone: (msgPhone: string) =>
      setFilters({ msgPhone }, { replace: true }),
    setDateRange: (msgFrom: string, msgTo: string) =>
      setFilters({ msgFrom, msgTo }),
    setSort: (
      msgSortBy: (typeof ADMIN_MESSAGE_SORT_OPTIONS)[number],
      msgSortOrder: 'ASC' | 'DESC',
    ) => setFilters({ msgSortBy, msgSortOrder }),
  };
}
