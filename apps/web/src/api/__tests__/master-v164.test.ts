import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataPolicyConfigurationApiV79 } from '../master/dataPolicyConfigurationV79';
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

// ===== 策略管理 =====
describe('V164 · 策略管理', () => {
  it('创建策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        id: 'p1',
        name: 'Data Classification',
        policy_type: 'classification',
        status: 'draft',
      },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.createPolicy({
      name: 'Data Classification',
      policy_type: 'classification',
      rules: [
        {
          id: 'r1',
          name: 'Rule 1',
          condition: 'level > 3',
          action: 'encrypt',
          priority: 1,
          enabled: true,
        },
      ],
    });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies', {
      name: 'Data Classification',
      policy_type: 'classification',
      rules: [
        {
          id: 'r1',
          name: 'Rule 1',
          condition: 'level > 3',
          action: 'encrypt',
          priority: 1,
          enabled: true,
        },
      ],
    });
  });

  it('获取策略详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'p1', name: 'Data Classification', status: 'active' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicy('p1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1');
  });

  it('列表查询 - 带参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, pagesize: 20 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listPolicies({
      policy_type: 'classification',
      status: 'active',
      keyword: 'test',
      page: 2,
      pagesize: 10,
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/mdm-v79/policies?page=2&pagesize=10&policy_type=classification&status=active&keyword=test'
    );
  });

  it('列表查询 - 无参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, pagesize: 20 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listPolicies();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies');
  });

  it('更新策略', async () => {
    mockPut.mockResolvedValueOnce({
      data: { id: 'p1', name: 'Updated Policy' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.updatePolicy('p1', { name: 'Updated Policy' });

    expect(mockPut).toHaveBeenCalledWith('/mdm-v79/policies/p1', { name: 'Updated Policy' });
  });

  it('删除策略', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.deletePolicy('p1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v79/policies/p1');
  });

  it('设置策略状态', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { id: 'p1', status: 'active' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.setPolicyStatus('p1', 'active');

    expect(mockPatch).toHaveBeenCalledWith('/mdm-v79/policies/p1/status', { status: 'active' });
  });
});

// ===== 策略版本管理 =====
describe('V164 · 策略版本管理', () => {
  it('列出策略版本', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, pagesize: 20 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listPolicyVersions('p1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1/versions');
  });

  it('获取特定版本', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'v1', policy_id: 'p1', version: '1.0', status: 'published' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicyVersion('p1', '1.0');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1/versions/1.0');
  });

  it('发布版本', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'p1', version: '2.0', status: 'active' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.publishPolicyVersion('p1', '2.0');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/p1/versions/2.0/publish', {});
  });

  it('版本差异对比', async () => {
    mockGet.mockResolvedValueOnce({
      data: { added: ['rule3'], removed: ['rule1'], modified: ['rule2'] },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.diffPolicyVersions('p1', '1.0', '2.0');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1/versions/diff?v1=1.0&v2=2.0');
  });
});

// ===== 策略执行与监控 =====
describe('V164 · 策略执行与监控', () => {
  it('执行策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', policy_id: 'p1', status: 'completed' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.executePolicy('p1', { dry_run: true });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/p1/execute', { dry_run: true });
  });

  it('执行策略 - 无参数', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'queued' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.executePolicy('p1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/p1/execute', {});
  });

  it('获取执行详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'e1', status: 'completed', records_affected: 150 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getExecution('e1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/executions/e1');
  });

  it('列出执行记录', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, pagesize: 20 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listExecutions({ policy_id: 'p1', status: 'completed' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/executions?policy_id=p1&status=completed');
  });

  it('取消执行', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'cancelled' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.cancelExecution('e1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/executions/e1/cancel', {});
  });

  it('重试执行', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'running' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.retryExecution('e1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/executions/e1/retry', {});
  });

  it('获取执行日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 'l1', action: 'executed' }],
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getExecutionLogs('e1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/executions/e1/logs');
  });
});

// ===== 策略日志 =====
describe('V164 · 策略日志', () => {
  it('列出策略日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [], total: 0, page: 1, pagesize: 20 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listPolicyLogs({ policy_id: 'p1', action: 'executed' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/logs?policy_id=p1&action=executed');
  });

  it('获取策略日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 'l1', action: 'created' }],
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicyLogsByPolicy('p1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1/logs');
  });
});

// ===== 策略评估与测试 =====
describe('V164 · 策略评估与测试', () => {
  it('评估策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { valid: true, violations: [], affected_count: 0 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.evaluatePolicy('p1', { sample_data: { name: 'test' } });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/p1/evaluate', {
      sample_data: { name: 'test' },
    });
  });

  it('测试策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { results: [], summary: { total: 5, matched: 2, passed: 3 } },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.testPolicy('p1', [{ id: '1' }, { id: '2' }]);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/p1/test', {
      test_data: [{ id: '1' }, { id: '2' }],
    });
  });

  it('获取策略影响分析', async () => {
    mockGet.mockResolvedValueOnce({
      data: { affected_entities: [], affected_fields: [], risk_assessment: 'low' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicyImpact('p1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/policies/p1/impact');
  });
});

// ===== 批量操作 =====
describe('V164 · 批量操作', () => {
  it('批量更新状态', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { updated: 3 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.batchUpdateStatus(['p1', 'p2', 'p3'], 'active');

    expect(mockPatch).toHaveBeenCalledWith('/mdm-v79/policies/batch-status', {
      ids: ['p1', 'p2', 'p3'],
      status: 'active',
    });
  });

  it('批量删除', async () => {
    mockPost.mockResolvedValueOnce({
      data: { deleted: 2 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.batchDelete(['p1', 'p2']);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/batch-delete', { ids: ['p1', 'p2'] });
  });

  it('批量执行', async () => {
    mockPost.mockResolvedValueOnce({
      data: { executions: [{ id: 'e1' }, { id: 'e2' }] },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.batchExecute(['p1', 'p2']);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/batch-execute', {
      policy_ids: ['p1', 'p2'],
    });
  });
});

// ===== 策略导入导出 =====
describe('V164 · 策略导入导出', () => {
  it('导出策略', async () => {
    mockGet.mockResolvedValueOnce({
      data: { url: '/exports/policies.json', count: 10 },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.exportPolicies({
      policy_type: 'classification',
      format: 'json',
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/mdm-v79/policies/export?policy_type=classification&format=json'
    );
  });

  it('导入策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { imported: 5, errors: 0 },
      status: 200,
    });

    const policies = [{ name: 'Policy 1', policy_type: 'classification' as const, rules: [] }];
    await dataPolicyConfigurationApiV79.importPolicies(policies);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/policies/import', { policies });
  });
});

// ===== 策略模板 =====
describe('V164 · 策略模板', () => {
  it('列出策略模板', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 't1', name: 'GDPR Template', policy_type: 'compliance' }],
      status: 200,
    });

    await dataPolicyConfigurationApiV79.listPolicyTemplates({ policy_type: 'compliance' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/templates?policy_type=compliance');
  });

  it('从模板创建策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'p1', name: 'GDPR Policy', status: 'draft' },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.createPolicyFromTemplate('t1', {
      name: 'GDPR Policy',
      scope: 'tenant',
    });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v79/templates/t1/instantiate', {
      name: 'GDPR Policy',
      scope: 'tenant',
    });
  });
});

// ===== 策略仪表板 =====
describe('V164 · 策略仪表板', () => {
  it('获取策略仪表板', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_policies: 50,
        active_policies: 35,
        draft_policies: 5,
        by_type: [],
        by_status: [],
        recent_executions: [],
        compliance_score: 85,
      },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicyDashboard();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/dashboard');
  });

  it('获取策略统计', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_policies: 50,
        active_policies: 35,
        executed_last_7_days: 120,
        violations_last_7_days: 3,
        compliance_rate: 0.95,
      },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getPolicyStats();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/stats');
  });

  it('获取合规报告', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        overall_score: 85,
        by_type: [],
        by_department: [],
        recommendations: ['加强加密策略'],
      },
      status: 200,
    });

    await dataPolicyConfigurationApiV79.getComplianceReport();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v79/compliance-report');
  });
});
