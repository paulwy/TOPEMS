import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type PolicyStatus = 'draft' | 'active' | 'paused' | 'archived';
export type PolicyType =
  'classification' | 'retention' | 'access' | 'encryption' | 'masking' | 'compliance' | 'quality';
export type PolicyScope = 'global' | 'tenant' | 'department' | 'entity' | 'field';
export type PolicyAction = 'allow' | 'deny' | 'warn' | 'encrypt' | 'mask' | 'alert' | 'log';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PolicyVersionStatus = 'draft' | 'published' | 'deprecated';

export interface PolicyDefinition {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  policy_type: PolicyType;
  status: PolicyStatus;
  scope: PolicyScope;
  scope_target?: string;
  rules: PolicyRule[];
  priority: number;
  version: string;
  owner?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: PolicyAction;
  parameters?: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version: string;
  status: PolicyVersionStatus;
  changelog?: string;
  definition: Omit<PolicyDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
  created_by?: string;
  created_at?: string;
}

export interface PolicyExecution {
  id: string;
  policy_id: string;
  policy_name: string;
  status: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  records_affected?: number;
  errors_count?: number;
  summary?: Record<string, unknown>;
  triggered_by?: string;
}

export interface PolicyLog {
  id: string;
  policy_id: string;
  policy_version: string;
  action: 'created' | 'updated' | 'published' | 'executed' | 'paused' | 'archived';
  details?: Record<string, unknown>;
  performed_by?: string;
  performed_at: string;
}

export interface PolicyDashboard {
  total_policies: number;
  active_policies: number;
  draft_policies: number;
  by_type: Array<{ type: PolicyType; count: number }>;
  by_status: Array<{ status: PolicyStatus; count: number }>;
  recent_executions: Array<{
    policy_id: string;
    policy_name: string;
    status: ExecutionStatus;
    executed_at: string;
  }>;
  compliance_score: number;
}

export interface ListPoliciesRequest {
  page?: number;
  pagesize?: number;
  policy_type?: PolicyType;
  status?: PolicyStatus;
  scope?: PolicyScope;
  keyword?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ListPolicyExecutionsRequest {
  page?: number;
  pagesize?: number;
  policy_id?: string;
  status?: ExecutionStatus;
  from_date?: string;
  to_date?: string;
}

export interface ListPolicyVersionsRequest {
  page?: number;
  pagesize?: number;
  status?: PolicyVersionStatus;
}

export interface ListPolicyLogsRequest {
  page?: number;
  pagesize?: number;
  policy_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pagesize: number;
}

// ============ API ============

export const dataPolicyConfigurationApiV79 = {
  // ===== 策略管理 =====
  async createPolicy(
    data: Partial<PolicyDefinition> & { name: string; policy_type: PolicyType; rules: PolicyRule[] }
  ): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.post<PolicyDefinition>('/mdm-v79/policies', data);
  },

  async getPolicy(id: string): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.get<PolicyDefinition>(`/mdm-v79/policies/${id}`);
  },

  async listPolicies(
    params?: ListPoliciesRequest
  ): Promise<ApiResponse<PaginatedResponse<PolicyDefinition>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.policy_type) qs.set('policy_type', params.policy_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.keyword) qs.set('keyword', params.keyword);
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    if (params?.sort_order) qs.set('sort_order', params.sort_order);
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<PolicyDefinition>>(
      `/mdm-v79/policies${s ? `?${s}` : ''}`
    );
  },

  async updatePolicy(
    id: string,
    data: Partial<PolicyDefinition>
  ): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.put<PolicyDefinition>(`/mdm-v79/policies/${id}`, data);
  },

  async deletePolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v79/policies/${id}`);
  },

  async setPolicyStatus(id: string, status: PolicyStatus): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.patch<PolicyDefinition>(`/mdm-v79/policies/${id}/status`, { status });
  },

  // ===== 策略版本管理 =====
  async listPolicyVersions(
    policyId: string,
    params?: ListPolicyVersionsRequest
  ): Promise<ApiResponse<PaginatedResponse<PolicyVersion>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.status) qs.set('status', params.status);
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<PolicyVersion>>(
      `/mdm-v79/policies/${policyId}/versions${s ? `?${s}` : ''}`
    );
  },

  async getPolicyVersion(policyId: string, version: string): Promise<ApiResponse<PolicyVersion>> {
    return apiClient.master.get<PolicyVersion>(`/mdm-v79/policies/${policyId}/versions/${version}`);
  },

  async publishPolicyVersion(
    policyId: string,
    version: string
  ): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.post<PolicyDefinition>(
      `/mdm-v79/policies/${policyId}/versions/${version}/publish`,
      {}
    );
  },

  async diffPolicyVersions(
    policyId: string,
    v1: string,
    v2: string
  ): Promise<
    ApiResponse<{
      added: string[];
      removed: string[];
      modified: string[];
    }>
  > {
    return apiClient.master.get(`/mdm-v79/policies/${policyId}/versions/diff?v1=${v1}&v2=${v2}`);
  },

  // ===== 策略执行与监控 =====
  async executePolicy(
    policyId: string,
    data?: { scope_target?: string; dry_run?: boolean }
  ): Promise<ApiResponse<PolicyExecution>> {
    return apiClient.master.post<PolicyExecution>(
      `/mdm-v79/policies/${policyId}/execute`,
      data || {}
    );
  },

  async getExecution(id: string): Promise<ApiResponse<PolicyExecution>> {
    return apiClient.master.get<PolicyExecution>(`/mdm-v79/executions/${id}`);
  },

  async listExecutions(
    params?: ListPolicyExecutionsRequest
  ): Promise<ApiResponse<PaginatedResponse<PolicyExecution>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.policy_id) qs.set('policy_id', params.policy_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<PolicyExecution>>(
      `/mdm-v79/executions${s ? `?${s}` : ''}`
    );
  },

  async cancelExecution(id: string): Promise<ApiResponse<PolicyExecution>> {
    return apiClient.master.post<PolicyExecution>(`/mdm-v79/executions/${id}/cancel`, {});
  },

  async retryExecution(id: string): Promise<ApiResponse<PolicyExecution>> {
    return apiClient.master.post<PolicyExecution>(`/mdm-v79/executions/${id}/retry`, {});
  },

  async getExecutionLogs(executionId: string): Promise<ApiResponse<PolicyLog[]>> {
    return apiClient.master.get<PolicyLog[]>(`/mdm-v79/executions/${executionId}/logs`);
  },

  // ===== 策略日志 =====
  async listPolicyLogs(
    params?: ListPolicyLogsRequest
  ): Promise<ApiResponse<PaginatedResponse<PolicyLog>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pagesize !== undefined) qs.set('pagesize', String(params.pagesize));
    if (params?.policy_id) qs.set('policy_id', params.policy_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<PolicyLog>>(`/mdm-v79/logs${s ? `?${s}` : ''}`);
  },

  async getPolicyLogsByPolicy(policyId: string): Promise<ApiResponse<PolicyLog[]>> {
    return apiClient.master.get<PolicyLog[]>(`/mdm-v79/policies/${policyId}/logs`);
  },

  // ===== 策略评估与测试 =====
  async evaluatePolicy(
    policyId: string,
    data?: { sample_data?: Record<string, unknown> }
  ): Promise<
    ApiResponse<{
      valid: boolean;
      violations: Array<{ rule_id: string; description: string; record_id?: string }>;
      affected_count: number;
    }>
  > {
    return apiClient.master.post(`/mdm-v79/policies/${policyId}/evaluate`, data || {});
  },

  async testPolicy(
    policyId: string,
    testData: Record<string, unknown>[]
  ): Promise<
    ApiResponse<{
      results: Array<{
        record: Record<string, unknown>;
        matched_rules: string[];
        actions: PolicyAction[];
      }>;
      summary: { total: number; matched: number; passed: number };
    }>
  > {
    return apiClient.master.post(`/mdm-v79/policies/${policyId}/test`, { test_data: testData });
  },

  async getPolicyImpact(policyId: string): Promise<
    ApiResponse<{
      affected_entities: Array<{ entity_type: string; count: number }>;
      affected_fields: Array<{ entity_type: string; field: string; count: number }>;
      risk_assessment: 'low' | 'medium' | 'high';
    }>
  > {
    return apiClient.master.get(`/mdm-v79/policies/${policyId}/impact`);
  },

  // ===== 批量操作 =====
  async batchUpdateStatus(
    ids: string[],
    status: PolicyStatus
  ): Promise<ApiResponse<{ updated: number }>> {
    return apiClient.master.patch(`/mdm-v79/policies/batch-status`, { ids, status });
  },

  async batchDelete(ids: string[]): Promise<ApiResponse<{ deleted: number }>> {
    return apiClient.master.post(`/mdm-v79/policies/batch-delete`, { ids });
  },

  async batchExecute(policyIds: string[]): Promise<ApiResponse<{ executions: PolicyExecution[] }>> {
    return apiClient.master.post(`/mdm-v79/policies/batch-execute`, { policy_ids: policyIds });
  },

  // ===== 策略导入导出 =====
  async exportPolicies(params?: {
    policy_type?: PolicyType;
    status?: PolicyStatus;
    format?: 'json' | 'yaml';
  }): Promise<ApiResponse<{ url: string; count: number }>> {
    const qs = new URLSearchParams();
    if (params?.policy_type) qs.set('policy_type', params.policy_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.format) qs.set('format', params.format);
    const s = qs.toString();
    return apiClient.master.get(`/mdm-v79/policies/export${s ? `?${s}` : ''}`);
  },

  async importPolicies(
    data: Array<{ name: string; policy_type: PolicyType; rules: PolicyRule[] }>
  ): Promise<ApiResponse<{ imported: number; errors: number }>> {
    return apiClient.master.post(`/mdm-v79/policies/import`, { policies: data });
  },

  // ===== 策略模板 =====
  async listPolicyTemplates(params?: { policy_type?: PolicyType }): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description: string;
        policy_type: PolicyType;
        rules: PolicyRule[];
      }>
    >
  > {
    const qs = new URLSearchParams();
    if (params?.policy_type) qs.set('policy_type', params.policy_type);
    const s = qs.toString();
    return apiClient.master.get(`/mdm-v79/templates${s ? `?${s}` : ''}`);
  },

  async createPolicyFromTemplate(
    templateId: string,
    data: { name: string; description?: string; scope?: PolicyScope }
  ): Promise<ApiResponse<PolicyDefinition>> {
    return apiClient.master.post<PolicyDefinition>(
      `/mdm-v79/templates/${templateId}/instantiate`,
      data
    );
  },

  // ===== 策略仪表板 =====
  async getPolicyDashboard(): Promise<ApiResponse<PolicyDashboard>> {
    return apiClient.master.get<PolicyDashboard>('/mdm-v79/dashboard');
  },

  async getPolicyStats(): Promise<
    ApiResponse<{
      total_policies: number;
      active_policies: number;
      executed_last_7_days: number;
      violations_last_7_days: number;
      compliance_rate: number;
    }>
  > {
    return apiClient.master.get('/mdm-v79/stats');
  },

  async getComplianceReport(): Promise<
    ApiResponse<{
      overall_score: number;
      by_type: Array<{ type: PolicyType; score: number; violations: number }>;
      by_department: Array<{ department: string; score: number; violations: number }>;
      recommendations: string[];
    }>
  > {
    return apiClient.master.get('/mdm-v79/compliance-report');
  },
};
