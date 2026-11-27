const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** Formats a millisecond duration as e.g. "450ms", "12s", "3m 5s", "2h 4m". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** "Ada Lovelace" -> "AL", "ada" -> "A" */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** "RUNNING" -> "Running" */
export function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const integerFormatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Counts in full below 10,000 ("1,284"), compact above ("12.9K"). */
export function formatCount(value: number): string {
  return Math.abs(value) < 10_000 ? integerFormatter.format(value) : compactFormatter.format(value);
}

/** 0.9734 -> "97.3%" */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(ratio === 0 || ratio === 1 ? 0 : 1)}%`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'short',
});

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "just now", "5 min. ago", "in 25 sec.", "yesterday" — relative to `now`. */
export function formatRelativeTime(value: string | null | undefined, now: number): string {
  if (!value) return '—';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '—';
  const diff = time - now;
  if (Math.abs(diff) < 5_000) return 'just now';
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return relativeFormatter.format(Math.round(diff / ms), unit);
  }
  return relativeFormatter.format(Math.round(diff / 1000), 'second');
}

const hourTickFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
const dayTickFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const hourFullFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const dayFullFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/** Labels a trend bucket: compact for axis ticks ("2 PM", "Nov 26"), fuller elsewhere. */
export function formatTrendBucket(
  timestamp: string,
  interval: 'hour' | 'day',
  variant: 'tick' | 'full',
): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  if (interval === 'hour') {
    return (variant === 'tick' ? hourTickFormatter : hourFullFormatter).format(date);
  }
  return (variant === 'tick' ? dayTickFormatter : dayFullFormatter).format(date);
}

/** A date-time as seen in a specific IANA timezone, e.g. "Nov 30, 2026, 9:00 AM EST". */
export function formatInTimeZone(value: string | Date, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  try {
    // dateStyle/timeStyle can't be combined with timeZoneName, so spell the fields out.
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return dateTimeFormatter.format(date); // unknown timezone: fall back to local time
  }
}
