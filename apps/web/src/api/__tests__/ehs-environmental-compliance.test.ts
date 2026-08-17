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

describe('EHS Environmental Compliance API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('environmentalComplianceApi - 法规管理', () => {
    it('listRegulations should call GET with params', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listRegulations({
        page: 1,
        page_size: 10,
        status: 'active',
        category: 'law',
        year: 2026,
      });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/regulations?page=1&page_size=10&status=active&category=law&year=2026'
      );
    });

    it('listRegulations should call GET without params', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listRegulations();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/regulations');
    });

    it('getRegulation should call GET /regulations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getRegulation('reg-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/regulations/reg-001'
      );
    });

    it('createRegulation should call POST with data', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '环保法', category: 'law' };
      await environmentalComplianceApi.createRegulation(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith(
        '/environmental-compliance/regulations',
        data
      );
    });

    it('updateRegulation should call PUT /regulations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '更新法规', status: 'active' };
      await environmentalComplianceApi.updateRegulation('reg-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith(
        '/environmental-compliance/regulations/reg-001',
        data
      );
    });

    it('deleteRegulation should call DELETE /regulations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await environmentalComplianceApi.deleteRegulation('reg-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith(
        '/environmental-compliance/regulations/reg-001'
      );
    });

    it('listRegulationCategories should call GET /regulations/categories', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await environmentalComplianceApi.listRegulationCategories();
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/regulations/categories'
      );
    });
  });

  describe('environmentalComplianceApi - 合规评价', () => {
    it('listEvaluations should call GET /evaluations', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listEvaluations();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/evaluations');
    });

    it('getEvaluation should call GET /evaluations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getEvaluation('eval-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/evaluations/eval-001'
      );
    });

    it('createEvaluation should call POST with data', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '年度评价', eval_type: 'annual' };
      await environmentalComplianceApi.createEvaluation(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith(
        '/environmental-compliance/evaluations',
        data
      );
    });

    it('updateEvaluation should call PUT /evaluations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'completed', compliance_rate: 95 };
      await environmentalComplianceApi.updateEvaluation('eval-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith(
        '/environmental-compliance/evaluations/eval-001',
        data
      );
    });

    it('deleteEvaluation should call DELETE /evaluations/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await environmentalComplianceApi.deleteEvaluation('eval-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith(
        '/environmental-compliance/evaluations/eval-001'
      );
    });
  });

  describe('environmentalComplianceApi - 环境监测', () => {
    it('listMonitorRecords should call GET /monitoring', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listMonitorRecords();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/monitoring');
    });

    it('getMonitorRecord should call GET /monitoring/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getMonitorRecord('mon-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/monitoring/mon-001'
      );
    });

    it('createMonitorRecord should call POST with data', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { monitor_type: 'wastewater', monitor_point: '总排口', result: 'qualified' };
      await environmentalComplianceApi.createMonitorRecord(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/environmental-compliance/monitoring', data);
    });

    it('deleteMonitorRecord should call DELETE /monitoring/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await environmentalComplianceApi.deleteMonitorRecord('mon-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith(
        '/environmental-compliance/monitoring/mon-001'
      );
    });

    it('listMonitorTypes should call GET /monitoring/types', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: [] });
      await environmentalComplianceApi.listMonitorTypes();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/monitoring/types');
    });
  });

  describe('environmentalComplianceApi - 排污许可', () => {
    it('listPermits should call GET /permits', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listPermits();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/permits');
    });

    it('getPermit should call GET /permits/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getPermit('permit-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/environmental-compliance/permits/permit-001'
      );
    });

    it('createPermit should call POST with data', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { permit_type: 'wastewater', permit_name: '排污许可证' };
      await environmentalComplianceApi.createPermit(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/environmental-compliance/permits', data);
    });

    it('updatePermit should call PUT /permits/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'valid', permit_name: '更新许可' };
      await environmentalComplianceApi.updatePermit('permit-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith(
        '/environmental-compliance/permits/permit-001',
        data
      );
    });

    it('deletePermit should call DELETE /permits/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await environmentalComplianceApi.deletePermit('permit-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith(
        '/environmental-compliance/permits/permit-001'
      );
    });
  });

  describe('environmentalComplianceApi - 环境事件', () => {
    it('listIncidents should call GET /incidents', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await environmentalComplianceApi.listIncidents();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/incidents');
    });

    it('getIncident should call GET /incidents/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getIncident('inc-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/incidents/inc-001');
    });

    it('createIncident should call POST with data', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: '废水泄漏', incident_type: 'wastewater_leak' };
      await environmentalComplianceApi.createIncident(data);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/environmental-compliance/incidents', data);
    });

    it('updateIncident should call PUT /incidents/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'closed', cause: '管道老化' };
      await environmentalComplianceApi.updateIncident('inc-001', data);
      expect(apiClient.ehs.put).toHaveBeenCalledWith(
        '/environmental-compliance/incidents/inc-001',
        data
      );
    });

    it('deleteIncident should call DELETE /incidents/:id', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.delete as vi.Mock).mockResolvedValue({ data: null });
      await environmentalComplianceApi.deleteIncident('inc-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith(
        '/environmental-compliance/incidents/inc-001'
      );
    });
  });

  describe('environmentalComplianceApi - 统计', () => {
    it('getComplianceStatistics should call GET /statistics', async () => {
      const { environmentalComplianceApi } = await import('../ehs/environmentalCompliance');
      const { apiClient } = await import('../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await environmentalComplianceApi.getComplianceStatistics();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/environmental-compliance/statistics');
    });
  });
});
