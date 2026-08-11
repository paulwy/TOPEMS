import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbStructureApi, mdmRefsApi } from '../erp/core';
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

describe('V142 ERP - dbStructureApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list tables with schema and search', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await dbStructureApi.listTables({ schema: 'public', search: 'ord' });
    expect(mockClient.get).toHaveBeenCalledWith('/db/tables?schema=public&search=ord');
  });

  it('should list tables without params', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await dbStructureApi.listTables();
    expect(mockClient.get).toHaveBeenCalledWith('/db/tables');
  });

  it('should get table detail', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { table_name: 'orders' } });
    await dbStructureApi.getTableDetail('orders');
    expect(mockClient.get).toHaveBeenCalledWith('/db/tables/orders');
  });

  it('should preview add column', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { sql: 'ALTER TABLE orders ADD COLUMN ...' } });
    await dbStructureApi.previewAddColumn({
      table_name: 'orders',
      column_name: 'total',
      data_type: 'DECIMAL(12,2)',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/db/columns/preview',
      { table_name: 'orders', column_name: 'total', data_type: 'DECIMAL(12,2)' }
    );
  });

  it('should add column', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { success: true } });
    await dbStructureApi.addColumn({
      table_name: 'orders',
      column_name: 'total',
      data_type: 'DECIMAL(12,2)',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/db/columns',
      { table_name: 'orders', column_name: 'total', data_type: 'DECIMAL(12,2)' }
    );
  });

  it('should modify column', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { success: true } });
    await dbStructureApi.modifyColumn('orders', 'total', { data_type: 'DECIMAL(14,2)' });
    expect(mockClient.put).toHaveBeenCalledWith(
      '/db/columns/orders/total',
      { data_type: 'DECIMAL(14,2)' }
    );
  });

  it('should drop column', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: { success: true } });
    await dbStructureApi.dropColumn('orders', 'total', { confirm: true, reason: '重构' });
    expect(mockClient.delete).toHaveBeenCalledWith(
      '/db/columns/orders/total?confirm=true&reason=%E9%87%8D%E6%9E%84'
    );
  });

  it('should list changes with pagination', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await dbStructureApi.listChanges({ page: 1, pageSize: 20, table_name: 'orders' });
    expect(mockClient.get).toHaveBeenCalledWith('/db/changes?page=1&pagesize=20&table_name=orders');
  });

  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await dbStructureApi.listTables();
    expect(mockClient.get).toHaveBeenCalledWith('/db/tables');
  });
});

describe('V142 ERP - mdmRefsApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Refs CRUD =====
  it('should list master data refs', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.list({ page: 1, pageSize: 20, domain: 'customer' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/master-data-refs?page=1&pagesize=20&domain=customer'
    );
  });

  it('should get master data ref by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.get('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/MDM-001');
  });

  it('should get by domain and code', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.getByCode('customer', 'CUST-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/by-code/customer/CUST-001');
  });

  // ===== Audit =====
  it('should get audit trail', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await mdmRefsApi.getAuditTrail('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/MDM-001/audit-trail');
  });

  it('should record audit event', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'AE-001' } });
    await mdmRefsApi.recordAuditEvent({
      master_data_id: 'MDM-001',
      action: 'create',
      source_service: 'erp',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/audit-trail',
      { master_data_id: 'MDM-001', action: 'create', source_service: 'erp' }
    );
  });

  // ===== Lineage =====
  it('should get data lineage', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001', refs: [] } });
    await mdmRefsApi.getLineage('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/MDM-001/lineage');
  });

  // ===== Versions =====
  it('should list versions', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await mdmRefsApi.listVersions('MDM-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/MDM-001/versions');
  });

  it('should get version', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'V-001' } });
    await mdmRefsApi.getVersion('MDM-001', 'V-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/MDM-001/versions/V-001');
  });

  it('should rollback version', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.rollbackVersion('MDM-001', 'V-001', { reason: '数据错误' });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/MDM-001/versions/V-001/rollback',
      { reason: '数据错误' }
    );
  });

  // ===== Conflicts =====
  it('should detect conflicts', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { conflicts: 3 } });
    await mdmRefsApi.detectConflicts({ master_data_ids: ['MDM-001', 'MDM-002'] });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/conflicts/detect',
      { master_data_ids: ['MDM-001', 'MDM-002'] }
    );
  });

  it('should list conflicts', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listConflicts({ page: 1, pageSize: 20, status: 'open' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/master-data-refs/conflicts?page=1&pagesize=20&status=open'
    );
  });

  it('should auto merge conflict', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.autoMergeConflict('CF-001');
    expect(mockClient.post).toHaveBeenCalledWith('/master-data-refs/conflicts/CF-001/auto-merge', {});
  });

  // ===== Lifecycle =====
  it('should list archived refs', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listArchived({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/archived?page=1&pagesize=20');
  });

  it('should list pending destruction', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listPendingDestruction({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/pending-destruction?page=1&pagesize=20');
  });

  it('should archive ref', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.archive('MDM-001', { archive_reason: '不再使用' });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/MDM-001/archive',
      { archive_reason: '不再使用' }
    );
  });

  it('should restore ref', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.restore('MDM-001', { restore_reason: '需要重新启用' });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/MDM-001/restore',
      { restore_reason: '需要重新启用' }
    );
  });

  it('should schedule destruction', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.scheduleDestruction('MDM-001', {
      destroy_reason: '数据过期',
      destroy_scheduled_at: '2026-09-01T00:00:00Z',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/MDM-001/schedule-destruction',
      { destroy_reason: '数据过期', destroy_scheduled_at: '2026-09-01T00:00:00Z' }
    );
  });

  it('should cancel destruction', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { master_data_id: 'MDM-001' } });
    await mdmRefsApi.cancelDestruction('MDM-001');
    expect(mockClient.post).toHaveBeenCalledWith('/master-data-refs/MDM-001/cancel-destruction', {});
  });

  // ===== Quality Rules =====
  it('should list quality rules', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listQualityRules({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/master-data-refs/quality-rules?page=1&pagesize=20'
    );
  });

  it('should create quality rule', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'QR-001' } });
    await mdmRefsApi.createQualityRule({
      code: 'rule-001',
      name: '客户编码必填',
      domain: 'customer',
      rule_type: 'not_null',
      expression: 'code IS NOT NULL',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data-refs/quality-rules',
      { code: 'rule-001', name: '客户编码必填', domain: 'customer', rule_type: 'not_null', expression: 'code IS NOT NULL' }
    );
  });

  it('should run quality check', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { total: 100, passed: 95, failed: 5 } });
    await mdmRefsApi.runQualityCheck();
    expect(mockClient.post).toHaveBeenCalledWith('/master-data-refs/quality-check', {});
  });

  // ===== Governance =====
  it('should get governance dashboard', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total_refs: 100 } });
    await mdmRefsApi.getGovernanceDashboard();
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs/governance/dashboard');
  });

  // ===== Sync Jobs =====
  it('should list sync jobs', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listSyncJobs({ page: 1, pageSize: 20, status: 'pending' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/master-data/sync/jobs?page=1&pagesize=20&status=pending'
    );
  });

  it('should create sync job', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'JOB-001' } });
    await mdmRefsApi.createSyncJob({
      job_type: 'full_sync',
      source_service: 'master-data',
      target_service: 'erp',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data/sync/jobs',
      { job_type: 'full_sync', source_service: 'master-data', target_service: 'erp' }
    );
  });

  it('should get sync job', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'JOB-001' } });
    await mdmRefsApi.getSyncJob('JOB-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data/sync/jobs/JOB-001');
  });

  it('should retry sync job', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'JOB-001' } });
    await mdmRefsApi.retrySyncJob('JOB-001');
    expect(mockClient.post).toHaveBeenCalledWith('/master-data/sync/jobs/JOB-001/retry', {});
  });

  it('should cancel sync job', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'JOB-001' } });
    await mdmRefsApi.cancelSyncJob('JOB-001');
    expect(mockClient.post).toHaveBeenCalledWith('/master-data/sync/jobs/JOB-001/cancel', {});
  });

  it('should get sync stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total_jobs: 100, success_rate: 0.95 } });
    await mdmRefsApi.getSyncStats();
    expect(mockClient.get).toHaveBeenCalledWith('/master-data/sync/stats');
  });

  // ===== Quality Tickets =====
  it('should list quality tickets', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.listQualityTickets({ page: 1, pageSize: 20, status: 'open' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/master-data/quality/tickets?page=1&pagesize=20&status=open'
    );
  });

  it('should create quality ticket', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'QT-001' } });
    await mdmRefsApi.createQualityTicket({
      title: '客户数据质量问题',
      domain: 'customer',
      ticket_type: 'data_integrity',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data/quality/tickets',
      { title: '客户数据质量问题', domain: 'customer', ticket_type: 'data_integrity' }
    );
  });

  it('should get quality ticket', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'QT-001' } });
    await mdmRefsApi.getQualityTicket('QT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/master-data/quality/tickets/QT-001');
  });

  it('should assign quality ticket', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'QT-001' } });
    await mdmRefsApi.assignQualityTicket('QT-001', 'user-001');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/master-data/quality/tickets/QT-001/assign',
      { assignee: 'user-001' }
    );
  });

  it('should close quality ticket', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'QT-001' } });
    await mdmRefsApi.closeQualityTicket('QT-001');
    expect(mockClient.post).toHaveBeenCalledWith('/master-data/quality/tickets/QT-001/close', {});
  });

  it('should get quality loop stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total: 100, resolved: 95 } });
    await mdmRefsApi.getQualityLoopStats();
    expect(mockClient.get).toHaveBeenCalledWith('/master-data/quality/loop-stats');
  });

  it('should support pagesize parameter', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mdmRefsApi.list({ page: 1, pagesize: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/master-data-refs?page=1&pagesize=50');
  });
});
