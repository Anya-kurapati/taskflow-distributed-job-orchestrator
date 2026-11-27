import type { z } from 'zod';

import type { JOB_SORTS } from '@/constants/jobs';
import type {
  createJobRequestSchema,
  executionStatusSchema,
  httpMethodSchema,
  httpTargetSchema,
  jobErrorSchema,
  jobExecutionSchema,
  jobPrioritySchema,
  jobSchema,
  jobStatusSchema,
  jobTargetSchema,
  taskTargetSchema,
  taskTypeSchema,
} from '@/schemas/job.schema';

export type Job = z.infer<typeof jobSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobPriority = z.infer<typeof jobPrioritySchema>;
export type JobTarget = z.infer<typeof jobTargetSchema>;
export type TaskTarget = z.infer<typeof taskTargetSchema>;
export type HttpTarget = z.infer<typeof httpTargetSchema>;
export type HttpMethod = z.infer<typeof httpMethodSchema>;
export type JobError = z.infer<typeof jobErrorSchema>;
export type JobExecution = z.infer<typeof jobExecutionSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;

export type JobSort = (typeof JOB_SORTS)[number];

/** Query parameters accepted by `GET /jobs`. */
export interface JobListParams {
  search?: string;
  status?: JobStatus;
  type?: string;
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type JobAction = 'retry' | 'pause' | 'resume' | 'cancel';
