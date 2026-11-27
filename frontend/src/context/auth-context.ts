import { createContext } from 'react';

import type { User } from '@/types/user';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while authentication is backed by the development-only mock user. */
  isMockAuth: boolean;
  /** Set when the API rejected a request with 401 — the user must sign in again. */
  sessionExpired: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
