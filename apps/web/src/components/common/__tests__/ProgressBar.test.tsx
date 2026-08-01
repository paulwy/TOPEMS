import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import ProgressBar from '../ProgressBar';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ProgressBar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders ProgressBar text content', () => {
    render(<ProgressBar />);
    expect(screen.getByText('ProgressBar')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = render(<ProgressBar />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('is a function component (no props required)', () => {
    expect(() => render(<ProgressBar />)).not.toThrow();
  });

  it('renders consistently on multiple renders', () => {
    const { unmount: u1 } = render(<ProgressBar />);
    expect(screen.getByText('ProgressBar')).toBeInTheDocument();
    u1();
    render(<ProgressBar />);
    expect(screen.getByText('ProgressBar')).toBeInTheDocument();
  });
});
