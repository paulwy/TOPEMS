import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataWorkflowAutomationApiV78 } from '../master/dataWorkflowAutomationV78';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    master: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockGet = apiClient.master.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.master.post as ReturnType<typeof vi.fn>;
const mockPut = apiClient.master.put as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.master.patch as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.master.delete as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ===== 工作流定义管理 =====
describe('V163 · 工作流定义管理', () => {
  it('创建工作流', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'w1', name: 'Test WF', status: 'draft', version: '1.0', steps: [] },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.createWorkflow({
      name: 'Test WF',
      trigger_type: 'manual',
      entity_type: 'user',
      steps: [],
    });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/workflows', {
      name: 'Test WF',
      trigger_type: 'manual',
      entity_type: 'user',
      steps: [],
    });
  });

  it('获取工作流详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'w1', name: 'Test WF', status: 'active', version: '1.0', steps: [] },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getWorkflow('w1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/workflows/w1');
  });

  it('列表查询 - 带参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listWorkflows({
      entity_type: 'user',
      status: 'active',
      search: 'test',
      page: 2,
      page_size: 10,
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/mdm-v78/workflows?entity_type=user&status=active&q=test&page=2&page_size=10'
    );
  });

  it('列表查询 - 无参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listWorkflows();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/workflows');
  });

  it('更新工作流', async () => {
    mockPut.mockResolvedValueOnce({
      data: { id: 'w1', name: 'Updated WF', status: 'draft', version: '1.0', steps: [] },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.updateWorkflow('w1', { name: 'Updated WF' });

    expect(mockPut).toHaveBeenCalledWith('/mdm-v78/workflows/w1', { name: 'Updated WF' });
  });

  it('删除工作流', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.deleteWorkflow('w1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v78/workflows/w1');
  });

  it('设置工作流状态', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { id: 'w1', status: 'active', version: '1.0', steps: [] },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.setWorkflowStatus('w1', 'active');

    expect(mockPatch).toHaveBeenCalledWith('/mdm-v78/workflows/w1/status', { status: 'active' });
  });
});

// ===== 数据变更审批 =====
describe('V163 · 数据变更审批', () => {
  it('创建审批', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'a1', workflow_id: 'w1', status: 'pending' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.createApproval({
      workflow_id: 'w1',
      entity_type: 'user',
      entity_id: 'u1',
    });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/approvals', {
      workflow_id: 'w1',
      entity_type: 'user',
      entity_id: 'u1',
    });
  });

  it('获取审批详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'a1', status: 'pending' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getApproval('a1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/approvals/a1');
  });

  it('列表审批 - 带过滤', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listApprovals({ status: 'pending', approver: 'user1' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/approvals?status=pending&approver=user1');
  });

  it('审批操作', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'a1', status: 'approved' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.reviewApproval('a1', { action: 'approve', comment: 'OK' });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/approvals/a1/review', {
      action: 'approve',
      comment: 'OK',
    });
  });

  it('获取我的审批', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getMyApprovals({ status: 'pending' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/approvals/my?status=pending');
  });

  it('获取审批统计', async () => {
    mockGet.mockResolvedValueOnce({
      data: { pending: 5, approved: 10, rejected: 2, escalated: 1, cancelled: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getApprovalStats();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/approvals/stats');
  });
});

// ===== 自动化工作流执行 =====
describe('V163 · 自动化工作流执行', () => {
  it('执行工作流', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', workflow_id: 'w1', status: 'running' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.executeWorkflow('w1', { input_data: { key: 'val' } });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/workflows/w1/execute', {
      input_data: { key: 'val' },
    });
  });

  it('执行工作流 - 无参数', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'queued' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.executeWorkflow('w1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/workflows/w1/execute', {});
  });

  it('获取执行详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'e1', status: 'completed' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getExecution('e1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/executions/e1');
  });

  it('取消执行', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'cancelled' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.cancelExecution('e1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/executions/e1/cancel', {});
  });

  it('重试执行', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'running' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.retryExecution('e1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/executions/e1/retry', {});
  });
});

// ===== 工作流监控与日志 =====
describe('V163 · 工作流监控与日志', () => {
  it('获取执行日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listExecutionLogs('e1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/executions/e1/logs');
  });

  it('获取错误日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getErrorLogs({ workflow_id: 'w1', limit: 10 });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/logs/errors?workflow_id=w1&limit=10');
  });
});

// ===== 数据映射与转换 =====
describe('V163 · 数据映射与转换', () => {
  it('创建映射', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'm1', name: 'User Mapping', status: 'active' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.createMapping({
      name: 'User Mapping',
      source_entity: 'legacy_user',
      target_entity: 'user',
      source_field: 'user_name',
      target_field: 'username',
    });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/mappings', {
      name: 'User Mapping',
      source_entity: 'legacy_user',
      target_entity: 'user',
      source_field: 'user_name',
      target_field: 'username',
    });
  });

  it('获取映射详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'm1', name: 'User Mapping' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getMapping('m1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/mappings/m1');
  });

  it('列表映射 - 带过滤', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listMappings({ source_entity: 'user', status: 'active' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/mappings?source_entity=user&status=active');
  });

  it('删除映射', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.deleteMapping('m1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v78/mappings/m1');
  });

  it('测试映射', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, transformed_data: { username: 'john' } },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.testMapping('m1', { user_name: 'john_doe' });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/mappings/m1/test', {
      sample_data: { user_name: 'john_doe' },
    });
  });
});

// ===== 工作流版本管理 =====
describe('V163 · 工作流版本管理', () => {
  it('列出工作流版本', async () => {
    mockGet.mockResolvedValueOnce({
      data: { versions: ['1.0', '1.1', '2.0'], current: '2.0' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.listWorkflowVersions('w1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/workflows/w1/versions');
  });

  it('获取指定版本', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'w1', version: '1.0' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getWorkflowVersion('w1', '1.0');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/workflows/w1/versions/1.0');
  });

  it('提升版本', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'w1', version: '2.0', status: 'active' },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.promoteVersion('w1', '2.0');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v78/workflows/w1/versions/2.0/promote', {});
  });

  it('对比版本差异', async () => {
    mockGet.mockResolvedValueOnce({
      data: { added_steps: [], removed_steps: [], modified_steps: ['step1'] },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.diffWorkflowVersions('w1', '1.0', '2.0');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/workflows/w1/diff?v1=1.0&v2=2.0');
  });
});

// ===== 工作流仪表板 =====
describe('V163 · 工作流仪表板', () => {
  it('获取仪表板数据', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_workflows: 10,
        active_workflows: 5,
        pending_approvals: 3,
        completed_today: 12,
        failed_today: 1,
        avg_execution_time_ms: 1500,
        approval_rate: 0.85,
        recent_executions: [],
      },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getDashboard();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/dashboard');
  });

  it('获取工作流统计', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        by_entity_type: { user: 5, order: 3 },
        by_trigger_type: { manual: 4, event: 4, schedule: 2 },
        avg_approval_time_ms: 3600000,
        execution_success_rate: 0.92,
      },
      status: 200,
    });

    await dataWorkflowAutomationApiV78.getWorkflowStats();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v78/stats');
  });
});
