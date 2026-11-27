import { Workflow } from 'lucide-react';
import { Link, NavLink } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface SidebarContentProps {
  /** Called after any link is followed — used to close the mobile drawer. */
  onNavigate?: () => void;
  /** Accessible name of the navigation landmark; must be unique on the page. */
  navLabel?: string;
}

/** Logo, navigation and profile summary; shared by the desktop and mobile sidebars. */
export function SidebarContent({ onNavigate, navLabel = 'Main' }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to={ROUTES.DASHBOARD}
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-5"
      >
        <Workflow className="size-6 text-indigo-600" aria-hidden />
        <span className="text-lg font-semibold text-slate-900">TaskFlow</span>
      </Link>

      <nav aria-label={navLabel} className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <NavList items={PRIMARY_NAV} onNavigate={onNavigate} />
        <div className="mt-auto border-t border-slate-200 pt-4">
          <NavList items={SECONDARY_NAV} onNavigate={onNavigate} />
        </div>
      </nav>

      <SidebarProfile onNavigate={onNavigate} />
    </div>
  );
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarProfile({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isMockAuth } = useAuth();

  return (
    <div className="shrink-0 border-t border-slate-200 p-3">
      {user ? (
        <Link
          to={ROUTES.SETTINGS}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-slate-100"
        >
          <Avatar name={user.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">{user.name}</span>
            <span className="block truncate text-xs text-slate-500">{user.email}</span>
          </span>
        </Link>
      ) : (
        <p className="px-2 py-1 text-sm text-slate-500">Not signed in</p>
      )}
      {isMockAuth && (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          Development mode · mock user
        </p>
      )}
    </div>
  );
}
