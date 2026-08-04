import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  CreateControlMeasureRequest,
  CreateInspectionItemRequest,
  CreateInspectionPlanRequest,
  CreateInspectionRecordRequest,
  CreateRectificationRequest,
  CreateRiskAssessmentRequest,
  CreateRiskControlMeasureRequest,
  CreateRiskMgmtAssessmentRequest,
  CreateRiskRequest,
  CreateSafetyHazardRequest,
  CreateSafetyIssueRequest,
  CreateTrainingCertificateRequest,
  CreateTrainingPlanRequest,
  CreateTrainingRecordRequest,
  CreateVerificationRequest,
  UpdateRiskRequest,
  UpdateTrainingPlanRequest,
} from '../types';

vi.mock('../../client', () => {
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

describe('EHS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hazardApi', () => {
    it('listHazards should call GET /hazards with params', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hazardApi.listHazards({ page: 1, pagesize: 10, search: 'test', status: 'active' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/hazards?page=1&pagesize=10&search=test&status=active'
      );
    });

    it('listHazards should call GET /hazards without params', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hazardApi.listHazards();
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards?');
    });

    it('getHazard should call GET /hazards/:id', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await hazardApi.getHazard('hazard-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/hazard-001');
    });

    it('createHazard should call POST /hazards with data', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Hazard', category: 'safety', severity: 'high' };
      await hazardApi.createHazard(data as unknown as CreateSafetyHazardRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards', data);
    });

    it('updateHazard should call PUT /hazards/:id with data', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Hazard', status: 'inactive' };
      await hazardApi.updateHazard('hazard-001', data as Partial<CreateSafetyHazardRequest>);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/hazards/hazard-001', data);
    });

    it('deleteHazard should call DELETE /hazards/:id', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      await hazardApi.deleteHazard('hazard-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/hazards/hazard-001');
    });

    it('listRiskAssessments should call GET /hazards/:id/assessments', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hazardApi.listRiskAssessments('hazard-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/hazard-001/assessments');
    });

    it('createRiskAssessment should call POST /hazards/:id/assessments with data', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { likelihood: 3, severity: 4, risk_level: 'high' };
      await hazardApi.createRiskAssessment(
        'hazard-001',
        data as unknown as CreateRiskAssessmentRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards/hazard-001/assessments', data);
    });

    it('listControlMeasures should call GET /hazards/:id/controls', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await hazardApi.listControlMeasures('hazard-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/hazard-001/controls');
    });

    it('createControlMeasure should call POST /hazards/:id/controls with data', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { measure: 'Install guardrails', type: 'engineering' };
      await hazardApi.createControlMeasure(
        'hazard-001',
        data as unknown as CreateControlMeasureRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards/hazard-001/controls', data);
    });

    it('deleteControlMeasure should call DELETE /hazards/:hazardId/controls/:measureId', async () => {
      const { hazardApi } = await import('../hazard');
      const { apiClient } = await import('../../client');
      await hazardApi.deleteControlMeasure('hazard-001', 'measure-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/hazards/hazard-001/controls/measure-001');
    });
  });

  describe('inspectionApi', () => {
    it('listInspectionPlans should call GET /checks/plans with params', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await inspectionApi.listInspectionPlans({ page: 1, pagesize: 10, search: 'test' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/checks/plans?page=1&pagesize=10&search=test'
      );
    });

    it('getInspectionPlan should call GET /checks/plans/:id', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await inspectionApi.getInspectionPlan('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/checks/plans/plan-001');
    });

    it('createInspectionPlan should call POST /checks/plans with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Plan', frequency: 'monthly' };
      await inspectionApi.createInspectionPlan(data as unknown as CreateInspectionPlanRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/checks/plans', data);
    });

    it('updateInspectionPlan should call PUT /checks/plans/:id with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Plan' };
      await inspectionApi.updateInspectionPlan(
        'plan-001',
        data as Partial<CreateInspectionPlanRequest>
      );
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/checks/plans/plan-001', data);
    });

    it('deleteInspectionPlan should call DELETE /checks/plans/:id', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      await inspectionApi.deleteInspectionPlan('plan-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/checks/plans/plan-001');
    });

    it('listInspectionItems should call GET /checks/plans/:id/items', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await inspectionApi.listInspectionItems('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/checks/plans/plan-001/items');
    });

    it('createInspectionItem should call POST /checks/plans/:id/items with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Check fire extinguisher', category: 'safety' };
      await inspectionApi.createInspectionItem(
        'plan-001',
        data as unknown as CreateInspectionItemRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/checks/plans/plan-001/items', data);
    });

    it('listInspectionRecords should call GET /checks/records with params', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await inspectionApi.listInspectionRecords({ page: 1, pagesize: 10, status: 'completed' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/checks/records?page=1&pagesize=10&status=completed'
      );
    });

    it('getInspectionRecord should call GET /checks/records/:id', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await inspectionApi.getInspectionRecord('record-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/checks/records/record-001');
    });

    it('createInspectionRecord should call POST /checks/records with data', async () => {
      const { inspectionApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { plan_id: 'plan-001', inspector: 'John' };
      await inspectionApi.createInspectionRecord(data as unknown as CreateInspectionRecordRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/checks/records', data);
    });
  });

  describe('safetyIssueApi', () => {
    it('listSafetyIssues should call GET /issues with params', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await safetyIssueApi.listSafetyIssues({ page: 1, pagesize: 10, status: 'open' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/issues?page=1&pagesize=10&status=open');
    });

    it('getSafetyIssue should call GET /issues/:id', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await safetyIssueApi.getSafetyIssue('issue-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/issues/issue-001');
    });

    it('createSafetyIssue should call POST /issues with data', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = {
        title: 'Test Issue',
        description: 'Safety issue description',
        severity: 'high',
      };
      await safetyIssueApi.createSafetyIssue(data as unknown as CreateSafetyIssueRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/issues', data);
    });

    it('updateSafetyIssue should call PUT /issues/:id with data', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { title: 'Updated Issue', status: 'in_progress' };
      await safetyIssueApi.updateSafetyIssue(
        'issue-001',
        data as Partial<CreateSafetyIssueRequest>
      );
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/issues/issue-001', data);
    });

    it('deleteSafetyIssue should call DELETE /issues/:id', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      await safetyIssueApi.deleteSafetyIssue('issue-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/issues/issue-001');
    });

    it('startRectification should call POST /issues/:id/rectification with data', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { responsible_person: 'John', deadline: '2024-02-01' };
      await safetyIssueApi.startRectification(
        'issue-001',
        data as unknown as CreateRectificationRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/issues/issue-001/rectification', data);
    });

    it('submitRectification should call POST /issues/:id/rectification/submit', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      await safetyIssueApi.submitRectification('issue-001');
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/issues/issue-001/rectification/submit', {});
    });

    it('verifySafetyIssue should call POST /issues/:id/verification with data', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { verifier: 'Jane', result: 'pass' };
      await safetyIssueApi.verifySafetyIssue(
        'issue-001',
        data as unknown as CreateVerificationRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/issues/issue-001/verification', data);
    });

    it('closeSafetyIssue should call POST /issues/:id/close', async () => {
      const { safetyIssueApi } = await import('../safetyIssue');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      await safetyIssueApi.closeSafetyIssue('issue-001');
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/issues/issue-001/close', {});
    });
  });

  describe('riskApi', () => {
    it('listRisks should call GET /hazards with params', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await riskApi.listRisks({ page: 1, pagesize: 10, risklevel: 'high' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards?page=1&pagesize=10&risklevel=high');
    });

    it('getRisk should call GET /hazards/:id', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await riskApi.getRisk('risk-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/risk-001');
    });

    it('createRisk should call POST /hazards with data', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Risk', category: 'operational', likelihood: 3 };
      await riskApi.createRisk(data as unknown as CreateRiskRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards', data);
    });

    it('updateRisk should call PUT /hazards/:id with data', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Risk', status: 'mitigated' };
      await riskApi.updateRisk('risk-001', data as Partial<UpdateRiskRequest>);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/hazards/risk-001', data);
    });

    it('deleteRisk should call DELETE /hazards/:id', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      await riskApi.deleteRisk('risk-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/hazards/risk-001');
    });

    it('listRiskMgmtAssessments should call GET /hazards/:id/assessments', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await riskApi.listRiskMgmtAssessments('risk-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/risk-001/assessments');
    });

    it('createRiskMgmtAssessment should call POST /hazards/:id/assessments with data', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { assessor: 'John', assessment_date: '2024-01-15' };
      await riskApi.createRiskMgmtAssessment(
        'risk-001',
        data as unknown as CreateRiskMgmtAssessmentRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards/risk-001/assessments', data);
    });

    it('listRiskControlMeasures should call GET /hazards/:id/controls', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await riskApi.listRiskControlMeasures('risk-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/hazards/risk-001/controls');
    });

    it('createRiskControlMeasure should call POST /hazards/:id/controls with data', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { measure: 'Risk reduction measure', type: 'preventive' };
      await riskApi.createRiskControlMeasure(
        'risk-001',
        data as unknown as CreateRiskControlMeasureRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/hazards/risk-001/controls', data);
    });

    it('deleteRiskControlMeasure should call DELETE /hazards/:riskId/controls/:measureId', async () => {
      const { riskApi } = await import('../risk');
      const { apiClient } = await import('../../client');
      await riskApi.deleteRiskControlMeasure('risk-001', 'measure-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/hazards/risk-001/controls/measure-001');
    });
  });

  describe('trainingApi', () => {
    it('listTrainingPlans should call GET /training/plans with params', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await trainingApi.listTrainingPlans({ page: 1, pagesize: 10, status: 'active' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/training/plans?page=1&pagesize=10&status=active'
      );
    });

    it('getTrainingPlan should call GET /training/plans/:id', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await trainingApi.getTrainingPlan('plan-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training/plans/plan-001');
    });

    it('createTrainingPlan should call POST /training/plans with data', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Safety Training', training_type: 'safety', category: 'EHS' };
      await trainingApi.createTrainingPlan(data as unknown as CreateTrainingPlanRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/training/plans', data);
    });

    it('updateTrainingPlan should call PUT /training/plans/:id with data', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Training Plan' };
      await trainingApi.updateTrainingPlan('plan-001', data as Partial<UpdateTrainingPlanRequest>);
      expect(apiClient.ehs.put).toHaveBeenCalledWith('/training/plans/plan-001', data);
    });

    it('deleteTrainingPlan should call DELETE /training/plans/:id', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      await trainingApi.deleteTrainingPlan('plan-001');
      expect(apiClient.ehs.delete).toHaveBeenCalledWith('/training/plans/plan-001');
    });

    it('listTrainingRecords should call GET /training/records with params', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await trainingApi.listTrainingRecords({ page: 1, pagesize: 10, employee_id: 'emp-001' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/training/records?page=1&pagesize=10&employee_id=emp-001'
      );
    });

    it('getTrainingRecord should call GET /training/records/:id', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await trainingApi.getTrainingRecord('record-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training/records/record-001');
    });

    it('createTrainingRecord should call POST /training/records with data', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { plan_id: 'plan-001', employee_id: 'emp-001', score: 95 };
      await trainingApi.createTrainingRecord(data as unknown as CreateTrainingRecordRequest);
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/training/records', data);
    });

    it('listTrainingCertificates should call GET /training/certificates with params', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
      await trainingApi.listTrainingCertificates({ page: 1, pagesize: 10, employee_id: 'emp-001' });
      expect(apiClient.ehs.get).toHaveBeenCalledWith(
        '/training/certificates?page=1&pagesize=10&employee_id=emp-001'
      );
    });

    it('getTrainingCertificate should call GET /training/certificates/:id', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.get as vi.Mock).mockResolvedValue({ data: {} });
      await trainingApi.getTrainingCertificate('cert-001');
      expect(apiClient.ehs.get).toHaveBeenCalledWith('/training/certificates/cert-001');
    });

    it('createTrainingCertificate should call POST /training/certificates with data', async () => {
      const { trainingApi } = await import('../training');
      const { apiClient } = await import('../../client');
      (apiClient.ehs.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { employee_id: 'emp-001', certificate_type: 'safety', issue_date: '2024-01-15' };
      await trainingApi.createTrainingCertificate(
        data as unknown as CreateTrainingCertificateRequest
      );
      expect(apiClient.ehs.post).toHaveBeenCalledWith('/training/certificates', data);
    });
  });
});
