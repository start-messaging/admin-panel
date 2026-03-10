import { apiGet } from './api-client';
import type { User } from '@/types';

export function getMe(): Promise<User> {
  return apiGet<User>('/users/me');
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export function getWallet(): Promise<Wallet> {
  return apiGet<Wallet>('/wallet');
}
