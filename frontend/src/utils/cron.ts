import { Cron } from 'croner';

import type { ScheduleTrigger } from '@/types/schedule';

/*
 * Cron and trigger maths, shared by the schedule form (validation + preview)
 * and the mock scheduler so both interpret expressions identically.
 *
 * Semantics (the backend scheduler must match):
 * - Standard 5-field cron: minute hour day-of-month month day-of-week.
 *   Names (JAN, MON), ranges, lists and steps are allowed; Sunday is 0 or 7.
 * - When both day-of-month and day-of-week are restricted, a day matching
 *   EITHER runs (classic Vixie cron behaviour).
 * - Expressions are evaluated in the schedule's IANA timezone, so "09:00" stays
 *   09:00 local time across DST changes. A time skipped by a spring-forward
 *   transition runs once, shifted forward; a repeated hour runs once.
 */

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The browser's timezone — the default for new schedules. */
export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** All IANA timezones the runtime knows, for pickers. */
export function listTimeZones(): string[] {
  const zones = Intl.supportedValuesOf?.('timeZone') ?? [];
  return zones.includes('UTC') ? zones : ['UTC', ...zones];
}

function compile(expression: string, timeZone: string): Cron {
  return new Cron(expression.trim(), { timezone: timeZone, mode: '5-part', paused: true });
}

/**
 * Returns a human-readable problem with a cron expression, or null if it is
 * valid and will actually run (e.g. "0 0 31 2 *" — Feb 31 — never does).
 */
export function validateCronExpression(expression: string, timeZone: string): string | null {
  const trimmed = expression.trim();
  if (!trimmed) return 'Enter a cron expression';
  if (trimmed.split(/\s+/).length !== 5) {
    return 'Use 5 fields: minute hour day-of-month month day-of-week';
  }
  if (!isValidTimeZone(timeZone)) return 'Choose a valid timezone';
  try {
    if (compile(trimmed, timeZone).nextRuns(1).length === 0) {
      return 'This expression never matches a date';
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Invalid cron expression: ${message.replace(/^CronPattern: /, '')}`;
  }
}

/** The next `count` run times strictly after `from`. Throws on invalid input. */
export function nextCronRuns(
  expression: string,
  timeZone: string,
  count: number,
  from: Date = new Date(),
): Date[] {
  return compile(expression, timeZone).nextRuns(count, from);
}

/** The next `count` fire times of a trigger strictly after `from`. */
export function upcomingTriggerTimes(
  trigger: ScheduleTrigger,
  count: number,
  from: Date = new Date(),
): Date[] {
  if (trigger.type === 'ONCE') {
    const runAt = new Date(trigger.runAt);
    return runAt.getTime() > from.getTime() ? [runAt] : [];
  }
  try {
    return nextCronRuns(trigger.expression, trigger.timezone, count, from);
  } catch {
    return [];
  }
}

/** When a trigger next fires strictly after `from`, or null if it never will. */
export const nextTriggerTime = (trigger: ScheduleTrigger, from: Date = new Date()) =>
  upcomingTriggerTimes(trigger, 1, from)[0] ?? null;
