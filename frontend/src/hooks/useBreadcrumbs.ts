import { useMatches } from 'react-router';

import type { RouteHandle } from '@/types/route';

export interface Crumb {
  label: string;
  pathname: string;
}

/** Builds breadcrumbs from the `handle.crumb` of each matched route. */
export function useBreadcrumbs(): Crumb[] {
  return useMatches().flatMap((match) => {
    const crumb = (match.handle as RouteHandle | undefined)?.crumb;
    if (!crumb) return [];
    const label = typeof crumb === 'function' ? crumb(match.params) : crumb;
    return [{ label, pathname: match.pathname }];
  });
}
