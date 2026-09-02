import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import posthog from 'posthog-js';
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
    // Whoever asks, "who am I" is fetched once per page load. These three
    // defaults are what turned an unreachable API into a request storm:
    // retryOnMount defaults to true, so every remount of any component calling
    // useAuth refetched the errored query, and retry:false meant it did so with
    // no backoff — measured at ~340 requests/second against a dead port. A
    // failed session check is an answer ("not signed in"), not a question to
    // keep asking.
    retryOnMount: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Covers both ways a session appears: login() seeding the cache and the
  // ['auth','me'] query resolving on a page load. `__loaded` is false when no
  // VITE_POSTHOG_KEY was set, so identify never fires with analytics off, and
  // posthog itself drops repeat identify calls for the same distinct id.
  useEffect(() => {
    if (user && posthog.__loaded) {
      posthog.identify(`user_${user.id}`, { email: user.email, role: user.role });
    }
  }, [user]);

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
      // Unlink the device from the person before the redirect, or the next
      // admin to sign in on this browser would inherit this session's replay
      // and event identity.
      if (posthog.__loaded) {
        posthog.reset();
      }
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
