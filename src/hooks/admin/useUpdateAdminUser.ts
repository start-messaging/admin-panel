import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAdminUser, type AdminUpdateUserPayload } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import type { User } from '@/types';

type Vars = { userId: string; payload: AdminUpdateUserPayload };

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, Vars>({
    mutationFn: ({ userId, payload }) => updateAdminUser(userId, payload),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.userDetail(userId),
      });
    },
  });
}
