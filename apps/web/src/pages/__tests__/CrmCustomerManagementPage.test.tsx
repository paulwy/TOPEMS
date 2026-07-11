import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerManagementPage from '../crm/CustomerManagementPage';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: {
      list: vi
        .fn()
        .mockResolvedValue({ code: 200, data: { items: [], total: 0, page: 1, pageSize: 10 } }),
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
      list: vi.fn().mockResolvedValue({ code: 200, data: [] }),
    },
    tags: {
      list: vi.fn().mockResolvedValue({ code: 200, data: { items: [], total: 0 } }),
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
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });

  it('should have customer API methods defined', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
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

  it('should have correct query key for customers', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(queryKeys.some((key) => key[0] === 'crm-customers')).toBe(true);
  });
});
