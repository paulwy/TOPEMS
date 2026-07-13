import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantManagementPage from '../admin/TenantManagementPage';
import { tenantApi } from '@/api/tenant';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/tenant', () => ({
  tenantApi: {
    listTenants: vi
      .fn()
      .mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
    suspendTenant: vi.fn(),
    activateTenant: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
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
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('AdminTenantManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <TenantManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have tenant management API methods', async () => {
    render(
      <BrowserRouter>
        <TenantManagementPage />
      </BrowserRouter>
    );
    expect(tenantApi.listTenants).toBeDefined();
    expect(tenantApi.createTenant).toBeDefined();
    expect(tenantApi.updateTenant).toBeDefined();
    expect(tenantApi.deleteTenant).toBeDefined();
    expect(tenantApi.suspendTenant).toBeDefined();
    expect(tenantApi.activateTenant).toBeDefined();
  });

  it('should call tenant list API on mount', async () => {
    render(
      <BrowserRouter>
        <TenantManagementPage />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(tenantApi.listTenants).toHaveBeenCalled();
    });
  });
});
