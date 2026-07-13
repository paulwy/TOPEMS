import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PurchaseOrderPage from '../erp/PurchaseOrderPage';
import ProductionOrderManagementPage from '../mes/ProductionOrderManagementPage';
import FinancePaymentPage from '../finance/FinancePaymentPage';
import QualityInspectionPage from '../mes/QualityInspectionPage';
import { erpApi } from '@/api/erp';
import { mesApi } from '@/api/mes';
import { financeApi } from '@/api/finance';
import { qualityApi } from '@/api/mes/quality';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/erp', () => ({
  erpApi: {
    purchaseOrders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { orders: [], total: 0 } }),
      approve: vi.fn().mockResolvedValue({ success: true }),
      cancel: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

vi.mock('@/api/mes', () => ({
  mesApi: {
    orders: {
      list: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      release: vi.fn().mockResolvedValue({ success: true }),
      start: vi.fn().mockResolvedValue({ success: true }),
      complete: vi.fn().mockResolvedValue({ success: true }),
      cancel: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

vi.mock('@/api/mes/quality', () => ({
  qualityApi: {
    listInspections: vi.fn().mockResolvedValue({ success: true, data: { inspections: [], total: 0 } }),
  },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    payments: {
      list: vi.fn().mockResolvedValue({ success: true, data: [] }),
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Batch Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ERP PurchaseOrderPage', () => {
    it('should render without crashing', async () => {
      const { container } = renderWithProviders(<PurchaseOrderPage />);
      expect(container).toBeTruthy();
    });
  });

  describe('MES ProductionOrderManagementPage', () => {
    it('should render without crashing', async () => {
      const { container } = renderWithProviders(<ProductionOrderManagementPage />);
      expect(container).toBeTruthy();
    });
  });

  describe('Finance FinancePaymentPage', () => {
    it('should render without crashing', async () => {
      const { container } = renderWithProviders(<FinancePaymentPage />);
      expect(container).toBeTruthy();
    });
  });

  describe('QMS QualityInspectionPage', () => {
    it('should render without crashing', async () => {
      const { container } = renderWithProviders(<QualityInspectionPage />);
      expect(container).toBeTruthy();
    });
  });
});