import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import NotificationItem from '../NotificationItem';
import { markAsRead, deleteNotification } from '@/api/notification';
import type { Notification } from '@/api/notification';

// Mock notification API
vi.mock('@/api/notification', () => ({
  markAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  user_id: 'user-1',
  notification_type: 'system',
  title: 'TestNotificationTitle',
  content: 'Test Notification Content Details',
  is_read: false,
  priority: 2,
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  ...overrides,
});

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(markAsRead).mockResolvedValue({
      code: 0,
      success: true,
      data: createMockNotification({ is_read: true }),
      message: 'ok',
      timestamp: Date.now(),
    });
    vi.mocked(deleteNotification).mockResolvedValue({
      code: 0,
      success: true,
      data: true,
      message: 'ok',
      timestamp: Date.now(),
    });
  });

  it('renders notification title', () => {
    renderWithProviders(
      <NotificationItem
        notification={createMockNotification()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('TestNotificationTitle')).toBeInTheDocument();
  });

  it('renders notification content', () => {
    renderWithProviders(
      <NotificationItem
        notification={createMockNotification()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Test Notification Content Details')).toBeInTheDocument();
  });

  it('renders notification time', () => {
    renderWithProviders(
      <NotificationItem
        notification={createMockNotification()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    //5 minutes ago -> "5 min ago"
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
  });

  it('applies unread background style when notification is unread', () => {
    const { container } = renderWithProviders(
      <NotificationItem
        notification={createMockNotification({ is_read: false })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toBeTruthy();
    expect(rootDiv.style.backgroundColor).toBe('rgba(59, 130, 246, 0.05)');
  });

  it('does not apply unread background style when notification is read', () => {
    const { container } = renderWithProviders(
      <NotificationItem
        notification={createMockNotification({ is_read: true })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toBeTruthy();
    expect(rootDiv.style.backgroundColor).toBe('');
  });

  it('calls markAsRead and onUpdate when unread notification is clicked', async () => {
    const handleUpdate = vi.fn();
    const { container } = renderWithProviders(
      <NotificationItem
        notification={createMockNotification({ is_read: false })}
        onUpdate={handleUpdate}
        onDelete={vi.fn()}
      />
    );
    const rootDiv = container.firstChild as HTMLElement;
    fireEvent.click(rootDiv);

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith('notif-1');
      expect(handleUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('calls deleteNotification and onDelete when delete button is clicked', async () => {
    const handleDelete = vi.fn();
    const { container } = renderWithProviders(
      <NotificationItem
        notification={createMockNotification({ is_read: true })}
        onUpdate={vi.fn()}
        onDelete={handleDelete}
      />
    );
    const rootDiv = container.firstChild as HTMLElement;
    // Trigger hover to show action buttons
    fireEvent.mouseEnter(rootDiv);

    const deleteButton = screen.getByTitle('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith('notif-1');
      expect(handleDelete).toHaveBeenCalledWith('notif-1');
    });
  });

  it('renders priority label', () => {
    renderWithProviders(
      <NotificationItem
        notification={createMockNotification({ priority: 4 })}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });
});
