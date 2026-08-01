import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import Pagination from '../Pagination';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<Pagination />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders Pagination text content', () => {
    render(<Pagination />);
    expect(screen.getByText('Pagination')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = render(<Pagination />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('is a function component (no props required)', () => {
    expect(() => render(<Pagination />)).not.toThrow();
  });

  it('renders consistently on multiple renders', () => {
    const { unmount } = render(<Pagination />);
    expect(screen.getByText('Pagination')).toBeInTheDocument();
    unmount();
    render(<Pagination />);
    expect(screen.getByText('Pagination')).toBeInTheDocument();
  });
});
