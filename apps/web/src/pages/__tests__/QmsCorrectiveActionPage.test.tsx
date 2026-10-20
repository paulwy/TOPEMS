import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsCorrectiveActionPage from '../qms/QmsCorrectiveActionPage';
import { correctiveActionApi } from '@/api/qms/correctiveAction';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/qms/correctiveAction', () => ({
  correctiveActionApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { actions: [], total: 0, page: 1, page_size: 10 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
    setUser: vi.fn(),
    setToken: vi.fn(),
    setPermissions: vi.fn(),
    setRoles: vi.fn(),
    clearAuth: vi.fn(),
    updateUser: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    isSuperuser: vi.fn(() => true),
    getDisplayName: vi.fn(() => 'Test User'),
    getAvatarUrl: vi.fn(() => ''),
  })),
}));

describe('QmsCorrectiveActionPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsCorrectiveActionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have corrective action API methods defined', () => {
    expect(correctiveActionApi.list).toBeDefined();
    expect(correctiveActionApi.create).toBeDefined();
    expect(correctiveActionApi.update).toBeDefined();
    expect(correctiveActionApi.delete).toBeDefined();
  });
});
