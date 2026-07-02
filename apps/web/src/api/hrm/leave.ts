import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { LeaveRequest, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const leaveApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/leaves${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/leaves/${id}`);
  },

  create: (data: Partial<LeaveRequest>) => {
    return apiClient.hrm.post('/leaves', data);
  },

  update: (id: string, data: Partial<LeaveRequest>) => {
    return apiClient.hrm.put(`/leaves/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/leaves/${id}`);
  },

  approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/leaves/${id}/approve`, { approver_id });
  },

  reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/leaves/${id}/reject`, {
      approver_id,
      reason,
    });
  },
};

export default leaveApi;
