import { useQuery } from '@tanstack/react-query';
import { use } from 'react';

import { env } from '@/config/env';
import { queryKeys } from '@/constants/queryKeys';
import { LiveUpdatesContext } from '@/context/live-updates-context';
import type { JobProgress, LiveStatus } from '@/types/events';

export function useLiveStatus(): LiveStatus {
  return use(LiveUpdatesContext).status;
}

/**
 * Polling interval for live data: off while the SSE stream is connected (events
 * keep the cache fresh), `intervalMs` otherwise as a fallback.
 */
export function usePollInterval(intervalMs: number = env.pollIntervalMs): number | false {
  return useLiveStatus() === 'open' ? false : intervalMs;
}

/** Live progress of a job's running attempt, if its task reports progress. */
export function useJobProgress(jobId: string): JobProgress | null {
  const { data } = useQuery<JobProgress | null>({
    queryKey: queryKeys.jobs.progress(jobId),
    // Only the SSE stream writes this key; there is nothing to fetch.
    queryFn: () => null,
    staleTime: Infinity,
    enabled: Boolean(jobId),
  });
  return data ?? null;
}
