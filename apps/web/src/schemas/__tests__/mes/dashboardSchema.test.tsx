import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useMesDashboardSchema } from '../../mes/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

describe('useMesDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('today-output');
    expect(ids).toContain('equipment-availability');
    expect(ids).toContain('yield-rate');
    expect(ids).toContain('pending-work-orders');
  });

  it('should return statCards with correct icons and colors', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const outputCard = result.current.statCards.find((c) => c.id === 'today-output');
    expect(outputCard?.icon).toBe('Activity');
    expect(outputCard?.color).toBe('primary');

    const yieldCard = result.current.statCards.find((c) => c.id === 'yield-rate');
    expect(yieldCard?.icon).toBe('CheckCircle');
    expect(yieldCard?.color).toBe('success');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('production-trend');
    expect(ids).toContain('equipment-status');
    expect(ids).toContain('yield-trend');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('pie');
    expect(types).toContain('line');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and return expected structure', async () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
    expect(loaderResult.table).toBeUndefined();
  });

  it('should show placeholder values before loader', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const outputCard = result.current.statCards.find((c) => c.id === 'today-output');
    expect(outputCard?.value()).toBe('-');
  });

  it('should return chart data as empty array when no stats loaded', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    const trendChart = result.current.charts.find((c) => c.id === 'production-trend');
    expect(trendChart?.data()).toEqual([]);
  });

  it('should have correct chart heights', () => {
    const { result } = renderHook(() => useMesDashboardSchema());
    result.current.charts.forEach((chart) => {
      expect(chart.height).toBe(300);
    });
  });
});
