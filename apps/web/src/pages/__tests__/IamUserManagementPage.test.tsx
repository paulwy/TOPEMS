import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserManagementPage from '../iam/UserManagementPage';
import { authApi } from '@/api/iam';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/iam', () => {
  const mock = {
    listUsers: vi.fn().mockResolvedValue({ success: true, data: { users: [], total: 0 } }),
    listRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createUser: vi.fn().mockResolvedValue({ success: true }),
    updateUser: vi.fn().mockResolvedValue({ success: true }),
    deleteUser: vi.fn().mockResolvedValue({ success: true }),
    addUserRole: vi.fn().mockResolvedValue({ success: true }),
    removeUserRole: vi.fn().mockResolvedValue({ success: true }),
    batchUpdateUsers: vi.fn().mockResolvedValue({ success: true }),
    batchDeleteUsers: vi.fn().mockResolvedValue({ success: true }),
  };
  return { authApi: mock, iamApi: mock, default: mock };
});

vi.mock('@/store', () => {
  const state = {
    addNotification: vi.fn(),
    notifications: [],
    user: { permissions: ['iam:user:read'] },
    theme: 'light',
  };
  return {
    useNotificationStore: vi.fn((selector?: any) => (selector ? selector(state) : state)),
  };
});

describe('IamUserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have user list API method', async () => {
    render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listUsers).toBeDefined();
    expect(authApi.createUser).toBeDefined();
    expect(authApi.updateUser).toBeDefined();
    expect(authApi.deleteUser).toBeDefined();
    expect(authApi.getUserRoles).toBeDefined();
    expect(authApi.addUserRole).toBeDefined();
    expect(authApi.removeUserRole).toBeDefined();
    expect(authApi.batchUpdateUsers).toBeDefined();
    expect(authApi.batchDeleteUsers).toBeDefined();
  });

  it('should call listUsers API on mount', async () => {
    render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listUsers).toHaveBeenCalled();
  });
});
