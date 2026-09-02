import { useQuery } from '@tanstack/react-query';
import { getLeadsSettings } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminLeadsSettings() {
  return useQuery({
    queryKey: adminQueryKeys.leadsSettings(),
    queryFn: getLeadsSettings,
  });
}
