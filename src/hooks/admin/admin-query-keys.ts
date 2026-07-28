/**
 * React Query cache keys for the admin views.
 *
 * Filter objects come straight from `useUrlFilters`, which derives them from
 * the URL. Passing the whole object keeps the key and the request in lockstep:
 * previously each key listed its filters positionally, so adding a filter meant
 * remembering to add it here too — miss that and the cache serves a stale page
 * belonging to a different set of filters.
 */
export const adminQueryKeys = {
  usersList: (filters: Record<string, unknown>) =>
    ['admin', 'users', filters] as const,

  userDetail: (userId: string) => ['admin', 'user', userId] as const,

  customerOverview: (userId: string) =>
    ['admin', 'user-overview', userId] as const,

  customerMessages: (userId: string, filters: Record<string, unknown>) =>
    ['admin', 'user-messages', userId, filters] as const,

  customerTransactions: (userId: string, filters: Record<string, unknown>) =>
    ['admin', 'user-transactions', userId, filters] as const,

  customerApiKeys: (userId: string, filters: Record<string, unknown>) =>
    ['admin', 'user-api-keys', userId, filters] as const,

  kycList: (filters: Record<string, unknown>) =>
    ['admin', 'kyc', filters] as const,

  templates: (filters: Record<string, unknown>) =>
    ['admin', 'templates', filters] as const,

  dailyUsage: (filters: Record<string, unknown>) =>
    ['admin', 'daily-usage', filters] as const,
} as const;
