import { useQuery } from '@tanstack/react-query';
import { getCustomerMessages } from '@/apis/admin.api';
import { adminQueryKeys } from './admin-query-keys';
import type { MessageStatus } from '@/types';

const PAGE_SIZE = 20;

export function useAdminCustomerMessages(params: {
  userId: string | undefined;
  enabled: boolean;
  page: number;
  statusFilter: 'all' | MessageStatus;
  phoneFilter: string;
  startDate: string;
  endDate: string;
}) {
  const { userId, enabled, page, statusFilter, phoneFilter, startDate, endDate } =
    params;

  return useQuery({
    queryKey: userId
      ? adminQueryKeys.customerMessages(
          userId,
          page,
          statusFilter,
          phoneFilter,
          startDate,
          endDate,
        )
      : (['admin', 'user-messages', '__pending__'] as const),
    queryFn: () =>
      getCustomerMessages(userId!, {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        phoneNumber: phoneFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: !!userId && enabled,
  });
}
