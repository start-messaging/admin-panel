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
  MessageStatus,
} from '@/types';

// ── Types ──────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalRevenue: number;
  pendingKycCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface KycListParams {
  page?: number;
  limit?: number;
  status?: KycStatus;
}

export interface ReviewKycPayload {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
}

export interface SmsWallet {
  balance: string;
  smsCount: number;
}

// ── API functions ──────────────────────────────────────

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/admin/dashboard');
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

export function updateUserStatus(userId: string, payload: UpdateUserStatusPayload): Promise<User> {
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
