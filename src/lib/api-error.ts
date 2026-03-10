import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api-error';

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as ApiErrorResponse).success === false &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.message === 'string'
  );
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Network error. Please check your connection.';
    }

    if (isApiErrorResponse(error.response.data)) {
      return error.response.data.error.message;
    }

    if (error.response.statusText) {
      return error.response.statusText;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
