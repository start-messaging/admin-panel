import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { getMe } from '@/apis/user.api';
import { logoutApi } from '@/apis/auth.api';
import { ROUTES, STORAGE_KEYS } from '@/lib/constants';
import type { User } from '@/types';

const AUTH_QUERY_KEY = ['auth', 'me'] as const;

function hasToken() {
  return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * The label a human reads in Sentry instead of a UUID.
 *
 * `firstName`/`lastName` are non-optional on the User type but are free-text
 * columns that can hold empty strings, so the join is trimmed and falls back to
 * the email address — a person row labelled " " is worse than one labelled by
 * address.
 */
function displayName(user: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
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

  // Covers both ways a session appears: login() seeding the cache, and the
  // ['auth','me'] query resolving on a page load. Off production Sentry was
  // never initialised, so this is a no-op there rather than a second code path.
  useEffect(() => {
    if (!user) return;
    // Names the admin who hit an error, instead of only where it happened.
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: displayName(user),
    });
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
      // Unlink the identity before the redirect: on a shared browser the next
      // admin to sign in must not inherit this account's name on their crash
      // reports.
      Sentry.setUser(null);
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
