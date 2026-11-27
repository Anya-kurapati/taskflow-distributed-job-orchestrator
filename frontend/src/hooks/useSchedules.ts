import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/constants/queryKeys';
import { UPCOMING_EXECUTIONS_LIMIT } from '@/constants/schedules';
import { schedulesService } from '@/services/api';
import type { ScheduleAction, ScheduleRequest } from '@/types/schedule';

import { usePollInterval } from './useLiveUpdates';

export function useSchedules() {
  return useQuery({
    queryKey: queryKeys.schedules.list,
    queryFn: () => schedulesService.list(),
    refetchInterval: usePollInterval(),
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: queryKeys.schedules.detail(id),
    queryFn: () => schedulesService.getById(id),
    enabled: Boolean(id),
  });
}

export function useUpcomingExecutions(limit = UPCOMING_EXECUTIONS_LIMIT) {
  return useQuery({
    queryKey: queryKeys.schedules.upcoming(limit),
    queryFn: () => schedulesService.upcoming(limit),
    refetchInterval: usePollInterval(),
  });
}

function useInvalidateSchedules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
}

/** Creates a schedule, or updates it when `id` is given. */
export function useSaveSchedule(id?: string) {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (request: ScheduleRequest) =>
      id ? schedulesService.update(id, request) : schedulesService.create(request),
    onSuccess: invalidate,
  });
}

export function useDeleteSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: (id: string) => schedulesService.remove(id),
    onSuccess: invalidate,
  });
}

export function useScheduleAction() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ScheduleAction }) =>
      schedulesService.runAction(id, action),
    onSuccess: invalidate,
  });
}
