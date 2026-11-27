import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { RECENT_EXECUTIONS_LIMIT, TRENDS_POLL_MULTIPLIER } from '@/constants/dashboard';
import { queryKeys } from '@/constants/queryKeys';
import { dashboardService } from '@/services/api';
import type { TrendRange } from '@/types/dashboard';

import { usePollInterval } from './useLiveUpdates';

// While the live-updates stream is connected these don't poll: job events
// invalidate the dashboard queries instead.

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardService.getSummary(),
    refetchInterval: usePollInterval(),
  });
}

export function useJobTrends(range: TrendRange) {
  const poll = usePollInterval();
  return useQuery({
    queryKey: queryKeys.dashboard.trends(range),
    queryFn: () => dashboardService.getTrends(range),
    refetchInterval: poll && poll * TRENDS_POLL_MULTIPLIER,
    // Keep the previous range on screen while a newly selected one loads.
    placeholderData: keepPreviousData,
  });
}

export function useRecentExecutions(limit = RECENT_EXECUTIONS_LIMIT) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentExecutions(limit),
    queryFn: () => dashboardService.getRecentExecutions(limit),
    refetchInterval: usePollInterval(),
  });
}
