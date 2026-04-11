import { useQuery } from '@tanstack/react-query';
import { getCustomerApiKeys } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminCustomerApiKeys(params: {
  userId: string | undefined;
  enabled: boolean;
}) {
  const { userId, enabled } = params;

  return useQuery({
    queryKey: userId
      ? adminQueryKeys.customerApiKeys(userId)
      : (['admin', 'user-api-keys', '__pending__'] as const),
    queryFn: () => getCustomerApiKeys(userId!),
    enabled: !!userId && enabled,
  });
}
