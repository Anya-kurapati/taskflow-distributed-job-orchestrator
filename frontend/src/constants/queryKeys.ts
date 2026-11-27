import type { TrendRange } from '@/types/dashboard';
import type { JobListParams } from '@/types/job';

/** Centralised TanStack Query keys so invalidation stays consistent. */
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    lists: ['jobs', 'list'] as const,
    list: (params: JobListParams = {}) => ['jobs', 'list', params] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    executions: (id: string) => ['jobs', 'detail', id, 'executions'] as const,
    /** Live progress of a running job — written only by the SSE stream. */
    progress: (id: string) => ['jobs', 'progress', id] as const,
  },
  taskTypes: ['task-types'] as const,
  schedules: {
    all: ['schedules'] as const,
    list: ['schedules', 'list'] as const,
    detail: (id: string) => ['schedules', 'detail', id] as const,
    upcoming: (limit: number) => ['schedules', 'upcoming', limit] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
    trends: (range: TrendRange) => ['dashboard', 'trends', range] as const,
    recentExecutions: (limit: number) => ['dashboard', 'recent-executions', limit] as const,
  },
};
