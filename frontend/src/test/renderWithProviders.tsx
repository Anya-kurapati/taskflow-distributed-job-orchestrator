import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';

import { AuthProvider } from '@/context/AuthProvider';
import { LiveUpdatesProvider, type EventSourceFactory } from '@/context/LiveUpdatesProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { routes } from '@/router';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

interface ProviderOptions {
  /** Inject a fake EventSource to drive live updates; omitted = live updates off (polling). */
  createEventSource?: EventSourceFactory | null;
}

function Providers({
  client,
  createEventSource = null,
  children,
}: ProviderOptions & { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>
          <LiveUpdatesProvider createEventSource={createEventSource}>
            {children}
          </LiveUpdatesProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

interface Options extends Omit<RenderOptions, 'wrapper'>, ProviderOptions {
  route?: string;
}

/** Renders a single component inside the app's providers and a memory router. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', createEventSource, ...options }: Options = {},
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Providers client={queryClient} createEventSource={createEventSource}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Providers>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/** Renders the full application route tree (shell + lazy pages) at `path`. */
export function renderRoute(path: string, { createEventSource }: ProviderOptions = {}) {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return {
    router,
    queryClient,
    ...render(
      <Providers client={queryClient} createEventSource={createEventSource}>
        <RouterProvider router={router} />
      </Providers>,
    ),
  };
}
