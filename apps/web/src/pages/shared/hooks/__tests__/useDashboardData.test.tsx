import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';

vi.mock('@tanstack/react-query', () => ({
  QueryCache: class QueryCache {
    constructor(_options?: any) {}
    subscribe() {}
    clear() {}
  },
  MutationCache: class MutationCache {
    constructor(_options?: any) {}
    subscribe() {}
    clear() {}
  },
  QueryClient: class QueryClient {
    constructor(_options?: any) {}
    invalidateQueries() {}
    setQueryData() {}
    getQueryData() {}
  },
  useQuery: vi.fn().mockImplementation(({ queryKey }) => {
    const keyStr = JSON.stringify(queryKey);
    if (keyStr.includes('\"stats\"')) {
      return {
        data: {
          fileCount: 10,
          workflowCount: 5,
          docCount: 20,
          notificationCount: 3,
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    if (keyStr.includes('\"module-stats\"')) {
      return {
        data: {
          qms: { total: 100, active: 50 },
          ehs: { total: 20, active: 5 },
          srm: { total: 30, active: 25 },
          lims: { total: 40, active: 20 },
          rs: { total: 15, active: 8 },
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    if (keyStr.includes('\"chart-data\"')) {
      return {
        data: {
          moduleDistribution: [
            { name: 'Module A', value: 10, color: 'primary.main' },
            { name: 'Module B', value: 20, color: 'secondary.main' },
          ],
          monthlyTrend: [
            { name: 'Jan', value: 5 },
            { name: 'Feb', value: 15 },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    if (keyStr.includes('\"todos\"')) {
      return {
        data: {
          todos: [
            { id: '1', title: 'Task 1', source: 'doc', status: 'pending' },
            { id: '2', title: 'Task 2', source: 'workflow', status: 'completed' },
            { id: '3', title: 'Task 3', source: 'qms', status: 'read' },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    if (keyStr.includes('\"activities\"')) {
      return {
        data: [
          {
            id: 'act1',
            title: 'Document Created',
            type: 'shared.dashboard.type_document',
            time: 'shared.dashboard.just_now',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    return {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    };
  }),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', name: 'Test User' },
    isAuthenticated: true,
    hasPermission: vi.fn(() => true),
  })),
}));

vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(() => ({
    checkPermission: vi.fn(() => true),
  })),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/api/doc', () => ({
  docApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/api/workflow', () => ({
  workflowApi: {
    getStatistics: vi.fn(),
    getNotificationCount: vi.fn(),
  },
}));

vi.mock('@/api/qms', () => ({
  qmsApi: {
    getStatistics: vi.fn(),
  },
}));

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listHazards: vi.fn(),
  },
}));

vi.mock('@/api/srm', () => ({
  srmApi: {
    getStatistics: vi.fn(),
  },
}));

vi.mock('@/api/lims', () => ({
  limsApi: {
    getStatistics: vi.fn(),
  },
}));

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn(),
  },
}));

vi.mock('@/api/bi', () => ({
  biApi: {
    fetchSummaryDashboard: vi.fn(),
  },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    auditLogs: {
      list: vi.fn(),
    },
  },
}));

vi.mock('@/api/bff', () => ({
  getDashboard: vi.fn(),
  completeTodoGql: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  User: () => null,
  FileText: () => null,
  GitBranch: () => null,
  Folder: () => null,
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current).toBeDefined();
  });

  it('should return correct default state - stats', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.fileCount).toBe(10);
    expect(result.current.stats.workflowCount).toBe(5);
    expect(result.current.stats.docCount).toBe(20);
    expect(result.current.stats.notificationCount).toBe(3);
  });

  it('should return correct default state - moduleStats', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.moduleStats).toBeDefined();
    expect(result.current.moduleStats.qms).toEqual({ total: 100, active: 50 });
    expect(result.current.moduleStats.ehs).toEqual({ total: 20, active: 5 });
    expect(result.current.moduleStats.srm).toEqual({ total: 30, active: 25 });
    expect(result.current.moduleStats.lims).toEqual({ total: 40, active: 20 });
    expect(result.current.moduleStats.rs).toEqual({ total: 15, active: 8 });
  });

  it('should return correct default state - chartData', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.chartData).toBeDefined();
    expect(result.current.chartData.moduleDistribution).toHaveLength(2);
    expect(result.current.chartData.monthlyTrend).toHaveLength(2);
  });

  it('should return correct todos and derived state', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.todos).toHaveLength(3);
    expect(result.current.pendingTodos).toHaveLength(1);
    expect(result.current.completedTodos).toHaveLength(2);
    expect(result.current.todos[0].done).toBe(false);
    expect(result.current.todos[1].done).toBe(true);
  });

  it('should return correct recentActivities', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.recentActivities).toHaveLength(1);
    expect(result.current.recentActivities[0].id).toBe('act1');
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should return auth context', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.hasPermission).toBe('function');
    expect(typeof result.current.checkPermission).toBe('function');
  });

  it('should contain getGreeting function and be callable', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(typeof result.current.getGreeting).toBe('function');
    const greeting = result.current.getGreeting();
    expect(typeof greeting).toBe('string');
    expect([
      'shared.dashboard.welcome_morning',
      'shared.dashboard.welcome_afternoon',
      'shared.dashboard.welcome_evening',
    ]).toContain(greeting);
  });

  it('should contain handleTodoToggle function and be callable', async () => {
    const { result } = renderHook(() => useDashboardData());
    expect(typeof result.current.handleTodoToggle).toBe('function');
    await expect(result.current.handleTodoToggle('todo-1')).resolves.not.toThrow();
  });

  it('should return query objects', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.statsQuery).toBeDefined();
    expect(result.current.moduleStatsQuery).toBeDefined();
    expect(result.current.chartDataQuery).toBeDefined();
    expect(result.current.bffDashboardQuery).toBeDefined();
    expect(result.current.activitiesQuery).toBeDefined();
  });
});
