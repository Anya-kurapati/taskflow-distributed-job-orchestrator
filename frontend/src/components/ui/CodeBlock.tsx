import { cn } from '@/utils/cn';

/** Read-only, scrollable monospace block — e.g. a JSON payload or stack trace. */
export function CodeBlock({ value, className }: { value: unknown; className?: string }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <pre
      className={cn(
        'max-h-72 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100',
        className,
      )}
    >
      <code>{text}</code>
    </pre>
  );
}
