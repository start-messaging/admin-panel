import { useQuery } from '@tanstack/react-query';
import { getCustomerTransactions } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';

const PAGE_SIZE = 20;

export function useAdminCustomerTransactions(params: {
  userId: string | undefined;
  enabled: boolean;
  page: number;
}) {
  const { userId, enabled, page } = params;

  return useQuery({
    queryKey: userId
      ? adminQueryKeys.customerTransactions(userId, page)
      : (['admin', 'user-transactions', '__pending__'] as const),
    queryFn: () =>
      getCustomerTransactions(userId!, { page, limit: PAGE_SIZE }),
    enabled: !!userId && enabled,
  });
}
