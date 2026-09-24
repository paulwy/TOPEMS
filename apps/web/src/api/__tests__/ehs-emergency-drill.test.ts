import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockEhsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { ehs: mockEhsClient },
    default: { ehs: mockEhsClient },
  };
});

describe('EHS Emergency Drill API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emergencyDrillApi - 演练计划管理', () => {
    it('listDrillPlans should call GET /drills/plans with params', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyDrillApi.listDrillPlans({
        page: 1,
        page_size: 10,
        status: 'active',
        drill_type: 'fire',
        year: 2026,
        keyword: 'test',
      });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/drills/plans?page=1&page_size=10&status=active&drill_type=fire&year=2026&q=test'
      );
    });

    it('listDrillPlans should call GET /drills/plans without params', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyDrillApi.listDrillPlans();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/plans');
    });

    it('getDrillPlan should call GET /drills/plans/:id', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyDrillApi.getDrillPlan('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/plans/plan-001');
    });

    it('createDrillPlan should call POST /drills/plans with data', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '2026年度火灾演练', drill_type: 'fire', location: '生产厂区' };
      await emergencyDrillApi.createDrillPlan(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/drills/plans', data);
    });

    it('updateDrillPlan should call PUT /drills/plans/:id with data', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '更新演练计划', status: 'completed' };
      await emergencyDrillApi.updateDrillPlan('plan-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/drills/plans/plan-001', data);
    });

    it('deleteDrillPlan should call DELETE /drills/plans/:id', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await emergencyDrillApi.deleteDrillPlan('plan-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/drills/plans/plan-001');
    });
  });

  describe('emergencyDrillApi - 演练记录管理', () => {
    it('listDrillRecords should call GET /drills/records with params', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyDrillApi.listDrillRecords({
        page: 1,
        page_size: 10,
        status: 'completed',
        drill_type: 'fire',
        plan_id: 'plan-001',
        keyword: 'test',
      });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/drills/records?page=1&page_size=10&status=completed&drill_type=fire&plan_id=plan-001&q=test'
      );
    });

    it('listDrillRecords should call GET /drills/records without params', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyDrillApi.listDrillRecords();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/records');
    });

    it('getDrillRecord should call GET /drills/records/:id', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyDrillApi.getDrillRecord('record-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/records/record-001');
    });

    it('createDrillRecord should call POST /drills/records with data', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        title: '火灾应急演练',
        drill_type: 'fire',
        location: '生产厂区',
        plan_id: 'plan-001',
      };
      await emergencyDrillApi.createDrillRecord(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/drills/records', data);
    });

    it('updateDrillRecord should call PUT /drills/records/:id with data', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'completed', actual_content: '实际演练内容' };
      await emergencyDrillApi.updateDrillRecord('record-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/drills/records/record-001', data);
    });

    it('deleteDrillRecord should call DELETE /drills/records/:id', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await emergencyDrillApi.deleteDrillRecord('record-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/drills/records/record-001');
    });
  });

  describe('emergencyDrillApi - 演练评估', () => {
    it('createDrillEvaluation should call POST /drills/records/:id/evaluation', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { evaluator: '李主任', overall_score: 85, overall_comment: '演练效果良好' };
      await emergencyDrillApi.createDrillEvaluation('record-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith(
        '/drills/records/record-001/evaluation',
        data
      );
    });

    it('createDrillEvaluation with empty data should call POST with empty object', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyDrillApi.createDrillEvaluation('record-001', {});
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/drills/records/record-001/evaluation', {});
    });
  });

  describe('emergencyDrillApi - 演练问题', () => {
    it('listDrillProblems should call GET /drills/records/:id/problems', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await emergencyDrillApi.listDrillProblems('record-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/records/record-001/problems');
    });

    it('createDrillProblem should call POST /drills/records/:id/problems', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        description: '部分员工不熟悉疏散路线',
        category: 'training',
        severity: 'medium',
      };
      await emergencyDrillApi.createDrillProblem('record-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/drills/records/record-001/problems', data);
    });

    it('updateDrillProblem should call PUT /drills/records/:id/problems/:problemId', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'rectified', verifier: '王主管' };
      await emergencyDrillApi.updateDrillProblem('record-001', 'problem-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith(
        '/drills/records/record-001/problems/problem-001',
        data
      );
    });
  });

  describe('emergencyDrillApi - 演练类型与统计', () => {
    it('listDrillTypes should call GET /drills/types', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await emergencyDrillApi.listDrillTypes();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/types');
    });

    it('getDrillStatistics should call GET /drills/statistics', async () => {
      const { emergencyDrillApi } = await import('../ehs/emergencyDrill');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyDrillApi.getDrillStatistics();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/drills/statistics');
    });
  });
});
