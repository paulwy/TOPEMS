import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataLifecycleApiV68 } from '../master/dataLifecycleV68';
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

describe('V151 masterData Lifecycle API bindings', () => {
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

  // ===== 生命周期策略管理 =====
  describe('Lifecycle Policy Management', () => {
    it('should create policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.createPolicy({
        name: '客户数据归档策略',
        entity_type: 'customer',
        policy_type: 'archive',
        target_state: 'archived',
        conditions: { age_days: 365 },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/policies', {
        name: '客户数据归档策略',
        entity_type: 'customer',
        policy_type: 'archive',
        target_state: 'archived',
        conditions: { age_days: 365 },
      });
    });

    it('should get policy by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getPolicy('p-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/policies/p-1');
    });

    it('should list policies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listPolicies({
        entity_type: 'customer',
        policy_type: 'archive',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/policies?entity_type=customer&policy_type=archive&page=1&pagesize=20'
      );
    });

    it('should update policy', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.updatePolicy('p-1', { description: '更新策略' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v68/policies/p-1', {
        description: '更新策略',
      });
    });

    it('should delete policy', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataLifecycleApiV68.deletePolicy('p-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v68/policies/p-1');
    });

    it('should activate policy', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.activatePolicy('p-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v68/policies/p-1/activate', {});
    });

    it('should deactivate policy', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.deactivatePolicy('p-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v68/policies/p-1/deactivate', {});
    });
  });

  // ===== 保留策略管理 =====
  describe('Retention Policy Management', () => {
    it('should create retention policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.createRetentionPolicy({
        name: '财务数据保留7年',
        entity_type: 'invoice',
        retention_type: 'fixed_term',
        duration_days: 2555,
        action_on_expiry: 'archive',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/retention-policies', {
        name: '财务数据保留7年',
        entity_type: 'invoice',
        retention_type: 'fixed_term',
        duration_days: 2555,
        action_on_expiry: 'archive',
      });
    });

    it('should get retention policy', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getRetentionPolicy('rp-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/retention-policies/rp-1');
    });

    it('should list retention policies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listRetentionPolicies({
        entity_type: 'invoice',
        action: 'archive',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/retention-policies?entity_type=invoice&action=archive'
      );
    });

    it('should update retention policy', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.updateRetentionPolicy('rp-1', { duration_days: 3650 });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v68/retention-policies/rp-1', {
        duration_days: 3650,
      });
    });

    it('should delete retention policy', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataLifecycleApiV68.deleteRetentionPolicy('rp-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v68/retention-policies/rp-1');
    });
  });

  // ===== 归档策略管理 =====
  describe('Archive Strategy Management', () => {
    it('should create archive strategy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.createArchiveStrategy({
        name: '客户数据冷归档',
        entity_type: 'customer',
        age_days: 365,
        archive_format: 'parquet',
        storage_tier: 'cold',
        compression: 'zstd',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/archive-strategies', {
        name: '客户数据冷归档',
        entity_type: 'customer',
        age_days: 365,
        archive_format: 'parquet',
        storage_tier: 'cold',
        compression: 'zstd',
      });
    });

    it('should get archive strategy', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getArchiveStrategy('as-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/archive-strategies/as-1');
    });

    it('should list archive strategies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listArchiveStrategies({
        entity_type: 'customer',
        storage_tier: 'cold',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/archive-strategies?entity_type=customer&storage_tier=cold'
      );
    });

    it('should update archive strategy', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.updateArchiveStrategy('as-1', { age_days: 730 });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v68/archive-strategies/as-1', {
        age_days: 730,
      });
    });

    it('should delete archive strategy', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataLifecycleApiV68.deleteArchiveStrategy('as-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v68/archive-strategies/as-1');
    });
  });

  // ===== 销毁策略管理 =====
  describe('Destruction Policy Management', () => {
    it('should create destruction policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.createDestructionPolicy({
        name: '临时数据销毁',
        entity_type: 'temp_data',
        destruction_method: 'physical',
        age_days: 30,
        require_approval: true,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/destruction-policies', {
        name: '临时数据销毁',
        entity_type: 'temp_data',
        destruction_method: 'physical',
        age_days: 30,
        require_approval: true,
      });
    });

    it('should get destruction policy', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getDestructionPolicy('dp-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/destruction-policies/dp-1');
    });

    it('should list destruction policies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listDestructionPolicies({
        entity_type: 'temp_data',
        require_approval: true,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/destruction-policies?entity_type=temp_data&require_approval=true'
      );
    });

    it('should update destruction policy', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.updateDestructionPolicy('dp-1', { age_days: 60 });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v68/destruction-policies/dp-1', {
        age_days: 60,
      });
    });

    it('should delete destruction policy', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataLifecycleApiV68.deleteDestructionPolicy('dp-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v68/destruction-policies/dp-1');
    });
  });

  // ===== 生命周期流转 =====
  describe('Lifecycle Transitions', () => {
    it('should execute transition', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.executeTransition({
        entity_type: 'customer',
        entity_id: 'c-1',
        target_state: 'archived',
        reason: '超过保留期限',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/transitions', {
        entity_type: 'customer',
        entity_id: 'c-1',
        target_state: 'archived',
        reason: '超过保留期限',
      });
    });

    it('should get transition by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getTransition('t-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/transitions/t-1');
    });

    it('should list transitions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listTransitions({
        entity_type: 'customer',
        to_state: 'archived',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/transitions?entity_type=customer&to_state=archived&page=1&pagesize=20'
      );
    });

    it('should get lifecycle history', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getLifecycleHistory('customer', 'c-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/history/customer/c-1');
    });

    it('should bulk transition', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { processed: 3, failed: 0 } });
      await dataLifecycleApiV68.bulkTransition([
        { entity_type: 'customer', entity_id: 'c-1', target_state: 'archived' },
        { entity_type: 'customer', entity_id: 'c-2', target_state: 'archived' },
        { entity_type: 'customer', entity_id: 'c-3', target_state: 'archived' },
      ]);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/transitions/bulk', {
        items: [
          { entity_type: 'customer', entity_id: 'c-1', target_state: 'archived' },
          { entity_type: 'customer', entity_id: 'c-2', target_state: 'archived' },
          { entity_type: 'customer', entity_id: 'c-3', target_state: 'archived' },
        ],
      });
    });
  });

  // ===== 归档执行 =====
  describe('Archive Execution', () => {
    it('should execute archive', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.executeArchive({
        strategy_id: 'as-1',
        entity_type: 'customer',
        dry_run: false,
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/archive/execute', {
        strategy_id: 'as-1',
        entity_type: 'customer',
        dry_run: false,
      });
    });

    it('should get archive job', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getArchiveJob('j-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/archive/jobs/j-1');
    });

    it('should list archive jobs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listArchiveJobs({
        entity_type: 'customer',
        status: 'completed',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/archive/jobs?entity_type=customer&status=completed&page=1&pagesize=20'
      );
    });

    it('should restore from archive', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.restoreFromArchive('j-1', ['c-1', 'c-2']);
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/archive/jobs/j-1/restore', {
        entity_ids: ['c-1', 'c-2'],
      });
    });

    it('should verify archive job', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { verified: true, record_count: 1000, checksum: 'abc123' },
      });
      await dataLifecycleApiV68.verifyArchiveJob('j-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/archive/jobs/j-1/verify', {});
    });
  });

  // ===== 销毁执行 =====
  describe('Destruction Execution', () => {
    it('should execute destruction', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.executeDestruction({
        policy_id: 'dp-1',
        entity_ids: ['t-1', 't-2'],
        reason: '数据过期',
        approval_token: 'token-xxx',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/destruction/execute', {
        policy_id: 'dp-1',
        entity_ids: ['t-1', 't-2'],
        reason: '数据过期',
        approval_token: 'token-xxx',
      });
    });

    it('should get destruction job', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getDestructionJob('j-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/destruction/jobs/j-1');
    });

    it('should list destruction jobs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listDestructionJobs({
        entity_type: 'temp_data',
        status: 'completed',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/destruction/jobs?entity_type=temp_data&status=completed&page=1&pagesize=20'
      );
    });

    it('should approve destruction job', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.approveDestructionJob('j-1', { reason: '已确认' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/destruction/jobs/j-1/approve', {
        reason: '已确认',
      });
    });

    it('should cancel destruction job', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.cancelDestructionJob('j-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/destruction/jobs/j-1/cancel', {});
    });

    it('should verify destruction job', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { verified: true, hash: 'def456', audit_trail: 'audit-log-url' },
      });
      await dataLifecycleApiV68.verifyDestructionJob('j-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/destruction/jobs/j-1/verify', {});
    });
  });

  // ===== 版本管理增强 =====
  describe('Version Management', () => {
    it('should create version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.createVersion({
        entity_type: 'customer',
        entity_id: 'c-1',
        action: 'publish',
        version_number: 'v2.1',
        change_summary: '添加联系方式字段',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/versions', {
        entity_type: 'customer',
        entity_id: 'c-1',
        action: 'publish',
        version_number: 'v2.1',
        change_summary: '添加联系方式字段',
      });
    });

    it('should get version by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getVersion('v-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/versions/v-1');
    });

    it('should list versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listVersions({
        entity_type: 'customer',
        entity_id: 'c-1',
        action: 'publish',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/versions?entity_type=customer&entity_id=c-1&action=publish'
      );
    });

    it('should promote version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.promoteVersion('v-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/versions/v-1/promote', {});
    });

    it('should archive version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.archiveVersion('v-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/versions/v-1/archive', {});
    });

    it('should restore version', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.restoreVersion('v-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/versions/v-1/restore', {});
    });

    it('should destroy version', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { destroyed: true, audit_hash: 'hash789' },
      });
      await dataLifecycleApiV68.destroyVersion('v-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v68/versions/v-1/destroy', {});
    });

    it('should compare versions', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: {
          added: ['field1'],
          removed: ['field2'],
          modified: ['field3'],
          summary: '版本差异摘要',
        },
      });
      await dataLifecycleApiV68.compareVersions('v-1', 'v-2');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/versions/compare?source_id=v-1&target_id=v-2'
      );
    });
  });

  // ===== 合规检查与报告 =====
  describe('Compliance Check & Reports', () => {
    it('should check compliance', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.checkCompliance({ entity_type: 'customer' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/compliance/check?entity_type=customer');
    });

    it('should get compliance report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getComplianceReport('r-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/compliance/reports/r-1');
    });

    it('should list compliance reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataLifecycleApiV68.listComplianceReports({
        entity_type: 'customer',
        severity: 'high',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v68/compliance/reports?entity_type=customer&severity=high'
      );
    });
  });

  // ===== 生命周期仪表盘 =====
  describe('Lifecycle Dashboard', () => {
    it('should get dashboard overview', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataLifecycleApiV68.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/dashboard');
    });

    it('should get policy compliance stats', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { compliant: 10, non_compliant: 2, violations: [] },
      });
      await dataLifecycleApiV68.getPolicyComplianceStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/dashboard/compliance');
    });

    it('should get retention stats', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { by_type: [], total_expiring_30d: 5 },
      });
      await dataLifecycleApiV68.getRetentionStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/dashboard/retention');
    });

    it('should get archive stats', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { total_archived: 1000, total_size_bytes: 1024, by_tier: [], trend: [] },
      });
      await dataLifecycleApiV68.getArchiveStats(30);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/dashboard/archive?days=30');
    });

    it('should get destruction stats', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: {
          total_destroyed: 100,
          total_size_bytes: 512,
          by_method: [],
          pending_approvals: 2,
          trend: [],
        },
      });
      await dataLifecycleApiV68.getDestructionStats(30);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v68/dashboard/destruction?days=30');
    });
  });
});
