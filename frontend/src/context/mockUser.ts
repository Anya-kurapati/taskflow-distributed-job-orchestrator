import type { User } from '@/types/user';

/** Development-only stand-in until real authentication is implemented. */
export const MOCK_USER: User = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@taskflow.local',
  role: 'ADMIN',
};
