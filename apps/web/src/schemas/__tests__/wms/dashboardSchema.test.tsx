import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useWmsDashboardSchema } from '../../wms/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock WMS dashboard API
vi.mock('@/api/wms/dashboard', () => ({
  wmsDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_inventory: 1000,
        pending_inbound: 50,
        pending_outbound: 30,
        location_utilization: 85,
        inbound_trend: [
          { name: 'Jan', value: 100 },
          { name: 'Feb', value: 150 },
        ],
        inventory_categories: [
          { name: 'Raw Material', value: 400 },
          { name: 'Finished Goods', value: 600 },
        ],
        outbound_trend: [
          { name: 'Jan', value: 80 },
          { name: 'Feb', value: 120 },
        ],
      },
    }),
  },
}));

describe('useWmsDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('total-inventory');
    expect(ids).toContain('pending-inbound');
    expect(ids).toContain('pending-outbound');
    expect(ids).toContain('location-utilization');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('inbound-trend');
    expect(ids).toContain('inventory-category');
    expect(ids).toContain('outbound-trend');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('pie');
    expect(types).toContain('line');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    await result.current.loader();
    const totalInventoryCard = result.current.statCards.find(
      (card) => card.id === 'total-inventory'
    );
    expect(totalInventoryCard).toBeDefined();
    expect(totalInventoryCard?.value()).toBe('1,000');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useWmsDashboardSchema());
    await result.current.loader();
    const inboundTrendChart = result.current.charts.find((chart) => chart.id === 'inbound-trend');
    expect(inboundTrendChart).toBeDefined();
    const data = inboundTrendChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
