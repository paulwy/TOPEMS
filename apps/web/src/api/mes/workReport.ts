import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  WorkReport,
  CreateWorkReportRequest,
  UpdateWorkReportRequest,
} from './types';

export const workReportApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      reports: WorkReport[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/work-reports${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkReport>> {
    return apiClient.mes.get(`/api/mes/work-reports/${id}`);
  },

  async create(data: CreateWorkReportRequest): Promise<ApiResponse<WorkReport>> {
    return apiClient.mes.post('/api/mes/work-reports', data);
  },

  async update(id: string, data: UpdateWorkReportRequest): Promise<ApiResponse<WorkReport>> {
    return apiClient.mes.put(`/api/mes/work-reports/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/work-reports/${id}`);
  },

  async approve(id: string): Promise<ApiResponse<WorkReport>> {
    return apiClient.mes.put(`/api/mes/work-reports/${id}/approve`);
  },

  async reject(id: string, remark?: string): Promise<ApiResponse<WorkReport>> {
    return apiClient.mes.put(`/api/mes/work-reports/${id}/reject`, { remark });
  },
};
