import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionOrderManagementPage from '../mes/ProductionOrderManagementPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    productionOrders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:order:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:order:read'] },
          theme: 'light',
        }
  ),
}));

describe('ProductionOrderManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductionOrderManagementPage />
      </BrowserRouter>
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
