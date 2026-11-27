import { Loader2 } from 'lucide-react';

/** Full-page placeholder shown while the first route's code loads. */
export function PageLoader() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-2 text-slate-500"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">Loading TaskFlow…</span>
    </div>
  );
}
