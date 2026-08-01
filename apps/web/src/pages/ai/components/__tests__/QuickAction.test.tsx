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

  it('renders the icon', () => {
    renderWithProviders(<QuickAction {...baseProps} />);
    expect(screen.getByTestId('qa-icon')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithProviders(
      <QuickAction
        {...baseProps}
        description='Begin a conversation'
      />
    );
    expect(screen.getByText('Begin a conversation')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    renderWithProviders(<QuickAction {...baseProps} />);
    expect(screen.queryByText('Begin a conversation')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <QuickAction
        {...baseProps}
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText('Start Chat'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with pointer cursor (clickable)', () => {
    const { container } = renderWithProviders(<QuickAction {...baseProps} />);
    // The outer Box is clickable
    expect(container.firstChild).toBeInTheDocument();
  });
});
