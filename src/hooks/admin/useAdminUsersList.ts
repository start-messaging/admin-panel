import { useQuery } from '@tanstack/react-query';
import { getUsers, type UserListSortBy } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import type { KycStatus } from '@/types';

const DEFAULT_LIMIT = 20;

export function useAdminUsersList(params: {
  page: number;
  search: string;
  status: string;
  kycStatus: KycStatus | '';
  sortBy: UserListSortBy;
  sortOrder: 'asc' | 'desc';
}) {
  const { page, search, status, kycStatus, sortBy, sortOrder } = params;

  return useQuery({
    queryKey: adminQueryKeys.usersList(
      page,
      search,
      status,
      kycStatus,
      sortBy,
      sortOrder,
    ),
    queryFn: () =>
      getUsers({
        page,
        limit: DEFAULT_LIMIT,
        search: search || undefined,
        status: status || undefined,
        kycStatus: kycStatus || undefined,
        sortBy,
        sortOrder,
      }),
  });
}
