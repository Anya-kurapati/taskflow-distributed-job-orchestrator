import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { queryKeys } from '@/constants/queryKeys';
import { jobsService, taskTypesService } from '@/services/api';
import type { CreateJobRequest, JobAction, JobListParams } from '@/types/job';
import { isJobActive } from '@/utils/jobActions';

import { usePollInterval } from './useLiveUpdates';

export function useJobs(params: JobListParams = {}) {
  return useQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: () => jobsService.list(params),
    // Keep the current page visible while the next page / filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: string) {
  const poll = usePollInterval();
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => jobsService.getById(id),
    enabled: Boolean(id),
    // Poll while the job can still change by itself — only if the live stream is down.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isJobActive(status) ? poll : false;
    },
  });
}

export function useJobExecutions(id: string, { live = false }: { live?: boolean } = {}) {
  const poll = usePollInterval();
  return useQuery({
    queryKey: queryKeys.jobs.executions(id),
    queryFn: () => jobsService.getExecutions(id),
    enabled: Boolean(id),
    refetchInterval: live ? poll : false,
  });
}

export function useTaskTypes() {
  return useQuery({
    queryKey: queryKeys.taskTypes,
    queryFn: () => taskTypesService.list(),
    staleTime: 5 * 60_000, // the registry changes rarely
  });
}

/** Job changes affect job lists, job details and every dashboard metric. */
function invalidateJobData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateJobRequest) => jobsService.create(request),
    onSuccess: () => invalidateJobData(queryClient),
  });
}

/** Retry, pause, resume or cancel a job. */
export function useJobAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: JobAction) => jobsService[action](id),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.jobs.detail(id), job);
      return invalidateJobData(queryClient);
    },
  });
}
