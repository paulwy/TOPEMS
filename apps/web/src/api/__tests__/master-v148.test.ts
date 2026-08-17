import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataQualityEnhancedApiV65 } from '../master/dataQualityEnhancedV65';
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

describe('V148 masterData Quality Enhanced API bindings', () => {
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

  // ===== 质量规则管理 =====
  describe('Quality Rule Management', () => {
    it('should create rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.createRule({
        name: '完整性检查-客户邮箱',
        type: 'completeness',
        severity: 'critical',
        entity_type: 'customer',
        field_name: 'email',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/rules', {
        name: '完整性检查-客户邮箱',
        type: 'completeness',
        severity: 'critical',
        entity_type: 'customer',
        field_name: 'email',
      });
    });

    it('should get rule', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getRule('r-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/rules/r-1');
    });

    it('should list rules with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataQualityEnhancedApiV65.listRules({
        type: 'completeness',
        severity: 'critical',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v65/rules?type=completeness&severity=critical&page=1&pagesize=20'
      );
    });

    it('should update rule', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.updateRule('r-1', { description: '更新描述' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v65/rules/r-1', {
        description: '更新描述',
      });
    });

    it('should delete rule', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataQualityEnhancedApiV65.deleteRule('r-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v65/rules/r-1');
    });

    it('should activate rule', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.activateRule('r-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v65/rules/r-1/activate', {});
    });

    it('should deactivate rule', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.deactivateRule('r-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v65/rules/r-1/deactivate', {});
    });

    it('should test rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.testRule('r-1', {
        entity_type: 'customer',
        entity_ids: ['c-1'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/rules/r-1/test', {
        entity_type: 'customer',
        entity_ids: ['c-1'],
      });
    });

    it('should get rule versions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataQualityEnhancedApiV65.getRuleVersions('r-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/rules/r-1/versions');
    });

    it('should get specific rule version', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getRuleVersion('r-1', 2);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/rules/r-1/versions/2');
    });

    it('should export rules', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.exportRules({ rule_ids: ['r-1'], format: 'json' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/rules/export?rule_ids=r-1&format=json');
    });

    it('should import rules', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.importRules({
        file_url: 'http://example.com/rules.json',
        conflict_strategy: 'skip',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/rules/import', {
        file_url: 'http://example.com/rules.json',
        conflict_strategy: 'skip',
      });
    });
  });

  // ===== 规则执行引擎 =====
  describe('Rule Execution Engine', () => {
    it('should execute rules', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await dataQualityEnhancedApiV65.executeRules({
        rule_ids: ['r-1', 'r-2'],
        entity_types: ['customer'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/execute', {
        rule_ids: ['r-1', 'r-2'],
        entity_types: ['customer'],
      });
    });

    it('should execute single rule by id', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.executeRuleById('r-1', { entity_type: 'customer' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/execute/r-1', {
        entity_type: 'customer',
      });
    });

    it('should get execution history', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataQualityEnhancedApiV65.getExecutionHistory({
        rule_id: 'r-1',
        passed: true,
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v65/executions?rule_id=r-1&passed=true&page=1&pagesize=20'
      );
    });
  });

  // ===== 数据质量评分 =====
  describe('Quality Scoring', () => {
    it('should calculate score', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await dataQualityEnhancedApiV65.calculateScore({
        entity_type: 'customer',
        dimensions: ['completeness', 'accuracy'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/scores', {
        entity_type: 'customer',
        dimensions: ['completeness', 'accuracy'],
      });
    });

    it('should get score for entity', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getScore('customer', 'c-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/scores/customer?entity_id=c-1');
    });

    it('should list scores with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataQualityEnhancedApiV65.listScores({ entity_type: 'customer', grade: 'A' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/scores?entity_type=customer&grade=A');
    });

    it('should get score trend', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataQualityEnhancedApiV65.getScoreTrend('customer', {
        entity_id: 'c-1',
        dimension: 'overall',
        days: 7,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v65/scores/customer/trend?entity_id=c-1&dimension=overall&days=7'
      );
    });

    it('should compare scores', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { entities: [] } });
      await dataQualityEnhancedApiV65.compareScores({
        entity_type: 'customer',
        entity_ids: ['c-1', 'c-2'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/scores/compare', {
        entity_type: 'customer',
        entity_ids: ['c-1', 'c-2'],
      });
    });
  });

  // ===== 质量缺陷管理 =====
  describe('Quality Issue Management', () => {
    it('should list issues with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataQualityEnhancedApiV65.listIssues({
        entity_type: 'customer',
        status: 'open',
        severity: 'critical',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v65/issues?entity_type=customer&status=open&severity=critical'
      );
    });

    it('should get issue', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getIssue('i-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/issues/i-1');
    });

    it('should update issue', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.updateIssue('i-1', {
        status: 'in_progress',
        assigned_to: 'user-1',
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v65/issues/i-1', {
        status: 'in_progress',
        assigned_to: 'user-1',
      });
    });

    it('should resolve issue', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.resolveIssue('i-1', { resolution: '数据已修正' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/issues/i-1/resolve', {
        resolution: '数据已修正',
      });
    });

    it('should bulk resolve issues', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { resolved: 5 } });
      await dataQualityEnhancedApiV65.bulkResolveIssues({
        issue_ids: ['i-1', 'i-2'],
        resolution: '批量修复完成',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/issues/bulk-resolve', {
        issue_ids: ['i-1', 'i-2'],
        resolution: '批量修复完成',
      });
    });
  });

  // ===== 质量报告 =====
  describe('Quality Reports', () => {
    it('should generate report', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.generateReport({
        name: '客户数据质量月报',
        report_type: 'entity',
        scope: { entity_types: ['customer'] },
        format: 'pdf',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v65/reports', {
        name: '客户数据质量月报',
        report_type: 'entity',
        scope: { entity_types: ['customer'] },
        format: 'pdf',
      });
    });

    it('should list reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataQualityEnhancedApiV65.listReports({ report_type: 'entity', status: 'completed' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v65/reports?report_type=entity&status=completed'
      );
    });

    it('should get report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getReport('rp-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/reports/rp-1');
    });

    it('should get report summary', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getReportSummary('rp-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/reports/rp-1/summary');
    });

    it('should download report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.downloadReport('rp-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/reports/rp-1/download');
    });

    it('should delete report', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataQualityEnhancedApiV65.deleteReport('rp-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v65/reports/rp-1');
    });
  });

  // ===== 仪表盘 =====
  describe('Dashboard', () => {
    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataQualityEnhancedApiV65.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v65/dashboard');
    });
  });
});
