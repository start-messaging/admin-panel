import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCustomerApiKeys } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import { numberParam, useUrlFilters } from '@/hooks/useUrlFilters';

const DEFAULT_LIMIT = 20;

/** Prefixed with `key` so it paginates independently of the other tabs. */
const API_KEY_FILTER_SCHEMA = {
  keyPage: numberParam(1),
  keyLimit: numberParam(DEFAULT_LIMIT),
} as const;

export function useAdminCustomerApiKeys(params: {
  userId: string | undefined;
  enabled: boolean;
}) {
  const { userId, enabled } = params;
  const { filters, setFilters } = useUrlFilters(API_KEY_FILTER_SCHEMA, {
    pageKey: 'keyPage',
  });

  const query = useQuery({
    queryKey: userId
      ? adminQueryKeys.customerApiKeys(userId, filters)
      : (['admin', 'user-api-keys', '__pending__'] as const),
    queryFn: () =>
      getCustomerApiKeys(userId!, {
        page: filters.keyPage,
        limit: filters.keyLimit,
      }),
    enabled: !!userId && enabled,
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    filters,
    setPage: (keyPage: number) => setFilters({ keyPage }, { keepPage: true }),
    setLimit: (keyLimit: number) => setFilters({ keyLimit }),
  };
}
