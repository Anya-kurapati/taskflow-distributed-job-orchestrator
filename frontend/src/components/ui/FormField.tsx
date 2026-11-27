import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error. Pair the control with `describedBy()` from form-styles. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
