import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addLeadSuppression,
  enrichLead,
  probeLead,
  queueLeadOutreach,
  removeLeadSuppression,
  runEnrichSweep,
  runLeadIngest,
  runLivenessSweep,
  updateLead,
  updateLeadsSettings,
  type AddSuppressionPayload,
  type Lead,
  type OutreachSuppression,
  type PipelineSettingsView,
  type QueueOutreachPayload,
  type UpdateLeadPayload,
  type UpdatePipelineSettingsPayload,
} from '@/apis/leads.api';
import { adminQueryKeys } from './admin-query-keys';

type UpdateVars = { leadId: string; payload: UpdateLeadPayload };

/**
 * Every lead mutation invalidates the list, the detail row and the stats:
 * status changes move a lead between the stat-card buckets, so refreshing
 * only the row would leave the counts above the table lying.
 */
function useInvalidateLead() {
  const queryClient = useQueryClient();
  return (leadId: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadDetail(leadId) });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadStats() });
  };
}

export function useUpdateLead() {
  const invalidateLead = useInvalidateLead();

  return useMutation<Lead, Error, UpdateVars>({
    mutationFn: ({ leadId, payload }) => updateLead(leadId, payload),
    onSuccess: (_data, { leadId }) => invalidateLead(leadId),
  });
}

export function useEnrichLead() {
  const invalidateLead = useInvalidateLead();

  return useMutation<Lead, Error, { leadId: string; browser?: boolean }>({
    mutationFn: ({ leadId, browser }) => enrichLead(leadId, browser),
    onSuccess: (_data, { leadId }) => invalidateLead(leadId),
  });
}

export function useQueueLeadOutreach() {
  const invalidateLead = useInvalidateLead();

  return useMutation<Lead, Error, { leadId: string; payload: QueueOutreachPayload }>({
    mutationFn: ({ leadId, payload }) => queueLeadOutreach(leadId, payload),
    onSuccess: (_data, { leadId }) => invalidateLead(leadId),
  });
}

export function useRunLeadIngest() {
  const queryClient = useQueryClient();

  return useMutation<
    { enqueued: boolean; fileDate?: string; fileDates: string[] },
    Error,
    string | undefined
  >({
    mutationFn: (date) => runLeadIngest(date),
    // The run lands asynchronously, so this refresh usually shows the previous
    // state — it is here for the case where the job finishes fast.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadStats() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadsPipeline() });
    },
  });
}

export function useProbeLead() {
  const invalidateLead = useInvalidateLead();

  return useMutation<Lead, Error, string>({
    mutationFn: (leadId) => probeLead(leadId),
    onSuccess: (_data, leadId) => invalidateLead(leadId),
  });
}

export function useRunLivenessSweep() {
  const queryClient = useQueryClient();

  return useMutation<{ enqueued: boolean }, Error, void>({
    mutationFn: () => runLivenessSweep(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadsPipeline() });
    },
  });
}

export function useUpdateLeadsSettings() {
  const queryClient = useQueryClient();

  return useMutation<PipelineSettingsView, Error, UpdatePipelineSettingsPayload>({
    mutationFn: (payload) => updateLeadsSettings(payload),
    onSuccess: (view) => {
      // The response IS the fresh view — seed it instead of refetching.
      queryClient.setQueryData(adminQueryKeys.leadsSettings(), view);
      // The pipeline's cron pill and enrichment block obey these settings.
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadsPipeline() });
    },
  });
}

export function useRunEnrichSweep() {
  const queryClient = useQueryClient();

  return useMutation<{ enqueued: boolean }, Error, void>({
    mutationFn: () => runEnrichSweep(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadsPipeline() });
    },
  });
}

export function useAddLeadSuppression() {
  const queryClient = useQueryClient();

  return useMutation<OutreachSuppression, Error, AddSuppressionPayload>({
    mutationFn: (payload) => addLeadSuppression(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lead-suppressions'] });
    },
  });
}

export function useRemoveLeadSuppression() {
  const queryClient = useQueryClient();

  return useMutation<{ removed: boolean }, Error, string>({
    mutationFn: (id) => removeLeadSuppression(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lead-suppressions'] });
    },
  });
}
