import {
  jobExecutionListSchema,
  jobPageSchema,
  jobSchema,
  taskTypeListSchema,
} from '@/schemas/job.schema';
import type {
  CreateJobRequest,
  Job,
  JobAction,
  JobExecution,
  JobListParams,
  Page,
  TaskType,
} from '@/types/job';

import { apiClient } from './client';

const jobPath = (id: string) => `/jobs/${encodeURIComponent(id)}`;

async function postAction(id: string, action: JobAction): Promise<Job> {
  const { data } = await apiClient.post<unknown>(`${jobPath(id)}/${action}`);
  return jobSchema.parse(data);
}

export const jobsService = {
  async list(params: JobListParams = {}): Promise<Page<Job>> {
    const { data } = await apiClient.get<unknown>('/jobs', { params });
    return jobPageSchema.parse(data);
  },

  async getById(id: string): Promise<Job> {
    const { data } = await apiClient.get<unknown>(jobPath(id));
    return jobSchema.parse(data);
  },

  /** Execution attempts, newest first. */
  async getExecutions(id: string): Promise<JobExecution[]> {
    const { data } = await apiClient.get<unknown>(`${jobPath(id)}/executions`);
    return jobExecutionListSchema.parse(data);
  },

  async create(request: CreateJobRequest): Promise<Job> {
    const { data } = await apiClient.post<unknown>('/jobs', request);
    return jobSchema.parse(data);
  },

  retry: (id: string) => postAction(id, 'retry'),
  pause: (id: string) => postAction(id, 'pause'),
  resume: (id: string) => postAction(id, 'resume'),
  cancel: (id: string) => postAction(id, 'cancel'),
};

export const taskTypesService = {
  /** Task types registered with the workers — the only tasks a job may run. */
  async list(): Promise<TaskType[]> {
    const { data } = await apiClient.get<unknown>('/task-types');
    return taskTypeListSchema.parse(data);
  },
};
