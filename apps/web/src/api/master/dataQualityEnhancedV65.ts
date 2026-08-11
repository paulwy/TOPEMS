import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type RuleType = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness' | 'validity' | 'integrity';
export type RuleSeverity = 'critical' | 'warning' | 'info';
export type RuleStatus = 'active' | 'inactive' | 'draft' | 'archived';
export type ScoreDimension = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness' | 'overall';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'ignored';
export type ReportFormat = 'pdf' | 'excel' | 'json';

export interface QualityRule {
  id: string;
  name: string;
  code?: string;
  type: RuleType;
  description?: string;
  entity_type?: string;
  field_name?: string;
  condition?: string;
  condition_params?: Record<string, unknown>;
  severity: RuleSeverity;
  status: RuleStatus;
  weight?: number;
  category?: string;
  tags?: string[];
  expression?: string;
  created_at: string;
  updated_at: string;
}

export interface RuleExecutionResult {
  rule_id: string;
  rule_name: string;
  passed: boolean;
  violation_count: number;
  sample_violations?: Array<{
    record_id: string;
    field_name: string;
    field_value: unknown;
    expected: unknown;
  }>;
  execution_time_ms: number;
  executed_at: string;
}

export interface QualityScore {
  id: string;
  entity_type: string;
  entity_id?: string;
  dimension: ScoreDimension;
  score: number;
  max_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  rule_count: number;
  passed_count: number;
  failed_count: number;
  executed_at: string;
  breakdown?: Record<ScoreDimension, number>;
}

export interface QualityIssue {
  id: string;
  rule_id: string;
  rule_name: string;
  entity_type: string;
  entity_id: string;
  field_name?: string;
  severity: RuleSeverity;
  status: IssueStatus;
  description: string;
  expected_value?: unknown;
  actual_value?: unknown;
  affected_records?: number;
  assigned_to?: string;
  related_issue_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface QualityReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'comprehensive' | 'entity' | 'rule' | 'custom';
  scope?: {
    entity_types?: string[];
    rule_ids?: string[];
    date_range?: { start: string; end: string };
  };
  format: ReportFormat;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generated_at?: string;
  download_url?: string;
  file_size?: number;
  created_by: string;
  created_at: string;
  summary?: QualityReportSummary;
}

export interface QualityReportSummary {
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  total_issues: number;
  critical_issues: number;
  warning_issues: number;
  overall_score: number;
  grade: string;
  top_entities: Array<{ entity_type: string; score: number; issues: number }>;
  top_rules: Array<{ rule_id: string; rule_name: string; violations: number }>;
  trend?: Array<{ date: string; score: number }>;
}

export interface QualityDashboardV65 {
  entity_types_monitored: number;
  total_rules: number;
  active_rules: number;
  total_issues: number;
  open_issues: number;
  critical_issues: number;
  avg_overall_score: number;
  score_distribution: Array<{ grade: string; count: number; percentage: number }>;
  rule_type_distribution: Array<{ type: RuleType; count: number }>;
  issues_by_severity: Array<{ severity: RuleSeverity; count: number }>;
  score_trend_7d: Array<{ date: string; score: number }>;
}

// ============ Request Types ============

export interface CreateQualityRuleRequest {
  name: string;
  code?: string;
  type: RuleType;
  description?: string;
  entity_type?: string;
  field_name?: string;
  condition?: string;
  condition_params?: Record<string, unknown>;
  severity: RuleSeverity;
  weight?: number;
  category?: string;
  tags?: string[];
  expression?: string;
}

export interface UpdateQualityRuleRequest {
  name?: string;
  description?: string;
  entity_type?: string;
  field_name?: string;
  condition?: string;
  severity?: RuleSeverity;
  weight?: number;
  category?: string;
  tags?: string[];
  status?: RuleStatus;
  expression?: string;
}

export interface TestRuleRequest {
  entity_type?: string;
  entity_ids?: string[];
  sample_data?: Record<string, unknown>[];
}

export interface ExecuteRulesRequest {
  rule_ids?: string[];
  entity_types?: string[];
  entity_ids?: string[];
  parallel?: boolean;
}

export interface CalculateScoreRequest {
  entity_type?: string;
  entity_ids?: string[];
  dimensions?: ScoreDimension[];
  rule_ids?: string[];
}

export interface GenerateReportRequest {
  name: string;
  description?: string;
  report_type: 'comprehensive' | 'entity' | 'rule' | 'custom';
  scope?: {
    entity_types?: string[];
    rule_ids?: string[];
    date_range?: { start: string; end: string };
  };
  format?: ReportFormat;
}

export interface UpdateIssueRequest {
  status?: IssueStatus;
  assigned_to?: string;
  description?: string;
  related_issue_id?: string;
}

// ============ API ============

export const dataQualityEnhancedApiV65 = {
  // ===== 质量规则管理 =====
  async createRule(data: CreateQualityRuleRequest): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.post<QualityRule>('/mdm-v65/rules', data);
  },

  async getRule(id: string): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.get<QualityRule>(`/mdm-v65/rules/${id}`);
  },

  async listRules(params?: {
    type?: RuleType;
    severity?: RuleSeverity;
    status?: RuleStatus;
    entity_type?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: QualityRule[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.category) qs.set('category', params.category);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: QualityRule[]; total: number }>(`/mdm-v65/rules${s ? `?${s}` : ''}`);
  },

  async updateRule(id: string, data: UpdateQualityRuleRequest): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.put<QualityRule>(`/mdm-v65/rules/${id}`, data);
  },

  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v65/rules/${id}`);
  },

  async activateRule(id: string): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.patch<QualityRule>(`/mdm-v65/rules/${id}/activate`, {});
  },

  async deactivateRule(id: string): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.patch<QualityRule>(`/mdm-v65/rules/${id}/deactivate`, {});
  },

  async testRule(id: string, data?: TestRuleRequest): Promise<ApiResponse<RuleExecutionResult>> {
    return apiClient.master.post<RuleExecutionResult>(`/mdm-v65/rules/${id}/test`, data ?? {});
  },

  async getRuleVersions(id: string): Promise<ApiResponse<Array<{ version: number; rule: QualityRule; created_at: string; created_by: string }>>> {
    return apiClient.master.get<Array<{ version: number; rule: QualityRule; created_at: string; created_by: string }>>(`/mdm-v65/rules/${id}/versions`);
  },

  async getRuleVersion(id: string, version: number): Promise<ApiResponse<QualityRule>> {
    return apiClient.master.get<QualityRule>(`/mdm-v65/rules/${id}/versions/${version}`);
  },

  async exportRules(params?: { rule_ids?: string[]; format?: 'json' | 'csv' }): Promise<ApiResponse<{ download_url: string; count: number }>> {
    const qs = new URLSearchParams();
    if (params?.rule_ids) qs.set('rule_ids', params.rule_ids.join(','));
    if (params?.format) qs.set('format', params.format);
    return apiClient.master.get<{ download_url: string; count: number }>(`/mdm-v65/rules/export?${qs.toString()}`);
  },

  async importRules(data: { file_url: string; conflict_strategy?: 'skip' | 'overwrite' | 'error' }): Promise<ApiResponse<{ imported: number; failed: number; errors?: string[] }>> {
    return apiClient.master.post<{ imported: number; failed: number; errors?: string[] }>('/mdm-v65/rules/import', data);
  },

  // ===== 规则执行引擎 =====
  async executeRules(data: ExecuteRulesRequest): Promise<ApiResponse<RuleExecutionResult[]>> {
    return apiClient.master.post<RuleExecutionResult[]>('/mdm-v65/execute', data);
  },

  async executeRuleById(ruleId: string, data?: TestRuleRequest): Promise<ApiResponse<RuleExecutionResult>> {
    return apiClient.master.post<RuleExecutionResult>(`/mdm-v65/execute/${ruleId}`, data ?? {});
  },

  async getExecutionHistory(params?: {
    rule_id?: string;
    entity_type?: string;
    passed?: boolean;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: RuleExecutionResult[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.rule_id) qs.set('rule_id', params.rule_id);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.passed !== undefined) qs.set('passed', String(params.passed));
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: RuleExecutionResult[]; total: number }>(`/mdm-v65/executions${s ? `?${s}` : ''}`);
  },

  // ===== 数据质量评分 =====
  async calculateScore(data: CalculateScoreRequest): Promise<ApiResponse<QualityScore[]>> {
    return apiClient.master.post<QualityScore[]>('/mdm-v65/scores', data);
  },

  async getScore(entityType: string, entityId?: string): Promise<ApiResponse<QualityScore>> {
    const qs = new URLSearchParams();
    if (entityId) qs.set('entity_id', entityId);
    return apiClient.master.get<QualityScore>(`/mdm-v65/scores/${entityType}${qs.toString() ? `?${qs.toString()}` : ''}`);
  },

  async listScores(params?: {
    entity_type?: string;
    dimension?: ScoreDimension;
    min_score?: number;
    grade?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<QualityScore[]>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.dimension) qs.set('dimension', params.dimension);
    if (params?.min_score !== undefined) qs.set('min_score', String(params.min_score));
    if (params?.grade) qs.set('grade', params.grade);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.master.get<QualityScore[]>(`/mdm-v65/scores${s ? `?${s}` : ''}`);
  },

  async getScoreTrend(entityType: string, params?: {
    entity_id?: string;
    dimension?: ScoreDimension;
    days?: number;
  }): Promise<ApiResponse<Array<{ date: string; score: number; grade: string }>>> {
    const qs = new URLSearchParams();
    if (params?.entity_id) qs.set('entity_id', params.entity_id);
    if (params?.dimension) qs.set('dimension', params.dimension);
    if (params?.days !== undefined) qs.set('days', String(params.days));
    return apiClient.master.get<Array<{ date: string; score: number; grade: string }>>(`/mdm-v65/scores/${entityType}/trend?${qs.toString()}`);
  },

  async compareScores(data: {
    entity_type: string;
    entity_ids?: string[];
    dimensions?: ScoreDimension[];
  }): Promise<ApiResponse<{
    entities: Array<{
      entity_id: string;
      scores: Record<ScoreDimension, number>;
      avg_score: number;
      grade: string;
    }>;
    comparison_matrix?: Record<string, Record<string, number>>;
  }>> {
    return apiClient.master.post<{
      entities: Array<{
        entity_id: string;
        scores: Record<ScoreDimension, number>;
        avg_score: number;
        grade: string;
      }>;
      comparison_matrix?: Record<string, Record<string, number>>;
    }>('/mdm-v65/scores/compare', data);
  },

  // ===== 质量缺陷管理 =====
  async listIssues(params?: {
    entity_type?: string;
    status?: IssueStatus;
    severity?: RuleSeverity;
    rule_id?: string;
    assigned_to?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: QualityIssue[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.rule_id) qs.set('rule_id', params.rule_id);
    if (params?.assigned_to) qs.set('assigned_to', params.assigned_to);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: QualityIssue[]; total: number }>(`/mdm-v65/issues${s ? `?${s}` : ''}`);
  },

  async getIssue(id: string): Promise<ApiResponse<QualityIssue>> {
    return apiClient.master.get<QualityIssue>(`/mdm-v65/issues/${id}`);
  },

  async updateIssue(id: string, data: UpdateIssueRequest): Promise<ApiResponse<QualityIssue>> {
    return apiClient.master.put<QualityIssue>(`/mdm-v65/issues/${id}`, data);
  },

  async resolveIssue(id: string, data?: { resolution?: string }): Promise<ApiResponse<QualityIssue>> {
    return apiClient.master.post<QualityIssue>(`/mdm-v65/issues/${id}/resolve`, data ?? {});
  },

  async bulkResolveIssues(data: { issue_ids: string[]; resolution?: string }): Promise<ApiResponse<{ resolved: number }>> {
    return apiClient.master.post<{ resolved: number }>('/mdm-v65/issues/bulk-resolve', data);
  },

  // ===== 质量报告 =====
  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<QualityReport>> {
    return apiClient.master.post<QualityReport>('/mdm-v65/reports', data);
  },

  async listReports(params?: {
    report_type?: string;
    status?: string;
    created_by?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: QualityReport[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.report_type) qs.set('report_type', params.report_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.created_by) qs.set('created_by', params.created_by);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: QualityReport[]; total: number }>(`/mdm-v65/reports${s ? `?${s}` : ''}`);
  },

  async getReport(id: string): Promise<ApiResponse<QualityReport>> {
    return apiClient.master.get<QualityReport>(`/mdm-v65/reports/${id}`);
  },

  async getReportSummary(id: string): Promise<ApiResponse<QualityReportSummary>> {
    return apiClient.master.get<QualityReportSummary>(`/mdm-v65/reports/${id}/summary`);
  },

  async downloadReport(id: string): Promise<ApiResponse<{ download_url: string; file_size: number; format: string }>> {
    return apiClient.master.get<{ download_url: string; file_size: number; format: string }>(`/mdm-v65/reports/${id}/download`);
  },

  async deleteReport(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v65/reports/${id}`);
  },

  // ===== 仪表盘 =====
  async getDashboard(): Promise<ApiResponse<QualityDashboardV65>> {
    return apiClient.master.get<QualityDashboardV65>('/mdm-v65/dashboard');
  },
};

export default dataQualityEnhancedApiV65;
