import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts';

import type { JobTrends, TrendPoint } from '@/types/dashboard';
import { formatCount, formatTrendBucket } from '@/utils/format';

import { CHART_COLORS, TREND_SERIES } from './chart-theme';

type Interval = JobTrends['interval'];

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/** Segment of the stack; only the topmost non-empty segment gets the rounded data-end. */
function segmentShape(isTop: (point: TrendPoint) => boolean) {
  return function Segment(props: BarShapeProps) {
    const point = props.payload as TrendPoint;
    return (
      <Rectangle
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        fill={props.fill}
        // A 2px surface-colored edge leaves a gap between stacked segments.
        stroke={CHART_COLORS.surface}
        strokeWidth={2}
        radius={isTop(point) ? BAR_RADIUS : 0}
      />
    );
  };
}

const SucceededSegment = segmentShape((point) => point.failed === 0);
const FailedSegment = segmentShape(() => true);

/** Stacked columns of succeeded vs failed executions per hour/day. */
export function JobTrendsChart({ trends }: { trends: JobTrends }) {
  const { interval, points } = trends;

  return (
    <div>
      <ChartLegend />
      <div className="mt-3 h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value: string) => formatTrendBucket(value, interval, 'tick')}
              tick={{ fontSize: 12, fill: CHART_COLORS.tick }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axis }}
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value: number) => formatCount(value)}
              tick={{ fontSize: 12, fill: CHART_COLORS.tick }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: CHART_COLORS.cursor }}
              content={(props) => <TrendTooltip {...props} interval={interval} />}
            />
            {TREND_SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="executions"
                fill={series.color}
                maxBarSize={24}
                shape={series.key === 'failed' ? FailedSegment : SucceededSegment}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {TREND_SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
          {series.label}
        </li>
      ))}
    </ul>
  );
}

function TrendTooltip({ active, payload, interval }: TooltipContentProps & { interval: Interval }) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="min-w-44 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-slate-900">
        {formatTrendBucket(point.timestamp, interval, 'full')}
      </p>
      <dl className="space-y-1">
        {TREND_SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2 text-slate-600">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
            <dt>{series.label}</dt>
            <dd className="ml-auto pl-4 font-medium text-slate-900 tabular-nums">
              {formatCount(point[series.key])}
            </dd>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-1 text-slate-600">
          <dt>Total</dt>
          <dd className="ml-auto pl-4 font-medium text-slate-900 tabular-nums">
            {formatCount(point.completed + point.failed)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Accessible tabular view of the same data. */
export function JobTrendsTable({ trends }: { trends: JobTrends }) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Finished executions per {trends.interval}</caption>
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th scope="col" className="py-2 pr-4">
              {trends.interval === 'hour' ? 'Hour' : 'Day'}
            </th>
            {TREND_SERIES.map((series) => (
              <th key={series.key} scope="col" className="py-2 pr-4 text-right">
                {series.label}
              </th>
            ))}
            <th scope="col" className="py-2 text-right">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {[...trends.points].reverse().map((point) => (
            <tr key={point.timestamp}>
              <th scope="row" className="py-2 pr-4 text-left font-normal text-slate-700">
                {formatTrendBucket(point.timestamp, trends.interval, 'full')}
              </th>
              <td className="py-2 pr-4 text-right">{formatCount(point.completed)}</td>
              <td className="py-2 pr-4 text-right">{formatCount(point.failed)}</td>
              <td className="py-2 text-right font-medium">
                {formatCount(point.completed + point.failed)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
