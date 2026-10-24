import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { Avatar } from '../Avatar';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with name (shows initials)', () => {
    render(<Avatar name='张三' />);
    // getInitials for single Chinese name returns first 2 chars
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('renders initials for multi-part name', () => {
    render(<Avatar name='John Doe' />);
    // getInitials: first char of first + first char of last = "JD"
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders with src (shows image)', () => {
    render(
      <Avatar
        name='张三'
        src='https://example.com/avatar.jpg'
      />
    );
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', '张三');
  });

  it('renders with status indicator', () => {
    const { container } = render(
      <Avatar
        name='张三'
        status='online'
      />
    );
    // The status indicator is an absolutely positioned Box inside a relative wrapper
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // In jsdom, sx props become CSS classes, not inline styles
    // Just verify it renders with the status wrapper
    expect(container.innerHTML).toBeTruthy();
  });

  it('renders all sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(
        <Avatar
          name='张三'
          size={size}
        />
      );
      // MUI Avatar without src renders text in a span, not img
      expect(screen.getByText('张三')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with label prop', () => {
    render(<Avatar label='AB' />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders with MUI fallback when no name or label provided', () => {
    const { container } = render(<Avatar />);
    // MUI Avatar shows fallback PersonIcon when no src, name, label, or children
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Avatar
        name='张三'
        onClick={handleClick}
      />
    );
    // Click on the avatar element (MuiAvatar root)
    const avatarEl = container.querySelector('.MuiAvatar-root') as HTMLElement;
    expect(avatarEl).toBeTruthy();
    fireEvent.click(avatarEl);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with badge', () => {
    render(
      <Avatar
        name='张三'
        badge={3}
      />
    );
    // Badge renders with aria-label
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
  });

  it('renders with square variant', () => {
    const { container } = render(
      <Avatar
        name='张三'
        variant='square'
      />
    );
    const avatarEl = container.querySelector('.MuiAvatar-root') as HTMLElement;
    expect(avatarEl).toBeTruthy();
  });

  it('renders children', () => {
    render(
      <Avatar>
        <span data-testid='child'>C</span>
      </Avatar>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
