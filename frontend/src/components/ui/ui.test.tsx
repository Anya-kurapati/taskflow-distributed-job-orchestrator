import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryState } from '@/components/common/QueryState';
import { Toaster } from '@/components/layout/Toaster';
import { ToastProvider } from '@/context/ToastProvider';
import { useToast } from '@/hooks/useToast';

import { Pagination } from './Pagination';
import { ProgressBar } from './ProgressBar';
import { SegmentedControl } from './SegmentedControl';

afterEach(() => vi.useRealTimers());

describe('Pagination', () => {
  const setup = (page: number, totalPages = 10) => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={page}
        pageSize={20}
        totalItems={totalPages * 20 - 5}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    return { onPageChange, onPageSizeChange, user: userEvent.setup() };
  };

  it('shows the visible range and the current page', () => {
    setup(3);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 41–60 of 195');
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });

  it('disables previous on the first page and next on the last', () => {
    setup(1);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('reports page and page-size changes', async () => {
    const { onPageChange, onPageSizeChange, user } = setup(5);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Page 10' }));
    await user.selectOptions(screen.getByRole('combobox'), '50');

    expect(onPageChange.mock.calls).toEqual([[6], [10]]);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('hides page controls when everything fits on one page', () => {
    setup(1, 1);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});

describe('QueryState', () => {
  it('shows loading, then error with retry, then empty, then content', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <QueryState isPending error={null}>
        content
      </QueryState>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');

    rerender(
      <QueryState isPending={false} error={new Error('Server down')} onRetry={onRetry}>
        content
      </QueryState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server down');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();

    rerender(
      <QueryState isPending={false} error={null} isEmpty emptyMessage="Nothing here">
        content
      </QueryState>,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();

    rerender(
      <QueryState isPending={false} error={null}>
        content
      </QueryState>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  function Bomb({ explode }: { explode: boolean }): string {
    if (explode) throw new Error('Chart data was malformed');
    return 'chart';
  }

  function Harness() {
    const [explode, setExplode] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setExplode(false)}>
          fix data
        </button>
        <ErrorBoundary label="the chart">
          <Bomb explode={explode} />
        </ErrorBoundary>
        <p>rest of the page</p>
      </>
    );
  }

  it('contains a crash to its section and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs caught errors
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't display the chart");
    expect(screen.getByRole('alert')).toHaveTextContent('Chart data was malformed');
    expect(screen.getByText('rest of the page')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'fix data' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('chart')).toBeInTheDocument();
  });

  it('resets automatically when resetKeys change', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKeys={['job-1']}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['job-2']}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('chart')).toBeInTheDocument();
  });
});

describe('Toasts', () => {
  function Notifier() {
    const { notify } = useToast();
    return (
      <>
        <button type="button" onClick={() => notify({ tone: 'success', title: 'Saved' })}>
          success
        </button>
        <button
          type="button"
          onClick={() =>
            notify({ tone: 'error', title: 'Job failed', href: '/jobs/1', hrefLabel: 'View job' })
          }
        >
          error
        </button>
      </>
    );
  }

  const renderToasts = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <Notifier />
          <Toaster />
        </ToastProvider>
      </MemoryRouter>,
    );

  it('auto-dismisses success after 5s but keeps errors longer', () => {
    vi.useFakeTimers();
    renderToasts();

    act(() => screen.getByRole('button', { name: 'success' }).click());
    act(() => screen.getByRole('button', { name: 'error' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toHaveTextContent('Job failed');

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Job failed')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(screen.queryByText('Job failed')).not.toBeInTheDocument();
  });

  it('shows at most four at once and can be dismissed', async () => {
    const user = userEvent.setup();
    renderToasts();

    for (let i = 0; i < 6; i += 1)
      await user.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getAllByRole('status')).toHaveLength(4);

    await user.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]!);
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });

  it('links to the related item', async () => {
    renderToasts();
    await userEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.getByRole('link', { name: 'View job' })).toHaveAttribute('href', '/jobs/1');
  });
});

describe('ProgressBar and SegmentedControl', () => {
  it('exposes progress to assistive technology, clamped to 0–100', () => {
    render(<ProgressBar percent={140} label="Upload" message="Almost done" />);
    const bar = screen.getByRole('progressbar', { name: 'Upload' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '100% — Almost done');
  });

  it('marks the selected option as pressed', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Range"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
        value="a"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'Range' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
