import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router';

import { SessionExpired } from '@/components/common/SessionExpired';
import { Header } from '@/components/layout/Header';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RouteAnnouncer } from '@/components/layout/RouteAnnouncer';
import { SidebarContent } from '@/components/layout/SidebarContent';
import { Toaster } from '@/components/layout/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

const DESKTOP_QUERY = '(min-width: 1024px)'; // Tailwind `lg`

/**
 * Application shell: fixed sidebar on desktop, off-canvas drawer on mobile,
 * sticky header with breadcrumbs and the user menu, and the routed page —
 * or a sign-in prompt if the API reported that the session has expired.
 */
export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const crumbs = useBreadcrumbs();
  const pageTitle = crumbs.at(-1)?.label;
  const { sessionExpired } = useAuth();

  // Close the drawer if the viewport grows to desktop size while it is open.
  useEffect(() => {
    const mediaQuery = window.matchMedia?.(DESKTOP_QUERY);
    if (!mediaQuery) return;
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setSidebarOpen(false);
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-h-screen">
      <title>{pageTitle ? `${pageTitle} · TaskFlow` : 'TaskFlow'}</title>

      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </aside>
      <MobileSidebar open={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header crumbs={crumbs} onOpenSidebar={() => setSidebarOpen(true)} />
        <OfflineBanner />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            {sessionExpired ? <SessionExpired /> : <Outlet />}
          </div>
        </main>
      </div>
      <Toaster />
      <RouteAnnouncer title={pageTitle} />
    </div>
  );
}
