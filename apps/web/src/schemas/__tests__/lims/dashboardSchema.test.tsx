import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useLimsDashboardSchema } from '../../lims/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock LIMS dashboard API
vi.mock('@/api/lims/dashboard', () => ({
  limsDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        pending_samples: 15,
        in_progress_tasks: 8,
        instrument_usage: 75,
        pass_rate: 92,
        test_items: [
          { name: 'Chemical', value: 10 },
          { name: 'Physical', value: 5 },
        ],
        task_completion: [
          { name: 'Jan', value: 80 },
          { name: 'Feb', value: 85 },
        ],
        instrument_status: [
          { name: 'Running', value: 5 },
          { name: 'Maintenance', value: 2 },
        ],
      },
    }),
  },
}));

describe('useLimsDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('pending-samples');
    expect(ids).toContain('in-progress-tasks');
    expect(ids).toContain('instrument-usage');
    expect(ids).toContain('pass-rate');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('test-item-distribution');
    expect(ids).toContain('task-completion-rate');
    expect(ids).toContain('instrument-status');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('line');
    expect(types).toContain('pie');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    await result.current.loader();
    const pendingSamplesCard = result.current.statCards.find(
      (card) => card.id === 'pending-samples'
    );
    expect(pendingSamplesCard).toBeDefined();
    expect(pendingSamplesCard?.value()).toBe('15');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useLimsDashboardSchema());
    await result.current.loader();
    const testItemChart = result.current.charts.find(
      (chart) => chart.id === 'test-item-distribution'
    );
    expect(testItemChart).toBeDefined();
    const data = testItemChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
