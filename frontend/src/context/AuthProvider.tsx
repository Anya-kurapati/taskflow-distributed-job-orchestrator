import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { env } from '@/config/env';
import type { User } from '@/types/user';
import { onUnauthorized } from '@/utils/authEvents';

import { AuthContext, type AuthContextValue } from './auth-context';
import { MOCK_USER } from './mockUser';

/**
 * Provides the current user.
 *
 * In development builds the user is a mock (`MOCK_USER`) so the UI can be
 * built without a backend. Production builds start signed out until real
 * authentication replaces this provider's internals; consumers only depend on
 * `useAuth()`, so they won't need to change.
 *
 * Any 401 from the API (reported by the HTTP client) signs the user out and
 * flags the session as expired, so the shell can ask them to sign in again.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(env.mockAuth ? MOCK_USER : null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setSessionExpired(true);
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isMockAuth: env.mockAuth,
      sessionExpired,
      signIn: () => {
        if (!env.mockAuth) return;
        setUser(MOCK_USER);
        if (sessionExpired) {
          setSessionExpired(false);
          // Anything that failed while signed out can now be loaded.
          void queryClient.invalidateQueries();
        }
      },
      signOut: () => setUser(null),
    }),
    [user, sessionExpired, queryClient],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
