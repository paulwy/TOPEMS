/**
 * Template · 模板审批流 API 绑定
 *
 * 后端: doc 服务 /templates/{id}/approvals/*
 * 路由:
 *   GET    /templates/{id}/approvals
 *   POST   /templates/{id}/approvals
 *   GET    /templates/approvals/pending
 *   POST   /templates/approvals/{id}/approve
 *   POST   /templates/approvals/{id}/reject
 *   GET    /templates/approvals/{id}
 *   POST   /templates/approvals/{id}/cancel
 *   GET    /templates/approvals/my-pending
 *   GET    /templates/approvals/my-submitted
 *   GET    /templates/approvals/my-history
 *   POST   /templates/{id}/submit
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_review';

export type ApprovalType =
  'publish' | 'deprecate' | 'delete' | 'modify_content' | 'change_permission';

export interface ApprovalRequest {
  id: string;
  template_id: string;
  template_name: string;
  template_type: string;
  request_type: ApprovalType;
  status: ApprovalStatus;
  requested_by: string;
  requested_by_name: string;
  requested_by_email?: string;
  approver_id?: string;
  approver_name?: string;
  approver_email?: string;
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  comment?: string;
  changes_summary?: string;
  review_required: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalRequest {
  request_type: ApprovalType;
  approver_id?: string;
  approvers?: string[];
  comment?: string;
  changes_summary?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ApproveRequest {
  comment?: string;
  version?: number;
}

export interface RejectRequest {
  reason: string;
  suggestion?: string;
}

export const templateApprovalApi = {
  // ==================== 审批发起 ====================

  listTemplateApprovals: async (
    templateId: string,
    params?: { status?: ApprovalStatus; page?: number; pagesize?: number }
  ): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> => {
    return apiClient.doc.get(`/templates/${templateId}/approvals`, { params });
  },

  createApproval: async (
    templateId: string,
    data: CreateApprovalRequest
  ): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.post(`/templates/${templateId}/approvals`, data);
  },

  submitTemplate: async (
    templateId: string,
    data?: { comment?: string; priority?: string }
  ): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.post(`/templates/${templateId}/submit`, data || {});
  },

  // ==================== 审批处理 ====================

  getApproval: async (approvalId: string): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.get(`/templates/approvals/${approvalId}`);
  },

  approve: async (
    approvalId: string,
    data?: ApproveRequest
  ): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.post(`/templates/approvals/${approvalId}/approve`, data || {});
  },

  reject: async (
    approvalId: string,
    data: RejectRequest
  ): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.post(`/templates/approvals/${approvalId}/reject`, data);
  },

  cancel: async (approvalId: string): Promise<ApiResponse<ApprovalRequest>> => {
    return apiClient.doc.post(`/templates/approvals/${approvalId}/cancel`);
  },

  // ==================== 审批列表 ====================

  listPending: async (params?: {
    priority?: string;
    request_type?: ApprovalType;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> => {
    return apiClient.doc.get('/templates/approvals/pending', { params });
  },

  listMyPending: async (params?: {
    request_type?: ApprovalType;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> => {
    return apiClient.doc.get('/templates/approvals/my-pending', { params });
  },

  listMySubmitted: async (params?: {
    status?: ApprovalStatus;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> => {
    return apiClient.doc.get('/templates/approvals/my-submitted', { params });
  },

  listMyHistory: async (params?: {
    status?: ApprovalStatus;
    request_type?: ApprovalType;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> => {
    return apiClient.doc.get('/templates/approvals/my-history', { params });
  },
};

export default templateApprovalApi;
