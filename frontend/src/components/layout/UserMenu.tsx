import { ChevronDown, LogIn, LogOut, Settings } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { toTitleCase } from '@/utils/format';

const itemClasses =
  'flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900';

export function UserMenu() {
  const { user, isMockAuth, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) {
    return isMockAuth ? (
      <Button variant="secondary" onClick={signIn}>
        <LogIn className="size-4" aria-hidden />
        Sign in as dev user
      </Button>
    ) : (
      <span className="text-sm text-slate-500">Guest</span>
    );
  }

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="User menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Avatar name={user.name} size="sm" />
        <ChevronDown className="hidden size-4 text-slate-500 sm:block" aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                {toTitleCase(user.role)}
                {isMockAuth && <span className="ml-1.5 text-amber-700">· mock</span>}
              </p>
            </div>
          </div>
          <ul className="py-1">
            <li>
              <Link to={ROUTES.SETTINGS} onClick={close} className={itemClasses}>
                <Settings className="size-4 text-slate-400" aria-hidden />
                Settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  close();
                  signOut();
                }}
                className={itemClasses}
              >
                <LogOut className="size-4 text-slate-400" aria-hidden />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
