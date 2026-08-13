import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import NotificationPanel from '../NotificationPanel';
import { getNotifications, getUnreadCount } from '@/api/notification';
import type { Notification } from '@/api/notification';

vi.mock('@/api/notification', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/modules/notification/config', () => ({
  NOTIFICATION_PATHS: {
    root: '/notification',
    list: '/notification/list',
    dashboard: '/notification/dashboard',
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/hooks/useNotificationWebSocket', () => ({
  useNotificationWebSocket: vi.fn(() => ({
    isConnected: false,
    notifications: [],
    unreadCount: 0,
    error: null,
    markAsRead: vi.fn(),
    clearNotifications: vi.fn(),
    reconnect: vi.fn(),
  })),
}));

vi.mock('../NotificationSettings', () => ({
  default: () => <div data-testid='notification-settings'>Settings</div>,
}));

vi.mock('../NotificationItem', () => ({
  default: ({ notification }: { notification: { id: string; title: string } }) => (
    <div data-testid={`notification-item-${notification.id}`}>{notification.title}</div>
  ),
}));

const createMockNotification = (id: string, title: string): Notification => ({
  id,
  user_id: 'user-1',
  notification_type: 'system',
  title,
  content: 'Notification Content',
  is_read: false,
  priority: 2,
  created_at: new Date().toISOString(),
});

const mockNotificationList: Notification[] = [
  createMockNotification('n1', 'Notification One'),
  createMockNotification('n2', 'Notification Two'),
];

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotifications).mockResolvedValue({
      code: 0,
      success: true,
      data: {
        notifications: mockNotificationList,
        total: 2,
        page: 1,
        pagesize: 50,
        unread_count: 1,
      },
      message: 'ok',
      timestamp: Date.now(),
    });
    vi.mocked(getUnreadCount).mockResolvedValue({
      code: 0,
      success: true,
      data: 1,
      message: 'ok',
      timestamp: Date.now(),
    });
  });

  it('renders title 通知中心', () => {
    renderWithProviders(
      <NotificationPanel
        onClose={vi.fn()}
        onUnreadCountChange={vi.fn()}
      />
    );
    expect(screen.getByText('通知中心')).toBeInTheDocument();
  });

  it('renders notification list after loading', async () => {
    renderWithProviders(
      <NotificationPanel
        onClose={vi.fn()}
        onUnreadCountChange={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('notification-item-n1')).toBeInTheDocument();
      expect(screen.getByTestId('notification-item-n2')).toBeInTheDocument();
    });
  });

  it('renders empty state when no notifications', async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      code: 0,
      success: true,
      data: {
        notifications: [],
        total: 0,
        page: 1,
        pagesize: 50,
        unread_count: 0,
      },
      message: 'ok',
      timestamp: Date.now(),
    });
    vi.mocked(getUnreadCount).mockResolvedValue({
      code: 0,
      success: true,
      data: 0,
      message: 'ok',
      timestamp: Date.now(),
    });

    renderWithProviders(
      <NotificationPanel
        onClose={vi.fn()}
        onUnreadCountChange={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('暂无通知')).toBeInTheDocument();
    });
  });

  it('renders tab buttons for 全部通知 and 未读通知', () => {
    renderWithProviders(
      <NotificationPanel
        onClose={vi.fn()}
        onUnreadCountChange={vi.fn()}
      />
    );
    expect(screen.getByText('全部通知')).toBeInTheDocument();
    expect(screen.getByText('未读通知')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <NotificationPanel
        onClose={handleClose}
        onUnreadCountChange={vi.fn()}
      />
    );
    const header = screen.getByText('通知中心').closest('div');
    expect(header).toBeTruthy();
    const buttons = within(header!).getAllByRole('button');
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders refresh and settings buttons with correct titles', () => {
    renderWithProviders(
      <NotificationPanel
        onClose={vi.fn()}
        onUnreadCountChange={vi.fn()}
      />
    );
    expect(screen.getByTitle('刷新')).toBeInTheDocument();
    expect(screen.getByTitle('通知设置')).toBeInTheDocument();
  });
});
