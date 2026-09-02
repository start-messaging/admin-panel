import { useQuery } from '@tanstack/react-query';
import { getLeadDetail } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminLeadDetail(leadId: string | undefined) {
  return useQuery({
    queryKey: leadId
      ? adminQueryKeys.leadDetail(leadId)
      : (['admin', 'lead', '__pending__'] as const),
    queryFn: () => getLeadDetail(leadId!),
    enabled: !!leadId,
  });
}
