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
