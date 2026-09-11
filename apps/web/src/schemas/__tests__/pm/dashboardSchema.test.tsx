import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { usePmDashboardSchema } from '../../pm/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

// Mock PM dashboard API
vi.mock('@/api/pm/dashboard', () => ({
  dashboardApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_projects: 120,
        draft_projects: 15,
        pending_projects: 10,
        active_projects: 60,
        completed_projects: 30,
        cancelled_projects: 5,
        total_contracts: 45,
        pending_contracts: 8,
        active_contracts: 25,
        completed_contracts: 12,
        total_budget: 5000000,
        spent_budget: 3200000,
        budget_usage_rate: 64.0,
        total_risks: 18,
        open_risks: 7,
        closed_risks: 11,
        total_tasks: 200,
        pending_tasks: 50,
        in_progress_tasks: 80,
        completed_tasks: 70,
        delayed_projects: 8,
        average_progress: 72.5,
      },
    }),
  },
}));

describe('usePmDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('total-projects');
    expect(ids).toContain('active-projects');
    expect(ids).toContain('completed-projects');
    expect(ids).toContain('delayed-projects');
  });

  it('should return statCards with correct icons and colors', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const totalCard = result.current.statCards.find((c) => c.id === 'total-projects');
    expect(totalCard?.icon).toBe('ClipboardList');
    expect(totalCard?.color).toBe('primary');

    const delayedCard = result.current.statCards.find((c) => c.id === 'delayed-projects');
    expect(delayedCard?.icon).toBe('AlertCircle');
    expect(delayedCard?.color).toBe('error');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(2);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('project-status-distribution');
    expect(ids).toContain('monthly-completion-rate');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('line');
  });

  it('should show placeholder values before loader is called', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const totalCard = result.current.statCards.find((c) => c.id === 'total-projects');
    expect(totalCard?.value()).toBe('-');
  });

  it('should return empty chart data before loader is called', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const barChart = result.current.charts.find((c) => c.id === 'project-status-distribution');
    expect(barChart?.data()).toEqual([]);
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and return expected structure', async () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct stat card values after loader is called', async () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    await result.current.loader();
    const totalCard = result.current.statCards.find((c) => c.id === 'total-projects');
    expect(totalCard).toBeDefined();
    expect(totalCard?.value()).toBe('120');

    const activeCard = result.current.statCards.find((c) => c.id === 'active-projects');
    expect(activeCard?.value()).toBe('60');

    const delayedCard = result.current.statCards.find((c) => c.id === 'delayed-projects');
    expect(delayedCard?.value()).toBe('8');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => usePmDashboardSchema());
    await result.current.loader();
    const barChart = result.current.charts.find((c) => c.id === 'project-status-distribution');
    expect(barChart).toBeDefined();
    const data = barChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(5);

    const lineChart = result.current.charts.find((c) => c.id === 'monthly-completion-rate');
    const lineData = lineChart?.data();
    expect(lineData).toBeDefined();
    expect(lineData).toHaveLength(2);
  });
});
