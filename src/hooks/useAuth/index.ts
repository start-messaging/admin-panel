import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getMe } from '@/apis/user.api';
import { logoutApi } from '@/apis/auth.api';
import { ROUTES, STORAGE_KEYS } from '@/lib/constants';
import type { User } from '@/types';

const AUTH_QUERY_KEY = ['auth', 'me'] as const;

function hasToken() {
  return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    enabled: hasToken(),
    retry: false,
  });

  const login = useCallback(
    (accessToken: string, userData: User) => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      queryClient.setQueryData(AUTH_QUERY_KEY, userData);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      queryClient.clear();
      window.location.href = ROUTES.SIGN_IN;
    }
  }, [queryClient]);

  return {
    user: user ?? null,
    isLoading: hasToken() && isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
