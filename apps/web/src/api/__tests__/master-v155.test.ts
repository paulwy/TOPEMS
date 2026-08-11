import { describe, it, expect, vi, beforeEach } from 'vitest';
import { complianceReportApiV70 } from '../master/complianceReportV70';
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

describe('V155 masterData Compliance Report API bindings', () => {
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

  // ===== 合规报告生成与管理 =====
  describe('Compliance Report Management', () => {
    it('should generate compliance report', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.generateComplianceReport({
        framework: 'GDPR',
        start_date: '2026-01-01',
        end_date: '2026-08-26',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v70/reports', {
        framework: 'GDPR',
        start_date: '2026-01-01',
        end_date: '2026-08-26',
      });
    });

    it('should get compliance report by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getComplianceReport('rep-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/reports/rep-1');
    });

    it('should list compliance reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await complianceReportApiV70.listComplianceReports({ framework: 'HIPAA', status: 'completed' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/reports?framework=HIPAA&status=completed');
    });

    it('should list compliance reports without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await complianceReportApiV70.listComplianceReports();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/reports');
    });

    it('should download report', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { download_url: 'http://...' } });
      await complianceReportApiV70.downloadReport('rep-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v70/reports/rep-1/download', {});
    });
  });

  // ===== 数据分类分级报告 =====
  describe('Data Classification Report', () => {
    it('should get classification report', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getClassificationReport('GDPR', '2026-01-01', '2026-08-26');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v70/classification/report?framework=GDPR&start_date=2026-01-01&end_date=2026-08-26'
      );
    });

    it('should list classification reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await complianceReportApiV70.listClassificationReports({ framework: 'SOX' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/classification/reports?framework=SOX');
    });
  });

  // ===== 访问审计报告 =====
  describe('Access Audit Report', () => {
    it('should generate access audit report', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.generateAccessAuditReport('GDPR', '2026-01-01', '2026-08-26');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/mdm-v70/audit/report?framework=GDPR&start_date=2026-01-01&end_date=2026-08-26',
        {}
      );
    });

    it('should list access audit reports', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await complianceReportApiV70.listAccessAuditReports({ anomalyOnly: true });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/audit/reports?anomaly_only=true');
    });

    it('should get access audit details', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getAccessAuditDetails('audit-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/audit/reports/audit-1');
    });

    it('should get anomalous access events', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await complianceReportApiV70.getAnomalousAccessEvents('GDPR', '2026-01-01', '2026-08-26');
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v70/audit/anomalies?framework=GDPR&start_date=2026-01-01&end_date=2026-08-26'
      );
    });
  });

  // ===== 数据泄露评估 =====
  describe('Data Breach Assessment', () => {
    it('should create breach assessment', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.createBreachAssessment({
        framework: 'GDPR',
        scenario: '数据中心火灾',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v70/breach-assessments', {
        framework: 'GDPR',
        scenario: '数据中心火灾',
      });
    });

    it('should get breach assessment by id', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getBreachAssessment('ba-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/breach-assessments/ba-1');
    });

    it('should list breach assessments', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await complianceReportApiV70.listBreachAssessments({ riskLevel: 'high' });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/breach-assessments?risk_level=high');
    });

    it('should get mitigation strategies', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await complianceReportApiV70.getMitigationStrategies('ba-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/breach-assessments/ba-1/mitigation');
    });
  });

  // ===== 合规仪表盘 =====
  describe('Compliance Dashboard', () => {
    it('should get compliance dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getComplianceDashboard('GDPR');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/dashboard?framework=GDPR');
    });

    it('should get compliance dashboard without framework', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: {} });
      await complianceReportApiV70.getComplianceDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/dashboard');
    });

    it('should get compliance score', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { score: 95 } });
      await complianceReportApiV70.getComplianceScore('HIPAA');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/score?framework=HIPAA');
    });

    it('should get pending reviews', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await complianceReportApiV70.getPendingReviews('SOX');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/pending-reviews?framework=SOX');
    });

    it('should get pending reviews without framework', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await complianceReportApiV70.getPendingReviews();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v70/pending-reviews');
    });
  });
});
