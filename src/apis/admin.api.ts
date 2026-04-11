import { apiGet, apiPatch, apiPost, apiDelete } from './api-client';
import type {
  User,
  KycStatus,
  Channel,
  OtpTemplate,
  TemplateStatus,
  AdminMessage,
  CustomerOverview,
  WalletTransaction,
  AdminApiKey,
  MessageStatus,
  DailyUsageUser,
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

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface KycListParams {
  page?: number;
  limit?: number;
  status?: KycStatus;
  search?: string;
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
  | 'role';

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

export interface SmsWallet {
  balance: string;
  smsCount: number;
}

// ── API functions ──────────────────────────────────────

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/admin/dashboard');
}

export function getAdminDailyUsage(date?: string): Promise<DailyUsageUser[]> {
  const params = date ? { date } : undefined;
  return apiGet<DailyUsageUser[]>('/admin/dashboard/daily-usage', { params });
}

export function getSmsWallet(): Promise<SmsWallet> {
  return apiGet<SmsWallet>('/admin/sms-wallet');
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

export interface CustomerMessageParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: MessageStatus;
  phoneNumber?: string;
}

export function getCustomerOverview(userId: string): Promise<CustomerOverview> {
  return apiGet<CustomerOverview>(`/admin/users/${userId}/overview`);
}

export function getCustomerMessages(
  userId: string,
  params?: CustomerMessageParams,
): Promise<PaginatedResponse<AdminMessage>> {
  return apiGet<PaginatedResponse<AdminMessage>>(`/admin/users/${userId}/messages`, { params });
}

export function getCustomerTransactions(
  userId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedResponse<WalletTransaction>> {
  return apiGet<PaginatedResponse<WalletTransaction>>(`/admin/users/${userId}/transactions`, {
    params,
  });
}

export function getCustomerApiKeys(userId: string): Promise<AdminApiKey[]> {
  return apiGet<AdminApiKey[]>(`/admin/users/${userId}/api-keys`);
}

// ── Template management ──────────────────────────────────

export interface TemplateListParams {
  page?: number;
  limit?: number;
  channelId?: string;
  status?: TemplateStatus;
  search?: string;
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
