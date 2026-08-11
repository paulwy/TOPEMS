/**
 * Mobile · 移动端审批增强 API 绑定
 *
 * 后端: svc/mobile/src/modules/approval_enhanced.rs
 * 路由:
 *   GET    /approvals/templates
 *   GET    /approvals/templates/{id}
 *   POST   /approvals/templates
 *   PUT    /approvals/templates/{id}
 *   DELETE /approvals/templates/{id}
 *   POST   /approvals/templates/{id}/apply
 *   GET    /approvals/{id}/history
 *   POST   /approvals/{id}/cc
 *   DELETE /approvals/{id}/cc/{userId}
 *   GET    /approvals/{id}/approvers
 *   POST   /approvals/batch/approve
 *   POST   /approvals/batch/reject
 *   POST   /approvals/{id}/escalate
 *   GET    /approvals/delegations
 *   POST   /approvals/delegations
 *   PUT    /approvals/delegations/{id}
 *   DELETE /approvals/delegations/{id}
 *   GET    /approvals/stats
 *   GET    /approvals/my-approvals
 *   GET    /approvals/my-requests
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type EnhancedApprovalStatus =
  'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DelegationStatus = 'active' | 'expired' | 'revoked';
export type TemplateTriggerType = 'manual' | 'event' | 'schedule';

export interface ApprovalTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  trigger_type: TemplateTriggerType;
  form_fields: TemplateFormField[];
  approval_chain: ApprovalChainNode[];
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  required: boolean;
  options?: string[];
  default_value?: unknown;
}

export interface ApprovalChainNode {
  order: number;
  type: 'user' | 'role' | 'department';
  approver_id?: string;
  approver_name?: string;
  role_name?: string;
  department_name?: string;
  allow_delegate: boolean;
  timeout_hours?: number;
}

export interface ApprovalHistory {
  id: string;
  approval_id: string;
  action: 'submit' | 'approve' | 'reject' | 'delegate' | 'escalate' | 'cc';
  actor: string;
  actor_name?: string;
  comment?: string;
  attachments?: Array<{ id: string; name: string; url: string }>;
  created_at: string;
}

export interface ApproverInfo {
  user_id: string;
  user_name?: string;
  role: 'approver' | 'cc' | 'observer';
  order?: number;
  status?: 'pending' | 'approved' | 'rejected';
  delegated_to?: string;
}

export interface Delegation {
  id: string;
  delegator_id: string;
  delegator_name?: string;
  delegate_id: string;
  delegate_name?: string;
  reason?: string;
  status: DelegationStatus;
  scope?: 'all' | 'specific_types';
  approval_types?: string[];
  start_date: string;
  end_date?: string;
  created_at: string;
}

export interface ApprovalStats {
  total_pending: number;
  total_approved_this_month: number;
  total_rejected_this_month: number;
  avg_approval_time_hours: number;
  by_priority: Array<{
    priority: ApprovalPriority;
    count: number;
  }>;
  by_type: Array<{
    type: string;
    count: number;
  }>;
  delegations_active: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  trigger_type?: TemplateTriggerType;
  form_fields: TemplateFormField[];
  approval_chain: ApprovalChainNode[];
}

export interface ApplyTemplateRequest {
  template_id: string;
  data: Record<string, unknown>;
  approvers?: string[];
  cc_users?: string[];
  priority?: ApprovalPriority;
}

export interface BatchActionRequest {
  ids: string[];
  comment?: string;
}

export interface CreateDelegationRequest {
  delegate_id: string;
  reason?: string;
  scope?: 'all' | 'specific_types';
  approval_types?: string[];
  start_date: string;
  end_date?: string;
}

export const approvalEnhancedApi = {
  // ==================== 审批模板 ====================

  listTemplates: async (params?: {
    category?: string;
    is_active?: boolean;
    keyword?: string;
  }): Promise<ApiResponse<ApprovalTemplate[]>> => {
    return apiClient.mobile.get('/approvals/templates', { params });
  },

  getTemplate: async (id: string): Promise<ApiResponse<ApprovalTemplate>> => {
    return apiClient.mobile.get(`/approvals/templates/${id}`);
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<ApiResponse<ApprovalTemplate>> => {
    return apiClient.mobile.post('/approvals/templates', data);
  },

  updateTemplate: async (
    id: string,
    data: Partial<CreateTemplateRequest>
  ): Promise<ApiResponse<ApprovalTemplate>> => {
    return apiClient.mobile.put(`/approvals/templates/${id}`, data);
  },

  deleteTemplate: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/approvals/templates/${id}`);
  },

  applyTemplate: async (
    data: ApplyTemplateRequest
  ): Promise<ApiResponse<{ approval_id: string }>> => {
    return apiClient.mobile.post(`/approvals/templates/${data.template_id}/apply`, data);
  },

  // ==================== 审批历史与抄送人 ====================

  getApprovalHistory: async (approvalId: string): Promise<ApiResponse<ApprovalHistory[]>> => {
    return apiClient.mobile.get(`/approvals/${approvalId}/history`);
  },

  listApprovers: async (approvalId: string): Promise<ApiResponse<ApproverInfo[]>> => {
    return apiClient.mobile.get(`/approvals/${approvalId}/approvers`);
  },

  addCcUser: async (approvalId: string, data: { user_id: string }): Promise<ApiResponse<void>> => {
    return apiClient.mobile.post(`/approvals/${approvalId}/cc`, data);
  },

  removeCcUser: async (approvalId: string, userId: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/approvals/${approvalId}/cc/${userId}`);
  },

  // ==================== 批量审批 ====================

  batchApprove: async (data: BatchActionRequest): Promise<ApiResponse<{ processed: number }>> => {
    return apiClient.mobile.post('/approvals/batch/approve', data);
  },

  batchReject: async (data: BatchActionRequest): Promise<ApiResponse<{ processed: number }>> => {
    return apiClient.mobile.post('/approvals/batch/reject', data);
  },

  escalateApproval: async (
    approvalId: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<void>> => {
    return apiClient.mobile.post(`/approvals/${approvalId}/escalate`, data || {});
  },

  // ==================== 委托管理 ====================

  listDelegations: async (params?: {
    status?: DelegationStatus;
  }): Promise<ApiResponse<Delegation[]>> => {
    return apiClient.mobile.get('/approvals/delegations', { params });
  },

  createDelegation: async (data: CreateDelegationRequest): Promise<ApiResponse<Delegation>> => {
    return apiClient.mobile.post('/approvals/delegations', data);
  },

  updateDelegation: async (
    id: string,
    data: Partial<CreateDelegationRequest>
  ): Promise<ApiResponse<Delegation>> => {
    return apiClient.mobile.put(`/approvals/delegations/${id}`, data);
  },

  deleteDelegation: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`/approvals/delegations/${id}`);
  },

  // ==================== 我的审批与统计 ====================

  listMyApprovals: async (params?: {
    status?: EnhancedApprovalStatus;
    priority?: ApprovalPriority;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalTemplate>>> => {
    return apiClient.mobile.get('/approvals/my-approvals', { params });
  },

  listMyRequests: async (params?: {
    status?: EnhancedApprovalStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalTemplate>>> => {
    return apiClient.mobile.get('/approvals/my-requests', { params });
  },

  getApprovalStats: async (): Promise<ApiResponse<ApprovalStats>> => {
    return apiClient.mobile.get('/approvals/stats');
  },
};

export default approvalEnhancedApi;
