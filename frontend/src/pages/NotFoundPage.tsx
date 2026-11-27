import { Link } from 'react-router';

import { ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <Link
        to={ROUTES.DASHBOARD}
        className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
