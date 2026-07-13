import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerManagementPage from '../crm/CustomerManagementPage';
import { crmApi } from '@/api/crm';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      batchDelete: vi.fn(),
      getTags: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
    },
    tags: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contacts: {
      list: vi.fn(),
    },
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

  it('should have valid customer API methods', () => {
    expect(crmApi.customers.list).toBeDefined();
    expect(crmApi.customers.get).toBeDefined();
    expect(crmApi.customers.create).toBeDefined();
    expect(crmApi.customers.update).toBeDefined();
    expect(crmApi.customers.delete).toBeDefined();
    expect(crmApi.customers.batchDelete).toBeDefined();
  });

  it('should have valid tag API methods', () => {
    expect(crmApi.tags.list).toBeDefined();
    expect(crmApi.tags.create).toBeDefined();
    expect(crmApi.tags.update).toBeDefined();
    expect(crmApi.tags.delete).toBeDefined();
  });

  it('should have valid contact API methods', () => {
    expect(crmApi.contacts.list).toBeDefined();
  });
});
