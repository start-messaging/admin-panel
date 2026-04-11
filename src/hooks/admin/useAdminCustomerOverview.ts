import { useQuery } from '@tanstack/react-query';
import { getCustomerOverview } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminCustomerOverview(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? adminQueryKeys.customerOverview(userId)
      : (['admin', 'user-overview', '__pending__'] as const),
    queryFn: () => getCustomerOverview(userId!),
    enabled: !!userId,
  });
}
