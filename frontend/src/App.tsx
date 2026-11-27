import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FatalError } from '@/components/common/FatalError';
import { createQueryClient } from '@/config/queryClient';
import { AuthProvider } from '@/context/AuthProvider';
import { LiveUpdatesProvider } from '@/context/LiveUpdatesProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { router } from '@/router';

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    // Route errors render inside the shell (see router.tsx); this catches anything
    // that fails outside the router, such as a provider.
    <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <LiveUpdatesProvider>
              <RouterProvider router={router} />
            </LiveUpdatesProvider>
          </ToastProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
