import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_half_day?: boolean;
  end_half_day?: boolean;
  days: number;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestRequest {
  employee_id?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_half_day?: boolean;
  end_half_day?: boolean;
  reason?: string;
}

export interface UpdateLeaveRequestRequest {
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  start_half_day?: boolean;
  end_half_day?: boolean;
  reason?: string;
}

export interface SubmitLeaveRequestRequest {
  comment?: string;
}

export interface ApproveLeaveRequestRequest {
  comment?: string;
}

export interface RejectLeaveRequestRequest {
  reason: string;
}

export interface LeaveRequestListResponse {
  items: LeaveRequest[];
  total: number;
}

export interface LeaveRequestQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  leave_type?: string;
  employee_id?: string;
}

// ============ Helper ============

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps = (params as { pageSize?: number } | undefined)?.pageSize
    ?? (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

// ============ API ============

export const leaveRequestApi = {
  async list(params?: LeaveRequestQueryParams): Promise<ApiResponse<LeaveRequestListResponse>> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) sp.set('pagesize', ps);
    if (params?.search) sp.set('search', params.search);
    if (params?.status) sp.set('status', params.status);
    if (params?.leave_type) sp.set('leave_type', params.leave_type);
    if (params?.employee_id) sp.set('employee_id', params.employee_id);
    const qs = sp.toString();
    return apiClient.erp.get<LeaveRequestListResponse>(
      `/leave-requests${qs ? `?${qs}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.get<LeaveRequest>(`/leave-requests/${id}`);
  },

  async create(data: CreateLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.post<LeaveRequest>('/leave-requests', data);
  },

  async update(id: string, data: UpdateLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.put<LeaveRequest>(`/leave-requests/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/leave-requests/${id}`);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async submit(id: string, data?: SubmitLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.post<LeaveRequest>(
      `/leave-requests/${id}/submit`,
      data || {}
    );
  },

  async approve(id: string, data?: ApproveLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.post<LeaveRequest>(
      `/leave-requests/${id}/approve`,
      data || {}
    );
  },

  async reject(id: string, data: RejectLeaveRequestRequest): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.post<LeaveRequest>(`/leave-requests/${id}/reject`, data);
  },

  async cancel(id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiClient.erp.post<LeaveRequest>(`/leave-requests/${id}/cancel`, {});
  },
};
