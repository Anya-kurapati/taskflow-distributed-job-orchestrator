import { describe, expect, it } from 'vitest';

import { formatDateTime, formatDuration, getInitials, toTitleCase } from './format';

describe('formatDuration', () => {
  it.each([
    [450, '450ms'],
    [12_000, '12s'],
    [185_000, '3m 5s'],
    [7_440_000, '2h 4m'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('returns a dash for invalid input', () => {
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('returns a dash for missing or invalid dates', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('formats a valid ISO timestamp', () => {
    expect(formatDateTime('2026-11-26T10:00:00Z')).not.toBe('—');
  });
});

describe('getInitials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['  grace  brewster hopper ', 'GH'],
    ['linus', 'L'],
    ['', '?'],
  ])('returns initials for %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe('toTitleCase', () => {
  it('converts enum-style values', () => {
    expect(toTitleCase('RUNNING')).toBe('Running');
  });
});
