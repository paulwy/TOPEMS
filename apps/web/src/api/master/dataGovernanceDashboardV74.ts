import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type AssetType = 'table' | 'view' | 'api' | 'dashboard' | 'model' | 'report' | 'topic' | 'file';
export type AssetClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';
export type AssetQualityStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type LineageDirection = 'upstream' | 'downstream' | 'both';
export type RuleSeverity = 'info' | 'warning' | 'error' | 'critical';
export type RuleStatus = 'active' | 'inactive' | 'archived';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GovernanceOverview {
  total_assets: number;
  assets_by_type: Record<AssetType, number>;
  assets_by_classification: Record<AssetClassification, number>;
  avg_quality_score: number;
  quality_distribution: Record<AssetQualityStatus, number>;
  classified_assets_count: number;
  unclassified_assets_count: number;
  sensitive_data_assets_count: number;
  compliant_assets_count: number;
  non_compliant_assets_count: number;
  data_owner_coverage: number;
  data_steward_coverage: number;
  last_scan_at: string;
}

export interface GovernanceAsset {
  id: string;
  tenant_id: string;
  name: string;
  type: AssetType;
  description: string;
  classification: AssetClassification;
  quality_score: number;
  quality_status: AssetQualityStatus;
  owner_id?: string;
  steward_id?: string;
  has_pii: boolean;
  contains_sensitive_data: boolean;
  row_count?: number;
  last_updated_at?: string;
  data_source?: string;
  tags: string[];
  compliance_status: 'compliant' | 'non_compliant' | 'pending_review';
  created_at: string;
  updated_at: string;
}

export interface QualityMetric {
  asset_id: string;
  metric_name: string;
  score: number;
  weight: number;
  status: AssetQualityStatus;
  last_checked_at: string;
  details?: Record<string, unknown>;
}

export interface QualityIssue {
  id: string;
  asset_id: string;
  metric_name: string;
  severity: RuleSeverity;
  description: string;
  suggestion?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  assignee_id?: string;
  created_at: string;
  resolved_at?: string;
}

export interface LineageNode {
  id: string;
  asset_id: string;
  name: string;
  type: AssetType;
  layer: 'source' | 'transform' | 'serving';
  metadata?: Record<string, unknown>;
}

export interface LineageEdge {
  id: string;
  source_id: string;
  target_id: string;
  transformation?: string;
  confidence: number;
}

export interface LineageGraph {
  asset_id: string;
  direction: LineageDirection;
  depth: number;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface ComplianceCheck {
  id: string;
  asset_id: string;
  rule_id: string;
  rule_name: string;
  severity: RuleSeverity;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  description: string;
  evidence?: Record<string, unknown>;
  checked_at: string;
}

export interface GovernanceRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  category: 'classification' | 'quality' | 'access' | 'retention' | 'encryption' | 'audit';
  severity: RuleSeverity;
  status: RuleStatus;
  expression: string;
  applies_to: AssetType[];
  schedule?: string;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GovernanceReport {
  id: string;
  tenant_id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  status: ReportStatus;
  period_start: string;
  period_end: string;
  summary?: string;
  total_assets_scanned: number;
  issues_found: number;
  issues_resolved: number;
  compliance_rate: number;
  quality_trend: 'improving' | 'stable' | 'declining';
  generated_at?: string;
  created_at: string;
}

export interface GovernanceDashboard {
  overview: GovernanceOverview;
  recent_issues: QualityIssue[];
  recent_assets: GovernanceAsset[];
  compliance_summary: {
    total_checks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  quality_trend_7d: Array<{ date: string; avg_score: number; issues_count: number }>;
  classification_progress: {
    total: number;
    classified: number;
    progress: number;
  };
  top_issues_categories: Array<{ category: string; count: number }>;
  owner_coverage_stats: Array<{ owner_id: string; assets_count: number; compliance_rate: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  category: GovernanceRule['category'];
  severity: RuleSeverity;
  expression: string;
  applies_to: AssetType[];
  schedule?: string;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  severity?: RuleSeverity;
  expression?: string;
  applies_to?: AssetType[];
  schedule?: string;
  status?: RuleStatus;
}

export interface GenerateReportRequest {
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period_start: string;
  period_end: string;
  name?: string;
}

// ============ API ============

export const dataGovernanceDashboardApiV74 = {
  // ===== 治理概览仪表板 =====
  async getOverview(): Promise<ApiResponse<GovernanceOverview>> {
    return apiClient.master.get<GovernanceOverview>('/mdm-v74/overview');
  },

  async getDashboard(): Promise<ApiResponse<GovernanceDashboard>> {
    return apiClient.master.get<GovernanceDashboard>('/mdm-v74/dashboard');
  },

  // ===== 数据资产清单 =====
  async listAssets(params?: {
    type?: AssetType;
    classification?: AssetClassification;
    qualityStatus?: AssetQualityStatus;
    complianceStatus?: GovernanceAsset['compliance_status'];
    search?: string;
    hasPII?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<GovernanceAsset>>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.classification) qs.set('classification', params.classification);
    if (params?.qualityStatus) qs.set('quality_status', params.qualityStatus);
    if (params?.complianceStatus) qs.set('compliance_status', params.complianceStatus);
    if (params?.search) qs.set('q', params.search);
    if (params?.hasPII !== undefined) qs.set('has_pii', String(params.hasPII));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<GovernanceAsset>>(`/mdm-v74/assets${s ? `?${s}` : ''}`);
  },

  async getAsset(id: string): Promise<ApiResponse<GovernanceAsset>> {
    return apiClient.master.get<GovernanceAsset>(`/mdm-v74/assets/${id}`);
  },

  async scanAssets(): Promise<ApiResponse<{ scanned: number }>> {
    return apiClient.master.post<{ scanned: number }>('/mdm-v74/assets/scan', {});
  },

  async classifyAsset(id: string, classification: AssetClassification): Promise<ApiResponse<GovernanceAsset>> {
    return apiClient.master.post<GovernanceAsset>(`/mdm-v74/assets/${id}/classify`, { classification });
  },

  // ===== 数据质量仪表板 =====
  async getAssetQualityMetrics(assetId: string): Promise<ApiResponse<QualityMetric[]>> {
    return apiClient.master.get<QualityMetric[]>(`/mdm-v74/assets/${assetId}/quality`);
  },

  async listQualityIssues(params?: {
    assetId?: string;
    severity?: RuleSeverity;
    status?: QualityIssue['status'];
    category?: GovernanceRule['category'];
    assigneeId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<QualityIssue>>> {
    const qs = new URLSearchParams();
    if (params?.assetId) qs.set('asset_id', params.assetId);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.assigneeId) qs.set('assignee_id', params.assigneeId);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<QualityIssue>>(`/mdm-v74/issues${s ? `?${s}` : ''}`);
  },

  async updateIssueStatus(issueId: string, status: QualityIssue['status'], assigneeId?: string): Promise<ApiResponse<QualityIssue>> {
    return apiClient.master.patch<QualityIssue>(`/mdm-v74/issues/${issueId}`, { status, assignee_id: assigneeId });
  },

  async resolveIssue(issueId: string, resolution: string): Promise<ApiResponse<QualityIssue>> {
    return apiClient.master.post<QualityIssue>(`/mdm-v74/issues/${issueId}/resolve`, { resolution });
  },

  async getQualityTrend(days?: number): Promise<ApiResponse<Array<{ date: string; avg_score: number; issues_count: number }>>> {
    const qs = new URLSearchParams();
    if (days !== undefined) qs.set('days', String(days));
    const s = qs.toString();
    return apiClient.master.get(`/mdm-v74/quality/trend${s ? `?${s}` : ''}`);
  },

  // ===== 数据血缘追踪 =====
  async getLineage(assetId: string, params?: {
    direction?: LineageDirection;
    depth?: number;
  }): Promise<ApiResponse<LineageGraph>> {
    const qs = new URLSearchParams();
    if (params?.direction) qs.set('direction', params.direction);
    if (params?.depth !== undefined) qs.set('depth', String(params.depth));
    const s = qs.toString();
    return apiClient.master.get<LineageGraph>(`/mdm-v74/assets/${assetId}/lineage${s ? `?${s}` : ''}`);
  },

  async getAssetLineageImpact(assetId: string): Promise<ApiResponse<{
    affected_downstream_assets: number;
    criticality_score: number;
    dependent_reports: number;
    dependent_dashboards: number;
  }>> {
    return apiClient.master.get(`/mdm-v74/assets/${assetId}/lineage/impact`);
  },

  // ===== 合规仪表板 =====
  async listComplianceChecks(params?: {
    assetId?: string;
    status?: ComplianceCheck['status'];
    severity?: RuleSeverity;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ComplianceCheck>>> {
    const qs = new URLSearchParams();
    if (params?.assetId) qs.set('asset_id', params.assetId);
    if (params?.status) qs.set('status', params.status);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ComplianceCheck>>(`/mdm-v74/compliance/checks${s ? `?${s}` : ''}`);
  },

  async runComplianceCheck(assetId?: string): Promise<ApiResponse<{ checked: number; failed: number }>> {
    const qs = new URLSearchParams();
    if (assetId) qs.set('asset_id', assetId);
    const s = qs.toString();
    return apiClient.master.post<{ checked: number; failed: number }>(`/mdm-v74/compliance/run${s ? `?${s}` : ''}`, {});
  },

  async getComplianceSummary(): Promise<ApiResponse<{
    total_checks: number;
    passed: number;
    failed: number;
    warnings: number;
    compliance_rate: number;
    by_category: Record<string, { passed: number; failed: number }>;
  }>> {
    return apiClient.master.get('/mdm-v74/compliance/summary');
  },

  async getSensitiveDataReport(): Promise<ApiResponse<{
    total_sensitive_assets: number;
    pii_assets: number;
    financial_data_assets: number;
    health_data_assets: number;
    classification_gaps: number;
  }>> {
    return apiClient.master.get('/mdm-v74/compliance/sensitive-data');
  },

  // ===== 治理策略管理 =====
  async listRules(params?: {
    category?: GovernanceRule['category'];
    severity?: RuleSeverity;
    status?: RuleStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<GovernanceRule>>> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<GovernanceRule>>(`/mdm-v74/rules${s ? `?${s}` : ''}`);
  },

  async getRule(id: string): Promise<ApiResponse<GovernanceRule>> {
    return apiClient.master.get<GovernanceRule>(`/mdm-v74/rules/${id}`);
  },

  async createRule(data: CreateRuleRequest): Promise<ApiResponse<GovernanceRule>> {
    return apiClient.master.post<GovernanceRule>('/mdm-v74/rules', data);
  },

  async updateRule(id: string, data: UpdateRuleRequest): Promise<ApiResponse<GovernanceRule>> {
    return apiClient.master.put<GovernanceRule>(`/mdm-v74/rules/${id}`, data);
  },

  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v74/rules/${id}`);
  },

  async runRule(id: string): Promise<ApiResponse<{ rule_id: string; found_issues: number }>> {
    return apiClient.master.post<{ rule_id: string; found_issues: number }>(`/mdm-v74/rules/${id}/run`, {});
  },

  // ===== 治理报告 =====
  async listReports(params?: {
    type?: GovernanceReport['type'];
    status?: ReportStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<GovernanceReport>>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('page_size', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<GovernanceReport>>(`/mdm-v74/reports${s ? `?${s}` : ''}`);
  },

  async getReport(id: string): Promise<ApiResponse<GovernanceReport>> {
    return apiClient.master.get<GovernanceReport>(`/mdm-v74/reports/${id}`);
  },

  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<GovernanceReport>> {
    return apiClient.master.post<GovernanceReport>('/mdm-v74/reports', data);
  },

  async downloadReport(id: string): Promise<ApiResponse<{ download_url: string }>> {
    return apiClient.master.get<{ download_url: string }>(`/mdm-v74/reports/${id}/download`);
  },

  // ===== 治理效率指标 =====
  async getGovernanceMetrics(): Promise<ApiResponse<{
    assets_total: number;
    assets_classified: number;
    compliance_rate: number;
    avg_quality_score: number;
    issues_open: number;
    issues_resolved_7d: number;
    rule_coverage: number;
    governance_maturity_score: number;
    maturity_by_category: Record<string, number>;
  }>> {
    return apiClient.master.get('/mdm-v74/metrics');
  },

  async getOwnerStats(): Promise<ApiResponse<Array<{
    owner_id: string;
    owner_name: string;
    assets_count: number;
    quality_score: number;
    compliance_rate: number;
    issues_assigned: number;
  }>>> {
    return apiClient.master.get('/mdm-v74/stats/owners');
  },
};

export default dataGovernanceDashboardApiV74;
