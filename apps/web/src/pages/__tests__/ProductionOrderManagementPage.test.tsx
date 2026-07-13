import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionOrderManagementPage from '../mes/ProductionOrderManagementPage';
import { mesApi } from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/mes', () => ({
  mesApi: {
    productionOrders: {
      list: vi
        .fn()
        .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
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

describe('ProductionOrderManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProductionOrderManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });

  it('should have production order API methods defined', () => {
    expect(mesApi.productionOrders.list).toBeDefined();
    expect(mesApi.productionOrders.create).toBeDefined();
    expect(mesApi.productionOrders.get).toBeDefined();
    expect(mesApi.productionOrders.update).toBeDefined();
  });
});
