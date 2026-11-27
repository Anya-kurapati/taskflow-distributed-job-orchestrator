import type { LucideIcon } from 'lucide-react';

import { cn } from '@/utils/cn';
import { formatCount } from '@/utils/format';

type Tone = 'neutral' | 'critical';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-indigo-50 text-indigo-600',
  critical: 'bg-red-50 text-red-600',
};

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  /** Supporting context under the value, e.g. a rate or definition. */
  hint?: string;
  /** `critical` draws attention (e.g. failures > 0); always paired with icon + label. */
  tone?: Tone;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
  isLoading = false,
}: StatCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={cn('rounded-md p-2.5', toneClasses[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        {isLoading || value === undefined ? (
          <div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-slate-100" aria-hidden />
        ) : (
          <p className="text-2xl font-semibold text-slate-900">{formatCount(value)}</p>
        )}
        {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
