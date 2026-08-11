import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockPmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { pm: mockPmClient },
    default: { pm: mockPmClient },
  };
});

describe('PM Statistics API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pmStatisticsApi', () => {
    it('getStatistics should call GET /statistics without params', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_projects: 10,
        draft_projects: 1,
        pending_projects: 2,
        active_projects: 5,
        completed_projects: 2,
        cancelled_projects: 0,
        total_contracts: 8,
        pending_contracts: 1,
        active_contracts: 3,
        completed_contracts: 4,
        total_budget: 1000000,
        spent_budget: 450000,
        budget_usage_rate: 45.0,
        total_risks: 15,
        open_risks: 5,
        closed_risks: 10,
        total_tasks: 200,
        pending_tasks: 30,
        in_progress_tasks: 70,
        completed_tasks: 100,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics', { params: undefined });
      expect(result.data).toEqual(mockData);
    });

    it('getStatistics should call GET /statistics with date range params', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_projects: 5,
        draft_projects: 0,
        pending_projects: 1,
        active_projects: 3,
        completed_projects: 1,
        cancelled_projects: 0,
        total_contracts: 4,
        pending_contracts: 0,
        active_contracts: 2,
        completed_contracts: 2,
        total_budget: 500000,
        spent_budget: 200000,
        budget_usage_rate: 40.0,
        total_risks: 8,
        open_risks: 3,
        closed_risks: 5,
        total_tasks: 100,
        pending_tasks: 15,
        in_progress_tasks: 35,
        completed_tasks: 50,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      await pmStatisticsApi.getStatistics({ start_date: '2026-01-01', end_date: '2026-06-30' });
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics', {
        params: { start_date: '2026-01-01', end_date: '2026-06-30' },
      });
    });

    it('getStatistics should handle empty response gracefully', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const emptyData = {
        total_projects: 0,
        draft_projects: 0,
        pending_projects: 0,
        active_projects: 0,
        completed_projects: 0,
        cancelled_projects: 0,
        total_contracts: 0,
        pending_contracts: 0,
        active_contracts: 0,
        completed_contracts: 0,
        total_budget: 0,
        spent_budget: 0,
        budget_usage_rate: 0,
        total_risks: 0,
        open_risks: 0,
        closed_risks: 0,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: emptyData });

      const result = await pmStatisticsApi.getStatistics();
      expect(result.data.total_projects).toBe(0);
      expect(result.data.active_projects).toBe(0);
      expect(result.data.total_budget).toBe(0);
    });

    it('getStatistics should be importable as default', async () => {
      const pmStatisticsModule = await import('../pm/statistics');
      expect(pmStatisticsModule.pmStatisticsApi).toBeDefined();
      expect(pmStatisticsModule.default).toBeDefined();
      expect(pmStatisticsModule.default).toBe(pmStatisticsModule.pmStatisticsApi);
    });

    it('getStatistics response should match PmStatistics type shape', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_projects: 100,
        draft_projects: 10,
        pending_projects: 15,
        active_projects: 50,
        completed_projects: 20,
        cancelled_projects: 5,
        total_contracts: 80,
        pending_contracts: 10,
        active_contracts: 30,
        completed_contracts: 40,
        total_budget: 5000000,
        spent_budget: 2250000,
        budget_usage_rate: 45.0,
        total_risks: 50,
        open_risks: 20,
        closed_risks: 30,
        total_tasks: 1000,
        pending_tasks: 150,
        in_progress_tasks: 350,
        completed_tasks: 500,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getStatistics();
      expect(result.data.total_projects).toBe(100);
      expect(result.data.draft_projects).toBe(10);
      expect(result.data.pending_projects).toBe(15);
      expect(result.data.active_projects).toBe(50);
      expect(result.data.completed_projects).toBe(20);
      expect(result.data.cancelled_projects).toBe(5);
      expect(result.data.total_contracts).toBe(80);
      expect(result.data.total_risks).toBe(50);
      expect(result.data.open_risks).toBe(20);
      expect(result.data.closed_risks).toBe(30);
      expect(result.data.total_tasks).toBe(1000);
      expect(result.data.in_progress_tasks).toBe(350);
      expect(result.data.completed_tasks).toBe(500);
    });

    // ===== 项目统计 =====

    it('getProjectStatistics should call GET /statistics/projects', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_projects: 50,
        by_status: [
          { status: 'active', count: 30 },
          { status: 'completed', count: 15 },
          { status: 'draft', count: 5 },
        ],
        by_type: [
          { type: 'internal', count: 20 },
          { type: 'external', count: 30 },
        ],
        by_leader: [
          { leader: 'user-1', count: 15 },
          { leader: 'user-2', count: 10 },
        ],
        average_progress: 65.5,
        on_time_rate: 80.0,
        high_risk_count: 5,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getProjectStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/projects', { params: undefined });
      expect(result.data.total_projects).toBe(50);
      expect(result.data.by_status).toHaveLength(3);
      expect(result.data.by_type).toHaveLength(2);
      expect(result.data.average_progress).toBe(65.5);
      expect(result.data.on_time_rate).toBe(80.0);
      expect(result.data.high_risk_count).toBe(5);
    });

    it('getProjectStatistics should accept query params', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: { total_projects: 10, by_status: [], by_type: [], by_leader: [], average_progress: 0, on_time_rate: 0, high_risk_count: 0 } });

      await pmStatisticsApi.getProjectStatistics({ start_date: '2026-01-01', end_date: '2026-12-31' });
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/projects', {
        params: { start_date: '2026-01-01', end_date: '2026-12-31' },
      });
    });

    // ===== 合同统计 =====

    it('getContractStatistics should call GET /statistics/contracts', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_contracts: 30,
        by_status: [
          { status: 'active', count: 15 },
          { status: 'completed', count: 10 },
          { status: 'pending', count: 5 },
        ],
        by_type: [
          { type: 'fixed_price', count: 20 },
          { type: 'time_material', count: 10 },
        ],
        total_amount: 5000000,
        avg_amount: 166666.67,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getContractStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/contracts', { params: undefined });
      expect(result.data.total_contracts).toBe(30);
      expect(result.data.by_status).toHaveLength(3);
      expect(result.data.by_type).toHaveLength(2);
      expect(result.data.total_amount).toBe(5000000);
      expect(result.data.avg_amount).toBe(166666.67);
    });

    // ===== 预算统计 =====

    it('getBudgetStatistics should call GET /statistics/budget', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_budget: 1000000,
        allocated_budget: 800000,
        spent_budget: 450000,
        remaining_budget: 550000,
        budget_usage_rate: 45.0,
        by_category: [
          { category: 'labor', total: 500000, spent: 300000 },
          { category: 'materials', total: 300000, spent: 150000 },
          { category: 'services', total: 200000, spent: 0 },
        ],
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getBudgetStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/budget', { params: undefined });
      expect(result.data.total_budget).toBe(1000000);
      expect(result.data.allocated_budget).toBe(800000);
      expect(result.data.spent_budget).toBe(450000);
      expect(result.data.remaining_budget).toBe(550000);
      expect(result.data.budget_usage_rate).toBe(45.0);
      expect(result.data.by_category).toHaveLength(3);
    });

    // ===== 风险统计 =====

    it('getRiskStatistics should call GET /statistics/risks', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_risks: 25,
        open_risks: 10,
        closed_risks: 15,
        by_level: [
          { level: 'high', count: 5 },
          { level: 'medium', count: 10 },
          { level: 'low', count: 10 },
        ],
        by_category: [
          { category: 'technical', total: 12, spent: 8 },
          { category: 'schedule', total: 8, spent: 5 },
          { category: 'resource', total: 5, spent: 2 },
        ],
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getRiskStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/risks', { params: undefined });
      expect(result.data.total_risks).toBe(25);
      expect(result.data.open_risks).toBe(10);
      expect(result.data.closed_risks).toBe(15);
      expect(result.data.by_level).toHaveLength(3);
      expect(result.data.by_category).toHaveLength(3);
    });

    // ===== 任务统计 =====

    it('getTaskStatistics should call GET /statistics/tasks', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        total_tasks: 200,
        by_status: [
          { status: 'pending', count: 40 },
          { status: 'in_progress', count: 80 },
          { status: 'completed', count: 80 },
        ],
        by_priority: [
          { priority: 'high', count: 30 },
          { priority: 'normal', count: 120 },
          { priority: 'low', count: 50 },
        ],
        completion_rate: 40.0,
        overdue_count: 15,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getTaskStatistics();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/tasks', { params: undefined });
      expect(result.data.total_tasks).toBe(200);
      expect(result.data.by_status).toHaveLength(3);
      expect(result.data.by_priority).toHaveLength(3);
      expect(result.data.completion_rate).toBe(40.0);
      expect(result.data.overdue_count).toBe(15);
    });

    // ===== 仪表板 =====

    it('getDashboard should call GET /statistics/dashboard', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      const mockData = {
        projects: { total_projects: 50, by_status: [], by_type: [], by_leader: [], average_progress: 60.0, on_time_rate: 75.0, high_risk_count: 3 },
        contracts: { total_contracts: 30, by_status: [], by_type: [], total_amount: 5000000, avg_amount: 166666.67 },
        budget: { total_budget: 1000000, allocated_budget: 800000, spent_budget: 450000, remaining_budget: 550000, budget_usage_rate: 45.0, by_category: [] },
        risks: { total_risks: 25, open_risks: 10, closed_risks: 15, by_level: [], by_category: [] },
        tasks: { total_tasks: 200, by_status: [], by_priority: [], completion_rate: 40.0, overdue_count: 15 },
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await pmStatisticsApi.getDashboard();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/dashboard');
      expect(result.data.projects.total_projects).toBe(50);
      expect(result.data.contracts.total_contracts).toBe(30);
      expect(result.data.budget.total_budget).toBe(1000000);
      expect(result.data.risks.total_risks).toBe(25);
      expect(result.data.tasks.total_tasks).toBe(200);
    });

    it('getDashboard should not accept params', async () => {
      const { pmStatisticsApi } = await import('../pm/statistics');
      const { apiClient } = await import('../client');
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: { projects: { total_projects: 0, by_status: [], by_type: [], by_leader: [], average_progress: 0, on_time_rate: 0, high_risk_count: 0 }, contracts: { total_contracts: 0, by_status: [], by_type: [], total_amount: 0, avg_amount: 0 }, budget: { total_budget: 0, allocated_budget: 0, spent_budget: 0, remaining_budget: 0, budget_usage_rate: 0, by_category: [] }, risks: { total_risks: 0, open_risks: 0, closed_risks: 0, by_level: [], by_category: [] }, tasks: { total_tasks: 0, by_status: [], by_priority: [], completion_rate: 0, overdue_count: 0 } } });

      await pmStatisticsApi.getDashboard();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/dashboard');
    });
  });

  describe('dashboardApi', () => {
    it('getDashboard should call the aggregated dashboard endpoint', async () => {
      const { dashboardApi } = await import('../pm/dashboard');
      const { apiClient } = await import('../client');
      const mockData = {
        projects: { total_projects: 50, by_status: [], by_type: [], by_leader: [], average_progress: 60.0, on_time_rate: 75.0, high_risk_count: 3 },
        contracts: { total_contracts: 30, by_status: [], by_type: [], total_amount: 5000000, avg_amount: 166666.67 },
        budget: { total_budget: 1000000, allocated_budget: 800000, spent_budget: 450000, remaining_budget: 550000, budget_usage_rate: 45.0, by_category: [] },
        risks: { total_risks: 25, open_risks: 10, closed_risks: 15, by_level: [], by_category: [] },
        tasks: { total_tasks: 200, by_status: [], by_priority: [], completion_rate: 40.0, overdue_count: 15 },
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await dashboardApi.getDashboard();
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics/dashboard');
      expect(result.data.projects.total_projects).toBe(50);
    });

    it('getStatistics should still work via dashboardApi', async () => {
      const { dashboardApi } = await import('../pm/dashboard');
      const { apiClient } = await import('../client');
      const mockData = {
        total_projects: 10,
        draft_projects: 1,
        pending_projects: 2,
        active_projects: 5,
        completed_projects: 2,
        cancelled_projects: 0,
        total_contracts: 8,
        pending_contracts: 1,
        active_contracts: 3,
        completed_contracts: 4,
        total_budget: 1000000,
        spent_budget: 450000,
        budget_usage_rate: 45.0,
        total_risks: 15,
        open_risks: 5,
        closed_risks: 10,
        total_tasks: 200,
        pending_tasks: 30,
        in_progress_tasks: 70,
        completed_tasks: 100,
      };
      (apiClient.pm.get as vi.Mock).mockResolvedValue({ data: mockData });

      await dashboardApi.getStatistics({ start_date: '2026-01-01' });
      expect(apiClient.pm.get).toHaveBeenCalledWith('/statistics', { params: { start_date: '2026-01-01' } });
    });
  });
});