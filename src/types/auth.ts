import type { User } from './user';

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface GoogleAuthPayload {
  idToken: string;
  country?: string;
}
