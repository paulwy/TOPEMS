import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { PaginatedResponse } from './types';

export interface HealthRecordItem {
  id: string;
  record_no: string;
  employee_name?: string;
  employee_id?: string;
  department?: string;
  check_type?: string;
  check_date?: string;
  result?: string;
  status: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HealthMonitoringQuery {
  page?: number;
  page_size?: number;
  status?: string;
  check_type?: string;
  employee_id?: string;
  keyword?: string;
}

export interface CreateHealthRecordRequest {
  employee_name?: string;
  employee_id?: string;
  department?: string;
  check_type?: string;
  check_date?: string;
  result?: string;
  status?: string;
  remarks?: string;
}

export interface UpdateHealthRecordRequest {
  employee_name?: string;
  employee_id?: string;
  department?: string;
  check_type?: string;
  check_date?: string;
  result?: string;
  status?: string;
  remarks?: string;
}

export interface HealthStatistics {
  total_records: number;
  normal_count: number;
  abnormal_count: number;
  pending_count: number;
  by_check_type: Record<string, unknown>[];
  by_department: Record<string, unknown>[];
}

export const healthMonitoringApi = {
  async listHealthRecords(params?: HealthMonitoringQuery): Promise<ApiResponse<PaginatedResponse<HealthRecordItem>>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.check_type) qs.set('check_type', params.check_type);
    if (params?.employee_id) qs.set('employee_id', params.employee_id);
    if (params?.keyword) qs.set('q', params.keyword);
    const s = qs.toString();
    return apiClient.ehs.get<PaginatedResponse<HealthRecordItem>>(`/health${s ? `?${s}` : ''}`);
  },

  async getHealthRecord(id: string): Promise<ApiResponse<HealthRecordItem>> {
    return apiClient.ehs.get<HealthRecordItem>(`/health/${id}`);
  },

  async createHealthRecord(data: CreateHealthRecordRequest): Promise<ApiResponse<HealthRecordItem>> {
    return apiClient.ehs.post<HealthRecordItem>('/health', data);
  },

  async updateHealthRecord(id: string, data: UpdateHealthRecordRequest): Promise<ApiResponse<HealthRecordItem>> {
    return apiClient.ehs.put<HealthRecordItem>(`/health/${id}`, data);
  },

  async deleteHealthRecord(id: string): Promise<ApiResponse<null>> {
    return apiClient.ehs.delete<null>(`/health/${id}`);
  },

  async getHealthStatistics(): Promise<ApiResponse<HealthStatistics>> {
    return apiClient.ehs.get<HealthStatistics>('/health/statistics');
  },
};
