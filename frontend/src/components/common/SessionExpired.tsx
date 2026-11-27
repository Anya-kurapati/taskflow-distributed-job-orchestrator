import { LockKeyhole, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/** Replaces page content after the API reports the session is no longer valid. */
export function SessionExpired() {
  const { signIn, isMockAuth } = useAuth();

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <LockKeyhole className="size-8 text-slate-400" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-slate-900">Your session has expired</h1>
      <p className="mt-2 text-sm text-slate-600">
        For your security you've been signed out. Sign in again to continue — nothing you saved has
        been lost.
      </p>
      {isMockAuth ? (
        <Button className="mt-6" onClick={signIn}>
          <LogIn className="size-4" aria-hidden />
          Sign in again
        </Button>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Sign-in isn't available in this build yet. Reload the page to try again.
        </p>
      )}
    </div>
  );
}
