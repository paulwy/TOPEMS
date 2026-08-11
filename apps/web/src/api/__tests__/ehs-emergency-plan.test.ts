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

describe('EHS Emergency Plan API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emergencyPlanApi - 预案管理', () => {
    it('listPlans should call GET /emergency-plans with params', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyPlanApi.listPlans({ page: 1, page_size: 10, status: 'active', category: 'fire' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans?page=1&page_size=10&status=active&category=fire');
    });

    it('listPlans should call GET /emergency-plans without params', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await emergencyPlanApi.listPlans();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans');
    });

    it('getPlan should call GET /emergency-plans/:id', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyPlanApi.getPlan('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans/plan-001');
    });

    it('createPlan should call POST /emergency-plans with data', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '火灾应急预案', category: 'fire', scope: '全厂' };
      await emergencyPlanApi.createPlan(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans', data);
    });

    it('updatePlan should call PUT /emergency-plans/:id with data', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '更新预案', status: 'active' };
      await emergencyPlanApi.updatePlan('plan-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/emergency-plans/plan-001', data);
    });

    it('deletePlan should call DELETE /emergency-plans/:id', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await emergencyPlanApi.deletePlan('plan-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/emergency-plans/plan-001');
    });

    it('listPlanCategories should call GET /emergency-plans/categories', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await emergencyPlanApi.listPlanCategories();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans/categories');
    });
  });

  describe('emergencyPlanApi - 物资管理', () => {
    it('listPlanSupplies should call GET /emergency-plans/:id/supplies', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await emergencyPlanApi.listPlanSupplies('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans/plan-001/supplies');
    });

    it('addPlanSupply should call POST /emergency-plans/:id/supplies', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: '灭火器', quantity: 10 };
      await emergencyPlanApi.addPlanSupply('plan-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans/plan-001/supplies', data);
    });

    it('deletePlanSupply should call DELETE /emergency-plans/:id/supplies/:supplyId', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await emergencyPlanApi.deletePlanSupply('plan-001', 'supply-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/emergency-plans/plan-001/supplies/supply-001');
    });
  });

  describe('emergencyPlanApi - 版本管理', () => {
    it('listPlanVersions should call GET /emergency-plans/:id/versions', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await emergencyPlanApi.listPlanVersions('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/emergency-plans/plan-001/versions');
    });

    it('createPlanVersion should call POST /emergency-plans/:id/versions', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { change_description: '更新内容', content: '新版本内容' };
      await emergencyPlanApi.createPlanVersion('plan-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans/plan-001/versions', data);
    });
  });

  describe('emergencyPlanApi - 审批流程', () => {
    it('submitPlanApproval should call POST /emergency-plans/:id/submit-approval with data', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { approvers: ['user-1', 'user-2'], remarks: '提交审批' };
      await emergencyPlanApi.submitPlanApproval('plan-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans/plan-001/submit-approval', data);
    });

    it('submitPlanApproval should call POST with empty object when no data', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      await emergencyPlanApi.submitPlanApproval('plan-001');
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans/plan-001/submit-approval', {});
    });

    it('approvePlan should call POST /emergency-plans/:id/approve', async () => {
      const { emergencyPlanApi } = await import('../ehs/emergencyPlan');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { result: 'approved', opinion: '同意' };
      await emergencyPlanApi.approvePlan('plan-001', data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/emergency-plans/plan-001/approve', data);
    });
  });
});
