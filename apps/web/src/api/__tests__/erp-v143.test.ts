import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mdmLifecycleApi } from '../erp/core';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    erp: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('V143 ERP - mdmLifecycleApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Lifecycle Entities =====
  it('should list lifecycle entities with pagination', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listEntities({
      page: 1,
      pageSize: 20,
      domain: 'customer',
      stage: 'operative',
    });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/mdm-v49/lifecycle/entities?page=1&pagesize=20&domain=customer&stage=operative'
    );
  });

  it('should list lifecycle entities without params', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listEntities();
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities');
  });

  it('should create lifecycle entity', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmLifecycleApi.createEntity({
      domain: 'customer',
      entity_type: 'customer',
      name: '测试',
    });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities', {
      domain: 'customer',
      entity_type: 'customer',
      name: '测试',
    });
  });

  it('should get lifecycle entity', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmLifecycleApi.getEntity('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities/MDM-001');
  });

  it('should transition lifecycle stage', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmLifecycleApi.transitionStage('MDM-001', { target_stage: 'operative', reason: '上线' });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities/MDM-001', {
      target_stage: 'operative',
      reason: '上线',
    });
  });

  it('should update lifecycle task', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { task_id: 'T-001' } });
    await mdmLifecycleApi.updateTask('MDM-001', 'T-001', { status: 'completed', assignee: 'u-1' });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/mdm-v49/lifecycle/entities/MDM-001/tasks/T-001',
      { status: 'completed', assignee: 'u-1' }
    );
  });

  it('should get lifecycle events', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await mdmLifecycleApi.getEvents('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities/MDM-001/events');
  });

  // ===== Retirement Plans =====
  it('should list retirement plans', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listRetirementPlans({ page: 1, pageSize: 20, status: 'draft' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/mdm-v49/retirement/plans?page=1&pagesize=20&status=draft'
    );
  });

  it('should create retirement plan', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.createRetirementPlan({
      master_data_id: 'MDM-001',
      master_data_name: '客户A',
    });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans', {
      master_data_id: 'MDM-001',
      master_data_name: '客户A',
    });
  });

  it('should get retirement plan', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.getRetirementPlan('P-001');
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001');
  });

  it('should assess impact', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { impact_score: 5 } });
    await mdmLifecycleApi.assessImpact('P-001', { include_related: true, depth: 2 });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/assess', {
      include_related: true,
      depth: 2,
    });
  });

  it('should assess impact with no data', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { impact_score: 0 } });
    await mdmLifecycleApi.assessImpact('P-001');
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/assess', {});
  });

  it('should notify stakeholders', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { notified: 3 } });
    await mdmLifecycleApi.notifyStakeholders('P-001', { channels: ['email'], recipients: ['u-1'] });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/notify', {
      channels: ['email'],
      recipients: ['u-1'],
    });
  });

  it('should confirm retirement plan', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.confirmRetirementPlan('P-001');
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/confirm', {});
  });

  it('should execute retirement plan', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.executeRetirementPlan('P-001', { execute_type: 'soft' });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/execute', {
      execute_type: 'soft',
    });
  });

  it('should rollback retirement plan', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.rollbackRetirementPlan('P-001', { reason: '误操作' });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/rollback', {
      reason: '误操作',
    });
  });

  it('should cancel retirement plan', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { plan_id: 'P-001' } });
    await mdmLifecycleApi.cancelRetirementPlan('P-001');
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/retirement/plans/P-001/cancel', {});
  });

  // ===== Archive Policies =====
  it('should list archive policies', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listArchivePolicies({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/archive/policies?page=1&pagesize=20');
  });

  it('should create archive policy', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { policy_id: 'POL-001' } });
    await mdmLifecycleApi.createArchivePolicy({
      name: '客户归档策略',
      scope: 'customer',
      age_threshold_days: 365,
      storage_tier: 'archive',
      retention_days: 3650,
    });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/archive/policies', {
      name: '客户归档策略',
      scope: 'customer',
      age_threshold_days: 365,
      storage_tier: 'archive',
      retention_days: 3650,
    });
  });

  it('should get archive policy', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { policy_id: 'POL-001' } });
    await mdmLifecycleApi.getArchivePolicy('POL-001');
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/archive/policies/POL-001');
  });

  it('should update archive policy', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { policy_id: 'POL-001' } });
    await mdmLifecycleApi.updateArchivePolicy('POL-001', { status: 'inactive' });
    expect(mockClient.put).toHaveBeenCalledWith('/mdm-v49/archive/policies/POL-001', {
      status: 'inactive',
    });
  });

  it('should delete archive policy', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: { success: true } });
    await mdmLifecycleApi.deleteArchivePolicy('POL-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v49/archive/policies/POL-001');
  });

  // ===== Archive Records =====
  it('should list archive records', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listArchiveRecords({ page: 1, pageSize: 20, policy_id: 'POL-001' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/mdm-v49/archive/records?page=1&pagesize=20&policy_id=POL-001'
    );
  });

  it('should get archive record', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { record_id: 'REC-001' } });
    await mdmLifecycleApi.getArchiveRecord('REC-001');
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/archive/records/REC-001');
  });

  it('should restore archive record', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { record_id: 'REC-001' } });
    await mdmLifecycleApi.restoreArchiveRecord('REC-001', { restore_reason: '业务需要' });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/archive/records/REC-001/restore', {
      restore_reason: '业务需要',
    });
  });

  it('should restore archive record without data', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { record_id: 'REC-001' } });
    await mdmLifecycleApi.restoreArchiveRecord('REC-001');
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/archive/records/REC-001/restore', {});
  });

  it('should run archive', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { archived_count: 12 } });
    await mdmLifecycleApi.runArchive({ dry_run: false, scope: 'customer' });
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/archive/run', {
      dry_run: false,
      scope: 'customer',
    });
  });

  it('should run archive without data', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { archived_count: 0 } });
    await mdmLifecycleApi.runArchive();
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/archive/run', {});
  });

  // ===== Stats & Governance =====
  it('should get lifecycle stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total: 100 } });
    await mdmLifecycleApi.getLifecycleStats();
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/stats/lifecycle');
  });

  it('should get archive stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total_records: 50 } });
    await mdmLifecycleApi.getArchiveStats();
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/stats/archive');
  });

  it('should get retirement stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total_plans: 10 } });
    await mdmLifecycleApi.getRetirementStats();
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/stats/retirement');
  });

  it('should run SLA check', async () => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { total: 100, passed: 95, failed: 5 },
    });
    await mdmLifecycleApi.runSlaCheck();
    expect(mockClient.post).toHaveBeenCalledWith('/mdm-v49/sla/check', {});
  });

  it('should get dashboard', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { sla_compliance: 0.95 } });
    await mdmLifecycleApi.getDashboard();
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/dashboard');
  });

  // ===== pagesize compatibility =====
  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmLifecycleApi.listEntities({ page: 1, pagesize: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/mdm-v49/lifecycle/entities?page=1&pagesize=50');
  });
});
