import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { StatCard } from '../StatCard';

const baseProps = {
  id: 'stat-1',
  title: 'Chat Count',
  value: '1,256',
  icon: <span data-testid='stat-icon'>ICN</span>,
  change: 23,
  changeLabel: 'vs last month',
  color: 'primary' as const,
};

describe('StatCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title and value', () => {
    renderWithProviders(<StatCard {...baseProps} />);
    expect(screen.getByText('Chat Count')).toBeInTheDocument();
    expect(screen.getByText('1,256')).toBeInTheDocument();
  });
});
