import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JobStatusBadge } from './JobStatusBadge';

describe('JobStatusBadge', () => {
  it('renders a human-readable status label', () => {
    render(<JobStatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
