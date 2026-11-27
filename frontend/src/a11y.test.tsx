import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { findA11yViolations } from '@/test/axe';
import { renderRoute } from '@/test/renderWithProviders';

const LAZY = { timeout: 5000 };

/**
 * Automated accessibility checks (axe-core) on every page, rendered with
 * realistic data from the mock API. Interactive states (open menus, dialogs,
 * validation errors) are checked too, since they add ARIA that can go wrong.
 */
async function expectAccessible() {
  // Wait until loading indicators are gone so the real content is checked.
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument(), LAZY);
  expect(await findA11yViolations()).toEqual([]);
}

// axe walks the whole DOM (e.g. ~400 timezone options), so allow more time.
describe('accessibility', { timeout: 60_000 }, () => {
  it.each([
    ['dashboard', '/dashboard', 'Dashboard'],
    ['jobs list', '/jobs', 'Jobs'],
    ['create job', '/jobs/create', 'Create job'],
    ['schedules', '/schedules', 'Scheduled jobs'],
    ['new schedule', '/schedules/new', 'New schedule'],
    ['edit schedule', '/schedules/sch-nightly-report/edit', 'Edit Nightly usage report'],
    ['settings', '/settings', 'Settings'],
    ['not found', '/nope', 'Page not found'],
  ])('%s page has no violations', async (_name, path, heading) => {
    renderRoute(path);
    await screen.findByRole('heading', { level: 1, name: heading }, LAZY);
    await expectAccessible();
  });

  it('job details page (failed job, with error details) has no violations', async () => {
    const job = mockDb.jobs.find((candidate) => candidate.status === 'FAILED')!;
    renderRoute(`/jobs/${job.id}`);
    await screen.findByRole('heading', { level: 1, name: job.name }, LAZY);
    await screen.findByRole('table', { name: /Execution attempts/ });
    await expectAccessible();
  });

  it('open navigation drawer and user menu have no violations', async () => {
    const user = userEvent.setup();
    renderRoute('/jobs');
    await screen.findByRole('heading', { level: 1, name: 'Jobs' }, LAZY);

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await expectAccessible();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await expectAccessible();
  });

  it('form validation errors have no violations', async () => {
    const user = userEvent.setup();
    renderRoute('/jobs/create');
    await screen.findByRole('heading', { level: 1, name: 'Create job' }, LAZY);

    await user.click(screen.getByRole('button', { name: 'Create job' }));
    await screen.findByText('Name must be at least 3 characters');
    await expectAccessible();
  });
});
