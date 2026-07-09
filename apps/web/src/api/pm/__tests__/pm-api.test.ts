import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
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

describe('PM Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('projectApi', () => {
    it('list should call GET /projects with params', async () => {
      const { projectApi } = await import('../project');
      await projectApi.list({ page: 1, pagesize: 10, status: 'active', project_type: 'internal' });
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith(
        '/projects?project_type=internal&status=active&page=1&pagesize=10'
      );
    });

    it('list should call GET /projects without params', async () => {
      const { projectApi } = await import('../project');
      await projectApi.list();
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects?');
    });

    it('get should call GET /projects/:id', async () => {
      const { projectApi } = await import('../project');
      await projectApi.get('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('create should call POST /projects with data', async () => {
      const { projectApi } = await import('../project');
      const data = { name: 'Project A', project_code: 'PROJ-001' };
      await projectApi.create(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/projects', data);
    });

    it('update should call PUT /projects/:id with data', async () => {
      const { projectApi } = await import('../project');
      const data = { name: 'Updated Project' };
      await projectApi.update('proj-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/projects/proj-001', data);
    });

    it('delete should call DELETE /projects/:id', async () => {
      const { projectApi } = await import('../project');
      await projectApi.delete('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.delete).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('dashboard should call GET /projects/:id/dashboard', async () => {
      const { projectApi } = await import('../project');
      await projectApi.dashboard('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/dashboard');
    });

    it('gantt should call GET /projects/:id/gantt', async () => {
      const { projectApi } = await import('../project');
      await projectApi.gantt('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/gantt');
    });
  });

  describe('phaseApi', () => {
    it('list should call GET /projects/:projectId/phases', async () => {
      const { phaseApi } = await import('../project');
      await phaseApi.list('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/phases');
    });

    it('create should call POST /projects/:projectId/phases with data', async () => {
      const { phaseApi } = await import('../project');
      const data = {
        name: 'Phase 1',
        description: 'Initial phase',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };
      await phaseApi.create('proj-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/projects/proj-001/phases', data);
    });

    it('get should call GET /projects/:projectId/phases/:id', async () => {
      const { phaseApi } = await import('../project');
      await phaseApi.get('proj-001', 'phase-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/phases/phase-001');
    });

    it('update should call PUT /projects/:projectId/phases/:id with data', async () => {
      const { phaseApi } = await import('../project');
      const data = { name: 'Updated Phase', progress: 50 };
      await phaseApi.update('proj-001', 'phase-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/projects/proj-001/phases/phase-001', data);
    });

    it('delete should call DELETE /projects/:projectId/phases/:id', async () => {
      const { phaseApi } = await import('../project');
      await phaseApi.delete('proj-001', 'phase-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.delete).toHaveBeenCalledWith('/projects/proj-001/phases/phase-001');
    });
  });

  describe('contractApi', () => {
    it('list should call GET /contracts', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.list();
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/contracts');
    });

    it('get should call GET /contracts/:id', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.get('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/contracts/contract-001');
    });

    it('create should call POST /contracts with data', async () => {
      const { contractApi } = await import('../contract');
      const data = {
        contract_code: 'CT-001',
        contract_name: 'Service Contract',
        contract_type: 'service',
        amount: 10000,
      };
      await contractApi.create(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/contracts', data);
    });

    it('update should call PUT /contracts/:id with data', async () => {
      const { contractApi } = await import('../contract');
      const data = { contract_name: 'Updated Contract', amount: 15000 };
      await contractApi.update('contract-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/contracts/contract-001', data);
    });

    it('delete should call DELETE /contracts/:id', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.delete('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.delete).toHaveBeenCalledWith('/contracts/contract-001');
    });

    it('submit should call POST /contracts/:id/submit', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.submit('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/contracts/contract-001/submit');
    });

    it('approve should call POST /contracts/:id/approve', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.approve('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/contracts/contract-001/approve');
    });

    it('reject should call POST /contracts/:id/reject', async () => {
      const { contractApi } = await import('../contract');
      await contractApi.reject('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/contracts/contract-001/reject');
    });
  });

  describe('budgetApi', () => {
    it('list should call GET /projects/:projectId/budgets', async () => {
      const { budgetApi } = await import('../budget');
      await budgetApi.list('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/budgets');
    });

    it('get should call GET /budgets/:id', async () => {
      const { budgetApi } = await import('../budget');
      await budgetApi.get('budget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/budgets/budget-001');
    });

    it('create should call POST /projects/:projectId/budgets with data', async () => {
      const { budgetApi } = await import('../budget');
      const data = { budget_code: 'BUD-001', budget_name: 'Project Budget', total_amount: 50000 };
      await budgetApi.create('proj-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/projects/proj-001/budgets', data);
    });

    it('update should call PUT /budgets/:id with data', async () => {
      const { budgetApi } = await import('../budget');
      const data = { budget_name: 'Updated Budget', total_amount: 60000 };
      await budgetApi.update('budget-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/budgets/budget-001', data);
    });

    it('submit should call POST /budgets/:id/submit', async () => {
      const { budgetApi } = await import('../budget');
      await budgetApi.submit('budget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/budgets/budget-001/submit');
    });

    it('approve should call POST /budgets/:id/approve', async () => {
      const { budgetApi } = await import('../budget');
      await budgetApi.approve('budget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/budgets/budget-001/approve');
    });
  });

  describe('riskApi', () => {
    it('list should call GET /projects/:projectId/risks', async () => {
      const { riskApi } = await import('../risk');
      await riskApi.list('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/risks');
    });

    it('get should call GET /risks/:id', async () => {
      const { riskApi } = await import('../risk');
      await riskApi.get('risk-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/risks/risk-001');
    });

    it('create should call POST /projects/:projectId/risks with data', async () => {
      const { riskApi } = await import('../risk');
      const data = {
        risk_name: 'Budget Overrun',
        likelihood: 'medium',
        impact: 'high',
        risk_score: 15,
      };
      await riskApi.create('proj-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/projects/proj-001/risks', data);
    });

    it('update should call PUT /risks/:id with data', async () => {
      const { riskApi } = await import('../risk');
      const data = { risk_name: 'Updated Risk', status: 'mitigated' };
      await riskApi.update('risk-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/risks/risk-001', data);
    });
  });

  describe('documentApi', () => {
    it('list should call GET /projects/:projectId/documents', async () => {
      const { documentApi } = await import('../document');
      await documentApi.list('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/projects/proj-001/documents');
    });

    it('get should call GET /documents/:id', async () => {
      const { documentApi } = await import('../document');
      await documentApi.get('doc-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.get).toHaveBeenCalledWith('/documents/doc-001');
    });

    it('create should call POST /projects/:projectId/documents with data', async () => {
      const { documentApi } = await import('../document');
      const data = {
        document_name: 'Project Plan',
        document_type: 'plan',
        file_path: '/files/plan.pdf',
        filesize: 1024,
      };
      await documentApi.create('proj-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.post).toHaveBeenCalledWith('/projects/proj-001/documents', data);
    });

    it('update should call PUT /documents/:id with data', async () => {
      const { documentApi } = await import('../document');
      const data = { document_name: 'Updated Plan', status: 'approved' };
      await documentApi.update('doc-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.put).toHaveBeenCalledWith('/documents/doc-001', data);
    });

    it('delete should call DELETE /documents/:id', async () => {
      const { documentApi } = await import('../document');
      await documentApi.delete('doc-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.pm.delete).toHaveBeenCalledWith('/documents/doc-001');
    });
  });
});
