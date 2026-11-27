import { describe, expect, it } from 'vitest';

import { nextCronRuns, nextTriggerTime, validateCronExpression } from './cron';

const iso = (dates: Date[]) => dates.map((date) => date.toISOString());

describe('validateCronExpression', () => {
  it.each([
    ['', 'UTC', 'Enter a cron expression'],
    ['0 0 * * * *', 'UTC', 'Use 5 fields: minute hour day-of-month month day-of-week'],
    ['61 * * * *', 'UTC', /^Invalid cron expression: .*minute/],
    ['0 0 31 2 *', 'UTC', 'This expression never matches a date'],
    ['0 9 * * *', 'Mars/Olympus_Mons', 'Choose a valid timezone'],
  ])('rejects %j in %s', (expression, timeZone, expected) => {
    expect(validateCronExpression(expression, timeZone)).toMatch(expected);
  });

  it.each(['*/15 * * * *', '0 9 * * 1-5', '0 8 * * MON', '0 0 1 JAN,JUL *', '0 0 * * 7'])(
    'accepts %j',
    (expression) => {
      expect(validateCronExpression(expression, 'Europe/London')).toBeNull();
    },
  );
});

describe('nextCronRuns', () => {
  it('skips weekends for a weekday schedule', () => {
    const saturday = new Date('2026-11-28T10:00:00Z');
    expect(iso(nextCronRuns('0 9 * * 1-5', 'UTC', 2, saturday))).toEqual([
      '2026-11-30T09:00:00.000Z',
      '2026-12-01T09:00:00.000Z',
    ]);
  });

  it('evaluates in the schedule timezone', () => {
    // 09:00 in New York (EST, UTC-5) is 14:00 UTC.
    expect(
      iso(nextCronRuns('0 9 * * *', 'America/New_York', 1, new Date('2026-11-26T00:00:00Z'))),
    ).toEqual(['2026-11-26T14:00:00.000Z']);
  });

  it('keeps local wall-clock time across a DST change', () => {
    // US clocks spring forward on 2026-03-08: 09:00 EST → 09:00 EDT.
    expect(
      iso(nextCronRuns('0 9 * * *', 'America/New_York', 2, new Date('2026-03-07T00:00:00Z'))),
    ).toEqual(['2026-03-07T14:00:00.000Z', '2026-03-08T13:00:00.000Z']);
  });

  it('runs a time skipped by spring-forward exactly once, shifted forward', () => {
    // 02:30 doesn't exist in New York on 2026-03-08; it runs at 03:30 EDT that day.
    expect(
      iso(nextCronRuns('30 2 * * *', 'America/New_York', 2, new Date('2026-03-07T12:00:00Z'))),
    ).toEqual(['2026-03-08T07:30:00.000Z', '2026-03-09T06:30:00.000Z']);
  });

  it('matches day-of-month OR day-of-week when both are restricted', () => {
    expect(iso(nextCronRuns('0 0 1 * MON', 'UTC', 3, new Date('2026-11-26T00:00:00Z')))).toEqual([
      '2026-11-30T00:00:00.000Z', // a Monday
      '2026-12-01T00:00:00.000Z', // the 1st
      '2026-12-07T00:00:00.000Z', // a Monday
    ]);
  });
});

describe('nextTriggerTime', () => {
  const now = new Date('2026-11-26T12:00:00Z');

  it('returns a one-time run only while it is in the future', () => {
    expect(
      nextTriggerTime({ type: 'ONCE', runAt: '2026-11-27T08:00:00Z' }, now)?.toISOString(),
    ).toBe('2026-11-27T08:00:00.000Z');
    expect(nextTriggerTime({ type: 'ONCE', runAt: '2026-11-26T11:59:00Z' }, now)).toBeNull();
  });

  it('returns the next cron run strictly after now', () => {
    const trigger = { type: 'CRON', expression: '0 12 * * *', timezone: 'UTC' } as const;
    expect(nextTriggerTime(trigger, now)?.toISOString()).toBe('2026-11-27T12:00:00.000Z');
  });

  it('returns null for an invalid expression instead of throwing', () => {
    expect(nextTriggerTime({ type: 'CRON', expression: 'nope', timezone: 'UTC' }, now)).toBeNull();
  });
});
