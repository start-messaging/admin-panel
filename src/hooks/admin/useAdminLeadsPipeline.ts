import { useQuery } from '@tanstack/react-query';
import { getLeadsPipeline } from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';

export function useAdminLeadsPipeline() {
  return useQuery({
    queryKey: adminQueryKeys.leadsPipeline(),
    queryFn: getLeadsPipeline,
    // A queue view is only useful live: jobs move every few seconds, and the
    // point of the page is watching them move. Polling stops on unmount.
    refetchInterval: 5000,
    // The 5-minute default staleTime would make every remount serve a stale
    // snapshot until the next poll tick.
    staleTime: 0,
  });
}
