import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';
import { isChunkLoadError } from '@/utils/errors';

/** Shown when a route throws while rendering or fails to load its code. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isChunkLoadError(error)) {
    return (
      <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
        <RefreshCw className="size-8 text-indigo-500" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">A new version is available</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          TaskFlow was updated while this page was open. Reload to get the latest version.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
      <AlertTriangle className="size-8 text-amber-500" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link
          to={ROUTES.DASHBOARD}
          className="self-center text-sm font-medium text-indigo-600 hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
