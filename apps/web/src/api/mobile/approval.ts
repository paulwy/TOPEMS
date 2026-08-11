/**
 * Mobile · 移动审批 API 绑定
 *
 * 后端: svc/mobile/src/modules/approval.rs
 * 路由（逻辑路径，待 main.rs 注册）:
 *   GET    /approvals
 *   GET    /approvals/pending
 *   GET    /approvals/{id}
 *   POST   /approvals/{id}/approve
 *   POST   /approvals/{id}/reject
 *   POST   /approvals/{id}/delegate
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ApprovalTask {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority?: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completedAt?: string;
}

export interface ApprovalListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  type?: string;
}

export interface ApprovalActionRequest {
  comment?: string;
}

export interface DelegateApprovalRequest {
  userId: string;
  reason?: string;
}

export const approvalApi = {
  listTasks: async (
    params?: ApprovalListQuery
  ): Promise<
    ApiResponse<{
      items: ApprovalTask[];
      total: number;
    }>
  > => {
    if (!params) {
      return apiClient.mobile.get('/approvals');
    }
    const usp = new URLSearchParams();
    if (params.page !== undefined) usp.set('page', String(params.page));
    if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
    if (params.status) usp.set('status', params.status);
    if (params.type) usp.set('type', params.type);
    const qs = usp.toString();
    return apiClient.mobile.get(`/approvals${qs ? `?${qs}` : ''}`);
  },

  listPending: async (): Promise<ApiResponse<ApprovalTask[]>> => {
    return apiClient.mobile.get('/approvals/pending');
  },

  getTask: async (id: string): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.mobile.get(`/approvals/${id}`);
  },

  approveTask: async (
    id: string,
    data?: ApprovalActionRequest
  ): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.mobile.post(`/approvals/${id}/approve`, data || {});
  },

  rejectTask: async (
    id: string,
    data?: ApprovalActionRequest
  ): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.mobile.post(`/approvals/${id}/reject`, data || {});
  },

  delegateTask: async (
    id: string,
    data: DelegateApprovalRequest
  ): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.mobile.post(`/approvals/${id}/delegate`, data);
  },
};

export default approvalApi;
