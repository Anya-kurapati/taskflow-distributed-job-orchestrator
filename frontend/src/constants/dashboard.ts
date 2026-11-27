export const TREND_RANGES = ['24h', '7d', '30d'] as const;

export const TREND_RANGE_LABELS: Record<(typeof TREND_RANGES)[number], string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export const DEFAULT_TREND_RANGE = '7d' satisfies (typeof TREND_RANGES)[number];

export const RECENT_EXECUTIONS_LIMIT = 8;

/** Trends change slowly, so they refresh less often than the live counters. */
export const TRENDS_POLL_MULTIPLIER = 6;
