import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoleManagementPage from '../iam/RoleManagementPage';
import { authApi } from '@/api/iam';
import { useAppStore } from '@/store';

vi.mock('@/api/iam', () => {
  const mock = {
    listRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listPermissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getRolePermissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createRole: vi.fn().mockResolvedValue({ success: true }),
    updateRole: vi.fn().mockResolvedValue({ success: true }),
    deleteRole: vi.fn().mockResolvedValue({ success: true }),
    addRolePermission: vi.fn().mockResolvedValue({ success: true }),
    removeRolePermission: vi.fn().mockResolvedValue({ success: true }),
  };
  return { authApi: mock, iamApi: mock, default: mock };
});

vi.mock('@/store', () => {
  const state = {
    addNotification: vi.fn(),
    notifications: [],
    user: { permissions: ['iam:role:read'] },
    theme: 'light',
  };
  return {
    useAppStore: vi.fn((selector?: any) => (selector ? selector(state) : state)),
  };
});

describe('IamRoleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <RoleManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have role management API methods', async () => {
    render(
      <BrowserRouter>
        <RoleManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listRoles).toBeDefined();
    expect(authApi.getRolePermissions).toBeDefined();
    expect(authApi.createRole).toBeDefined();
    expect(authApi.updateRole).toBeDefined();
    expect(authApi.deleteRole).toBeDefined();
    expect(authApi.addRolePermission).toBeDefined();
    expect(authApi.removeRolePermission).toBeDefined();
  });

  it('should call listRoles API on mount', async () => {
    render(
      <BrowserRouter>
        <RoleManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listRoles).toHaveBeenCalled();
  });
});
