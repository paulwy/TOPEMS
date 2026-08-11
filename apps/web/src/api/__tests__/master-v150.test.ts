import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataSecurityApiV67 } from '../master/dataSecurityV67';
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

describe('V150 masterData Security API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    patch: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== 安全策略管理 =====
  describe('Security Policy Management', () => {
    it('should create policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.createPolicy({
        name: '客户数据行级访问控制',
        entity_type: 'customer',
        policy_type: 'row_level',
        condition: 'department_id = current_user_department',
        actions: ['read'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/policies', {
        name: '客户数据行级访问控制',
        entity_type: 'customer',
        policy_type: 'row_level',
        condition: 'department_id = current_user_department',
        actions: ['read'],
      });
    });

    it('should get policy by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getPolicy('p-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/policies/p-1');
    });

    it('should list policies with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listPolicies({ entity_type: 'customer', policy_type: 'row_level', status: 'active', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/policies?entity_type=customer&policy_type=row_level&status=active&page=1&pagesize=20');
    });

    it('should list policies with search', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listPolicies({ search: '客户' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/policies?q=%E5%AE%A2%E6%88%B7');
    });

    it('should update policy', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.updatePolicy('p-1', { description: '更新策略描述' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v67/policies/p-1', { description: '更新策略描述' });
    });

    it('should delete policy', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataSecurityApiV67.deletePolicy('p-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v67/policies/p-1');
    });

    it('should activate policy', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.activatePolicy('p-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v67/policies/p-1/activate', {});
    });

    it('should deactivate policy', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.deactivatePolicy('p-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v67/policies/p-1/deactivate', {});
    });
  });

  // ===== 安全规则管理 =====
  describe('Security Rule Management', () => {
    it('should create rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.createRule({
        policy_id: 'p-1',
        entity_type: 'customer',
        field_name: 'email',
        rule_type: 'mask_if',
        expression: 'level = "public"',
        decision: 'allow',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/rules', {
        policy_id: 'p-1',
        entity_type: 'customer',
        field_name: 'email',
        rule_type: 'mask_if',
        expression: 'level = "public"',
        decision: 'allow',
      });
    });

    it('should list rules', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listRules({ policy_id: 'p-1', decision: 'allow' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/rules?policy_id=p-1&decision=allow');
    });

    it('should update rule', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.updateRule('r-1', { description: '更新规则描述' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v67/rules/r-1', { description: '更新规则描述' });
    });

    it('should delete rule', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataSecurityApiV67.deleteRule('r-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v67/rules/r-1');
    });
  });

  // ===== 数据分类分级 =====
  describe('Data Classification', () => {
    it('should classify data', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.classifyData({
        asset_id: 'a-1',
        classification: 'personal',
        security_level: 'confidential',
        reason: '包含客户邮箱和手机号',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/classifications', {
        asset_id: 'a-1',
        classification: 'personal',
        security_level: 'confidential',
        reason: '包含客户邮箱和手机号',
      });
    });

    it('should get classification', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getClassification('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/classifications/a-1');
    });

    it('should list classifications', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listClassifications({ security_level: 'confidential', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/classifications?security_level=confidential&page=1&pagesize=20');
    });

    it('should update classification', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.updateClassification('a-1', { security_level: 'secret' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v67/classifications/a-1', { security_level: 'secret' });
    });

    it('should review classification', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.reviewClassification('a-1', 'approved', '分类合理');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/classifications/a-1/review', {
        status: 'approved',
        reason: '分类合理',
      });
    });

    it('should batch classify', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { classified: 5, failed: 0 } });
      await dataSecurityApiV67.batchClassify([
        { asset_id: 'a-1', classification: 'personal', security_level: 'confidential' },
        { asset_id: 'a-2', classification: 'financial', security_level: 'secret' },
      ]);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/classifications/batch', {
        items: [
          { asset_id: 'a-1', classification: 'personal', security_level: 'confidential' },
          { asset_id: 'a-2', classification: 'financial', security_level: 'secret' },
        ],
      });
    });
  });

  // ===== 访问控制列表 =====
  describe('Access Control Lists', () => {
    it('should get ACL', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getAcl('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/acls/a-1');
    });

    it('should update ACL', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.updateAcl('a-1', {
        permissions: [
          { subject_type: 'role', subject_id: 'admin', actions: ['read', 'write', 'delete', 'admin'] },
          { subject_type: 'public', actions: ['read'] },
        ],
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v67/acls/a-1', {
        permissions: [
          { subject_type: 'role', subject_id: 'admin', actions: ['read', 'write', 'delete', 'admin'] },
          { subject_type: 'public', actions: ['read'] },
        ],
      });
    });

    it('should grant permission', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.grantPermission('a-1', {
        subject_type: 'user',
        subject_id: 'u-1',
        actions: ['read'],
        expire_at: '2026-12-31T23:59:59Z',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/acls/a-1/grant', {
        subject_type: 'user',
        subject_id: 'u-1',
        actions: ['read'],
        expire_at: '2026-12-31T23:59:59Z',
      });
    });

    it('should revoke permission', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.revokePermission('a-1', {
        subject_type: 'user',
        subject_id: 'u-1',
        actions: ['read'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/acls/a-1/revoke', {
        subject_type: 'user',
        subject_id: 'u-1',
        actions: ['read'],
      });
    });

    it('should list ACLs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listAcls({ asset_type: 'table', page: 1, pageSize: 50 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/acls?asset_type=table&page=1&pagesize=50');
    });
  });

  // ===== 访问请求工作流 =====
  describe('Access Request Workflow', () => {
    it('should create access request', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.createAccessRequest({
        asset_id: 'a-1',
        requested_actions: ['read', 'export'],
        reason: '数据分析项目需要访问客户数据',
        expires_at: '2026-12-31T23:59:59Z',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/access-requests', {
        asset_id: 'a-1',
        requested_actions: ['read', 'export'],
        reason: '数据分析项目需要访问客户数据',
        expires_at: '2026-12-31T23:59:59Z',
      });
    });

    it('should get access request', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getAccessRequest('r-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/access-requests/r-1');
    });

    it('should list access requests', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listAccessRequests({ status: 'pending', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/access-requests?status=pending&page=1&pagesize=20');
    });

    it('should review access request (approve)', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.reviewAccessRequest('r-1', {
        status: 'approved',
        reason: '业务需要',
        expires_at: '2026-12-31T23:59:59Z',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/access-requests/r-1/review', {
        status: 'approved',
        reason: '业务需要',
        expires_at: '2026-12-31T23:59:59Z',
      });
    });

    it('should cancel access request', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.cancelAccessRequest('r-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/access-requests/r-1/cancel', {});
    });
  });

  // ===== 访问检查 =====
  describe('Access Check', () => {
    it('should check access', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { allowed: true, decisions: [] } });
      await dataSecurityApiV67.checkAccess({
        entity_type: 'customer',
        entity_id: 'c-1',
        actions: ['read', 'write'],
        context: { department: 'sales' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/check-access', {
        entity_type: 'customer',
        entity_id: 'c-1',
        actions: ['read', 'write'],
        context: { department: 'sales' },
      });
    });

    it('should batch check access', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await dataSecurityApiV67.batchCheckAccess([
        { entity_type: 'customer', entity_id: 'c-1', actions: ['read'] },
        { entity_type: 'order', entity_id: 'o-1', actions: ['read', 'export'] },
      ]);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/check-access/batch', {
        requests: [
          { entity_type: 'customer', entity_id: 'c-1', actions: ['read'] },
          { entity_type: 'order', entity_id: 'o-1', actions: ['read', 'export'] },
        ],
      });
    });
  });

  // ===== 审计日志 =====
  describe('Audit Logs', () => {
    it('should query audit logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.queryAuditLogs({
        action: 'access',
        status: 'denied',
        date_from: '2026-08-01',
        date_to: '2026-08-24',
        sensitive_only: true,
        page: 1,
        pageSize: 50,
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/audit-logs?action=access&status=denied&date_from=2026-08-01&date_to=2026-08-24&sensitive_only=true&page=1&pagesize=50');
    });

    it('should get audit log by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getAuditLog('l-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/audit-logs/l-1');
    });

    it('should export audit logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { download_url: '/exports/audit-logs.json', count: 150 } });
      await dataSecurityApiV67.exportAuditLogs({
        action: 'access',
        date_from: '2026-08-01',
        date_to: '2026-08-24',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/audit-logs/export?action=access&date_from=2026-08-01&date_to=2026-08-24');
    });
  });

  // ===== 安全评估 =====
  describe('Security Assessment', () => {
    it('should run security assessment', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.runSecurityAssessment('a-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v67/assessments/a-1', {});
    });

    it('should get security assessment', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getSecurityAssessment('a-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/assessments/a-1');
    });

    it('should list security assessments', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataSecurityApiV67.listSecurityAssessments({
        status: 'non_compliant',
        min_score: 50,
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/assessments?status=non_compliant&min_score=50&page=1&pagesize=20');
    });
  });

  // ===== 安全仪表盘 =====
  describe('Security Dashboard', () => {
    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataSecurityApiV67.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/dashboard');
    });

    it('should get policy stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { by_type: [], by_status: [] } });
      await dataSecurityApiV67.getPolicyStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/dashboard/policies');
    });

    it('should get classification stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { by_level: [], by_classification: [], unclassified_count: 0 } });
      await dataSecurityApiV67.getClassificationStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/dashboard/classifications');
    });

    it('should get access stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_granted: 1000, total_denied: 50, by_action: [], trend: [] } });
      await dataSecurityApiV67.getAccessStats(30);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/dashboard/access?days=30');
    });

    it('should get access stats without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_granted: 0, total_denied: 0, by_action: [], trend: [] } });
      await dataSecurityApiV67.getAccessStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v67/dashboard/access');
    });
  });
});
