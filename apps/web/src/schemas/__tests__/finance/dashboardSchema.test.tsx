import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useFinanceDashboardSchema } from '../../finance/dashboardSchema';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Mock finance API
vi.mock('@/api/finance', () => ({
  financeApi: {
    getDashboard: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_vouchers: 100,
        draft_vouchers: 20,
        submitted_vouchers: 30,
        approved_vouchers: 40,
        posted_vouchers: 10,
        total_receivables: 50000,
        overdue_receivables: 5000,
        total_payables: 30000,
        overdue_payables: 3000,
        pending_approvals: 15,
        pending_payments: 25,
        total_payments: 45,
      },
    }),
  },
}));

describe('useFinanceDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(6);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('voucher-total');
    expect(ids).toContain('voucher-draft');
    expect(ids).toContain('receivable');
    expect(ids).toContain('payable');
    expect(ids).toContain('pending-approvals');
    expect(ids).toContain('pending-payments');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('voucher-trend');
    expect(ids).toContain('receivable-payable');
    expect(ids).toContain('expense-category');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('line');
    expect(types).toContain('pie');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    await result.current.loader();
    // After loader is called, stats should be set
    const voucherTotalCard = result.current.statCards.find((card) => card.id === 'voucher-total');
    expect(voucherTotalCard).toBeDefined();
    expect(voucherTotalCard?.value()).toBe('100');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useFinanceDashboardSchema());
    await result.current.loader();
    // After loader is called, chart data should be populated
    const voucherTrendChart = result.current.charts.find((chart) => chart.id === 'voucher-trend');
    expect(voucherTrendChart).toBeDefined();
    const data = voucherTrendChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(4);
  });
});
