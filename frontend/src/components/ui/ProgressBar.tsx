import { cn } from '@/utils/cn';

interface ProgressBarProps {
  percent: number;
  label: string;
  message?: string | null;
  size?: 'sm' | 'md';
}

export function ProgressBar({ percent, label, message, size = 'md' }: ProgressBarProps) {
  const value = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div className="min-w-0">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={message ? `${value}% — ${message}` : `${value}%`}
        className={cn(
          'w-full overflow-hidden rounded-full bg-indigo-100',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {size === 'md' && (
        <p className="mt-1 flex justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">{message}</span>
          <span className="tabular-nums">{value}%</span>
        </p>
      )}
    </div>
  );
}
