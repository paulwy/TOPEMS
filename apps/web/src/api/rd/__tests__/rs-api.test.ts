import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  BatchCreateProjectsRequest,
  BatchDeleteProjectsRequest,
  CreateBugRequest,
  CreateBuildRequest,
  CreateExperimentRecordRequest,
  CreateExperimentRequest,
  CreateFormulaRequest,
  CreateFormulaVersionRequest,
  CreateProjectRequest,
  CreateTestCaseRequest,
  UpdateBugRequest,
  UpdateExperimentRequest,
  UpdateFormulaRequest,
  UpdateProjectRequest,
  UpdateTestCaseRequest,
} from '../types';

vi.mock('../../client', () => {
  const mockRdClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { rd: mockRdClient },
    default: { rd: mockRdClient },
  };
});

describe('RS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('projectApi', () => {
    it('listProjects should call GET /projects with params', async () => {
      const { projectApi } = await import('../project');
      await projectApi.listProjects({ page: 1, pagesize: 10, search: 'test', status: 'active' });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith(
        '/projects?page=1&pagesize=10&search=test&status=active'
      );
    });

    it('listProjects should call GET /projects without params', async () => {
      const { projectApi } = await import('../project');
      await projectApi.listProjects();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/projects');
    });

    it('getProject should call GET /projects/:id', async () => {
      const { projectApi } = await import('../project');
      await projectApi.getProject('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('createProject should call POST /projects with data', async () => {
      const { projectApi } = await import('../project');
      const data = { name: 'Project A', project_no: 'PROJ-001' };
      await projectApi.createProject(data as unknown as CreateProjectRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/projects', data);
    });

    it('updateProject should call PUT /projects/:id with data', async () => {
      const { projectApi } = await import('../project');
      const data = { name: 'Updated Project' };
      await projectApi.updateProject('proj-001', data as Partial<UpdateProjectRequest>);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.put).toHaveBeenCalledWith('/projects/proj-001', data);
    });

    it('deleteProject should call DELETE /projects/:id', async () => {
      const { projectApi } = await import('../project');
      await projectApi.deleteProject('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('batchCreateProjects should call POST /projects/batch with data', async () => {
      const { projectApi } = await import('../project');
      const data = { projects: [{ name: 'Project A' }] };
      await projectApi.batchCreateProjects(data as unknown as BatchCreateProjectsRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/projects/batch', data);
    });

    it('batchDeleteProjects should call DELETE /projects/batch with data', async () => {
      const { projectApi } = await import('../project');
      const data = { ids: ['proj-001', 'proj-002'] };
      await projectApi.batchDeleteProjects(data as unknown as BatchDeleteProjectsRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/projects/batch', { data });
    });

    it('getProjectDashboard should call GET /projects/:id/dashboard', async () => {
      const { projectApi } = await import('../project');
      await projectApi.getProjectDashboard('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/projects/proj-001/dashboard');
    });

    it('getProjectGantt should call GET /projects/:id/gantt', async () => {
      const { projectApi } = await import('../project');
      await projectApi.getProjectGantt('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/projects/proj-001/gantt');
    });
  });

  describe('experimentApi', () => {
    it('listExperiments should call GET /experiments with params', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listExperiments({
        page: 1,
        pagesize: 10,
        search: 'test',
        status: 'active',
      });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith(
        '/experiments?page=1&pagesize=10&search=test&status=active'
      );
    });

    it('listExperiments should call GET /experiments without params', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listExperiments();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments');
    });

    it('getExperiment should call GET /experiments/:id', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.getExperiment('exp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments/exp-001');
    });

    it('createExperiment should call POST /experiments with data', async () => {
      const { experimentApi } = await import('../experiment');
      const data = { name: 'Experiment A', experiment_no: 'EXP-001' };
      await experimentApi.createExperiment(data as unknown as CreateExperimentRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/experiments', data);
    });

    it('updateExperiment should call PUT /experiments/:id with data', async () => {
      const { experimentApi } = await import('../experiment');
      const data = { name: 'Updated Experiment' };
      await experimentApi.updateExperiment('exp-001', data as Partial<UpdateExperimentRequest>);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.put).toHaveBeenCalledWith('/experiments/exp-001', data);
    });

    it('deleteExperiment should call DELETE /experiments/:id', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.deleteExperiment('exp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/experiments/exp-001');
    });

    it('listExperimentsByProject should call GET /experiments/project/:projectId', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listExperimentsByProject('proj-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments/project/proj-001');
    });

    it('listLabExperiments should call GET /experiments/phase/lab with params', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listLabExperiments({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments/phase/lab?page=1&pagesize=10');
    });

    it('listPilotExperiments should call GET /experiments/phase/pilot with params', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listPilotExperiments({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments/phase/pilot?page=1&pagesize=10');
    });

    it('listScaleupExperiments should call GET /experiments/phase/scaleup with params', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.listScaleupExperiments({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith(
        '/experiments/phase/scaleup?page=1&pagesize=10'
      );
    });

    it('advancePhase should call POST /experiments/:id/advance-phase with data', async () => {
      const { experimentApi } = await import('../experiment');
      const data = { new_status: 'pilot' };
      await experimentApi.advancePhase('exp-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/experiments/exp-001/advance-phase', data);
    });

    it('traceBatch should call GET /batch-trace/:batchNumber', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.traceBatch('batch-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/batch-trace/batch-001');
    });

    it('getExperimentRecords should call GET /experiments/:experimentId/records', async () => {
      const { experimentApi } = await import('../experiment');
      await experimentApi.getExperimentRecords('exp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/experiments/exp-001/records');
    });

    it('createExperimentRecord should call POST /experiments/:experimentId/records with data', async () => {
      const { experimentApi } = await import('../experiment');
      const data = { record_data: 'test data' };
      await experimentApi.createExperimentRecord(
        'exp-001',
        data as unknown as CreateExperimentRecordRequest
      );
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/experiments/exp-001/records', data);
    });
  });

  describe('formulaApi', () => {
    it('listFormulas should call GET /formulas with params', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.listFormulas({ project_id: 'proj-001', status: 'active' });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/formulas?project_id=proj-001&status=active');
    });

    it('listFormulas should call GET /formulas without params', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.listFormulas();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/formulas');
    });

    it('getFormula should call GET /formulas/:id', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.getFormula('formula-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/formulas/formula-001');
    });

    it('createFormula should call POST /formulas with data', async () => {
      const { formulaApi } = await import('../formula');
      const data = { name: 'Formula A', formula_no: 'FORM-001' };
      await formulaApi.createFormula(data as unknown as CreateFormulaRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/formulas', data);
    });

    it('updateFormula should call PUT /formulas/:id with data', async () => {
      const { formulaApi } = await import('../formula');
      const data = { name: 'Updated Formula' };
      await formulaApi.updateFormula('formula-001', data as Partial<UpdateFormulaRequest>);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.put).toHaveBeenCalledWith('/formulas/formula-001', data);
    });

    it('deleteFormula should call DELETE /formulas/:id', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.deleteFormula('formula-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/formulas/formula-001');
    });

    it('listVersions should call GET /formulas/:formulaId/versions', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.listVersions('formula-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/formulas/formula-001/versions');
    });

    it('createVersion should call POST /formulas/:formulaId/versions with data', async () => {
      const { formulaApi } = await import('../formula');
      const data = { version: '1.0', content: {} };
      await formulaApi.createVersion('formula-001', data as unknown as CreateFormulaVersionRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/formulas/formula-001/versions', data);
    });

    it('approveFormula should call POST /formulas/:id/approve', async () => {
      const { formulaApi } = await import('../formula');
      await formulaApi.approveFormula('formula-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/formulas/formula-001/approve', {});
    });
  });

  describe('bugApi', () => {
    it('listBugs should call GET /bugs with params', async () => {
      const { bugApi } = await import('../bug');
      await bugApi.listBugs({ page: 1, pagesize: 10, severity: 'high', status: 'open' });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith(
        '/bugs?page=1&pagesize=10&severity=high&status=open'
      );
    });

    it('listBugs should call GET /bugs without params', async () => {
      const { bugApi } = await import('../bug');
      await bugApi.listBugs();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/bugs');
    });

    it('getBug should call GET /bugs/:id', async () => {
      const { bugApi } = await import('../bug');
      await bugApi.getBug('bug-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/bugs/bug-001');
    });

    it('createBug should call POST /bugs with data', async () => {
      const { bugApi } = await import('../bug');
      const data = { title: 'Bug A', severity: 'high' };
      await bugApi.createBug(data as unknown as CreateBugRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/bugs', data);
    });

    it('updateBug should call PUT /bugs/:id with data', async () => {
      const { bugApi } = await import('../bug');
      const data = { title: 'Updated Bug', status: 'fixed' };
      await bugApi.updateBug('bug-001', data as Partial<UpdateBugRequest>);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.put).toHaveBeenCalledWith('/bugs/bug-001', data);
    });

    it('deleteBug should call DELETE /bugs/:id', async () => {
      const { bugApi } = await import('../bug');
      await bugApi.deleteBug('bug-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/bugs/bug-001');
    });
  });

  describe('testApi', () => {
    it('listTests should call GET /tests with params', async () => {
      const { testApi } = await import('../test');
      await testApi.listTests({ page: 1, pagesize: 10, case_type: 'unit', priority: 'high' });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith(
        '/tests?page=1&pagesize=10&case_type=unit&priority=high'
      );
    });

    it('listTests should call GET /tests without params', async () => {
      const { testApi } = await import('../test');
      await testApi.listTests();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/tests');
    });

    it('getTest should call GET /tests/:id', async () => {
      const { testApi } = await import('../test');
      await testApi.getTest('test-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/tests/test-001');
    });

    it('createTest should call POST /tests with data', async () => {
      const { testApi } = await import('../test');
      const data = { name: 'Test Case A', case_type: 'unit' };
      await testApi.createTest(data as unknown as CreateTestCaseRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/tests', data);
    });

    it('updateTest should call PUT /tests/:id with data', async () => {
      const { testApi } = await import('../test');
      const data = { name: 'Updated Test Case', status: 'passed' };
      await testApi.updateTest('test-001', data as Partial<UpdateTestCaseRequest>);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.put).toHaveBeenCalledWith('/tests/test-001', data);
    });

    it('deleteTest should call DELETE /tests/:id', async () => {
      const { testApi } = await import('../test');
      await testApi.deleteTest('test-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.delete).toHaveBeenCalledWith('/tests/test-001');
    });
  });

  describe('buildApi', () => {
    it('listBuilds should call GET /builds with params', async () => {
      const { buildApi } = await import('../build');
      await buildApi.listBuilds({ page: 1, pagesize: 10, status: 'success' });
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/builds?page=1&pagesize=10&status=success');
    });

    it('listBuilds should call GET /builds without params', async () => {
      const { buildApi } = await import('../build');
      await buildApi.listBuilds();
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/builds');
    });

    it('getBuild should call GET /builds/:id', async () => {
      const { buildApi } = await import('../build');
      await buildApi.getBuild('build-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.get).toHaveBeenCalledWith('/builds/build-001');
    });

    it('createBuild should call POST /builds with data', async () => {
      const { buildApi } = await import('../build');
      const data = { build_task: 'task-001', version: '1.0.0' };
      await buildApi.createBuild(data as unknown as CreateBuildRequest);
      const { apiClient } = await import('../../client');
      expect(apiClient.rd.post).toHaveBeenCalledWith('/builds', data);
    });
  });
});
