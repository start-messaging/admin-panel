import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';
import type { PaginatedResponse } from '@/types';
import type {
  AudiencePreview,
  EmailAudience,
  EmailCampaign,
  EmailCampaignRecipient,
  EmailCampaignStats,
  EmailCampaignStatus,
  EmailPreviewResult,
  EmailRecipientStatus,
  EmailSuppression,
  EmailSuppressionReason,
  EmailTransportStatus,
} from '@/types/email';

const BASE = '/admin/email';

// ── Composer support ───────────────────────────────────

export function getEmailStatus() {
  return apiGet<EmailTransportStatus>(`${BASE}/status`);
}

export function previewAudience(audience: EmailAudience) {
  return apiPost<AudiencePreview>(`${BASE}/audience/preview`, { audience });
}

export function renderPreview(body: {
  subject: string;
  bodyHtml: string;
  preheader?: string;
  previewFor?: string;
}) {
  return apiPost<EmailPreviewResult>(`${BASE}/preview`, body);
}

// ── Campaigns ──────────────────────────────────────────

export interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: EmailCampaignStatus;
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'status' | 'sent' | 'opened';
  sortOrder?: 'ASC' | 'DESC';
}

export function getCampaigns(params: CampaignListParams) {
  return apiGet<PaginatedResponse<EmailCampaign>>(`${BASE}/campaigns`, {
    params,
  });
}

export function getCampaign(id: string) {
  return apiGet<EmailCampaign>(`${BASE}/campaigns/${id}`);
}

export interface CampaignPayload {
  name: string;
  subject: string;
  bodyHtml: string;
  preheader?: string;
  replyTo?: string;
  audience?: EmailAudience;
  trackOpens?: boolean;
  trackClicks?: boolean;
  scheduledAt?: string;
}

export function createCampaign(payload: CampaignPayload) {
  return apiPost<EmailCampaign>(`${BASE}/campaigns`, payload);
}

export function updateCampaign(id: string, payload: Partial<CampaignPayload>) {
  return apiPatch<EmailCampaign>(`${BASE}/campaigns/${id}`, payload);
}

export function deleteCampaign(id: string) {
  return apiDelete<{ deleted: boolean }>(`${BASE}/campaigns/${id}`);
}

export function sendCampaign(id: string) {
  return apiPost<EmailCampaign>(`${BASE}/campaigns/${id}/send`);
}

export function cancelCampaign(id: string) {
  return apiPost<EmailCampaign>(`${BASE}/campaigns/${id}/cancel`);
}

export function sendTestEmail(id: string, to: string) {
  return apiPost<{ sent: boolean; to: string }>(`${BASE}/campaigns/${id}/test`, {
    to,
  });
}

// ── Analytics ──────────────────────────────────────────

export function getCampaignStats(id: string) {
  return apiGet<EmailCampaignStats>(`${BASE}/campaigns/${id}/stats`);
}

export interface RecipientListParams {
  page?: number;
  limit?: number;
  status?: EmailRecipientStatus;
  search?: string;
  openedOnly?: boolean;
}

export function getCampaignRecipients(id: string, params: RecipientListParams) {
  return apiGet<PaginatedResponse<EmailCampaignRecipient>>(
    `${BASE}/campaigns/${id}/recipients`,
    { params },
  );
}

/** Campaigns one customer has been sent — shown on the customer detail screen. */
export function getUserEmailHistory(
  userId: string,
  params: { page?: number; limit?: number },
) {
  return apiGet<PaginatedResponse<EmailCampaignRecipient>>(
    `${BASE}/users/${userId}/history`,
    { params },
  );
}

// ── Suppressions ───────────────────────────────────────

export interface SuppressionListParams {
  page?: number;
  limit?: number;
  search?: string;
  reason?: EmailSuppressionReason;
}

export function getSuppressions(params: SuppressionListParams) {
  return apiGet<PaginatedResponse<EmailSuppression>>(`${BASE}/suppressions`, {
    params,
  });
}

export function addSuppression(body: {
  email: string;
  reason?: EmailSuppressionReason;
  note?: string;
}) {
  return apiPost<EmailSuppression>(`${BASE}/suppressions`, body);
}

export function removeSuppression(id: string) {
  return apiDelete<{ removed: boolean }>(`${BASE}/suppressions/${id}`);
}
