import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AssignInspectionRequestBackend,
  CreateQualityCheckRequest,
  CreateQualityCostRequest,
  CreateQualityImprovementRequest,
  CreateQualityIssueRequest,
  CreateQualityStandardRequest,
  CreateSpcChartRequest,
  SubmitInspectionResultRequestBackend,
  UpdateQualityCostRequestBackend,
  UpdateQualityImprovementRequest,
  UpdateQualityInspectionRequestBackend,
  UpdateQualityIssueRequest,
  UpdateQualityStandardRequestBackend,
  UpdateSpcChartRequestBackend,
} from '../types';

vi.mock('../../client', () => {
  const mockQmsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { qms: mockQmsClient },
    default: { qms: mockQmsClient },
  };
});

describe('QMS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('standardApi', () => {
    it('listStandards should call GET /standards', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { standards: [] } });
      await standardApi.listStandards();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/standards');
    });

    it('getStandard should call GET /standards/:id', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: {} });
      await standardApi.getStandard('std-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/standards/std-001');
    });

    it('createStandard should call POST /standards with data', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Standard', code: 'STD-001', category: 'quality' };
      await standardApi.createStandard(data as unknown as CreateQualityStandardRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/standards', expect.any(Object));
    });

    it('updateStandard should call PUT /standards/:id with data', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Standard', description: 'Updated description' };
      await standardApi.updateStandard('std-001', data as Partial<UpdateQualityStandardRequestBackend>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/standards/std-001', expect.any(Object));
    });

    it('deleteStandard should call DELETE /standards/:id', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      await standardApi.deleteStandard('std-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/standards/std-001');
    });

    it('listRevisions should call GET /standards/:id/revisions', async () => {
      const { standardApi } = await import('../standard');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { revisions: [] } });
      await standardApi.listRevisions('std-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/standards/std-001/revisions');
    });
  });

  describe('inspectionApi', () => {
    it('listChecks should call GET /checks', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { inspections: [] } });
      await inspectionApi.listChecks();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/checks');
    });

    it('getCheck should call GET /checks/:id', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: {} });
      await inspectionApi.getCheck('check-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/checks/check-001');
    });

    it('createCheck should call POST /checks with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { inspection_type: 'incoming', product_name: 'Product A' };
      await inspectionApi.createCheck(data as unknown as CreateQualityCheckRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/checks', expect.any(Object));
    });

    it('updateCheck should call PUT /checks/:id with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { quantity: 100 };
      await inspectionApi.updateCheck('check-001', data as Partial<UpdateQualityInspectionRequestBackend>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/checks/check-001', expect.any(Object));
    });

    it('deleteCheck should call DELETE /checks/:id', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      await inspectionApi.deleteCheck('check-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/checks/check-001');
    });

    it('assignCheck should call POST /checks/:id/assign with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { inspector: 'John', assign_time: '2024-01-15' };
      await inspectionApi.assignCheck('check-001', data as unknown as AssignInspectionRequestBackend);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/checks/check-001/assign', data);
    });

    it('submitCheckResult should call POST /checks/:id/submit with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { result: 'pass', qualified_quantity: 95 };
      await inspectionApi.submitCheckResult('check-001', data as unknown as SubmitInspectionResultRequestBackend);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/checks/check-001/submit', data);
    });

    it('getCheckResults should call GET /checks/:id/results', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { results: [] } });
      await inspectionApi.getCheckResults('check-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/checks/check-001/results');
    });
  });

  describe('issueApi', () => {
    it('listIssues should call GET /issues', async () => {
      const { issueApi } = await import('../issue');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { issues: [] } });
      await issueApi.listIssues();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/issues');
    });

    it('getIssue should call GET /issues/:id', async () => {
      const { issueApi } = await import('../issue');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({
        data: { id: 'issue-001', title: 'Test Issue' },
      });
      await issueApi.getIssue('issue-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/issues/issue-001');
    });

    it('createIssue should call POST /issues with data', async () => {
      const { issueApi } = await import('../issue');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({
        data: { id: 'issue-001', title: 'Test Issue' },
      });
      const data = { title: 'Test Issue', description: 'Issue description', severity: 'high' };
      await issueApi.createIssue(data as unknown as CreateQualityIssueRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/issues', expect.any(Object));
    });

    it('updateIssue should call PUT /issues/:id with data', async () => {
      const { issueApi } = await import('../issue');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({
        data: { id: 'issue-001', title: 'Updated Issue' },
      });
      const data = { title: 'Updated Issue', status: 'in_progress' };
      await issueApi.updateIssue('issue-001', data as Partial<UpdateQualityIssueRequest>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/issues/issue-001', expect.any(Object));
    });

    it('deleteIssue should call DELETE /issues/:id', async () => {
      const { issueApi } = await import('../issue');
      const { apiClient } = await import('../../client');
      await issueApi.deleteIssue('issue-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/issues/issue-001');
    });
  });

  describe('spcApi', () => {
    it('listSpcCharts should call GET /spc/charts', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { charts: [] } });
      await spcApi.listSpcCharts();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/spc/charts');
    });

    it('getSpcChart should call GET /spc/charts/:id', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: {} });
      await spcApi.getSpcChart('chart-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/spc/charts/chart-001');
    });

    it('createSpcChart should call POST /spc/charts with data', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { chartName: 'Test Chart', chartType: 'xbar', productName: 'Product A' };
      await spcApi.createSpcChart(data as unknown as CreateSpcChartRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/spc/charts', expect.any(Object));
    });

    it('updateSpcChart should call PUT /spc/charts/:id with data', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { chartName: 'Updated Chart', status: 'active' };
      await spcApi.updateSpcChart('chart-001', data as Partial<UpdateSpcChartRequestBackend>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/spc/charts/chart-001', expect.any(Object));
    });

    it('deleteSpcChart should call DELETE /spc/charts/:id', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      await spcApi.deleteSpcChart('chart-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/spc/charts/chart-001');
    });

    it('getSpcDataPoints should call GET /spc/charts/:id/data-points', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { data_points: [] } });
      await spcApi.getSpcDataPoints('chart-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/spc/charts/chart-001/data-points');
    });

    it('calculateControlLimits should call POST /spc/charts/:id/calculate', async () => {
      const { spcApi } = await import('../spc');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      await spcApi.calculateControlLimits('chart-001');
      expect(apiClient.qms.post).toHaveBeenCalledWith('/spc/charts/chart-001/calculate', {});
    });
  });

  describe('qualityCostApi', () => {
    it('listQualityCosts should call GET /quality-costs', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { costs: [] } });
      await qualityCostApi.listQualityCosts();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/quality-costs');
    });

    it('getQualityCost should call GET /quality-costs/:id', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: {} });
      await qualityCostApi.getQualityCost('cost-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/quality-costs/cost-001');
    });

    it('createQualityCost should call POST /quality-costs with data', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { costType: 'prevention', amount: 1000, currency: 'CNY' };
      await qualityCostApi.createQualityCost(data as unknown as CreateQualityCostRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/quality-costs', expect.any(Object));
    });

    it('updateQualityCost should call PUT /quality-costs/:id with data', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { amount: 1500, description: 'Updated cost' };
      await qualityCostApi.updateQualityCost('cost-001', data as Partial<UpdateQualityCostRequestBackend>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/quality-costs/cost-001', expect.any(Object));
    });

    it('deleteQualityCost should call DELETE /quality-costs/:id', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      await qualityCostApi.deleteQualityCost('cost-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/quality-costs/cost-001');
    });

    it('getCostStatistics should call GET /quality-costs/statistics with params', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: {} });
      await qualityCostApi.getCostStatistics({ startDate: '2024-01-01', endDate: '2024-01-31' });
      expect(apiClient.qms.get).toHaveBeenCalledWith('/quality-costs/statistics', {
        params: { start_date: '2024-01-01', end_date: '2024-01-31' },
      });
    });

    it('getCostTrend should call GET /quality-costs/trend with params', async () => {
      const { qualityCostApi } = await import('../qualityCost');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { trend: [] } });
      await qualityCostApi.getCostTrend({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        period: 'monthly',
      });
      expect(apiClient.qms.get).toHaveBeenCalledWith('/quality-costs/trend', {
        params: { start_date: '2024-01-01', end_date: '2024-01-31', period: 'monthly' },
      });
    });
  });

  describe('improvementApi', () => {
    it('listImprovements should call GET /actions', async () => {
      const { improvementApi } = await import('../improvement');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({ data: { actions: [] } });
      await improvementApi.listImprovements();
      expect(apiClient.qms.get).toHaveBeenCalledWith('/actions');
    });

    it('getImprovement should call GET /actions/:id', async () => {
      const { improvementApi } = await import('../improvement');
      const { apiClient } = await import('../../client');
      (apiClient.qms.get as vi.Mock).mockResolvedValue({
        data: { id: 'imp-001', title: 'Test Improvement' },
      });
      await improvementApi.getImprovement('imp-001');
      expect(apiClient.qms.get).toHaveBeenCalledWith('/actions/imp-001');
    });

    it('createImprovement should call POST /actions with data', async () => {
      const { improvementApi } = await import('../improvement');
      const { apiClient } = await import('../../client');
      (apiClient.qms.post as vi.Mock).mockResolvedValue({
        data: { id: 'imp-001', title: 'Test Improvement' },
      });
      const data = { title: 'Test Improvement', description: 'Improvement description' };
      await improvementApi.createImprovement(data as unknown as CreateQualityImprovementRequest);
      expect(apiClient.qms.post).toHaveBeenCalledWith('/actions', expect.any(Object));
    });

    it('updateImprovement should call PUT /actions/:id with data', async () => {
      const { improvementApi } = await import('../improvement');
      const { apiClient } = await import('../../client');
      (apiClient.qms.put as vi.Mock).mockResolvedValue({
        data: { id: 'imp-001', title: 'Updated Improvement' },
      });
      const data = { title: 'Updated Improvement', status: 'in_progress' };
      await improvementApi.updateImprovement('imp-001', data as Partial<UpdateQualityImprovementRequest>);
      expect(apiClient.qms.put).toHaveBeenCalledWith('/actions/imp-001', expect.any(Object));
    });

    it('deleteImprovement should call DELETE /actions/:id', async () => {
      const { improvementApi } = await import('../improvement');
      const { apiClient } = await import('../../client');
      await improvementApi.deleteImprovement('imp-001');
      expect(apiClient.qms.delete).toHaveBeenCalledWith('/actions/imp-001');
    });
  });
});
