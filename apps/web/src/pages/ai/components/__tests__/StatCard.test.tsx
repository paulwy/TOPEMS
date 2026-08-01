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

  it('renders the change label', () => {
    renderWithProviders(<StatCard {...baseProps} />);
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders positive change with + prefix and success chip', () => {
    renderWithProviders(
      <StatCard
        {...baseProps}
        change={23}
      />
    );
    expect(screen.getByText('+23%')).toBeInTheDocument();
    const chip = screen.getByText('+23%').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorSuccess');
  });

  it('renders negative change without + prefix and error chip', () => {
    renderWithProviders(
      <StatCard
        {...baseProps}
        change={-5}
      />
    );
    expect(screen.getByText('-5%')).toBeInTheDocument();
    const chip = screen.getByText('-5%').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorError');
  });

  it('renders the provided icon', () => {
    renderWithProviders(<StatCard {...baseProps} />);
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('calls onClick when clicked (if provided)', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <StatCard
        {...baseProps}
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText('Chat Count'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as non-pointer when onClick is not provided', () => {
    const { container } = renderWithProviders(<StatCard {...baseProps} />);
    const paper = container.querySelector('.MuiPaper-root') as HTMLElement;
    expect(paper).toBeInTheDocument();
    // No onClick handler attached -> no cursor pointer
    expect(paper.style.cursor).not.toBe('pointer');
  });
});
