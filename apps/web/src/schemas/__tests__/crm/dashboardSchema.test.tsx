import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCrmDashboardSchema } from '../../crm/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock CRM dashboard API
vi.mock('@/api/crm/dashboard', () => ({
  crmDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_opportunities: 50,
        won_amount: 100000,
        conversion_rate: 25,
        average_cycle: 30,
        opportunity_stages: [
          { name: 'Lead', value: 10 },
          { name: 'Qualified', value: 20 },
        ],
        monthly_performance: [
          { name: 'Jan', value: 5 },
          { name: 'Feb', value: 10 },
        ],
        industries: [
          { name: 'Manufacturing', value: 15 },
          { name: 'Retail', value: 10 },
        ],
      },
    }),
  },
}));

describe('useCrmDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('total-opportunities');
    expect(ids).toContain('won-amount');
    expect(ids).toContain('conversion-rate');
    expect(ids).toContain('average-cycle');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('opportunity-stage-distribution');
    expect(ids).toContain('monthly-performance');
    expect(ids).toContain('industry-distribution');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('line');
    expect(types).toContain('pie');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    await result.current.loader();
    const totalOpportunitiesCard = result.current.statCards.find(
      (card) => card.id === 'total-opportunities'
    );
    expect(totalOpportunitiesCard).toBeDefined();
    expect(totalOpportunitiesCard?.value()).toBe('50');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useCrmDashboardSchema());
    await result.current.loader();
    const opportunityStageChart = result.current.charts.find(
      (chart) => chart.id === 'opportunity-stage-distribution'
    );
    expect(opportunityStageChart).toBeDefined();
    const data = opportunityStageChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
