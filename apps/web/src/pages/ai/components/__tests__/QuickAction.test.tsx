import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { QuickAction } from '../QuickAction';

const baseProps = {
  id: 'qa-1',
  label: 'Start Chat',
  icon: <span data-testid='qa-icon'>ICN</span>,
  color: 'primary' as const,
  onClick: vi.fn(),
};

describe('QuickAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label', () => {
    renderWithProviders(<QuickAction {...baseProps} />);
    expect(screen.getByText('Start Chat')).toBeInTheDocument();
  });
});
