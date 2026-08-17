import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type SecurityLevel = 'public' | 'internal' | 'confidential' | 'secret' | 'top_secret';
export type DataClassification =
  'personal' | 'financial' | 'health' | 'legal' | 'business' | 'technical';
export type PermissionType = 'read' | 'write' | 'delete' | 'admin' | 'export';
export type AccessDecision = 'allow' | 'deny' | 'challenge';
export type AuditAction = 'grant' | 'revoke' | 'access' | 'modify' | 'export' | 'delete';
export type AuditStatus = 'success' | 'denied' | 'error' | 'challenge';

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  policy_type: 'row_level' | 'column_level' | 'field_masking' | 'full_masking';
  status: 'active' | 'inactive' | 'draft';
  priority: number;
  condition?: string;
  condition_params?: Record<string, unknown>;
  actions?: PermissionType[];
  affected_columns?: string[];
  role_ids?: string[];
  user_ids?: string[];
  department_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface SecurityRule {
  id: string;
  policy_id: string;
  entity_type: string;
  entity_id?: string;
  field_name?: string;
  rule_type: 'allow_if' | 'deny_if' | 'mask_if' | 'require_approval';
  expression: string;
  description?: string;
  decision: AccessDecision;
  created_at: string;
  updated_at: string;
}

export interface DataClassificationInfo {
  id: string;
  asset_id: string;
  classification: DataClassification;
  security_level: SecurityLevel;
  owner?: string;
  classification_reason?: string;
  classified_by?: string;
  classified_at: string;
  reviewed_at?: string;
  review_status?: 'pending' | 'approved' | 'rejected';
  tags?: string[];
}

export interface AccessControlList {
  id: string;
  asset_id: string;
  asset_type: string;
  permissions: Array<{
    subject_type: 'user' | 'role' | 'department' | 'public';
    subject_id?: string;
    actions: PermissionType[];
    condition?: string;
    expire_at?: string;
  }>;
  inherited_from?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  asset_id: string;
  asset_name: string;
  requested_actions: PermissionType[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_type: 'user' | 'service' | 'system';
  action: AuditAction;
  target_type: string;
  target_id: string;
  target_name?: string;
  status: AuditStatus;
  reason?: string;
  details?: Record<string, unknown>;
  source_ip?: string;
  user_agent?: string;
  sensitive_data?: Array<{ field: string; value: string; action: 'masked' | 'exposed' }>;
}

export interface SecurityDashboard {
  total_policies: number;
  active_policies: number;
  policies_by_type: Array<{ type: string; count: number }>;
  total_classifications: number;
  classification_distribution: Array<{ level: SecurityLevel; count: number }>;
  total_acl_entries: number;
  pending_access_requests: number;
  denied_access_count: number;
  access_granted_last_7d: number;
  access_denied_last_7d: number;
  sensitive_assets_count: number;
  unclassified_assets_count: number;
  audit_events_last_24h: number;
  denied_events_last_24h: number;
  top_accessed_assets: Array<{ asset_id: string; asset_name: string; count: number }>;
  top_denied_assets: Array<{ asset_id: string; asset_name: string; count: number }>;
}

export interface SecurityAssessment {
  id: string;
  asset_id: string;
  asset_name: string;
  score: number;
  max_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: Array<{
    check_id: string;
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message?: string;
    remediation?: string;
  }>;
  overall_status: 'compliant' | 'partial' | 'non_compliant';
  assessed_at: string;
}

// ============ Request Types ============

export interface CreateSecurityPolicyRequest {
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: string;
  policy_type: 'row_level' | 'column_level' | 'field_masking' | 'full_masking';
  priority?: number;
  condition?: string;
  condition_params?: Record<string, unknown>;
  actions?: PermissionType[];
  affected_columns?: string[];
  role_ids?: string[];
  user_ids?: string[];
  department_ids?: string[];
}

export interface UpdateSecurityPolicyRequest {
  name?: string;
  description?: string;
  condition?: string;
  condition_params?: Record<string, unknown>;
  actions?: PermissionType[];
  affected_columns?: string[];
  role_ids?: string[];
  user_ids?: string[];
  department_ids?: string[];
  status?: 'active' | 'inactive' | 'draft';
  priority?: number;
}

export interface CreateSecurityRuleRequest {
  policy_id: string;
  entity_type: string;
  entity_id?: string;
  field_name?: string;
  rule_type: 'allow_if' | 'deny_if' | 'mask_if' | 'require_approval';
  expression: string;
  description?: string;
  decision: AccessDecision;
}

export interface ClassifyDataRequest {
  asset_id: string;
  classification: DataClassification;
  security_level: SecurityLevel;
  reason?: string;
  owner?: string;
  tags?: string[];
}

export interface UpdateClassificationRequest {
  classification?: DataClassification;
  security_level?: SecurityLevel;
  reason?: string;
  tags?: string[];
}

export interface UpdateAclRequest {
  permissions: Array<{
    subject_type: 'user' | 'role' | 'department' | 'public';
    subject_id?: string;
    actions: PermissionType[];
    condition?: string;
    expire_at?: string;
  }>;
}

export interface CreateAccessRequestRequest {
  asset_id: string;
  requested_actions: PermissionType[];
  reason: string;
  expires_at?: string;
}

export interface ReviewAccessRequest {
  status: 'approved' | 'rejected';
  reason?: string;
  expires_at?: string;
}

export interface CheckAccessRequest {
  entity_type: string;
  entity_id?: string;
  actions: PermissionType[];
  context?: Record<string, unknown>;
}

export interface CheckAccessResponse {
  allowed: boolean;
  decisions: Array<{
    action: PermissionType;
    allowed: boolean;
    reason?: string;
    matching_policy_id?: string;
  }>;
  required_approval?: boolean;
  challenged_actions?: PermissionType[];
}

export interface QueryAuditLogParams {
  actor_id?: string;
  action?: AuditAction;
  status?: AuditStatus;
  target_type?: string;
  target_id?: string;
  date_from?: string;
  date_to?: string;
  sensitive_only?: boolean;
  page?: number;
  pageSize?: number;
}

// ============ API ============

export const dataSecurityApiV67 = {
  // ===== 安全策略管理 =====
  async createPolicy(data: CreateSecurityPolicyRequest): Promise<ApiResponse<SecurityPolicy>> {
    return apiClient.master.post<SecurityPolicy>('/mdm-v67/policies', data);
  },

  async getPolicy(id: string): Promise<ApiResponse<SecurityPolicy>> {
    return apiClient.master.get<SecurityPolicy>(`/mdm-v67/policies/${id}`);
  },

  async listPolicies(params?: {
    entity_type?: string;
    policy_type?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: SecurityPolicy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.policy_type) qs.set('policy_type', params.policy_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: SecurityPolicy[]; total: number }>(
      `/mdm-v67/policies${s ? `?${s}` : ''}`
    );
  },

  async updatePolicy(
    id: string,
    data: UpdateSecurityPolicyRequest
  ): Promise<ApiResponse<SecurityPolicy>> {
    return apiClient.master.put<SecurityPolicy>(`/mdm-v67/policies/${id}`, data);
  },

  async deletePolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v67/policies/${id}`);
  },

  async activatePolicy(id: string): Promise<ApiResponse<SecurityPolicy>> {
    return apiClient.master.patch<SecurityPolicy>(`/mdm-v67/policies/${id}/activate`, {});
  },

  async deactivatePolicy(id: string): Promise<ApiResponse<SecurityPolicy>> {
    return apiClient.master.patch<SecurityPolicy>(`/mdm-v67/policies/${id}/deactivate`, {});
  },

  // ===== 安全规则管理 =====
  async createRule(data: CreateSecurityRuleRequest): Promise<ApiResponse<SecurityRule>> {
    return apiClient.master.post<SecurityRule>('/mdm-v67/rules', data);
  },

  async listRules(params?: {
    policy_id?: string;
    entity_type?: string;
    rule_type?: string;
    decision?: AccessDecision;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: SecurityRule[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.policy_id) qs.set('policy_id', params.policy_id);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.rule_type) qs.set('rule_type', params.rule_type);
    if (params?.decision) qs.set('decision', params.decision);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: SecurityRule[]; total: number }>(
      `/mdm-v67/rules${s ? `?${s}` : ''}`
    );
  },

  async updateRule(
    id: string,
    data: Partial<CreateSecurityRuleRequest>
  ): Promise<ApiResponse<SecurityRule>> {
    return apiClient.master.put<SecurityRule>(`/mdm-v67/rules/${id}`, data);
  },

  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v67/rules/${id}`);
  },

  // ===== 数据分类分级 =====
  async classifyData(data: ClassifyDataRequest): Promise<ApiResponse<DataClassificationInfo>> {
    return apiClient.master.post<DataClassificationInfo>('/mdm-v67/classifications', data);
  },

  async getClassification(assetId: string): Promise<ApiResponse<DataClassificationInfo>> {
    return apiClient.master.get<DataClassificationInfo>(`/mdm-v67/classifications/${assetId}`);
  },

  async listClassifications(params?: {
    classification?: DataClassification;
    security_level?: SecurityLevel;
    owner?: string;
    review_status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: DataClassificationInfo[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.classification) qs.set('classification', params.classification);
    if (params?.security_level) qs.set('security_level', params.security_level);
    if (params?.owner) qs.set('owner', params.owner);
    if (params?.review_status) qs.set('review_status', params.review_status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: DataClassificationInfo[]; total: number }>(
      `/mdm-v67/classifications${s ? `?${s}` : ''}`
    );
  },

  async updateClassification(
    assetId: string,
    data: UpdateClassificationRequest
  ): Promise<ApiResponse<DataClassificationInfo>> {
    return apiClient.master.put<DataClassificationInfo>(
      `/mdm-v67/classifications/${assetId}`,
      data
    );
  },

  async reviewClassification(
    assetId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<ApiResponse<DataClassificationInfo>> {
    return apiClient.master.post<DataClassificationInfo>(
      `/mdm-v67/classifications/${assetId}/review`,
      { status, reason }
    );
  },

  async batchClassify(
    data: Array<{
      asset_id: string;
      classification: DataClassification;
      security_level: SecurityLevel;
    }>
  ): Promise<ApiResponse<{ classified: number; failed: number }>> {
    return apiClient.master.post<{ classified: number; failed: number }>(
      '/mdm-v67/classifications/batch',
      { items: data }
    );
  },

  // ===== 访问控制列表 =====
  async getAcl(assetId: string): Promise<ApiResponse<AccessControlList>> {
    return apiClient.master.get<AccessControlList>(`/mdm-v67/acls/${assetId}`);
  },

  async updateAcl(
    assetId: string,
    data: UpdateAclRequest
  ): Promise<ApiResponse<AccessControlList>> {
    return apiClient.master.put<AccessControlList>(`/mdm-v67/acls/${assetId}`, data);
  },

  async grantPermission(
    assetId: string,
    data: {
      subject_type: 'user' | 'role' | 'department' | 'public';
      subject_id?: string;
      actions: PermissionType[];
      expire_at?: string;
    }
  ): Promise<ApiResponse<AccessControlList>> {
    return apiClient.master.post<AccessControlList>(`/mdm-v67/acls/${assetId}/grant`, data);
  },

  async revokePermission(
    assetId: string,
    data: {
      subject_type: 'user' | 'role' | 'department' | 'public';
      subject_id?: string;
      actions?: PermissionType[];
    }
  ): Promise<ApiResponse<AccessControlList>> {
    return apiClient.master.post<AccessControlList>(`/mdm-v67/acls/${assetId}/revoke`, data);
  },

  async listAcls(params?: {
    asset_type?: string;
    subject_type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: AccessControlList[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.asset_type) qs.set('asset_type', params.asset_type);
    if (params?.subject_type) qs.set('subject_type', params.subject_type);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: AccessControlList[]; total: number }>(
      `/mdm-v67/acls${s ? `?${s}` : ''}`
    );
  },

  // ===== 访问请求工作流 =====
  async createAccessRequest(data: CreateAccessRequestRequest): Promise<ApiResponse<AccessRequest>> {
    return apiClient.master.post<AccessRequest>('/mdm-v67/access-requests', data);
  },

  async getAccessRequest(id: string): Promise<ApiResponse<AccessRequest>> {
    return apiClient.master.get<AccessRequest>(`/mdm-v67/access-requests/${id}`);
  },

  async listAccessRequests(params?: {
    status?: string;
    requester_id?: string;
    asset_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: AccessRequest[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.requester_id) qs.set('requester_id', params.requester_id);
    if (params?.asset_id) qs.set('asset_id', params.asset_id);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: AccessRequest[]; total: number }>(
      `/mdm-v67/access-requests${s ? `?${s}` : ''}`
    );
  },

  async reviewAccessRequest(
    id: string,
    data: ReviewAccessRequest
  ): Promise<ApiResponse<AccessRequest>> {
    return apiClient.master.post<AccessRequest>(`/mdm-v67/access-requests/${id}/review`, data);
  },

  async cancelAccessRequest(id: string): Promise<ApiResponse<AccessRequest>> {
    return apiClient.master.post<AccessRequest>(`/mdm-v67/access-requests/${id}/cancel`, {});
  },

  // ===== 访问检查 =====
  async checkAccess(data: CheckAccessRequest): Promise<ApiResponse<CheckAccessResponse>> {
    return apiClient.master.post<CheckAccessResponse>('/mdm-v67/check-access', data);
  },

  async batchCheckAccess(data: CheckAccessRequest[]): Promise<ApiResponse<CheckAccessResponse[]>> {
    return apiClient.master.post<CheckAccessResponse[]>('/mdm-v67/check-access/batch', {
      requests: data,
    });
  },

  // ===== 审计日志 =====
  async queryAuditLogs(
    params?: QueryAuditLogParams
  ): Promise<ApiResponse<{ items: AuditLog[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.actor_id) qs.set('actor_id', params.actor_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.status) qs.set('status', params.status);
    if (params?.target_type) qs.set('target_type', params.target_type);
    if (params?.target_id) qs.set('target_id', params.target_id);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.sensitive_only !== undefined)
      qs.set('sensitive_only', String(params.sensitive_only));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: AuditLog[]; total: number }>(
      `/mdm-v67/audit-logs${s ? `?${s}` : ''}`
    );
  },

  async getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
    return apiClient.master.get<AuditLog>(`/mdm-v67/audit-logs/${id}`);
  },

  async exportAuditLogs(
    params?: QueryAuditLogParams
  ): Promise<ApiResponse<{ download_url: string; count: number }>> {
    const qs = new URLSearchParams();
    if (params?.actor_id) qs.set('actor_id', params.actor_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.status) qs.set('status', params.status);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    return apiClient.master.get<{ download_url: string; count: number }>(
      `/mdm-v67/audit-logs/export?${qs.toString()}`
    );
  },

  // ===== 安全评估 =====
  async runSecurityAssessment(assetId: string): Promise<ApiResponse<SecurityAssessment>> {
    return apiClient.master.post<SecurityAssessment>(`/mdm-v67/assessments/${assetId}`, {});
  },

  async getSecurityAssessment(assetId: string): Promise<ApiResponse<SecurityAssessment>> {
    return apiClient.master.get<SecurityAssessment>(`/mdm-v67/assessments/${assetId}`);
  },

  async listSecurityAssessments(params?: {
    asset_type?: string;
    status?: 'compliant' | 'partial' | 'non_compliant';
    min_score?: number;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: SecurityAssessment[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.asset_type) qs.set('asset_type', params.asset_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.min_score !== undefined) qs.set('min_score', String(params.min_score));
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: SecurityAssessment[]; total: number }>(
      `/mdm-v67/assessments${s ? `?${s}` : ''}`
    );
  },

  // ===== 安全仪表盘 =====
  async getDashboard(): Promise<ApiResponse<SecurityDashboard>> {
    return apiClient.master.get<SecurityDashboard>('/mdm-v67/dashboard');
  },

  async getPolicyStats(): Promise<
    ApiResponse<{
      by_type: Array<{ type: string; count: number; active: number }>;
      by_status: Array<{ status: string; count: number }>;
    }>
  > {
    return apiClient.master.get<{
      by_type: Array<{ type: string; count: number; active: number }>;
      by_status: Array<{ status: string; count: number }>;
    }>('/mdm-v67/dashboard/policies');
  },

  async getClassificationStats(): Promise<
    ApiResponse<{
      by_level: Array<{ level: SecurityLevel; count: number }>;
      by_classification: Array<{ classification: DataClassification; count: number }>;
      unclassified_count: number;
    }>
  > {
    return apiClient.master.get<{
      by_level: Array<{ level: SecurityLevel; count: number }>;
      by_classification: Array<{ classification: DataClassification; count: number }>;
      unclassified_count: number;
    }>('/mdm-v67/dashboard/classifications');
  },

  async getAccessStats(days?: number): Promise<
    ApiResponse<{
      total_granted: number;
      total_denied: number;
      by_action: Array<{ action: string; granted: number; denied: number }>;
      trend: Array<{ date: string; granted: number; denied: number }>;
    }>
  > {
    const qs = new URLSearchParams();
    if (days !== undefined) qs.set('days', String(days));
    return apiClient.master.get<{
      total_granted: number;
      total_denied: number;
      by_action: Array<{ action: string; granted: number; denied: number }>;
      trend: Array<{ date: string; granted: number; denied: number }>;
    }>(`/mdm-v67/dashboard/access${qs.toString() ? `?${qs.toString()}` : ''}`);
  },
};

export default dataSecurityApiV67;
