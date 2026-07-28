import { apiGet, apiPatch, apiPost } from './api-client';
import type { PaginatedResponse } from '@/types';

export type CommissionType = 'percent' | 'flat';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'on_hold';

export interface AffiliateSettings {
  isEnabled: boolean;
  defaultCommissionType: CommissionType;
  defaultCommissionRate: number;
  minPaidReferrals: number;
  minPayoutAmount: number;
  payoutDayOfMonth: number;
  cookieDurationDays: number;
  accrualIntervalHours: number;
  accrualLookbackHours: number;
}

export interface AffiliateOverview {
  totalAccrued: number;
  totalPaid: number;
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  pendingApplications: number;
  activePartners: number;
}

export interface AdminPartner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  referralCode: string;
  status: PartnerStatus;
  commissionType: CommissionType | null;
  commissionRate: number | null;
  payoutMethod: 'bank' | 'upi' | null;
  bankAccountName: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  pan: string | null;
  lifetimeEarnings: number;
  unpaidEarnings: number;
  paidEarnings: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminPayout {
  id: string;
  partnerId: string;
  partner?: AdminPartner;
  periodKey: string;
  amount: number;
  commissionCount: number;
  qualifiedReferralCount: number;
  status: PayoutStatus;
  payoutMethod: 'bank' | 'upi' | null;
  payoutAccountName: string | null;
  payoutAccountRef: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface PartnerDetail {
  partner: AdminPartner;
  referralLink: string;
  stats: {
    clicks: number;
    uniqueClicks: number;
    signups: number;
    qualifiedReferrals: number;
    unpaidEarnings: number;
    lifetimeEarnings: number;
    paidEarnings: number;
    signupConversionRate: number;
  };
  payout: {
    qualifiedReferrals: number;
    requiredReferrals: number;
    unpaidEarnings: number;
    minPayoutAmount: number;
    isEligible: boolean;
    reason?: string;
  };
}

// ── Settings ───────────────────────────────────────────

export function getAffiliateSettings(): Promise<AffiliateSettings> {
  return apiGet<AffiliateSettings>('/admin/affiliate/settings');
}

export function updateAffiliateSettings(
  payload: Partial<AffiliateSettings>,
): Promise<AffiliateSettings> {
  return apiPatch<AffiliateSettings>('/admin/affiliate/settings', payload);
}

export function getAffiliateOverview(): Promise<AffiliateOverview> {
  return apiGet<AffiliateOverview>('/admin/affiliate/overview');
}

// ── Partners ───────────────────────────────────────────

export interface PartnerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PartnerStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export function getPartners(
  params?: PartnerListParams,
): Promise<PaginatedResponse<AdminPartner>> {
  return apiGet<PaginatedResponse<AdminPartner>>('/admin/affiliate/partners', {
    params,
  });
}

export function getPartnerDetail(id: string): Promise<PartnerDetail> {
  return apiGet<PartnerDetail>(`/admin/affiliate/partners/${id}`);
}

export function setPartnerStatus(
  id: string,
  payload: { status: PartnerStatus; adminNotes?: string },
): Promise<AdminPartner> {
  return apiPatch<AdminPartner>(
    `/admin/affiliate/partners/${id}/status`,
    payload,
  );
}

/** Send both fields as null to revert the partner to the global rate. */
export function setPartnerCommission(
  id: string,
  payload: {
    commissionType: CommissionType | null;
    commissionRate: number | null;
  },
): Promise<AdminPartner> {
  return apiPatch<AdminPartner>(
    `/admin/affiliate/partners/${id}/commission`,
    payload,
  );
}

// ── Payouts ────────────────────────────────────────────

export function getAffiliatePayouts(params?: {
  page?: number;
  limit?: number;
  status?: PayoutStatus;
}): Promise<PaginatedResponse<AdminPayout>> {
  return apiGet<PaginatedResponse<AdminPayout>>('/admin/affiliate/payouts', {
    params,
  });
}

export function updatePayout(
  id: string,
  payload: {
    status: PayoutStatus;
    paymentReference?: string;
    failureReason?: string;
    adminNotes?: string;
  },
): Promise<AdminPayout> {
  return apiPatch<AdminPayout>(`/admin/affiliate/payouts/${id}`, payload);
}

// ── Manual job triggers ────────────────────────────────

export function runAccrualJob(): Promise<Record<string, unknown>> {
  return apiPost('/admin/affiliate/jobs/accrual');
}

export function runPayoutJob(): Promise<Record<string, unknown>> {
  return apiPost('/admin/affiliate/jobs/payouts');
}

export function runReconcileJob(): Promise<{ driftedPartners: number }> {
  return apiPost('/admin/affiliate/jobs/reconcile');
}
