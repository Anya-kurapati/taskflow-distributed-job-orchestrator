import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { jobsService } from '@/services/api';
import { buildJob } from '@/test/fixtures';
import { renderRoute } from '@/test/renderWithProviders';

// Lazy route chunks are transformed on first load, which can be slow in CI.
const LAZY = { timeout: 5000 };

const mainNav = () => screen.getAllByRole('navigation', { name: 'Main' })[0]!;

describe('application shell', () => {
  it('redirects / to /dashboard', async () => {
    const { router } = renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Dashboard' }, LAZY)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it.each([
    ['/jobs', 'Jobs', 'Jobs'],
    ['/jobs/create', 'Create job', 'Jobs'],
    ['/schedules', 'Scheduled jobs', 'Schedules'],
    ['/settings', 'Settings', 'Settings'],
  ])('renders %s with breadcrumb and active nav item', async (path, heading, navLabel) => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { name: heading }, LAZY)).toBeInTheDocument();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText(heading)).toHaveAttribute('aria-current', 'page');
    expect(within(mainNav()).getByRole('link', { name: navLabel })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await waitFor(() => expect(document.title).toBe(`${heading} · TaskFlow`));
  });

  it('renders the job details route', async () => {
    const getById = vi.spyOn(jobsService, 'getById').mockResolvedValue(buildJob({ id: 'abc' }));
    renderRoute('/jobs/abc');

    expect(
      await screen.findByRole('heading', { name: 'Nightly report' }, LAZY),
    ).toBeInTheDocument();
    expect(getById).toHaveBeenCalledWith('abc');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs');
    expect(within(breadcrumb).getByText('Job abc')).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', async () => {
    renderRoute('/does-not-exist');
    expect(
      await screen.findByRole('heading', { name: 'Page not found' }, LAZY),
    ).toBeInTheDocument();
  });

  it('opens and closes the mobile navigation drawer', async () => {
    const user = userEvent.setup();
    renderRoute('/jobs');
    await screen.findByRole('heading', { name: 'Jobs' }, LAZY);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(drawer).getByRole('button', { name: 'Close navigation' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Following a link inside the drawer closes it and navigates.
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Settings' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Settings' }, LAZY)).toBeInTheDocument();
  });

  it('shows the mock user and supports signing out and back in', async () => {
    const user = userEvent.setup();
    renderRoute('/jobs');
    await screen.findByRole('heading', { name: 'Jobs' }, LAZY);

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getAllByText('dev@taskflow.local').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.queryByRole('button', { name: 'User menu' })).not.toBeInTheDocument();
    expect(screen.getByText('Not signed in')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in as dev user' }));
    expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument();
  });
});
