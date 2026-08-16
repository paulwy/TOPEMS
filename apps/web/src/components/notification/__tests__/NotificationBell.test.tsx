import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import NotificationBell from '../NotificationBell';
import { useNotificationState } from '@/hooks/useNotificationState';

const { tMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.notification_bell.k0': '通知',
    'shared.notification_bell.k1': '有新通知',
    'shared.notification_bell.k2': '未读通知',
  };
  const tMock = (key: string): string => i18nMap[key] || key;
  return { tMock };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    off: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
    changeLanguage: () => {},
  },
  SUPPORTED_LANGUAGES: [
    { code: 'zh', name: '中文', flag: 'CN' },
    { code: 'en', name: 'English', flag: 'US' },
  ],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: ({ children }: any) => children,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    isAuthenticated: true,
  })),
}));

vi.mock('@/hooks/useNotificationState', () => ({
  useNotificationState: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    addNotification: vi.fn(),
    updateNotification: vi.fn(),
    removeNotification: vi.fn(),
    fetchNotifications: vi.fn(),
    fetchUnreadCount: vi.fn(),
  })),
}));

vi.mock('@/hooks/useNotificationWebSocket', () => ({
  useNotificationWebSocket: vi.fn(() => ({
    isConnected: false,
    error: null,
    reconnect: vi.fn(),
  })),
}));

vi.mock('../NotificationPanel', () => ({
  default: ({ onClose }: { onClose: () => void; onUnreadCountChange: (count: number) => void }) => (
    <div data-testid='notification-panel'>
      <button
        data-testid='panel-close'
        onClick={onClose}
      >
        Close
      </button>
    </div>
  ),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell button with aria-label 通知', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('通知');
    expect(bellButton).toBeInTheDocument();
  });

  it('shows unread count badge when unreadCount > 0', () => {
    vi.mocked(useNotificationState).mockReturnValue({
      notifications: [],
      unreadCount: 5,
      loading: false,
      error: null,
      addNotification: vi.fn(),
      updateNotification: vi.fn(),
      removeNotification: vi.fn(),
      fetchNotifications: vi.fn(),
      fetchUnreadCount: vi.fn(),
    });

    renderWithProviders(<NotificationBell />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show badge when unreadCount is 0', () => {
    vi.mocked(useNotificationState).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      addNotification: vi.fn(),
      updateNotification: vi.fn(),
      removeNotification: vi.fn(),
      fetchNotifications: vi.fn(),
      fetchUnreadCount: vi.fn(),
    });

    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('通知');
    const numberSpans = Array.from(bellButton.querySelectorAll('span')).filter((span) =>
      /\d+/.test(span.textContent || '')
    );
    expect(numberSpans.length).toBe(0);
  });

  it('opens panel when bell is clicked', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('通知');
    fireEvent.click(bellButton);
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
  });

  it('calls onNotificationClick callback when bell is clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(<NotificationBell onNotificationClick={handleClick} />);
    const bellButton = screen.getByLabelText('通知');
    fireEvent.click(bellButton);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('closes panel when panel onClose is triggered', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('通知');
    fireEvent.click(bellButton);
    expect(screen.getByTestId('notification-panel')).toBeInTheDocument();

    const closeButton = screen.getByTestId('panel-close');
    fireEvent.click(closeButton);
    expect(screen.queryByTestId('notification-panel')).not.toBeInTheDocument();
  });

  it('shows 99+ when unreadCount exceeds 99', () => {
    vi.mocked(useNotificationState).mockReturnValue({
      notifications: [],
      unreadCount: 100,
      loading: false,
      error: null,
      addNotification: vi.fn(),
      updateNotification: vi.fn(),
      removeNotification: vi.fn(),
      fetchNotifications: vi.fn(),
      fetchUnreadCount: vi.fn(),
    });

    renderWithProviders(<NotificationBell />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
