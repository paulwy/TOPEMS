import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type ComplianceFramework = 'GDPR' | 'HIPAA' | 'SOX' | 'CCPA' | 'PCI-DSS' | 'ISO27001';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';
export type AuditAction = 'read' | 'write' | 'delete' | 'export' | 'copy';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceReport {
  id: string;
  tenant_id: string;
  framework: ComplianceFramework;
  report_type: string;
  status: ReportStatus;
  generated_by?: string;
  start_date: string;
  end_date: string;
  summary?: string;
  findings: Array<{
    id: string;
    severity: RiskLevel;
    description: string;
    affected_assets?: string[];
    recommendation?: string;
  }>;
  compliance_score: number;
  created_at: string;
  updated_at: string;
}

export interface DataClassificationReport {
  id: string;
  tenant_id: string;
  framework: ComplianceFramework;
  total_assets: number;
  classified_assets: number;
  unclassified_assets: number;
  distribution: Record<SensitivityLevel, number>;
  missing_tags: number;
  outdated_classifications: number;
  status: ReportStatus;
  generated_at: string;
}

export interface AccessAuditReport {
  id: string;
  tenant_id: string;
  framework: ComplianceFramework;
  start_date: string;
  end_date: string;
  total_events: number;
  access_events: Array<{
    id: string;
    user_id: string;
    asset_id: string;
    action: AuditAction;
    timestamp: string;
    risk_level?: RiskLevel;
    anomaly_detected: boolean;
  }>;
  anomalous_events_count: number;
  top_accessed_assets: Array<{ asset_id: string; count: number }>;
  status: ReportStatus;
  generated_at: string;
}

export interface DataBreachAssessment {
  id: string;
  tenant_id: string;
  framework: ComplianceFramework;
  scenario: string;
  affected_assets: number;
  affected_users: number;
  potential_data_leak: number;
  risk_level: RiskLevel;
  mitigation_strategies: string[];
  estimated_response_time_hours: number;
  compliance_impact: string;
  status: ReportStatus;
  created_at: string;
}

export interface ComplianceDashboard {
  tenant_id: string;
  framework: ComplianceFramework;
  overall_score: number;
  data_classification_score: number;
  access_control_score: number;
  encryption_score: number;
  audit_coverage: number;
  active_incidents: number;
  pending_reviews: number;
  upcoming_deadlines: Array<{
    id: string;
    description: string;
    deadline: string;
    framework: ComplianceFramework;
  }>;
  recent_findings: Array<{
    id: string;
    severity: RiskLevel;
    description: string;
    created_at: string;
  }>;
  last_updated: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GenerateReportRequest {
  framework: ComplianceFramework;
  start_date: string;
  end_date: string;
  report_types?: string[];
}

export interface CreateBreachAssessmentRequest {
  framework: ComplianceFramework;
  scenario: string;
  target_asset_ids?: string[];
}

// ============ API ============

export const complianceReportApiV70 = {
  // ===== 合规报告生成与管理 =====
  async generateComplianceReport(
    data: GenerateReportRequest,
  ): Promise<ApiResponse<ComplianceReport>> {
    return apiClient.master.post<ComplianceReport>('/mdm-v70/reports', data);
  },

  async getComplianceReport(id: string): Promise<ApiResponse<ComplianceReport>> {
    return apiClient.master.get<ComplianceReport>(`/mdm-v70/reports/${id}`);
  },

  async listComplianceReports(params?: {
    framework?: ComplianceFramework;
    status?: ReportStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ComplianceReport>>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ComplianceReport>>(`/mdm-v70/reports${s ? `?${s}` : ''}`);
  },

  async downloadReport(id: string): Promise<ApiResponse<{ download_url: string }>> {
    return apiClient.master.post<{ download_url: string }>(`/mdm-v70/reports/${id}/download`, {});
  },

  // ===== 数据分类分级报告 =====
  async getClassificationReport(
    framework: ComplianceFramework,
    startDate: string,
    endDate: string,
  ): Promise<ApiResponse<DataClassificationReport>> {
    const qs = new URLSearchParams({ framework, start_date: startDate, end_date: endDate });
    return apiClient.master.get<DataClassificationReport>(`/mdm-v70/classification/report?${qs.toString()}`);
  },

  async listClassificationReports(params?: {
    framework?: ComplianceFramework;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataClassificationReport>>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataClassificationReport>>(`/mdm-v70/classification/reports${s ? `?${s}` : ''}`);
  },

  // ===== 访问审计报告 =====
  async generateAccessAuditReport(
    framework: ComplianceFramework,
    startDate: string,
    endDate: string,
  ): Promise<ApiResponse<AccessAuditReport>> {
    const qs = new URLSearchParams({ framework, start_date: startDate, end_date: endDate });
    return apiClient.master.post<AccessAuditReport>(`/mdm-v70/audit/report?${qs.toString()}`, {});
  },

  async listAccessAuditReports(params?: {
    framework?: ComplianceFramework;
    anomalyOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<AccessAuditReport>>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    if (params?.anomalyOnly !== undefined) qs.set('anomaly_only', String(params.anomalyOnly));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AccessAuditReport>>(`/mdm-v70/audit/reports${s ? `?${s}` : ''}`);
  },

  async getAccessAuditDetails(id: string): Promise<ApiResponse<AccessAuditReport>> {
    return apiClient.master.get<AccessAuditReport>(`/mdm-v70/audit/reports/${id}`);
  },

  async getAnomalousAccessEvents(
    framework: ComplianceFramework,
    startDate: string,
    endDate: string,
  ): Promise<ApiResponse<AccessAuditReport['access_events']>> {
    const qs = new URLSearchParams({ framework, start_date: startDate, end_date: endDate });
    return apiClient.master.get<AccessAuditReport['access_events']>(`/mdm-v70/audit/anomalies?${qs.toString()}`);
  },

  // ===== 数据泄露评估 =====
  async createBreachAssessment(
    data: CreateBreachAssessmentRequest,
  ): Promise<ApiResponse<DataBreachAssessment>> {
    return apiClient.master.post<DataBreachAssessment>('/mdm-v70/breach-assessments', data);
  },

  async getBreachAssessment(id: string): Promise<ApiResponse<DataBreachAssessment>> {
    return apiClient.master.get<DataBreachAssessment>(`/mdm-v70/breach-assessments/${id}`);
  },

  async listBreachAssessments(params?: {
    framework?: ComplianceFramework;
    riskLevel?: RiskLevel;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataBreachAssessment>>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    if (params?.riskLevel) qs.set('risk_level', params.riskLevel);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataBreachAssessment>>(`/mdm-v70/breach-assessments${s ? `?${s}` : ''}`);
  },

  async getMitigationStrategies(id: string): Promise<ApiResponse<string[]>> {
    return apiClient.master.get<string[]>(`/mdm-v70/breach-assessments/${id}/mitigation`);
  },

  // ===== 合规仪表盘 =====
  async getComplianceDashboard(framework?: ComplianceFramework): Promise<ApiResponse<ComplianceDashboard>> {
    const qs = new URLSearchParams();
    if (framework) qs.set('framework', framework);
    const s = qs.toString();
    return apiClient.master.get<ComplianceDashboard>(`/mdm-v70/dashboard${s ? `?${s}` : ''}`);
  },

  async getComplianceScore(framework: ComplianceFramework): Promise<ApiResponse<{
    framework: ComplianceFramework;
    score: number;
    trend: 'up' | 'down' | 'stable';
    last_updated: string;
  }>> {
    return apiClient.master.get(`/mdm-v70/score?framework=${framework}`);
  },

  async getPendingReviews(framework?: ComplianceFramework): Promise<ApiResponse<Array<{
    id: string;
    asset_id: string;
    required_action: string;
    deadline: string;
  }>>> {
    const qs = new URLSearchParams();
    if (framework) qs.set('framework', framework);
    const s = qs.toString();
    return apiClient.master.get<Array<{
      id: string;
      asset_id: string;
      required_action: string;
      deadline: string;
    }>>(`/mdm-v70/pending-reviews${s ? `?${s}` : ''}`);
  },
};

export default complianceReportApiV70;
