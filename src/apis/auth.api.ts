import { apiPost } from './api-client';
import type { AuthResponse, GoogleAuthPayload } from '@/types';

export function googleLogin(payload: GoogleAuthPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/google', payload);
}

export function refreshToken(): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/refresh');
}

export function logoutApi(): Promise<void> {
  return apiPost<void>('/auth/logout');
}
