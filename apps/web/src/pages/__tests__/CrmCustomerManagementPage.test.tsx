import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CustomerManagementPage from '../crm/CustomerManagementPage';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      import: vi.fn(),
      export: vi.fn(),
    },
    contacts: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['crm:customer:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['crm:customer:read'] },
          theme: 'light',
        }
  ),
}));

describe('CustomerManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <CustomerManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have customer API methods defined', async () => {
    render(
      <BrowserRouter>
        <CustomerManagementPage />
      </BrowserRouter>
    );
    expect(crmApi.customers.list).toBeDefined();
    expect(crmApi.customers.get).toBeDefined();
    expect(crmApi.customers.create).toBeDefined();
    expect(crmApi.customers.update).toBeDefined();
    expect(crmApi.customers.delete).toBeDefined();
    expect(crmApi.customers.enable).toBeDefined();
    expect(crmApi.customers.disable).toBeDefined();
    expect(crmApi.customers.import).toBeDefined();
    expect(crmApi.customers.export).toBeDefined();
  });

  it('should call customer list API on mount', async () => {
    render(
      <BrowserRouter>
        <CustomerManagementPage />
      </BrowserRouter>
    );
    expect(crmApi.customers.list).toHaveBeenCalled();
  });
});
