import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { LeaveRequest, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const leaveApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/leaves${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/leaves/${id}`);
  },

  create: (data: Partial<LeaveRequest>) => {
    return apiClient.hrm.post('/api/hrm/leaves', data);
  },

  update: (id: string, data: Partial<LeaveRequest>) => {
    return apiClient.hrm.put(`/api/hrm/leaves/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/leaves/${id}`);
  },

  approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/hrm/leaves/${id}/approve`, { approver_id });
  },

  reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.hrm.put(`/api/hrm/leaves/${id}/reject`, {
      approver_id,
      reason,
    });
  },
};

export default leaveApi;
