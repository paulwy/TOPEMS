import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useQmsDashboardSchema } from '../../qms/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

// Mock QMS API
vi.mock('@/api/qms', () => ({
  qualityDashboardApi: {
    getQualityOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalStandards: 50,
        totalInspections: 200,
        totalIssues: 15,
        totalActions: 8,
        passRate: 96.5,
        defectRate: 3.5,
        onTimeDeliveryRate: 98.0,
        customerComplaintCount: 3,
        qualityCostTotal: 120000,
        qualityCostRatio: 2.5,
        spcChartCount: 12,
        fmeaCount: 6,
        eightdCount: 4,
        auditPlanCount: 3,
        trendData: [
          { date: '2024-01', passRate: 95.0, defectCount: 5, issueCount: 2 },
          { date: '2024-02', passRate: 96.0, defectCount: 4, issueCount: 1 },
          { date: '2024-03', passRate: 97.0, defectCount: 3, issueCount: 2 },
          { date: '2024-04', passRate: 96.5, defectCount: 3, issueCount: 1 },
        ],
        topIssues: [
          { category: '尺寸偏差', count: 8, percentage: 53.3 },
          { category: '表面缺陷', count: 4, percentage: 26.7 },
          { category: '材料问题', count: 3, percentage: 20.0 },
        ],
        departmentPerformance: [
          { department: '装配车间', passRate: 98.0, issueCount: 2 },
          { department: '机加工车间', passRate: 95.0, issueCount: 5 },
          { department: '质检部', passRate: 99.0, issueCount: 1 },
        ],
      },
    }),
  },
}));

describe('useQmsDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('pass-rate');
    expect(ids).toContain('total-inspections');
    expect(ids).toContain('open-issues');
    expect(ids).toContain('customer-complaints');
  });

  it('should return statCards with correct icons and colors', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const passRateCard = result.current.statCards.find((c) => c.id === 'pass-rate');
    expect(passRateCard?.icon).toBe('CheckCircle');
    expect(passRateCard?.color).toBe('success');

    const complaintCard = result.current.statCards.find((c) => c.id === 'customer-complaints');
    expect(complaintCard?.icon).toBe('Users');
    expect(complaintCard?.color).toBe('error');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('quality-trend');
    expect(ids).toContain('issue-type-distribution');
    expect(ids).toContain('inspection-pass-rate');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('line');
    expect(types).toContain('pie');
    expect(types).toContain('bar');
  });

  it('should show placeholder values before loader is called', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const passRateCard = result.current.statCards.find((c) => c.id === 'pass-rate');
    expect(passRateCard?.value()).toBe('-');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and return expected structure', async () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct stat card values after loader is called', async () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    await result.current.loader();
    const passRateCard = result.current.statCards.find((c) => c.id === 'pass-rate');
    expect(passRateCard).toBeDefined();
    expect(passRateCard?.value()).toBe('96.5%');

    const inspectionsCard = result.current.statCards.find((c) => c.id === 'total-inspections');
    expect(inspectionsCard?.value()).toBe('200');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useQmsDashboardSchema());
    await result.current.loader();
    const trendChart = result.current.charts.find((c) => c.id === 'quality-trend');
    expect(trendChart).toBeDefined();
    const data = trendChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(4);
    expect(data?.[0]).toEqual({ name: '2024-01', value: 95.0 });

    const pieChart = result.current.charts.find((c) => c.id === 'issue-type-distribution');
    const pieData = pieChart?.data();
    expect(pieData).toBeDefined();
    expect(pieData).toHaveLength(3);
  });
});
