import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useHrmDashboardSchema } from '../../hrm/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock HRM dashboard API
vi.mock('@/api/hrm/dashboard', () => ({
  hrmDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_employees: 200,
        new_hires: 10,
        on_leave: 5,
        avg_salary: 8000,
        department_distribution: [
          { name: 'Engineering', value: 50 },
          { name: 'Sales', value: 30 },
        ],
        hire_trend: [
          { name: 'Jan', value: 5 },
          { name: 'Feb', value: 8 },
        ],
        education_distribution: [
          { name: 'Bachelor', value: 100 },
          { name: 'Master', value: 50 },
        ],
      },
    }),
  },
}));

describe('useHrmDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('total-employees');
    expect(ids).toContain('new-hires');
    expect(ids).toContain('on-leave');
    expect(ids).toContain('avg-salary');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('department-distribution');
    expect(ids).toContain('hire-trend');
    expect(ids).toContain('education-distribution');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('line');
    expect(types).toContain('pie');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    await result.current.loader();
    const totalEmployeesCard = result.current.statCards.find(
      (card) => card.id === 'total-employees'
    );
    expect(totalEmployeesCard).toBeDefined();
    expect(totalEmployeesCard?.value()).toBe('200');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => useHrmDashboardSchema());
    await result.current.loader();
    const departmentChart = result.current.charts.find(
      (chart) => chart.id === 'department-distribution'
    );
    expect(departmentChart).toBeDefined();
    const data = departmentChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
