import { describe, expect, it } from 'vitest';

import { availableActions } from './jobActions';
import {
  DEFAULT_JOB_LIST_QUERY,
  parseJobListQuery,
  toJobListParams,
  toSearchParams,
} from './jobListQuery';
import { getPageItems } from './pagination';

describe('availableActions', () => {
  it.each([
    ['SCHEDULED', ['pause', 'cancel']],
    ['QUEUED', ['pause', 'cancel']],
    ['RUNNING', ['cancel']],
    ['PAUSED', ['resume', 'cancel']],
    ['FAILED', ['retry']],
    ['COMPLETED', []],
    ['CANCELLED', []],
  ] as const)('%s → %j', (status, actions) => {
    expect(availableActions(status)).toEqual(actions);
  });
});

describe('job list query', () => {
  it('parses valid params and falls back to defaults for invalid ones', () => {
    expect(
      parseJobListQuery(
        new URLSearchParams('search=report&status=FAILED&type=email.send&page=3&pageSize=50'),
      ),
    ).toEqual({
      ...DEFAULT_JOB_LIST_QUERY,
      search: 'report',
      status: 'FAILED',
      type: 'email.send',
      page: 3,
      pageSize: 50,
    });

    expect(
      parseJobListQuery(new URLSearchParams('status=NOPE&sort=name&page=-2&pageSize=7')),
    ).toEqual(DEFAULT_JOB_LIST_QUERY);
  });

  it('omits defaults from the URL and round-trips', () => {
    const query = { ...DEFAULT_JOB_LIST_QUERY, status: 'RUNNING' as const, page: 2 };
    const params = toSearchParams(query);

    expect(params.toString()).toBe('status=RUNNING&page=2');
    expect(parseJobListQuery(params)).toEqual(query);
    expect(toSearchParams(DEFAULT_JOB_LIST_QUERY).toString()).toBe('');
  });

  it('builds API params without empty filters', () => {
    expect(toJobListParams({ ...DEFAULT_JOB_LIST_QUERY, search: '  ' })).toEqual({
      sort: 'createdAt:desc',
      page: 1,
      pageSize: 20,
    });
  });
});

describe('getPageItems', () => {
  it.each([
    [1, 5, [1, 2, 3, 4, 5]],
    [1, 20, [1, 2, 3, 4, 'gap', 20]],
    [10, 20, [1, 'gap', 9, 10, 11, 'gap', 20]],
    [20, 20, [1, 'gap', 17, 18, 19, 20]],
    [1, 0, []],
  ])('page %i of %i', (current, total, expected) => {
    expect(getPageItems(current, total)).toEqual(expected);
  });
});
