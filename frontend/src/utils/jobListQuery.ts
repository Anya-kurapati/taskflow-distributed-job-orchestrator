import { DEFAULT_PAGE_SIZE, JOB_SORTS, JOB_STATUSES, PAGE_SIZES } from '@/constants/jobs';
import type { JobListParams, JobSort, JobStatus } from '@/types/job';

/** Jobs list state, mirrored in the URL so views can be bookmarked and shared. */
export interface JobListQuery {
  search: string;
  status: JobStatus | '';
  type: string;
  sort: JobSort;
  page: number;
  pageSize: number;
}

export const DEFAULT_JOB_LIST_QUERY: JobListQuery = {
  search: '',
  status: '',
  type: '',
  sort: 'createdAt:desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const oneOf = <T extends string | number>(values: readonly T[], value: unknown): value is T =>
  (values as readonly unknown[]).includes(value);

/** Reads the query from URL params, falling back to defaults for anything invalid. */
export function parseJobListQuery(params: URLSearchParams): JobListQuery {
  const status = params.get('status');
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));

  return {
    search: params.get('search') ?? '',
    status: oneOf(JOB_STATUSES, status) ? status : '',
    type: params.get('type') ?? '',
    sort: oneOf(JOB_SORTS, sort) ? sort : DEFAULT_JOB_LIST_QUERY.sort,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: oneOf(PAGE_SIZES, pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** URL params for a query, omitting defaults to keep URLs short. */
export function toSearchParams(query: JobListQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_JOB_LIST_QUERY) as (keyof JobListQuery)[]) {
    const value = query[key];
    if (value !== DEFAULT_JOB_LIST_QUERY[key] && value !== '') params.set(key, String(value));
  }
  return params;
}

/** API params for `GET /jobs`. */
export function toJobListParams(query: JobListQuery): JobListParams {
  return {
    ...(query.search.trim() && { search: query.search.trim() }),
    ...(query.status && { status: query.status }),
    ...(query.type && { type: query.type }),
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export const hasActiveFilters = (query: JobListQuery) =>
  Boolean(query.search.trim() || query.status || query.type);
