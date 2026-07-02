import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FinanceDashboardPage from '../finance/FinanceDashboardPage';
import { financeApi } from '@/api/finance';
import { useAppStore } from '@/store';

vi.mock('@/api/finance', () => ({
  financeApi: {
    account: {
      list: vi.fn(),
    },
    voucher: {
      list: vi.fn(),
    },
    receivablePayable: {
      list: vi.fn(),
    },
    report: {
      getOverview: vi.fn(),
      getTrend: vi.fn(),
    },
    period: {
      getCurrent: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: null,
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: null,
          theme: 'light',
        }
  ),
}));

describe('FinanceDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <FinanceDashboardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have valid finance API methods', () => {
    expect(financeApi.account.list).toBeDefined();
    expect(financeApi.voucher.list).toBeDefined();
    expect(financeApi.receivablePayable.list).toBeDefined();
    expect(financeApi.report.getOverview).toBeDefined();
    expect(financeApi.report.getTrend).toBeDefined();
    expect(financeApi.period.getCurrent).toBeDefined();
  });
});
