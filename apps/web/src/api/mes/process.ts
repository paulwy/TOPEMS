import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ProcessRoute {
  id: string;
  code: string;
  name: string;
  description?: string;
  version?: string;
  status: string;
  standard_time?: number;
  total_standard_time?: number;
  process_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProcessRouteRequest {
  code: string;
  name: string;
  description?: string;
  version?: string;
  standard_time?: number;
}

export interface UpdateProcessRouteRequest {
  name?: string;
  description?: string;
  version?: string;
  standard_time?: number;
  status?: string;
}

export interface ProcessRouteStep {
  id: string;
  route_id: string;
  process_id: string;
  process_name: string;
  process_code: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
  work_station_name?: string;
  description?: string;
  created_at: string;
}

interface AddProcessRouteStepRequest {
  process_id: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
  description?: string;
}

interface UpdateProcessRouteStepRequest {
  sequence?: number;
  standard_time?: number;
  work_station_id?: string;
  description?: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}

export const processRouteApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      routes: ProcessRoute[];
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
    return apiClient.mes.get(`/process-routes${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProcessRoute>> {
    return apiClient.mes.get(`/process-routes/${id}`);
  },

  async create(data: CreateProcessRouteRequest): Promise<ApiResponse<ProcessRoute>> {
    return apiClient.mes.post('/process-routes', data);
  },

  async update(id: string, data: UpdateProcessRouteRequest): Promise<ApiResponse<ProcessRoute>> {
    return apiClient.mes.put(`/process-routes/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/process-routes/${id}`);
  },

  async getSteps(routeId: string): Promise<ApiResponse<{ steps: ProcessRouteStep[] }>> {
    return apiClient.mes.get(`/process-routes/${routeId}/steps`);
  },

  async addStep(
    routeId: string,
    data: AddProcessRouteStepRequest
  ): Promise<ApiResponse<ProcessRouteStep>> {
    return apiClient.mes.post(`/process-routes/${routeId}/steps`, data);
  },

  async updateStep(
    routeId: string,
    stepId: string,
    data: UpdateProcessRouteStepRequest
  ): Promise<ApiResponse<ProcessRouteStep>> {
    return apiClient.mes.put(`/process-routes/${routeId}/steps/${stepId}`, data);
  },

  async removeStep(routeId: string, stepId: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/process-routes/${routeId}/steps/${stepId}`);
  },

  async reorderSteps(
    routeId: string,
    stepIds: string[]
  ): Promise<ApiResponse<{ steps: ProcessRouteStep[] }>> {
    return apiClient.mes.put(`/process-routes/${routeId}/steps/reorder`, {
      step_ids: stepIds,
    });
  },
};
