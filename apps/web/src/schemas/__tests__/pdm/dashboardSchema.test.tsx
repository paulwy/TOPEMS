import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { usePdmDashboardSchema } from '../../pdm/dashboardSchema';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock PDM dashboard API
vi.mock('@/api/pdm/dashboard', () => ({
  pdmDashboardApi: {
    getOverview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        ongoing_projects: 12,
        pending_reviews: 8,
        bom_changes: 5,
        completion_rate: 75,
        project_distribution: [
          { name: 'Mechanical', value: 5 },
          { name: 'Electrical', value: 4 },
        ],
        document_types: [
          { name: 'Drawing', value: 20 },
          { name: 'Spec', value: 10 },
        ],
        change_trend: [
          { name: 'Jan', value: 3 },
          { name: 'Feb', value: 5 },
        ],
      },
    }),
  },
}));

describe('usePdmDashboardSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    expect(result.current).toBeDefined();
  });

  it('should return correct title', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    expect(result.current.title).toBeDefined();
    expect(typeof result.current.title).toBe('string');
  });

  it('should return statCards with correct count', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    expect(result.current.statCards).toBeDefined();
    expect(result.current.statCards).toHaveLength(4);
  });

  it('should return statCards with correct ids', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    const ids = result.current.statCards.map((card) => card.id);
    expect(ids).toContain('ongoing-projects');
    expect(ids).toContain('pending-reviews');
    expect(ids).toContain('bom-changes');
    expect(ids).toContain('completion-rate');
  });

  it('should return charts with correct count', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    expect(result.current.charts).toBeDefined();
    expect(result.current.charts).toHaveLength(3);
  });

  it('should return charts with correct ids', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    const ids = result.current.charts.map((chart) => chart.id);
    expect(ids).toContain('project-distribution');
    expect(ids).toContain('document-types');
    expect(ids).toContain('change-trend');
  });

  it('should return charts with correct types', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    const types = result.current.charts.map((chart) => chart.type);
    expect(types).toContain('bar');
    expect(types).toContain('pie');
    expect(types).toContain('line');
  });

  it('should have loader function', () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    expect(result.current.loader).toBeDefined();
    expect(typeof result.current.loader).toBe('function');
  });

  it('should call loader and update stats', async () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    const loaderResult = await result.current.loader();
    expect(loaderResult).toBeDefined();
    expect(loaderResult.statCards).toBeUndefined();
    expect(loaderResult.charts).toBeUndefined();
  });

  it('should return correct values after loader is called', async () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    await result.current.loader();
    const ongoingProjectsCard = result.current.statCards.find(
      (card) => card.id === 'ongoing-projects'
    );
    expect(ongoingProjectsCard).toBeDefined();
    expect(ongoingProjectsCard?.value()).toBe('12');
  });

  it('should return correct chart data after loader is called', async () => {
    const { result } = renderHook(() => usePdmDashboardSchema());
    await result.current.loader();
    const projectChart = result.current.charts.find((chart) => chart.id === 'project-distribution');
    expect(projectChart).toBeDefined();
    const data = projectChart?.data();
    expect(data).toBeDefined();
    expect(data).toHaveLength(2);
  });
});
