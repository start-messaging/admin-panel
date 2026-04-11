import { useQuery } from '@tanstack/react-query';
import { getUserDetail } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminUserDetail(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? adminQueryKeys.userDetail(userId)
      : (['admin', 'user', '__pending__'] as const),
    queryFn: () => getUserDetail(userId!),
    enabled: !!userId,
  });
}
