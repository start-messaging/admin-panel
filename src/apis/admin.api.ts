import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from './api-client';
import type {
  User,
  KycStatus,
  Channel,
  OtpTemplate,
  TemplateStatus,
  AdminMessage,
  Tag,
  CustomerOverview,
  WalletTransaction,
  AdminApiKey,
  MessageStatus,
  DailyUsageUser,
  PaginatedResponse,
} from '@/types';

// ── Types ──────────────────────────────────────────────

export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
    totalRevenue: number;
    pendingKycCount: number;
    /** Sum of completed Razorpay wallet top-ups (INR) */
    razorpayPaymentsTotal: number;
    razorpayPaymentsToday: number;
    razorpayPaymentsCount: number;
    /**
     * Everything received: app checkouts AND payments credited by hand. The
     * Razorpay-only fields above are what an older server answers, so these
     * are optional until the server that sends them is live.
     */
    collectionsTotal?: number;
    collectionsToday?: number;
    collectionsCount?: number;
    collectionsRazorpay?: number;
    collectionsManual?: number;
  };
  growth: {
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  performance: {
    successRate: number;
    messagesToday: number;
    revenueToday: number;
    failedMessages: number;
  };
  trends: {
    messages: { date: string; total: number; delivered: number; failed: number }[];
    revenue: { date: string; revenue: number }[];
  };
}

export type { PaginationMeta as Pagination, PaginatedResponse } from '@/types';

export type KycSortBy =
  | 'submitted_at'
  | 'reviewed_at'
  | 'created_at'
  | 'name'
  | 'email'
  | 'business_name';

export interface KycListParams {
  page?: number;
  limit?: number;
  status?: KycStatus;
  search?: string;
  sortBy?: KycSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewKycPayload {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export type UserListSortBy =
  | 'created_at'
  | 'name'
  | 'email'
  | 'last_called'
  | 'last_login'
  | 'kyc_status'
  | 'role'
  | 'wallet_balance';

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Account: active | suspended */
  status?: string;
  kycStatus?: KycStatus;
  sortBy?: UserListSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUpdateUserPayload {
  isActive?: boolean;
  adminLastCalledAt?: string | null;
  adminCallNotes?: string | null;
}

// ── API functions ──────────────────────────────────────

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/admin/dashboard');
}

export interface DailyUsageParams {
  date?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export function getAdminDailyUsage(
  params?: DailyUsageParams,
): Promise<PaginatedResponse<DailyUsageUser>> {
  return apiGet<PaginatedResponse<DailyUsageUser>>(
    '/admin/dashboard/daily-usage',
    { params },
  );
}

export function getUsers(params?: UserListParams): Promise<PaginatedResponse<User>> {
  return apiGet<PaginatedResponse<User>>('/admin/users', { params });
}

export function getUserDetail(userId: string): Promise<User> {
  return apiGet<User>(`/admin/kyc/${userId}`);
}

export function updateAdminUser(
  userId: string,
  payload: AdminUpdateUserPayload,
): Promise<User> {
  return apiPatch<User>(`/admin/users/${userId}`, payload);
}

export function getKycList(params?: KycListParams): Promise<PaginatedResponse<User>> {
  return apiGet<PaginatedResponse<User>>('/admin/kyc', { params });
}

export function getKycDetail(userId: string): Promise<User> {
  return apiGet<User>(`/admin/kyc/${userId}`);
}

export function reviewKyc(userId: string, payload: ReviewKycPayload): Promise<User> {
  return apiPatch<User>(`/admin/kyc/${userId}`, payload);
}

// ── Customer detail ──────────────────────────────────────

export type MessageSortBy =
  | 'created_at'
  | 'sent_at'
  | 'delivered_at'
  | 'status'
  | 'cost';

export type TransactionSortBy =
  | 'created_at'
  | 'amount'
  | 'type'
  | 'balance_after';

export interface CustomerMessageParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: MessageStatus;
  phoneNumber?: string;
  apiKeyId?: string;
  provider?: string;
  sortBy?: MessageSortBy;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomerTransactionParams {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit' | 'refund';
  startDate?: string;
  endDate?: string;
  referenceType?: string;
  search?: string;
  sortBy?: TransactionSortBy;
  sortOrder?: 'ASC' | 'DESC';
}

export function getCustomerOverview(userId: string): Promise<CustomerOverview> {
  return apiGet<CustomerOverview>(`/admin/users/${userId}/overview`);
}

export interface MessageSearchParams {
  page?: number;
  limit?: number;
  phoneNumber?: string;
  status?: string;
  provider?: string;
  otpTemplateId?: string;
}

/** Platform-wide message search — "what happened to this number?". */
export function searchMessages(
  params: MessageSearchParams,
): Promise<PaginatedResponse<AdminMessage>> {
  return apiGet<PaginatedResponse<AdminMessage>>('/admin/messages', { params });
}

/**
 * `payment` is money received outside the app and counts as a collection;
 * `goodwill` and `promo` are given away and do not. Left out, it does not count.
 */
export type TopupReason = 'payment' | 'goodwill' | 'promo';

export interface TopupPayload {
  email: string;
  amount: number;
  description: string;
  internalNote?: string;
  reason?: TopupReason;
}

export interface TopupResult {
  user: { id: string; email: string; firstName: string; lastName: string };
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  transactionId: string;
}

/** Manual wallet credit by email. Admin-only; recorded against the actor. */
export function topupWallet(payload: TopupPayload): Promise<TopupResult> {
  return apiPost<TopupResult>('/admin/wallet/topup', payload);
}

export interface CustomPaymentQuote {
  /** Which fee rule the server is running: a flat percentage, or exact netting. */
  mode: 'simple' | 'gross_up';
  /** What the wallet is credited. */
  amount: number;
  /** The gateway's cut, passed on to the customer. */
  convenienceFee: number;
  /** What the customer pays: amount + convenienceFee. */
  chargedAmount: number;
}

/**
 * Works out a payment made outside the app, with the same fee rule the in-app
 * checkout uses. Exactly one of the two: `credit` is "to credit this much, what
 * should the customer pay?" and `paid` is "they paid this much, what do I
 * credit?".
 */
export function getCustomPaymentQuote(
  params: { credit: number } | { paid: number },
): Promise<CustomPaymentQuote> {
  return apiGet<CustomPaymentQuote>('/admin/payments/fee-quote', { params });
}

export interface CollectionsDay {
  /** IST calendar date, YYYY-MM-DD. */
  date: string;
  /** Credited from app checkouts that day. */
  razorpay: number;
  /** Credited by hand as a payment received that day. */
  manual: number;
  total: number;
  count: number;
}

export interface CollectionsData {
  /** Oldest first, every day present. */
  days: CollectionsDay[];
  totals: {
    total: number;
    razorpay: number;
    manual: number;
    count: number;
    averagePerDay: number;
    bestDay: { date: string; total: number } | null;
  };
  /** The same-length period immediately before this one. */
  previous: { total: number; count: number };
  /** Null when the previous period had nothing to compare against. */
  growthPercent: number | null;
}

/** Daily collections for the last `days` days, with growth against the period before. */
export function getCollections(days: number): Promise<CollectionsData> {
  return apiGet<CollectionsData>('/admin/dashboard/collections', {
    params: { days },
  });
}

export function listTags(): Promise<Tag[]> {
  return apiGet<Tag[]>('/admin/tags');
}

export function createTag(payload: {
  name: string;
  colour?: string;
  description?: string;
}): Promise<Tag> {
  return apiPost<Tag>('/admin/tags', payload);
}

export function deleteTag(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/admin/tags/${id}`);
}

/** Replaces the customer's whole manual tag set — not a delta. */
export function setUserTags(userId: string, tagIds: string[]): Promise<Tag[]> {
  return apiPut<Tag[]>(`/admin/users/${userId}/tags`, { tagIds });
}

export function getCustomerMessages(
  userId: string,
  params?: CustomerMessageParams,
): Promise<PaginatedResponse<AdminMessage>> {
  return apiGet<PaginatedResponse<AdminMessage>>(`/admin/users/${userId}/messages`, { params });
}

export function getCustomerTransactions(
  userId: string,
  params?: CustomerTransactionParams,
): Promise<PaginatedResponse<WalletTransaction>> {
  return apiGet<PaginatedResponse<WalletTransaction>>(`/admin/users/${userId}/transactions`, {
    params,
  });
}

export function getCustomerApiKeys(
  userId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedResponse<AdminApiKey>> {
  return apiGet<PaginatedResponse<AdminApiKey>>(
    `/admin/users/${userId}/api-keys`,
    { params },
  );
}

// ── Template management ──────────────────────────────────

export type TemplateSortBy = 'created_at' | 'updated_at' | 'name' | 'status';

export interface TemplateListParams {
  page?: number;
  limit?: number;
  channelId?: string;
  status?: TemplateStatus;
  search?: string;
  sortBy?: TemplateSortBy;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateTemplatePayload {
  name: string;
  body: string;
  channelId: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplatePayload {
  name?: string;
  body?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export function getChannels(): Promise<Channel[]> {
  return apiGet<Channel[]>('/admin/channels');
}

export function getTemplates(params?: TemplateListParams): Promise<PaginatedResponse<OtpTemplate>> {
  return apiGet<PaginatedResponse<OtpTemplate>>('/admin/templates', { params });
}

export function getTemplateDetail(id: string): Promise<OtpTemplate> {
  return apiGet<OtpTemplate>(`/admin/templates/${id}`);
}

export function createTemplate(payload: CreateTemplatePayload): Promise<OtpTemplate> {
  return apiPost<OtpTemplate>('/admin/templates', payload);
}

export function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<OtpTemplate> {
  return apiPatch<OtpTemplate>(`/admin/templates/${id}`, payload);
}

export function publishTemplate(id: string): Promise<OtpTemplate> {
  return apiPatch<OtpTemplate>(`/admin/templates/${id}/publish`);
}

export function unpublishTemplate(id: string): Promise<OtpTemplate> {
  return apiPatch<OtpTemplate>(`/admin/templates/${id}/unpublish`);
}

export function deleteTemplate(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/admin/templates/${id}`);
}
