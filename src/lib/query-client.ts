import { QueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const axiosError = error as AxiosError;
        // Don't retry network errors (server down)
        if (!axiosError?.response) return false;
        // Don't retry 4xx (client errors)
        const status = axiosError.response?.status;
        if (status && status < 500) return false;
        // Retry server errors once
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
    },
  },
});
