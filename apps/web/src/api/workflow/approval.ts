import apiClient from '../client';
import type { CreateApprovalRequest, ProcessApprovalRequest, ListParams } from './types';

export const approvalApi = {
  list: (params?: ListParams) => {
    return apiClient.workflow.get(`/approvals`, { params });
  },

  create: (data: CreateApprovalRequest) => {
    return apiClient.workflow.post('/approvals', data);
  },

  get: (id: string) => {
    return apiClient.workflow.get(`/approvals/${id}`);
  },

  process: (id: string, data: ProcessApprovalRequest) => {
    return apiClient.workflow.post(`/approvals/${id}/process`, data);
  },

  listApprovals: (params?: ListParams) => {
    return apiClient.workflow.get(`/approvals`, { params });
  },

  getRecords: (params?: ListParams) => {
    return apiClient.workflow.get(`/records`, { params });
  },

  getRecordsByApproval: (approvalId: string) => {
    return apiClient.workflow.get(`/records/${approvalId}`);
  },
};

export const approvalTaskApi = {
  listApprovalTasks: (params?: ListParams) => {
    return apiClient.workflow.get(`/approval-tasks`, { params });
  },

  getApprovalTask: (id: string) => {
    return apiClient.workflow.get(`/approval-tasks/${id}`);
  },

  approveTask: (id: string, data?: { comment?: string; actor_id?: string }) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/approve`, data);
  },

  rejectTask: (id: string, data?: { comment?: string; actor_id?: string }) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/reject`, data);
  },

  delegateTask: (id: string, data: { delegate_to: string; delegate_to_name?: string }) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/delegate`, data);
  },

  reassignTask: (id: string, data: { assignee_id: string; assignee_name?: string }) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/reassign`, data);
  },

  claimTask: (id: string) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/claim`);
  },

  unclaimTask: (id: string) => {
    return apiClient.workflow.post(`/approval-tasks/${id}/unclaim`);
  },
};
