import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type MaskingType = 'mask' | 'redact' | 'hash' | 'tokenize' | 'encrypt' | 'generalize';
export type PiiType =
  'email' | 'phone' | 'id_card' | 'bank_card' | 'address' | 'name' | 'salary' | 'other';
export type PolicyStatus = 'active' | 'inactive' | 'draft';
export type AuditAction = 'mask' | 'unmask' | 'policy_create' | 'policy_update' | 'access';

export interface MaskingRule {
  id: string;
  name: string;
  type: MaskingType;
  pattern: string;
  replacement?: string;
  function?: string;
  target_type: 'field' | 'column';
  target_name: string;
  pii_type?: PiiType;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface PrivacyPolicy {
  id: string;
  name: string;
  description?: string;
  scope: 'global' | 'entity' | 'field';
  entity_type?: string;
  field_names?: string[];
  pii_types: PiiType[];
  masking_rule_ids: string[];
  exclusion_roles?: string[];
  status: PolicyStatus;
  owner?: string;
  created_at: string;
  updated_at: string;
}

export interface PiiDetectionResult {
  field_name: string;
  value: string;
  detected_types: PiiType[];
  confidence: number;
  suggestion: MaskingType;
  matched_rule_id?: string;
}

export interface AccessAuditLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  field_name?: string;
  reason?: string;
  request_ip?: string;
  timestamp: string;
  policy_id?: string;
  was_masked: boolean;
}

export interface PrivacyDashboardV64 {
  total_rules: number;
  active_rules: number;
  by_type: Array<{ type: MaskingType; count: number }>;
  total_policies: number;
  active_policies: number;
  pii_fields_protected: number;
  pii_fields_unprotected: number;
  audit_events_7d: number;
  unmask_events_7d: number;
}

// ============ Request Types ============

export interface CreateMaskingRuleRequest {
  name: string;
  type: MaskingType;
  pattern: string;
  replacement?: string;
  function?: string;
  target_type: 'field' | 'column';
  target_name: string;
  pii_type?: PiiType;
}

export interface UpdateMaskingRuleRequest {
  name?: string;
  type?: MaskingType;
  pattern?: string;
  replacement?: string;
  status?: 'active' | 'inactive';
}

export interface CreatePrivacyPolicyRequest {
  name: string;
  description?: string;
  scope: 'global' | 'entity' | 'field';
  entity_type?: string;
  field_names?: string[];
  pii_types: PiiType[];
  masking_rule_ids: string[];
  exclusion_roles?: string[];
}

export interface DetectPiiRequest {
  data: Record<string, unknown>;
  entity_type?: string;
}

export interface MaskDataRequest {
  data: Record<string, unknown>;
  entity_type: string;
  policy_id?: string;
}

export interface UnmaskRequest {
  data: Record<string, unknown>;
  entity_type: string;
  field_names?: string[];
  reason: string;
}

// ============ API ============

export const dataMaskingApiV64 = {
  // ===== 脱敏规则管理 =====
  async createRule(data: CreateMaskingRuleRequest): Promise<ApiResponse<MaskingRule>> {
    return apiClient.master.post<MaskingRule>('/mdm-v64/rules', data);
  },

  async getRule(id: string): Promise<ApiResponse<MaskingRule>> {
    return apiClient.master.get<MaskingRule>(`/mdm-v64/rules/${id}`);
  },

  async listRules(params?: {
    type?: MaskingType;
    pii_type?: PiiType;
    status?: 'active' | 'inactive';
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: MaskingRule[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.pii_type) qs.set('pii_type', params.pii_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.pageSize !== undefined) qs.set('pagesize', String(params.pageSize));
    const s = qs.toString();
    return apiClient.master.get<{ items: MaskingRule[]; total: number }>(
      `/mdm-v64/rules${s ? `?${s}` : ''}`
    );
  },

  async updateRule(id: string, data: UpdateMaskingRuleRequest): Promise<ApiResponse<MaskingRule>> {
    return apiClient.master.put<MaskingRule>(`/mdm-v64/rules/${id}`, data);
  },

  async deleteRule(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v64/rules/${id}`);
  },

  // ===== 隐私策略管理 =====
  async createPolicy(data: CreatePrivacyPolicyRequest): Promise<ApiResponse<PrivacyPolicy>> {
    return apiClient.master.post<PrivacyPolicy>('/mdm-v64/policies', data);
  },

  async getPolicy(id: string): Promise<ApiResponse<PrivacyPolicy>> {
    return apiClient.master.get<PrivacyPolicy>(`/mdm-v64/policies/${id}`);
  },

  async listPolicies(params?: {
    scope?: 'global' | 'entity' | 'field';
    status?: PolicyStatus;
    entity_type?: string;
  }): Promise<ApiResponse<{ items: PrivacyPolicy[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.status) qs.set('status', params.status);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    const s = qs.toString();
    return apiClient.master.get<{ items: PrivacyPolicy[]; total: number }>(
      `/mdm-v64/policies${s ? `?${s}` : ''}`
    );
  },

  async updatePolicy(
    id: string,
    data: Partial<CreatePrivacyPolicyRequest>
  ): Promise<ApiResponse<PrivacyPolicy>> {
    return apiClient.master.put<PrivacyPolicy>(`/mdm-v64/policies/${id}`, data);
  },

  async deletePolicy(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v64/policies/${id}`);
  },

  async activatePolicy(id: string): Promise<ApiResponse<PrivacyPolicy>> {
    return apiClient.master.post<PrivacyPolicy>(`/mdm-v64/policies/${id}/activate`, {});
  },

  async deactivatePolicy(id: string): Promise<ApiResponse<PrivacyPolicy>> {
    return apiClient.master.post<PrivacyPolicy>(`/mdm-v64/policies/${id}/deactivate`, {});
  },

  // ===== PII 检测与脱敏执行 =====
  async detectPii(data: DetectPiiRequest): Promise<ApiResponse<PiiDetectionResult[]>> {
    return apiClient.master.post<PiiDetectionResult[]>('/mdm-v64/detect', data);
  },

  async maskData(
    data: MaskDataRequest
  ): Promise<ApiResponse<{ masked_data: Record<string, unknown>; applied_rules: string[] }>> {
    return apiClient.master.post<{ masked_data: Record<string, unknown>; applied_rules: string[] }>(
      '/mdm-v64/mask',
      data
    );
  },

  async unmaskData(
    data: UnmaskRequest
  ): Promise<ApiResponse<{ unmasked_data: Record<string, unknown>; audit_id: string }>> {
    return apiClient.master.post<{ unmasked_data: Record<string, unknown>; audit_id: string }>(
      '/mdm-v64/unmask',
      data
    );
  },

  async previewMasking(data: { entity_type: string; record: Record<string, unknown> }): Promise<
    ApiResponse<{
      original: Record<string, unknown>;
      masked: Record<string, unknown>;
      changes: string[];
    }>
  > {
    return apiClient.master.post<{
      original: Record<string, unknown>;
      masked: Record<string, unknown>;
      changes: string[];
    }>('/mdm-v64/preview', data);
  },

  // ===== 审计日志 =====
  async listAuditLogs(params?: {
    user_id?: string;
    action?: AuditAction;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<AccessAuditLog[]>> {
    const qs = new URLSearchParams();
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.action) qs.set('action', params.action);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const s = qs.toString();
    return apiClient.master.get<AccessAuditLog[]>(`/mdm-v64/audit${s ? `?${s}` : ''}`);
  },

  async getAuditLog(id: string): Promise<ApiResponse<AccessAuditLog>> {
    return apiClient.master.get<AccessAuditLog>(`/mdm-v64/audit/${id}`);
  },

  async exportAuditLogs(params?: {
    start_date: string;
    end_date: string;
    format?: 'csv' | 'json';
  }): Promise<ApiResponse<{ download_url: string; record_count: number }>> {
    const qs = new URLSearchParams();
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    if (params?.format) qs.set('format', params.format);
    return apiClient.master.get<{ download_url: string; record_count: number }>(
      `/mdm-v64/audit/export?${qs.toString()}`
    );
  },

  // ===== 仪表盘 =====
  async getDashboard(): Promise<ApiResponse<PrivacyDashboardV64>> {
    return apiClient.master.get<PrivacyDashboardV64>('/mdm-v64/dashboard');
  },
};

export default dataMaskingApiV64;
