import { X } from 'lucide-react';
import { useEffect } from 'react';

import { SidebarContent } from './SidebarContent';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Off-canvas navigation drawer for viewports below the `lg` breakpoint. */
export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="fixed inset-0 bg-slate-900/50" aria-hidden onClick={onClose} />
      <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          autoFocus // move focus into the dialog when it opens
          aria-label="Close navigation"
          className="absolute top-4 right-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="size-5" aria-hidden />
        </button>
        <SidebarContent onNavigate={onClose} navLabel="Main menu" />
      </div>
    </div>
  );
}
