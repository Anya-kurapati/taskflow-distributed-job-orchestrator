import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/renderWithProviders';

const LAZY = { timeout: 5000 };

// Names also appear in the upcoming-executions list, so look them up in the table.
const table = () => screen.getByRole('table');
const row = (name: string) => within(table()).getByText(name, { selector: 'p' }).closest('tr')!;

async function renderSchedules() {
  const user = userEvent.setup();
  const result = renderRoute('/schedules');
  await screen.findByRole('table', {}, LAZY);
  return { user, ...result };
}

async function renderNewSchedule() {
  const user = userEvent.setup();
  const result = renderRoute('/schedules/new');
  await screen.findByRole('heading', { name: 'New schedule', level: 1 }, LAZY);
  return { user, ...result };
}

describe('SchedulesPage', () => {
  it('lists schedules with their trigger, status and next run, plus upcoming executions', async () => {
    await renderSchedules();

    const warm = row('Warm search cache');
    expect(warm).toHaveTextContent('*/2 * * * *');
    expect(warm).toHaveTextContent('Active');
    expect(row('Monthly invoices')).toHaveTextContent('Paused');
    expect(row('Backfill CRM contacts')).toHaveTextContent('Completed');

    const upcoming = await screen.findByRole('list', { name: 'Upcoming executions' });
    expect(within(upcoming).getAllByRole('listitem')).toHaveLength(10);
    expect(upcoming).not.toHaveTextContent('Monthly invoices');
  });

  it('pauses and resumes a schedule', async () => {
    const { user } = await renderSchedules();

    await user.click(screen.getByRole('button', { name: 'Pause Warm search cache' }));
    await waitFor(() => expect(row('Warm search cache')).toHaveTextContent('Paused'));

    await user.click(screen.getByRole('button', { name: 'Resume Warm search cache' }));
    await waitFor(() => expect(row('Warm search cache')).toHaveTextContent('Active'));
  });

  it('deletes a schedule after confirmation', async () => {
    const { user } = await renderSchedules();

    await user.click(screen.getByRole('button', { name: 'Delete Nightly usage report' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(row('Nightly usage report')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Nightly usage report' }));
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete Nightly usage report?' })).getByRole(
        'button',
        { name: 'Delete' },
      ),
    );
    await waitFor(() =>
      expect(within(table()).queryByText('Nightly usage report')).not.toBeInTheDocument(),
    );
  });

  it('creates a recurring schedule from a preset with a run-time preview', async () => {
    const { user, router } = await renderNewSchedule();

    await user.type(screen.getByLabelText('Schedule name'), 'Hourly contact sync');
    await screen.findByRole('option', { name: /Sync data/ });
    await user.selectOptions(screen.getByLabelText('Task type'), 'data.sync');
    await user.selectOptions(screen.getByLabelText('Preset'), 'Every hour');
    await user.selectOptions(screen.getByLabelText('Timezone'), 'UTC');

    expect(screen.getByLabelText('Cron expression')).toHaveValue('0 * * * *');
    const preview = screen.getByRole('list', { name: 'Upcoming run times' });
    expect(within(preview).getAllByRole('listitem')).toHaveLength(5);
    expect(preview).toHaveTextContent(/:00/);

    await user.click(screen.getByRole('button', { name: 'Create schedule' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/schedules'));
    await screen.findByRole('table', {}, LAZY);
    await waitFor(() => expect(row('Hourly contact sync')).toHaveTextContent('Every hour'));
  });

  it('validates cron expressions and one-time run times', async () => {
    const { user } = await renderNewSchedule();
    const cron = screen.getByLabelText('Cron expression');

    await user.clear(cron);
    await user.type(cron, '61 * * * *');
    await user.tab();
    expect(await screen.findByText(/Invalid cron expression/)).toBeInTheDocument();
    expect(screen.getByText('Enter a valid expression to preview run times.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /One time/ }));
    fireEvent.change(screen.getByLabelText('Run at'), { target: { value: '2020-01-01T09:00' } });
    await user.click(screen.getByRole('button', { name: 'Create schedule' }));
    expect(await screen.findByText('Choose a time in the future')).toBeInTheDocument();
  });

  it('edits an existing schedule', async () => {
    const { user, router } = await renderSchedules();

    await user.click(screen.getByRole('link', { name: 'Edit Nightly usage report' }));
    await screen.findByRole('heading', { name: 'Edit Nightly usage report' }, LAZY);
    expect(screen.getByLabelText('Schedule name')).toHaveValue('Nightly usage report');
    expect(screen.getByLabelText('Cron expression')).toHaveValue('0 2 * * *');
    expect(screen.getByLabelText('Timezone')).toHaveValue('America/New_York');
    // Task types load asynchronously; the saved type must be selected once they arrive.
    await waitFor(() => expect(screen.getByLabelText('Task type')).toHaveValue('report.generate'));

    const name = screen.getByLabelText('Schedule name');
    await user.clear(name);
    await user.type(name, 'Early usage report');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/schedules'));
    await screen.findByRole('table', {}, LAZY);
    await waitFor(() => expect(row('Early usage report')).toBeInTheDocument());
  });
});
