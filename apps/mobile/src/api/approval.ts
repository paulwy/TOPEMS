import { apiClient } from './client';
import type { ApiResponse, ApprovalTask } from '@/types';

export const approvalApi = {
  getApprovals: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<{ items: ApprovalTask[]; total: number }>> => {
    return apiClient.get('/approval/tasks', { params });
  },

  getTasks: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<{ items: ApprovalTask[]; total: number }>> => {
    return apiClient.get('/approval/tasks', { params });
  },

  getPendingTasks: async (): Promise<ApiResponse<ApprovalTask[]>> => {
    return apiClient.get('/approval/tasks/pending');
  },

  getTaskById: async (id: string): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.get(`/approval/tasks/${id}`);
  },

  approveApproval: async (id: string, data?: { comment?: string }): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.post(`/approval/tasks/${id}/approve`, data);
  },

  approve: async (id: string, data?: { comment?: string }): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.post(`/approval/tasks/${id}/approve`, data);
  },

  rejectApproval: async (id: string, data?: { comment?: string }): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.post(`/approval/tasks/${id}/reject`, data);
  },

  reject: async (id: string, data?: { comment?: string }): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.post(`/approval/tasks/${id}/reject`, data);
  },

  delegate: async (
    id: string,
    data: { userId: string; reason?: string },
  ): Promise<ApiResponse<ApprovalTask>> => {
    return apiClient.post(`/approval/tasks/${id}/delegate`, data);
  },

  getHistory: async (params: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: ApprovalTask[]; total: number }>> => {
    return apiClient.get('/approval/history', { params });
  },
};
