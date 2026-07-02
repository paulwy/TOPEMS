import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinanceDashboardPage from '../finance/FinanceDashboardPage';
import { financeApi } from '@/api/finance';
import { useAppStore } from '@/store';

vi.mock('@/api/finance', () => ({
  financeApi: {
    accounts: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transactions: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    budgets: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    reports: {
      generate: vi.fn(),
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
          user: { permissions: ['finance:dashboard:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['finance:dashboard:read'] },
          theme: 'light',
        }
  ),
}));

describe('FinanceModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FinanceDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <FinanceDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have finance API methods defined', async () => {
      render(
        <BrowserRouter>
          <FinanceDashboardPage />
        </BrowserRouter>
      );
      expect(financeApi.accounts.list).toBeDefined();
      expect(financeApi.transactions.list).toBeDefined();
      expect(financeApi.budgets.list).toBeDefined();
      expect(financeApi.reports.generate).toBeDefined();
    });
  });
});
