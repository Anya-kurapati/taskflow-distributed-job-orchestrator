import { Menu, Plus } from 'lucide-react';
import { useNavigation } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/constants/routes';
import type { Crumb } from '@/hooks/useBreadcrumbs';

import { Breadcrumbs } from './Breadcrumbs';
import { LiveStatusIndicator } from './LiveStatusIndicator';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  crumbs: Crumb[];
  onOpenSidebar: () => void;
}

export function Header({ crumbs, onOpenSidebar }: HeaderProps) {
  const isNavigating = useNavigation().state === 'loading';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <Breadcrumbs crumbs={crumbs} />

      <LiveStatusIndicator />
      <ButtonLink to={ROUTES.JOB_CREATE} aria-label="New job" className="px-2.5 sm:px-3.5">
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New job</span>
      </ButtonLink>
      <UserMenu />

      {isNavigating && (
        <div
          role="progressbar"
          aria-label="Loading page"
          className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-indigo-500"
        />
      )}
    </header>
  );
}
