import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/services/api/client';

const MAX_RETRIES = 2;

/**
 * Retry only failures that a retry can fix: network errors, timeouts and 5xx.
 * Client errors (4xx — invalid input, auth, not found) and cancellations won't
 * succeed by repeating the request.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof ApiError) {
    return error.kind !== 'cancelled' && !error.isClientError;
  }
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        // Mutations aren't idempotent in general — never retry them automatically.
        retry: false,
      },
    },
  });
}
