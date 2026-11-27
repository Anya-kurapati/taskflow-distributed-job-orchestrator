import { useState } from 'react';

import { QueryState } from '@/components/common/QueryState';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DEFAULT_TREND_RANGE, TREND_RANGE_LABELS, TREND_RANGES } from '@/constants/dashboard';
import { useJobTrends } from '@/hooks/useDashboard';
import type { TrendRange } from '@/types/dashboard';
import { cn } from '@/utils/cn';
import { formatCount, formatPercent } from '@/utils/format';

import { JobTrendsChart, JobTrendsTable } from './JobTrendsChart';

type View = 'chart' | 'table';

const RANGE_OPTIONS = TREND_RANGES.map((value) => ({ value, label: value }));
const VIEW_OPTIONS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
] as const;

/** Execution trends from `GET /dashboard/trends`, with range and chart/table toggles. */
export function JobTrendsCard() {
  const [range, setRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const [view, setView] = useState<View>('chart');
  const { data: trends, isPending, error, refetch, isPlaceholderData } = useJobTrends(range);

  const totals = trends?.points.reduce(
    (sum, point) => ({
      completed: sum.completed + point.completed,
      failed: sum.failed + point.failed,
    }),
    { completed: 0, failed: 0 },
  );
  const finished = totals ? totals.completed + totals.failed : 0;

  return (
    <Card
      title="Execution trends"
      description={
        totals && finished > 0
          ? `${formatCount(finished)} finished in the last ${TREND_RANGE_LABELS[trends!.range]} · ${formatPercent(totals.failed / finished)} failed`
          : 'Finished executions over time'
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Time range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
          <SegmentedControl label="View" options={VIEW_OPTIONS} value={view} onChange={setView} />
        </div>
      }
    >
      <div
        aria-busy={isPlaceholderData}
        className={cn('transition-opacity', isPlaceholderData && 'opacity-50')}
      >
        <QueryState
          isPending={isPending}
          error={error}
          isEmpty={finished === 0}
          emptyMessage={`No executions finished in the last ${TREND_RANGE_LABELS[range]}.`}
          onRetry={() => void refetch()}
        >
          {trends &&
            (view === 'chart' ? (
              <JobTrendsChart trends={trends} />
            ) : (
              <JobTrendsTable trends={trends} />
            ))}
        </QueryState>
      </div>
    </Card>
  );
}
