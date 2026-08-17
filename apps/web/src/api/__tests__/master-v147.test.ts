import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataStandardApiV63, dataMaskingApiV64 } from '../master';
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

describe('V147 masterData API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== Data Standard V63 =====
  describe('dataStandardApiV63', () => {
    it('should create standard', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.createStandard({
        name: '命名规范',
        code: 'NAMING_001',
        type: 'naming',
        definitions: [{ field: 'name', rule: 'must_be_snake_case' }],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v63/standards', {
        name: '命名规范',
        code: 'NAMING_001',
        type: 'naming',
        definitions: [{ field: 'name', rule: 'must_be_snake_case' }],
      });
    });

    it('should get standard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.getStandard('s-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v63/standards/s-1');
    });

    it('should list standards with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataStandardApiV63.listStandards({ type: 'naming', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v63/standards?type=naming&page=1&pagesize=20'
      );
    });

    it('should update standard', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.updateStandard('s-1', { description: 'new desc' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v63/standards/s-1', {
        description: 'new desc',
      });
    });

    it('should delete standard', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataStandardApiV63.deleteStandard('s-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v63/standards/s-1');
    });

    it('should get standard by code', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.getStandardByCode('NAMING_001');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v63/standards/code/NAMING_001');
    });

    it('should create category', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.createCategory({
        code: 'CAT_001',
        name: '分类',
        type: 'category',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v63/categories', {
        code: 'CAT_001',
        name: '分类',
        type: 'category',
      });
    });

    it('should get category tree', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.getCategoryTree();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v63/categories/tree');
    });

    it('should search categories', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataStandardApiV63.searchCategories('产品', { type: 'category' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v63/categories/search?q=%E4%BA%A7%E5%93%81&type=category'
      );
    });

    it('should add mapping', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataStandardApiV63.addMapping({
        source_standard_id: 's-1',
        target_standard_id: 's-2',
        source_value: 'A',
        target_value: 'B',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v63/mappings', {
        source_standard_id: 's-1',
        target_standard_id: 's-2',
        source_value: 'A',
        target_value: 'B',
      });
    });

    it('should list mappings', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataStandardApiV63.listMappings('s-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v63/mappings?source=s-1');
    });

    it('should evaluate compliance', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await dataStandardApiV63.evaluateCompliance({ entity_type: 'product', entity_id: 'p-1' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v63/evaluate', {
        entity_type: 'product',
        entity_id: 'p-1',
      });
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_standards: 0 } });
      await dataStandardApiV63.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v63/dashboard');
    });
  });

  // ===== Data Masking V64 =====
  describe('dataMaskingApiV64', () => {
    it('should create masking rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataMaskingApiV64.createRule({
        name: '邮箱脱敏',
        type: 'mask',
        pattern: '^(.{2}).+(@.+)$',
        replacement: '$1***$2',
        target_type: 'field',
        target_name: 'email',
        pii_type: 'email',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/rules', {
        name: '邮箱脱敏',
        type: 'mask',
        pattern: '^(.{2}).+(@.+)$',
        replacement: '$1***$2',
        target_type: 'field',
        target_name: 'email',
        pii_type: 'email',
      });
    });

    it('should get masking rule', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataMaskingApiV64.getRule('r-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v64/rules/r-1');
    });

    it('should list rules with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataMaskingApiV64.listRules({ type: 'mask', status: 'active' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v64/rules?type=mask&status=active');
    });

    it('should update rule', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataMaskingApiV64.updateRule('r-1', { status: 'inactive' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v64/rules/r-1', { status: 'inactive' });
    });

    it('should delete rule', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataMaskingApiV64.deleteRule('r-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v64/rules/r-1');
    });

    it('should create privacy policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataMaskingApiV64.createPolicy({
        name: '员工信息隐私',
        scope: 'entity',
        entity_type: 'employee',
        pii_types: ['email', 'phone'],
        masking_rule_ids: ['r-1'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/policies', {
        name: '员工信息隐私',
        scope: 'entity',
        entity_type: 'employee',
        pii_types: ['email', 'phone'],
        masking_rule_ids: ['r-1'],
      });
    });

    it('should list policies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataMaskingApiV64.listPolicies({ status: 'active' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v64/policies?status=active');
    });

    it('should activate policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataMaskingApiV64.activatePolicy('p-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/policies/p-1/activate', {});
    });

    it('should detect PII', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await dataMaskingApiV64.detectPii({ data: { email: 'test@test.com' } });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/detect', {
        data: { email: 'test@test.com' },
      });
    });

    it('should mask data', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { masked_data: {}, applied_rules: [] },
      });
      await dataMaskingApiV64.maskData({
        data: { email: 'test@test.com' },
        entity_type: 'employee',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/mask', {
        data: { email: 'test@test.com' },
        entity_type: 'employee',
      });
    });

    it('should unmask data', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { unmasked_data: {}, audit_id: 'a-1' },
      });
      await dataMaskingApiV64.unmaskData({
        data: { email: 't***@test.com' },
        entity_type: 'employee',
        reason: '导出',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/unmask', {
        data: { email: 't***@test.com' },
        entity_type: 'employee',
        reason: '导出',
      });
    });

    it('should preview masking', async () => {
      mockClient.post.mockResolvedValue({
        success: true,
        data: { original: {}, masked: {}, changes: [] },
      });
      await dataMaskingApiV64.previewMasking({
        entity_type: 'employee',
        record: { email: 'test@test.com' },
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v64/preview', {
        entity_type: 'employee',
        record: { email: 'test@test.com' },
      });
    });

    it('should list audit logs', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataMaskingApiV64.listAuditLogs({ action: 'unmask' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v64/audit?action=unmask');
    });

    it('should export audit logs', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { download_url: 'http://...', record_count: 100 },
      });
      await dataMaskingApiV64.exportAuditLogs({ start_date: '2024-01-01', end_date: '2024-01-31' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v64/audit/export?start_date=2024-01-01&end_date=2024-01-31'
      );
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_rules: 0 } });
      await dataMaskingApiV64.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v64/dashboard');
    });
  });
});
