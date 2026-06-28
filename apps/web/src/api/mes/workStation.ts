import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  WorkStation,
  CreateWorkStationRequest,
  UpdateWorkStationRequest,
} from './types';

export const workStationApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      workstations: WorkStation[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/workstations${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.get(`/api/mes/workstations/${id}`);
  },

  async create(data: CreateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.post('/api/mes/workstations', data);
  },

  async update(id: string, data: UpdateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/workstations/${id}`);
  },

  async activate(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}/activate`);
  },

  async deactivate(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}/deactivate`);
  },
};
