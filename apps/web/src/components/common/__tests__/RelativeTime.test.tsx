import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RelativeTime from '../RelativeTime';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RelativeTime />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders RelativeTime text content', () => {
    render(<RelativeTime />);
    expect(screen.getByText('RelativeTime')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = render(<RelativeTime />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('is a function component (no props required)', () => {
    expect(() => render(<RelativeTime />)).not.toThrow();
  });

  it('renders consistently on re-render', () => {
    const { unmount } = render(<RelativeTime />);
    expect(screen.getByText('RelativeTime')).toBeInTheDocument();
    unmount();
    render(<RelativeTime />);
    expect(screen.getByText('RelativeTime')).toBeInTheDocument();
  });
});
