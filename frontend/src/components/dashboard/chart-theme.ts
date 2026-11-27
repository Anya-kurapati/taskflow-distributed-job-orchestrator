/**
 * Chart colors. The two series were checked with the dataviz palette validator
 * (light surface #ffffff): CVD ΔE 24.8, normal-vision ΔE 33.4, both >= 3:1
 * contrast. A red/green pair was rejected — it fails deuteranopia (ΔE 4.0).
 * Failures use the reserved "critical" red; successes use neutral blue.
 */
export const CHART_COLORS = {
  succeeded: '#257de0',
  failed: '#dc3c3d',
  surface: '#ffffff',
  grid: '#e7e7e7',
  axis: '#c2c2c2',
  tick: '#666666',
  cursor: '#f1f5f9',
} as const;

export const TREND_SERIES = [
  { key: 'completed', label: 'Succeeded', color: CHART_COLORS.succeeded },
  { key: 'failed', label: 'Failed', color: CHART_COLORS.failed },
] as const;
