import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockWorkflowClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { workflow: mockWorkflowClient },
    default: { workflow: mockWorkflowClient },
  };
});

describe('Workflow Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('workflowDefinitionApi', () => {
    it('listWorkflows should call GET /workflows with params', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.listWorkflows({ page: 1, pagesize: 10, search: 'Leave' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/workflows', {
        params: { page: 1, pagesize: 10, search: 'Leave' },
      });
    });

    it('getWorkflow should call GET /workflows/:id', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.getWorkflow('wf-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/workflows/wf-001');
    });

    it('createWorkflow should call POST /workflows with data', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      const data = { name: 'Leave Approval', code: 'LEAVE-001' };
      await workflowDefinitionApi.createWorkflow(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows', data);
    });

    it('updateWorkflow should call PUT /workflows/:id with data', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      const data = { name: 'Updated Leave Approval' };
      await workflowDefinitionApi.updateWorkflow('wf-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.put).toHaveBeenCalledWith('/workflows/wf-001', data);
    });

    it('deleteWorkflow should call DELETE /workflows/:id', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.deleteWorkflow('wf-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.delete).toHaveBeenCalledWith('/workflows/wf-001');
    });

    it('deploy should call POST /workflows/:id/deploy', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.deploy('wf-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows/wf-001/deploy');
    });

    it('activate should call POST /workflows/:id/activate', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.activate('wf-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows/wf-001/activate');
    });

    it('deactivate should call POST /workflows/:id/deactivate', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.deactivate('wf-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows/wf-001/deactivate');
    });

    it('getVersions should call GET /workflows/:id/versions with params', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.getVersions('wf-001', { page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/workflows/wf-001/versions', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('createVersion should call POST /workflows/:id/versions with data', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      const data = { version: '2.0', description: 'Updated version' };
      await workflowDefinitionApi.createVersion('wf-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows/wf-001/versions', data);
    });

    it('rollback should call POST /workflows/:id/rollback with data', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      const data = { target_version: '1.0' };
      await workflowDefinitionApi.rollback('wf-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/workflows/wf-001/rollback', data);
    });

    it('compareVersions should call GET /workflows/:id/compare/:v1/:v2', async () => {
      const { workflowDefinitionApi } = await import('../definition');
      await workflowDefinitionApi.compareVersions('wf-001', '1.0', '2.0');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/workflows/wf-001/compare/1.0/2.0');
    });
  });

  describe('instanceApi', () => {
    it('listInstances should call GET /instances with params', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.listInstances({ page: 1, pagesize: 10, status: 'running' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/instances', {
        params: { page: 1, pagesize: 10, status: 'running' },
      });
    });

    it('start should call POST /instances with data', async () => {
      const { instanceApi } = await import('../instance');
      const data = { workflow_id: 'wf-001', variables: { employee_id: 'emp-001' } };
      await instanceApi.start(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/instances', data);
    });

    it('getInstance should call GET /instances/:id', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.getInstance('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/instances/inst-001');
    });

    it('getDetails should call GET /instances/:id/details', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.getDetails('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/instances/inst-001/details');
    });

    it('cancelInstance should call POST /instances/:id/cancel', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.cancelInstance('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/instances/inst-001/cancel');
    });

    it('suspendInstance should call POST /instances/:id/suspend', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.suspendInstance('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/instances/inst-001/suspend');
    });

    it('resumeInstance should call POST /instances/:id/resume', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.resumeInstance('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/instances/inst-001/resume');
    });

    it('getInstanceVariables should call GET /instances/:id/variables', async () => {
      const { instanceApi } = await import('../instance');
      await instanceApi.getInstanceVariables('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/instances/inst-001/variables');
    });

    it('setInstanceVariables should call POST /instances/:id/variables with data', async () => {
      const { instanceApi } = await import('../instance');
      const data = { amount: 1000 };
      await instanceApi.setInstanceVariables('inst-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/instances/inst-001/variables', data);
    });
  });

  describe('approvalApi', () => {
    it('listApprovals should call GET /approvals with params', async () => {
      const { approvalApi } = await import('../approval');
      await approvalApi.listApprovals({ page: 1, pagesize: 10, search: 'Expense' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/approvals', {
        params: { page: 1, pagesize: 10, search: 'Expense' },
      });
    });

    it('create should call POST /approvals with data', async () => {
      const { approvalApi } = await import('../approval');
      const data = { workflow_id: 'wf-001', title: 'Expense Approval' };
      await approvalApi.create(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/approvals', data);
    });

    it('get should call GET /approvals/:id', async () => {
      const { approvalApi } = await import('../approval');
      await approvalApi.get('apr-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/approvals/apr-001');
    });

    it('process should call POST /approvals/:id/process with data', async () => {
      const { approvalApi } = await import('../approval');
      const data = { action: 'approve', comment: 'Approved' };
      await approvalApi.process('apr-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/approvals/apr-001/process', data);
    });

    it('getRecords should call GET /records with params', async () => {
      const { approvalApi } = await import('../approval');
      await approvalApi.getRecords({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/records', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getRecordsByApproval should call GET /records/:id', async () => {
      const { approvalApi } = await import('../approval');
      await approvalApi.getRecordsByApproval('apr-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/records/apr-001');
    });
  });

  describe('approvalTaskApi', () => {
    it('listApprovalTasks should call GET /approval-tasks with params', async () => {
      const { approvalTaskApi } = await import('../approval');
      await approvalTaskApi.listApprovalTasks({ page: 1, pagesize: 10, status: 'pending' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/approval-tasks', {
        params: { page: 1, pagesize: 10, status: 'pending' },
      });
    });

    it('getApprovalTask should call GET /approval-tasks/:id', async () => {
      const { approvalTaskApi } = await import('../approval');
      await approvalTaskApi.getApprovalTask('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/approval-tasks/task-001');
    });

    it('approveTask should call POST /approval-tasks/:id/approve with data', async () => {
      const { approvalTaskApi } = await import('../approval');
      const data = { comment: 'Approved' };
      await approvalTaskApi.approveTask('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith(
        '/approval-tasks/task-001/approve',
        data
      );
    });

    it('rejectTask should call POST /approval-tasks/:id/reject with data', async () => {
      const { approvalTaskApi } = await import('../approval');
      const data = { comment: 'Rejected' };
      await approvalTaskApi.rejectTask('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/approval-tasks/task-001/reject', data);
    });

    it('delegateTask should call POST /approval-tasks/:id/delegate with data', async () => {
      const { approvalTaskApi } = await import('../approval');
      const data = { delegate_to: 'user-002' };
      await approvalTaskApi.delegateTask('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith(
        '/approval-tasks/task-001/delegate',
        data
      );
    });

    it('reassignTask should call POST /approval-tasks/:id/reassign with data', async () => {
      const { approvalTaskApi } = await import('../approval');
      const data = { assignee_id: 'user-003' };
      await approvalTaskApi.reassignTask('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith(
        '/approval-tasks/task-001/reassign',
        data
      );
    });

    it('claimTask should call POST /approval-tasks/:id/claim', async () => {
      const { approvalTaskApi } = await import('../approval');
      await approvalTaskApi.claimTask('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/approval-tasks/task-001/claim');
    });

    it('unclaimTask should call POST /approval-tasks/:id/unclaim', async () => {
      const { approvalTaskApi } = await import('../approval');
      await approvalTaskApi.unclaimTask('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/approval-tasks/task-001/unclaim');
    });
  });

  describe('taskApi', () => {
    it('listTasks should call GET /tasks with params', async () => {
      const { taskApi } = await import('../task');
      await taskApi.listTasks({ page: 1, pagesize: 10, status: 'pending' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/tasks', {
        params: { page: 1, pagesize: 10, status: 'pending' },
      });
    });

    it('getTask should call GET /tasks/:id', async () => {
      const { taskApi } = await import('../task');
      await taskApi.getTask('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/tasks/task-001');
    });

    it('claim should call POST /tasks/:id/claim', async () => {
      const { taskApi } = await import('../task');
      await taskApi.claim('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/task-001/claim');
    });

    it('unclaim should call POST /tasks/:id/unclaim', async () => {
      const { taskApi } = await import('../task');
      await taskApi.unclaim('task-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/task-001/unclaim');
    });

    it('complete should call POST /tasks/:id/complete with data', async () => {
      const { taskApi } = await import('../task');
      const data = { comment: 'Task completed', outcome: 'approved' };
      await taskApi.complete('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/task-001/complete', data);
    });

    it('approve should call POST /tasks/:id/approve with data', async () => {
      const { taskApi } = await import('../task');
      const data = { comment: 'Approved' };
      await taskApi.approve('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/task-001/approve', data);
    });

    it('reject should call POST /tasks/:id/reject with data', async () => {
      const { taskApi } = await import('../task');
      const data = { comment: 'Rejected' };
      await taskApi.reject('task-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/task-001/reject', data);
    });

    it('myTasks should call GET /tasks/my with params', async () => {
      const { taskApi } = await import('../task');
      await taskApi.myTasks({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/tasks/my', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('myPending should call GET /tasks/my/pending with params', async () => {
      const { taskApi } = await import('../task');
      await taskApi.myPending({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/tasks/my/pending', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('myCompleted should call GET /tasks/my/completed with params', async () => {
      const { taskApi } = await import('../task');
      await taskApi.myCompleted({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/tasks/my/completed', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('batchApprove should call POST /tasks/batch/approve with data', async () => {
      const { taskApi } = await import('../task');
      const data = { task_ids: ['task-001', 'task-002'], comment: 'Batch approved' };
      await taskApi.batchApprove(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/batch/approve', data);
    });

    it('batchComplete should call POST /tasks/batch/complete with data', async () => {
      const { taskApi } = await import('../task');
      const data = { task_ids: ['task-001', 'task-002'], comment: 'Batch completed' };
      await taskApi.batchComplete(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/tasks/batch/complete', data);
    });
  });

  describe('templateApi', () => {
    it('listTemplates should call GET /templates with params', async () => {
      const { templateApi } = await import('../template');
      await templateApi.listTemplates({ page: 1, pagesize: 10, search: 'Leave' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/templates', {
        params: { page: 1, pagesize: 10, search: 'Leave' },
      });
    });

    it('getTemplate should call GET /templates/:id', async () => {
      const { templateApi } = await import('../template');
      await templateApi.getTemplate('tpl-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/templates/tpl-001');
    });

    it('createTemplate should call POST /templates with data', async () => {
      const { templateApi } = await import('../template');
      const data = { name: 'Leave Template', workflow_id: 'wf-001' };
      await templateApi.createTemplate(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/templates', data);
    });

    it('updateTemplate should call PUT /templates/:id with data', async () => {
      const { templateApi } = await import('../template');
      const data = { name: 'Updated Template' };
      await templateApi.updateTemplate('tpl-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.put).toHaveBeenCalledWith('/templates/tpl-001', data);
    });

    it('deleteTemplate should call DELETE /templates/:id', async () => {
      const { templateApi } = await import('../template');
      await templateApi.deleteTemplate('tpl-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.delete).toHaveBeenCalledWith('/templates/tpl-001');
    });

    it('copyTemplate should call POST /templates/:id/copy with data', async () => {
      const { templateApi } = await import('../template');
      const data = { name: 'Copied Template' };
      await templateApi.copyTemplate('tpl-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/templates/tpl-001/copy', data);
    });
  });

  describe('monitorApi', () => {
    it('listInstances should call GET /monitor/instances with params', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.listInstances({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/instances', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getInstanceDetail should call GET /monitor/instances/:id', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getInstanceDetail('inst-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/instances/inst-001');
    });

    it('getStatistics should call GET /monitor/statistics with params', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getStatistics({ start_date: '2024-01-01', end_date: '2024-01-31' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/statistics', {
        params: { start_date: '2024-01-01', end_date: '2024-01-31' },
      });
    });

    it('getRealTimeStats should call GET /monitor/realtime', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getRealTimeStats();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/realtime');
    });

    it('getDashboardData should call GET /monitor/dashboard', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getDashboardData();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/dashboard');
    });

    it('getEfficiencyAnalysis should call GET /monitor/analysis/efficiency with params', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getEfficiencyAnalysis({ period: 'monthly' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/analysis/efficiency', {
        params: { period: 'monthly' },
      });
    });

    it('getTrendData should call GET /monitor/analysis/trend with params', async () => {
      const { monitorApi } = await import('../monitor');
      await monitorApi.getTrendData({ period: 'weekly' });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/monitor/analysis/trend', {
        params: { period: 'weekly' },
      });
    });
  });

  describe('delegateApi', () => {
    it('listDelegates should call GET /delegates with params', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.listDelegates({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/delegates', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getDelegate should call GET /delegates/:id', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.getDelegate('del-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/delegates/del-001');
    });

    it('createDelegate should call POST /delegates with data', async () => {
      const { delegateApi } = await import('../delegate');
      const data = { delegate_to: 'user-002', start_date: '2024-01-01', end_date: '2024-01-31' };
      await delegateApi.createDelegate(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/delegates', data);
    });

    it('updateDelegate should call PUT /delegates/:id with data', async () => {
      const { delegateApi } = await import('../delegate');
      const data = { end_date: '2024-02-15' };
      await delegateApi.updateDelegate('del-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.put).toHaveBeenCalledWith('/delegates/del-001', data);
    });

    it('deleteDelegate should call DELETE /delegates/:id', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.deleteDelegate('del-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.delete).toHaveBeenCalledWith('/delegates/del-001');
    });

    it('activate should call POST /delegates/:id/activate', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.activate('del-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/delegates/del-001/activate');
    });

    it('deactivate should call POST /delegates/:id/deactivate', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.deactivate('del-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/delegates/del-001/deactivate');
    });

    it('getMyDelegates should call GET /delegates/my with params', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.getMyDelegates({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/delegates/my', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getMyAttorneys should call GET /delegates/my/attorneys with params', async () => {
      const { delegateApi } = await import('../delegate');
      await delegateApi.getMyAttorneys({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/delegates/my/attorneys', {
        params: { page: 1, pagesize: 10 },
      });
    });
  });

  describe('categoryApi', () => {
    it('listCategories should call GET /categories with params', async () => {
      const { categoryApi } = await import('../category');
      await categoryApi.listCategories({ page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/categories', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('getCategory should call GET /categories/:id', async () => {
      const { categoryApi } = await import('../category');
      await categoryApi.getCategory('cat-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/categories/cat-001');
    });

    it('createCategory should call POST /categories with data', async () => {
      const { categoryApi } = await import('../category');
      const data = { name: 'HR Workflows', code: 'HR' };
      await categoryApi.createCategory(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/categories', data);
    });

    it('updateCategory should call PUT /categories/:id with data', async () => {
      const { categoryApi } = await import('../category');
      const data = { name: 'HR Workflows Updated' };
      await categoryApi.updateCategory('cat-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.put).toHaveBeenCalledWith('/categories/cat-001', data);
    });

    it('deleteCategory should call DELETE /categories/:id', async () => {
      const { categoryApi } = await import('../category');
      await categoryApi.deleteCategory('cat-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.delete).toHaveBeenCalledWith('/categories/cat-001');
    });

    it('getActiveCategories should call GET /categories/active', async () => {
      const { categoryApi } = await import('../category');
      await categoryApi.getActiveCategories();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/categories/active');
    });

    it('getCategoryWorkflows should call GET /categories/:id/workflows with params', async () => {
      const { categoryApi } = await import('../category');
      await categoryApi.getCategoryWorkflows('cat-001', { page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/categories/cat-001/workflows', {
        params: { page: 1, pagesize: 10 },
      });
    });
  });

  describe('workflowApi', () => {
    it('getStatistics should call GET /statistics', async () => {
      const { workflowApi } = await import('../index');
      await workflowApi.getStatistics();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/statistics');
    });

    it('getPerformance should call GET /performance', async () => {
      const { workflowApi } = await import('../index');
      await workflowApi.getPerformance();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/performance');
    });

    it('resetPerformance should call POST /performance/reset', async () => {
      const { workflowApi } = await import('../index');
      await workflowApi.resetPerformance();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.post).toHaveBeenCalledWith('/performance/reset');
    });

    it('health should call GET /health', async () => {
      const { workflowApi } = await import('../index');
      await workflowApi.health();
      const { apiClient } = await import('../../client');
      expect(apiClient.workflow.get).toHaveBeenCalledWith('/health');
    });
  });
});
