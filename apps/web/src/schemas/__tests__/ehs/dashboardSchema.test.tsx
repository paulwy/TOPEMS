import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useEhsDashboardSchema } from '../../ehs/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock EHS dashboard API
vi.mock('@/api/ehs/dashboard', () => ({
  ehsDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_accidents: 5,
        pending_hazards: 10,
        training_rate: 85,
        drill_count: 3,
        accident_trend: [
          { name: 'Jan', value: 1 },
          { name: 'Feb', value: 2 },
        ],
        hazard_types: [
          { name: 'Chemical', value: 5 },
          { name: 'Physical', value: 3 },
        ],
        training_trend: [
          { name: 'Jan', value: 80 },
          { name: 'Feb', value: 85 },
        ],
      },
    }),
  },
}));

describe('useEhsDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('accident-total');
    expect(ids).toContain('pending-hazards');
    expect(ids).toContain('training-rate');
    expect(ids).toContain('drill-count');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('accident-trend');
    expect(ids).toContain('hazard-type-distribution');
    expect(ids).toContain('training-completion-rate');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('pie');
    expect(types).toContain('line');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    await result.current.loader();
    const accidentTotalCard = result.current.statCards.find((card) => card.id === 'accident-total');
    expect(accidentTotalCard).toBeDefined();
    expect(accidentTotalCard?.value()).toBe('5');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useEhsDashboardSchema());
    await result.current.loader();
    const accidentTrendChart = result.current.charts.find((chart) => chart.id === 'accident-trend');
    expect(accidentTrendChart).toBeDefined();
    const data = accidentTrendChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
