import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import AmountDisplay from '../AmountDisplay';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: unknown) =>
    selector ? selector({ user: null }) : { user: null }
  ),
}));

describe('AmountDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders amount with default CNY currency symbol', () => {
    render(<AmountDisplay amount={1234.56} />);
    expect(screen.getByText('¥')).toBeInTheDocument();
    expect(screen.getByText('1,234.56')).toBeInTheDocument();
  });

  it('renders USD currency symbol when currency is USD', () => {
    render(
      <AmountDisplay
        amount={100}
        currency='USD'
      />
    );
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('renders negative numbers with thousand separator', () => {
    render(<AmountDisplay amount={-1234567.89} />);
    expect(screen.getByText('-1,234,567.89')).toBeInTheDocument();
  });

  it('renders without thousand separator when thousandSeparator is false', () => {
    render(
      <AmountDisplay
        amount={1234567.89}
        thousandSeparator={false}
      />
    );
    expect(screen.getByText('1234567.89')).toBeInTheDocument();
  });

  it('hides currency unit when showUnit is false', () => {
    render(
      <AmountDisplay
        amount={100}
        showUnit={false}
      />
    );
    expect(screen.queryByText('¥')).not.toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('renders with custom prefix and suffix', () => {
    render(
      <AmountDisplay
        amount={100}
