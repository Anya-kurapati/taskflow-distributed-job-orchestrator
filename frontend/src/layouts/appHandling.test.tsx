import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiUrl } from '@/mocks/handlers';
import { renderRoute } from '@/test/renderWithProviders';
import { server } from '@/test/server';

const LAZY = { timeout: 5000 };

afterEach(() => vi.restoreAllMocks());

describe('application-level handling', () => {
  it('asks the user to sign in again when the API returns 401, then recovers', async () => {
    let authenticated = false;
    server.use(
      http.get(apiUrl('/jobs'), ({ request }) =>
        authenticated
          ? undefined // fall through to the normal mock handler
          : new HttpResponse(null, { status: 401, statusText: request.url && 'Unauthorized' }),
      ),
    );
    const user = userEvent.setup();
    renderRoute('/jobs');

    expect(
      await screen.findByRole('heading', { name: 'Your session has expired' }, LAZY),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'User menu' })).not.toBeInTheDocument();

    authenticated = true;
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));

    expect(await screen.findByRole('table', {}, LAZY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument();
  });

  it('shows a permission message for 403 responses', async () => {
    server.use(http.get(apiUrl('/schedules'), () => new HttpResponse(null, { status: 403 })));
    renderRoute('/schedules');

    expect(
      await screen.findByText("You don't have permission to do this.", {}, LAZY),
    ).toBeInTheDocument();
    // Other sections of the page still work.
    expect(await screen.findByRole('list', { name: 'Upcoming executions' })).toBeInTheDocument();
  });

  it('shows an offline banner while the browser has no connection', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    renderRoute('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, LAZY);
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();

    onLine.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();

    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
  });

  it('announces page changes to screen readers', async () => {
    const user = userEvent.setup();
    renderRoute('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, LAZY);

    await user.click(screen.getAllByRole('link', { name: 'Settings' })[0]!);
    await screen.findByRole('heading', { level: 1, name: 'Settings' }, LAZY);
    await waitFor(() => expect(screen.getByText('Settings page')).toBeInTheDocument());
  });

  it('offers a reload when a page fails to load after a new deploy', async () => {
    const { routes } = await import('@/router');
    const settingsRoute = routes[0]!.children![0]!.children!.find(
      (route) => route.path === '/settings',
    )!;
    const originalLazy = settingsRoute.lazy;
    settingsRoute.lazy = () =>
      Promise.reject(
        new TypeError('Failed to fetch dynamically imported module: /assets/SettingsPage-abc.js'),
      );

    try {
      renderRoute('/settings');
      expect(
        await screen.findByRole('heading', { name: 'A new version is available' }, LAZY),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    } finally {
      settingsRoute.lazy = originalLazy;
    }
  });
});
