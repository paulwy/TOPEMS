import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataGovernanceDashboardApiV74 } from '../master/dataGovernanceDashboardV74';
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

describe('V159 masterData Data Governance Dashboard API bindings', () => {
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

  // ===== 治理概览仪表板 =====
  describe('Governance Overview', () => {
    it('should get overview', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getOverview();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/overview');
    });

    it('should get dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/dashboard');
    });
  });

  // ===== 数据资产清单 =====
  describe('Asset Inventory', () => {
    it('should list assets with filters', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listAssets({
        type: 'table',
        classification: 'confidential',
        qualityStatus: 'good',
        page: 1,
        pageSize: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v74/assets?type=table&classification=confidential&quality_status=good&page=1&page_size=20'
      );
    });

    it('should list assets without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listAssets();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/assets');
    });

    it('should get asset by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getAsset('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/assets/asset-1');
    });

    it('should scan assets', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { scanned: 100 } });
      await dataGovernanceDashboardApiV74.scanAssets();
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/assets/scan', {});
    });

    it('should classify asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.classifyAsset('asset-1', 'restricted');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/assets/asset-1/classify', {
        classification: 'restricted',
      });
    });
  });

  // ===== 数据质量仪表板 =====
  describe('Quality Dashboard', () => {
    it('should get asset quality metrics', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataGovernanceDashboardApiV74.getAssetQualityMetrics('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/assets/asset-1/quality');
    });

    it('should list quality issues', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listQualityIssues({
        severity: 'critical',
        status: 'open',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/issues?severity=critical&status=open');
    });

    it('should update issue status', async () => {
      mockClient.patch.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.updateIssueStatus('issue-1', 'in_progress', 'user-1');
      expect(mockClient.patch).toHaveBeenCalledWith('/mdm-v74/issues/issue-1', {
        status: 'in_progress',
        assignee_id: 'user-1',
      });
    });

    it('should resolve issue', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.resolveIssue('issue-1', 'Fixed the data pipeline');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/issues/issue-1/resolve', {
        resolution: 'Fixed the data pipeline',
      });
    });

    it('should get quality trend', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataGovernanceDashboardApiV74.getQualityTrend(30);
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/quality/trend?days=30');
    });

    it('should get quality trend without days', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataGovernanceDashboardApiV74.getQualityTrend();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/quality/trend');
    });
  });

  // ===== 数据血缘追踪 =====
  describe('Lineage Tracking', () => {
    it('should get lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getLineage('asset-1', {
        direction: 'downstream',
        depth: 3,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v74/assets/asset-1/lineage?direction=downstream&depth=3'
      );
    });

    it('should get lineage impact', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getAssetLineageImpact('asset-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/assets/asset-1/lineage/impact');
    });
  });

  // ===== 合规仪表板 =====
  describe('Compliance Dashboard', () => {
    it('should list compliance checks', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listComplianceChecks({
        status: 'failed',
        severity: 'critical',
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v74/compliance/checks?status=failed&severity=critical'
      );
    });

    it('should run compliance check', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { checked: 50, failed: 2 } });
      await dataGovernanceDashboardApiV74.runComplianceCheck('asset-1');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/mdm-v74/compliance/run?asset_id=asset-1',
        {}
      );
    });

    it('should run compliance check without asset', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { checked: 200, failed: 10 } });
      await dataGovernanceDashboardApiV74.runComplianceCheck();
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/compliance/run', {});
    });

    it('should get compliance summary', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getComplianceSummary();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/compliance/summary');
    });

    it('should get sensitive data report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getSensitiveDataReport();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/compliance/sensitive-data');
    });
  });

  // ===== 治理策略管理 =====
  describe('Governance Rules', () => {
    it('should list rules', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listRules({
        category: 'quality',
        status: 'active',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/rules?category=quality&status=active');
    });

    it('should get rule by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getRule('rule-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/rules/rule-1');
    });

    it('should create rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.createRule({
        name: 'Check PII classification',
        description: 'Verify PII assets are classified',
        category: 'classification',
        severity: 'critical',
        expression: 'asset.has_pii && asset.classification == "unclassified"',
        applies_to: ['table', 'view'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/rules', {
        name: 'Check PII classification',
        description: 'Verify PII assets are classified',
        category: 'classification',
        severity: 'critical',
        expression: 'asset.has_pii && asset.classification == "unclassified"',
        applies_to: ['table', 'view'],
      });
    });

    it('should update rule', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.updateRule('rule-1', {
        description: 'Updated',
        severity: 'warning',
      });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v74/rules/rule-1', {
        description: 'Updated',
        severity: 'warning',
      });
    });

    it('should delete rule', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await dataGovernanceDashboardApiV74.deleteRule('rule-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v74/rules/rule-1');
    });

    it('should run rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { rule_id: 'rule-1', found_issues: 5 } });
      await dataGovernanceDashboardApiV74.runRule('rule-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/rules/rule-1/run', {});
    });
  });

  // ===== 治理报告 =====
  describe('Governance Reports', () => {
    it('should list reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await dataGovernanceDashboardApiV74.listReports({ type: 'monthly' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/reports?type=monthly');
    });

    it('should get report by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getReport('report-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/reports/report-1');
    });

    it('should generate report', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.generateReport({
        type: 'monthly',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        name: 'August 2026 Governance Report',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v74/reports', {
        type: 'monthly',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        name: 'August 2026 Governance Report',
      });
    });

    it('should download report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { download_url: 'https://...' } });
      await dataGovernanceDashboardApiV74.downloadReport('report-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/reports/report-1/download');
    });
  });

  // ===== 治理效率指标 =====
  describe('Governance Metrics', () => {
    it('should get governance metrics', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await dataGovernanceDashboardApiV74.getGovernanceMetrics();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/metrics');
    });

    it('should get owner stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await dataGovernanceDashboardApiV74.getOwnerStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v74/stats/owners');
    });
  });
});
