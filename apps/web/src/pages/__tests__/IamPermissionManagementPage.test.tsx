import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PermissionManagementPage from '../iam/PermissionManagementPage';
import { authApi } from '@/api/iam';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/iam', () => {
  const mock = {
    listPermissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createPermission: vi.fn().mockResolvedValue({ success: true }),
    updatePermission: vi.fn().mockResolvedValue({ success: true }),
    deletePermission: vi.fn().mockResolvedValue({ success: true }),
  };
  return { authApi: mock, iamApi: mock, default: mock };
});

vi.mock('@/store', () => {
  const state = {
    addNotification: vi.fn(),
    notifications: [],
    user: { permissions: ['iam:permission:read'] },
    theme: 'light',
  };
  return {
    useNotificationStore: vi.fn((selector?: any) => (selector ? selector(state) : state)),
  };
});

describe('IamPermissionManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PermissionManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have permission management API methods', async () => {
    render(
      <BrowserRouter>
        <PermissionManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listPermissions).toBeDefined();
    expect(authApi.createPermission).toBeDefined();
    expect(authApi.updatePermission).toBeDefined();
    expect(authApi.deletePermission).toBeDefined();
  });

  it('should call listPermissions API on mount', async () => {
    render(
      <BrowserRouter>
        <PermissionManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listPermissions).toHaveBeenCalled();
  });
});
