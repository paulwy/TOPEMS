import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockLimsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:3000/lims' },
  };
  return {
    apiClient: { lims: mockLimsClient },
    default: { lims: mockLimsClient },
  };
});

describe('LIMS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sampleApi', () => {
    it('listSamples should call GET /samples with params', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await sampleApi.listSamples({ page: 1, pagesize: 10 });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/samples', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('listSamples should call GET /samples without params', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await sampleApi.listSamples();
      expect(apiClient.lims.get).toHaveBeenCalledWith('/samples', { params: undefined });
    });

    it('getSample should call GET /samples/:id', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await sampleApi.getSample('sample-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/samples/sample-001');
    });

    it('createSample should call POST /samples with data', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { sample_no: 'S-001', sample_name: 'Test Sample', sample_type: 'water' };
      await sampleApi.createSample(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/samples', data);
    });

    it('updateSample should call PUT /samples/:id with data', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { sample_name: 'Updated Sample' };
      await sampleApi.updateSample('sample-001', data as any);
      expect(apiClient.lims.put).toHaveBeenCalledWith('/samples/sample-001', data);
    });

    it('deleteSample should call DELETE /samples/:id', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      await sampleApi.deleteSample('sample-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/samples/sample-001');
    });

    it('batchCreateSamples should call POST /samples/batch with data', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { samples: [{ sample_no: 'S-001' }, { sample_no: 'S-002' }] };
      await sampleApi.batchCreateSamples(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/samples/batch', data);
    });

    it('getSampleLifecycle should call GET /samples/:id/lifecycle', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await sampleApi.getSampleLifecycle('sample-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/samples/sample-001/lifecycle');
    });

    it('transitionSampleStage should call POST /samples/:id/transition-stage with data', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { stage: 'testing', operator: 'John' };
      await sampleApi.transitionSampleStage('sample-001', data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith(
        '/samples/sample-001/transition-stage',
        data
      );
    });

    it('getSampleTraceability should call GET /samples/:id/traceability', async () => {
      const { sampleApi } = await import('../sample');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await sampleApi.getSampleTraceability('sample-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/samples/sample-001/traceability');
    });
  });

  describe('taskApi', () => {
    it('listTasks should call GET /tasks with params', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await taskApi.listTasks({ page: 1, pagesize: 10, status: 'pending' });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/tasks', {
        params: { page: 1, pagesize: 10, status: 'pending' },
      });
    });

    it('getTask should call GET /tasks/:id', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await taskApi.getTask('task-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/tasks/task-001');
    });

    it('createTask should call POST /tasks with data', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { sample_id: 'sample-001', task_type: 'testing' };
      await taskApi.createTask(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/tasks', data);
    });

    it('updateTask should call PUT /tasks/:id with data', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { status: 'in_progress' };
      await taskApi.updateTask('task-001', data as any);
      expect(apiClient.lims.put).toHaveBeenCalledWith('/tasks/task-001', data);
    });

    it('deleteTask should call DELETE /tasks/:id', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      await taskApi.deleteTask('task-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/tasks/task-001');
    });

    it('listTasksBySample should call GET /tasks/sample/:sampleId', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await taskApi.listTasksBySample('sample-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/tasks/sample/sample-001');
    });

    it('completeStep should call POST /tasks/:id/complete_step with data', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { step_name: 'testing', result: 'pass' };
      await taskApi.completeStep('task-001', data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/tasks/task-001/complete_step', {
        ...data,
        task_id: 'task-001',
      });
    });

    it('submitResult should call POST /tasks/:id/submit-result with data', async () => {
      const { taskApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { result: 'pass', conclusion: 'qualified', inspector: 'John' };
      await taskApi.submitResult('task-001', data);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/tasks/task-001/submit-result', data);
    });
  });

  describe('instrumentApi', () => {
    it('listInstruments should call GET /instruments with params', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await instrumentApi.listInstruments({ page: 1, pagesize: 10 });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/instruments', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getInstrument should call GET /instruments/:id', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await instrumentApi.getInstrument('inst-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/instruments/inst-001');
    });

    it('createInstrument should call POST /instruments with data', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Instrument', model: 'Model A', serial_no: 'SN-001' };
      await instrumentApi.createInstrument(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/instruments', data);
    });

    it('updateInstrument should call PUT /instruments/:id with data', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Instrument' };
      await instrumentApi.updateInstrument('inst-001', data as any);
      expect(apiClient.lims.put).toHaveBeenCalledWith('/instruments/inst-001', data);
    });

    it('deleteInstrument should call DELETE /instruments/:id', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      await instrumentApi.deleteInstrument('inst-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/instruments/inst-001');
    });

    it('calibrate should call POST /instruments/:id/calibrate with data', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { calibration_date: '2024-01-15', technician: 'John' };
      await instrumentApi.calibrate('inst-001', data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/instruments/inst-001/calibrate', data);
    });

    it('listCalibrationRecords should call GET /instruments/:id/calibrations', async () => {
      const { instrumentApi } = await import('../instrument');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await instrumentApi.listCalibrationRecords('inst-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/instruments/inst-001/calibrations');
    });
  });

  describe('reagentApi', () => {
    it('listReagents should call GET /reagents with params', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await reagentApi.listReagents({ page: 1, pagesize: 10 });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/reagents', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getReagent should call GET /reagents/:id', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await reagentApi.getReagent('reagent-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/reagents/reagent-001');
    });

    it('createReagent should call POST /reagents with data', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Reagent', batch_no: 'B-001', quantity: 100 };
      await reagentApi.createReagent(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/reagents', data);
    });

    it('updateReagent should call PUT /reagents/:id with data', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { quantity: 150 };
      await reagentApi.updateReagent('reagent-001', data as any);
      expect(apiClient.lims.put).toHaveBeenCalledWith('/reagents/reagent-001', data);
    });

    it('deleteReagent should call DELETE /reagents/:id', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      await reagentApi.deleteReagent('reagent-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/reagents/reagent-001');
    });

    it('listLowStock should call GET /reagents/low-stock', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await reagentApi.listLowStock();
      expect(apiClient.lims.get).toHaveBeenCalledWith('/reagents/low-stock');
    });

    it('listExpiring should call GET /reagents/expiring with params', async () => {
      const { reagentApi } = await import('../reagent');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await reagentApi.listExpiring(30);
      expect(apiClient.lims.get).toHaveBeenCalledWith('/reagents/expiring', {
        params: { days: 30 },
      });
    });
  });

  describe('testMethodApi', () => {
    it('listTestMethods should call GET /test-methods with params', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await testMethodApi.listTestMethods({ page: 1, pagesize: 10 });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/test-methods', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getTestMethod should call GET /test-methods/:id', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await testMethodApi.getTestMethod('method-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/test-methods/method-001');
    });

    it('createTestMethod should call POST /test-methods with data', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Test Method', code: 'TM-001', category: 'chemical' };
      await testMethodApi.createTestMethod(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/test-methods', data);
    });

    it('updateTestMethod should call PUT /test-methods/:id with data', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.put as vi.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Updated Method' };
      await testMethodApi.updateTestMethod('method-001', data as any);
      expect(apiClient.lims.put).toHaveBeenCalledWith('/test-methods/method-001', data);
    });

    it('deleteTestMethod should call DELETE /test-methods/:id', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      await testMethodApi.deleteTestMethod('method-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/test-methods/method-001');
    });

    it('listMethodVersions should call GET /test-methods/:id/versions', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await testMethodApi.listMethodVersions('method-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/test-methods/method-001/versions');
    });

    it('createNewVersion should call POST /test-methods/:id/new-version with data', async () => {
      const { testMethodApi } = await import('../testMethod');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { version: '2.0', change_log: 'Updated method' };
      await testMethodApi.createNewVersion('method-001', data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith(
        '/test-methods/method-001/new-version',
        data
      );
    });
  });

  describe('recordApi', () => {
    it('listRecords should call GET /records with params', async () => {
      const { recordApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await recordApi.listRecords({ page: 1, pagesize: 10 });
      expect(apiClient.lims.get).toHaveBeenCalledWith('/records', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getRecord should call GET /records/:id', async () => {
      const { recordApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: {} });
      await recordApi.getRecord('record-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/records/record-001');
    });

    it('createRecord should call POST /records with data', async () => {
      const { recordApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.post as vi.Mock).mockResolvedValue({ data: {} });
      const data = { task_id: 'task-001', result: 'pass' };
      await recordApi.createRecord(data as any);
      expect(apiClient.lims.post).toHaveBeenCalledWith('/records', data);
    });

    it('deleteRecord should call DELETE /records/:id', async () => {
      const { recordApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      await recordApi.deleteRecord('record-001');
      expect(apiClient.lims.delete).toHaveBeenCalledWith('/records/record-001');
    });

    it('listRecordsByTask should call GET /records/task/:taskId', async () => {
      const { recordApi } = await import('../inspection');
      const { apiClient } = await import('../../client');
      (apiClient.lims.get as vi.Mock).mockResolvedValue({ data: [] });
      await recordApi.listRecordsByTask('task-001');
      expect(apiClient.lims.get).toHaveBeenCalledWith('/records/task/task-001');
    });
  });
});
