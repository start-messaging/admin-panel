import { useQuery } from '@tanstack/react-query';
import { getLeadStats } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminLeadStats() {
  return useQuery({
    queryKey: adminQueryKeys.leadStats(),
    queryFn: getLeadStats,
  });
}
