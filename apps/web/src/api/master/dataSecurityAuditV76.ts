import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type AuditAction = 'read' | 'write' | 'update' | 'delete' | 'export' | 'import' | 'transfer';
export type AuditStatus = 'success' | 'denied' | 'pending' | 'failed';
export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'ignored';
export type AuditRuleType = 'access' | 'change' | 'permission' | 'data' | 'system';
export type AuditRuleStatus = 'active' | 'inactive' | 'archived';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ReportType = 'access' | 'security' | 'compliance' | 'change' | 'overview';

export interface AuditLog {
  id: string;
  tenant_id: string;
  timestamp: string;
  user_id?: string;
  username?: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  resource_path?: string;
  status: AuditStatus;
  ip_address?: string;
  user_agent?: string;
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';
  details?: Record<string, unknown>;
  risk_score?: number;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  session_id?: string;
  created_at: string;
}

export interface AuditRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  rule_type: AuditRuleType;
  status: AuditRuleStatus;
  severity: EventSeverity;
  condition: string;
  action: 'log' | 'alert' | 'block' | 'notify';
  filter_expression?: string;
  applies_to: Array<{ resource_type?: string; action?: AuditAction }>;
  is_anomaly_detection: boolean;
  anomaly_threshold?: number;
  created_at: string;
  updated_at: string;
  last_triggered_at?: string;
  trigger_count: number;
}

export interface SecurityEvent {
  id: string;
  tenant_id: string;
  rule_id?: string;
  rule_name?: string;
  title: string;
  description: string;
  severity: EventSeverity;
  status: EventStatus;
  type: 'unauthorized_access' | 'data_breach' | 'privilege_escalation' | 'data_exfiltration' | 'policy_violation' | 'anomalous_activity';
  source: {
    type: 'audit_rule' | 'anomaly_detection' | 'manual' | 'external';
    detection_time: string;
  };
  targets: Array<{
    type: 'user' | 'role' | 'resource' | 'data_classification';
    id: string;
    name?: string;
  }>;
  evidence?: Array<{
    type: 'audit_log' | 'screenshot' | 'configuration' | 'other';
    reference_id: string;
    description: string;
  }>;
  assignee_id?: string;
  resolution?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnomalyDetectionConfig {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  detection_type: 'access_pattern' | 'data_volume' | 'time_window' | 'user_behavior';
  threshold: number;
  sensitivity: 'low' | 'medium' | 'high';
  baseline_period_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAudit {
  id: string;
  tenant_id: string;
  framework: 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'CUSTOM';
  audit_type: 'access_review' | 'permission_review' | 'data_classification' | 'retention_policy' | 'encryption_check';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  scope: Array<{
    resource_type?: string;
    data_classification?: string;
    department?: string;
  }>;
  start_date: string;
  end_date?: string;
  findings_count: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  overall_score: number;
  created_at: string;
  completed_at?: string;
}

export interface AuditReport {
  id: string;
  tenant_id: string;
  name: string;
  report_type: ReportType;
  status: ReportStatus;
  period_start: string;
  period_end: string;
  summary: string;
  metrics: {
    total_events: number;
    critical_events: number;
    high_events: number;
    resolved_events: number;
    avg_resolution_time_hours: number;
    compliance_score: number;
  };
  findings: Array<{
    category: string;
    severity: EventSeverity;
    count: number;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact_assessment: string;
  }>;
  created_at: string;
  generated_at?: string;
}

export interface AuditDashboard {
  total_audit_events: number;
  events_last_24h: number;
  critical_events_open: number;
  high_events_open: number;
  avg_resolution_time_hours: number;
  compliance_score: number;
  event_severity_distribution: Record<EventSeverity, number>;
  event_status_distribution: Record<EventStatus, number>;
  top_rules_triggered: Array<{ rule_id: string; rule_name: string; trigger_count: number }>;
  top_targeted_resources: Array<{ resource_type: string; resource_id: string; event_count: number }>;
  resolution_trend_7d: Array<{ date: string; resolved: number; created: number }>;
  compliance_frameworks: Array<{ framework: string; score: number; last_audit: string }>;
  anomaly_detection_active: boolean;
  anomaly_events_last_7d: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QueryLogsRequest {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  status?: AuditStatus;
  start_date?: string;
  end_date?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  data_classification?: string;
  ip_address?: string;
  page?: number;
  page_size?: number;
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  rule_type: AuditRuleType;
  severity: EventSeverity;
  condition: string;
  action: 'log' | 'alert' | 'block' | 'notify';
  filter_expression?: string;
  applies_to: Array<{ resource_type?: string; action?: AuditAction }>;
  is_anomaly_detection?: boolean;
  anomaly_threshold?: number;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  severity?: EventSeverity;
  condition?: string;
  action?: 'log' | 'alert' | 'block' | 'notify';
  filter_expression?: string;
  applies_to?: Array<{ resource_type?: string; action?: AuditAction }>;
  status?: AuditRuleStatus;
  is_anomaly_detection?: boolean;
  anomaly_threshold?: number;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  severity: EventSeverity;
  type: SecurityEvent['type'];
  assignee_id?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  severity?: EventSeverity;
  status?: EventStatus;
  assignee_id?: string;
  resolution?: string;
}

export interface CreateComplianceAuditRequest {
  framework: 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'CUSTOM';
  audit_type: ComplianceAudit['audit_type'];
  scope: Array<{
    resource_type?: string;
    data_classification?: string;
    department?: string;
  }>;
  start_date: string;
}

export interface GenerateReportRequest {
  name: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  filters?: {
    severity?: EventSeverity[];
    status?: EventStatus[];
    categories?: string[];
  };
}

export interface CreateAnomalyDetectionConfigRequest {
  name: string;
  description: string;
  detection_type: AnomalyDetectionConfig['detection_type'];
  threshold: number;
  sensitivity: 'low' | 'medium' | 'high';
  baseline_period_days: number;
}

// ============ API ============

export const dataSecurityAuditApiV76 = {
  // ===== 访问审计日志 =====
  async queryLogs(params?: QueryLogsRequest): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const qs = new URLSearchParams();
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.resource_type) qs.set('resource_type', params.resource_type);
    if (params?.resource_id) qs.set('resource_id', params.resource_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.risk_level) qs.set('risk_level', params.risk_level);
    if (params?.data_classification) qs.set('data_classification', params.data_classification);
    if (params?.ip_address) qs.set('ip_address', params.ip_address);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AuditLog>>(`/mdm-v76/logs${s ? `?${s}` : ''}`);
  },

  async getLog(id: string): Promise<ApiResponse<AuditLog>> {
    return apiClient.master.get<AuditLog>(`/mdm-v76/logs/${id}`);
  },

  async getLogStats(params?: {
    action?: AuditAction;
    start_date?: string;
    end_date?: string;
    group_by?: 'action' | 'user' | 'resource_type' | 'risk_level';
  }): Promise<ApiResponse<Array<{ category: string; count: number }>>> {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.group_by) qs.set('group_by', params.group_by);
    const s = qs.toString();
    return apiClient.master.get<Array<{ category: string; count: number }>>(`/mdm-v76/logs/stats${s ? `?${s}` : ''}`);
  },

  async exportLogs(params?: QueryLogsRequest): Promise<ApiResponse<{ download_url: string }>> {
    const qs = new URLSearchParams();
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.resource_type) qs.set('resource_type', params.resource_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.master.get<{ download_url: string }>(`/mdm-v76/logs/export${s ? `?${s}` : ''}`);
  },

  // ===== 审计策略管理 =====
  async listRules(params?: {
    rule_type?: AuditRuleType;
    status?: AuditRuleStatus;
    severity?: EventSeverity;
    is_anomaly?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<AuditRule>>> {
    const qs = new URLSearchParams();
    if (params?.rule_type) qs.set('rule_type', params.rule_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.is_anomaly !== undefined) qs.set('is_anomaly', String(params.is_anomaly));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AuditRule>>(`/mdm-v76/rules${s ? `?${s}` : ''}`);
  },

  async getRule(id: string): Promise<ApiResponse<AuditRule>> {
    return apiClient.master.get<AuditRule>(`/mdm-v76/rules/${id}`);
  },

  async createRule(data: CreateRuleRequest): Promise<ApiResponse<AuditRule>> {
    return apiClient.master.post<AuditRule>('/mdm-v76/rules', data);
  },

  async updateRule(id: string, data: UpdateRuleRequest): Promise<ApiResponse<AuditRule>> {
    return apiClient.master.put<AuditRule>(`/mdm-v76/rules/${id}`, data);
  },

  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v76/rules/${id}`);
  },

  async enableRule(id: string): Promise<ApiResponse<AuditRule>> {
    return apiClient.master.post<AuditRule>(`/mdm-v76/rules/${id}/enable`, {});
  },

  async disableRule(id: string): Promise<ApiResponse<AuditRule>> {
    return apiClient.master.post<AuditRule>(`/mdm-v76/rules/${id}/disable`, {});
  },

  async testRule(id: string, sampleLog?: Partial<AuditLog>): Promise<ApiResponse<{ matches: boolean; matched_actions?: string[] }>> {
    return apiClient.master.post<{ matches: boolean; matched_actions?: string[] }>(
      `/mdm-v76/rules/${id}/test`,
      { sample_log: sampleLog || {} },
    );
  },

  // ===== 安全事件管理 =====
  async listEvents(params?: {
    severity?: EventSeverity;
    status?: EventStatus;
    type?: SecurityEvent['type'];
    assignee_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<SecurityEvent>>> {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.assignee_id) qs.set('assignee_id', params.assignee_id);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<SecurityEvent>>(`/mdm-v76/events${s ? `?${s}` : ''}`);
  },

  async getEvent(id: string): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.get<SecurityEvent>(`/mdm-v76/events/${id}`);
  },

  async createEvent(data: CreateEventRequest): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.post<SecurityEvent>('/mdm-v76/events', data);
  },

  async updateEvent(id: string, data: UpdateEventRequest): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.put<SecurityEvent>(`/mdm-v76/events/${id}`, data);
  },

  async assignEvent(id: string, assignee_id: string): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.post<SecurityEvent>(`/mdm-v76/events/${id}/assign`, { assignee_id });
  },

  async resolveEvent(id: string, resolution: string): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.post<SecurityEvent>(`/mdm-v76/events/${id}/resolve`, { resolution });
  },

  async closeEvent(id: string): Promise<ApiResponse<SecurityEvent>> {
    return apiClient.master.post<SecurityEvent>(`/mdm-v76/events/${id}/close`, {});
  },

  async deleteEvent(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v76/events/${id}`);
  },

  // ===== 异常检测配置 =====
  async listAnomalyConfigs(params?: {
    detection_type?: AnomalyDetectionConfig['detection_type'];
    is_active?: boolean;
  }): Promise<ApiResponse<AnomalyDetectionConfig[]>> {
    const qs = new URLSearchParams();
    if (params?.detection_type) qs.set('detection_type', params.detection_type);
    if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
    const s = qs.toString();
    return apiClient.master.get<AnomalyDetectionConfig[]>(`/mdm-v76/anomaly-configs${s ? `?${s}` : ''}`);
  },

  async createAnomalyConfig(data: CreateAnomalyDetectionConfigRequest): Promise<ApiResponse<AnomalyDetectionConfig>> {
    return apiClient.master.post<AnomalyDetectionConfig>('/mdm-v76/anomaly-configs', data);
  },

  async updateAnomalyConfig(id: string, data: Partial<CreateAnomalyDetectionConfigRequest>): Promise<ApiResponse<AnomalyDetectionConfig>> {
    return apiClient.master.put<AnomalyDetectionConfig>(`/mdm-v76/anomaly-configs/${id}`, data);
  },

  async toggleAnomalyConfig(id: string, is_active: boolean): Promise<ApiResponse<AnomalyDetectionConfig>> {
    return apiClient.master.patch<AnomalyDetectionConfig>(`/mdm-v76/anomaly-configs/${id}`, { is_active });
  },

  async deleteAnomalyConfig(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v76/anomaly-configs/${id}`);
  },

  async runAnomalyDetection(configId: string): Promise<ApiResponse<{ config_id: string; anomalies_found: number; events_created: number }>> {
    return apiClient.master.post<{ config_id: string; anomalies_found: number; events_created: number }>(
      `/mdm-v76/anomaly-configs/${configId}/run`,
      {},
    );
  },

  // ===== 合规审计 =====
  async listComplianceAudits(params?: {
    framework?: ComplianceAudit['framework'];
    audit_type?: ComplianceAudit['audit_type'];
    status?: ComplianceAudit['status'];
  }): Promise<ApiResponse<ComplianceAudit[]>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    if (params?.audit_type) qs.set('audit_type', params.audit_type);
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<ComplianceAudit[]>(`/mdm-v76/compliance${s ? `?${s}` : ''}`);
  },

  async createComplianceAudit(data: CreateComplianceAuditRequest): Promise<ApiResponse<ComplianceAudit>> {
    return apiClient.master.post<ComplianceAudit>('/mdm-v76/compliance', data);
  },

  async getComplianceAudit(id: string): Promise<ApiResponse<ComplianceAudit>> {
    return apiClient.master.get<ComplianceAudit>(`/mdm-v76/compliance/${id}`);
  },

  async runComplianceAudit(id: string): Promise<ApiResponse<ComplianceAudit>> {
    return apiClient.master.post<ComplianceAudit>(`/mdm-v76/compliance/${id}/run`, {});
  },

  async getComplianceSummary(params?: {
    framework?: ComplianceAudit['framework'];
  }): Promise<ApiResponse<{
    framework: string;
    total_audits: number;
    pass_rate: number;
    critical_findings: number;
    high_findings: number;
    avg_resolution_days: number;
    last_audit_date?: string;
  }>> {
    const qs = new URLSearchParams();
    if (params?.framework) qs.set('framework', params.framework);
    const s = qs.toString();
    return apiClient.master.get<{
      framework: string;
      total_audits: number;
      pass_rate: number;
      critical_findings: number;
      high_findings: number;
      avg_resolution_days: number;
      last_audit_date?: string;
    }>(`/mdm-v76/compliance/summary${s ? `?${s}` : ''}`);
  },

  // ===== 审计报告 =====
  async listReports(params?: {
    report_type?: ReportType;
    status?: ReportStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<AuditReport>>> {
    const qs = new URLSearchParams();
    if (params?.report_type) qs.set('report_type', params.report_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<AuditReport>>(`/mdm-v76/reports${s ? `?${s}` : ''}`);
  },

  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<AuditReport>> {
    return apiClient.master.post<AuditReport>('/mdm-v76/reports', data);
  },

  async getReport(id: string): Promise<ApiResponse<AuditReport>> {
    return apiClient.master.get<AuditReport>(`/mdm-v76/reports/${id}`);
  },

  async downloadReport(id: string): Promise<ApiResponse<{ download_url: string }>> {
    return apiClient.master.get<{ download_url: string }>(`/mdm-v76/reports/${id}/download`);
  },

  async deleteReport(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v76/reports/${id}`);
  },

  // ===== 仪表板 =====
  async getDashboard(): Promise<ApiResponse<AuditDashboard>> {
    return apiClient.master.get<AuditDashboard>('/mdm-v76/dashboard');
  },

  async getLiveFeed(params?: {
    limit?: number;
    action?: AuditAction;
    severity?: EventSeverity;
  }): Promise<ApiResponse<Array<AuditLog>>> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.action) qs.set('action', params.action);
    if (params?.severity) qs.set('severity', params.severity);
    const s = qs.toString();
    return apiClient.master.get<Array<AuditLog>>(`/mdm-v76/live-feed${s ? `?${s}` : ''}`);
  },
};

export default dataSecurityAuditApiV76;
