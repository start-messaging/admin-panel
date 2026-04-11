import type { MessageStatus } from '@/types';

export const adminQueryKeys = {
  usersList: (
    page: number,
    search: string,
    status: string,
    kycStatus: string,
    sortBy: string,
    sortOrder: string,
  ) => ['admin', 'users', page, search, status, kycStatus, sortBy, sortOrder] as const,

  userDetail: (userId: string) => ['admin', 'user', userId] as const,

  customerOverview: (userId: string) => ['admin', 'user-overview', userId] as const,

  customerMessages: (
    userId: string,
    page: number,
    statusFilter: 'all' | MessageStatus,
    phoneFilter: string,
    startDate: string,
    endDate: string,
  ) =>
    [
      'admin',
      'user-messages',
      userId,
      page,
      statusFilter,
      phoneFilter,
      startDate,
      endDate,
    ] as const,

  customerTransactions: (userId: string, page: number) =>
    ['admin', 'user-transactions', userId, page] as const,

  customerApiKeys: (userId: string) => ['admin', 'user-api-keys', userId] as const,
} as const;
