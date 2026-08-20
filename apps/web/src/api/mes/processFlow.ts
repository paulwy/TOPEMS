import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ProcessFlow {
  id: string;
  code: string;
  name: string;
  description?: string;
  version?: string;
  status: string;
  route_id?: string;
  route_name?: string;
  production_line?: string;
  capacity?: number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProcessFlowRequest {
  code: string;
  name: string;
  description?: string;
  version?: string;
  route_id?: string;
  production_line?: string;
  capacity?: number;
  unit?: string;
}

export interface UpdateProcessFlowRequest {
  name?: string;
  description?: string;
  version?: string;
  route_id?: string;
  production_line?: string;
  capacity?: number;
  unit?: string;
  status?: string;
}

export interface ProcessFlowStep {
  id: string;
  flow_id: string;
  process_id: string;
  process_name: string;
  process_code: string;
  sequence: number;
  work_station_id?: string;
  work_station_name?: string;
  equipment_ids?: string[];
  standard_time?: number;
  wait_time?: number;
  transfer_time?: number;
  quality_check_required?: boolean;
  description?: string;
  created_at: string;
}

interface AddProcessFlowStepRequest {
  process_id: string;
  sequence: number;
  work_station_id?: string;
  equipment_ids?: string[];
  standard_time?: number;
  wait_time?: number;
  transfer_time?: number;
  quality_check_required?: boolean;
  description?: string;
}

interface UpdateProcessFlowStepRequest {
  sequence?: number;
  work_station_id?: string;
  equipment_ids?: string[];
  standard_time?: number;
  wait_time?: number;
  transfer_time?: number;
  quality_check_required?: boolean;
  description?: string;
}

export interface CapacityAnalysis {
  flow_id: string;
  flow_name: string;
  theoretical_capacity: number;
  effective_capacity: number;
  utilization_rate: number;
  bottleneck_step?: {
    step_name: string;
    utilization_rate: number;
  };
  by_step: Array<{
    step_name: string;
    capacity: number;
    utilization_rate: number;
  }>;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}

export const processFlowApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      flows: ProcessFlow[];
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
    return apiClient.mes.get(`/process-flows${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProcessFlow>> {
    return apiClient.mes.get(`/process-flows/${id}`);
  },

  async create(data: CreateProcessFlowRequest): Promise<ApiResponse<ProcessFlow>> {
    return apiClient.mes.post('/process-flows', data);
  },

  async update(id: string, data: UpdateProcessFlowRequest): Promise<ApiResponse<ProcessFlow>> {
    return apiClient.mes.put(`/process-flows/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/process-flows/${id}`);
  },

  async getSteps(flowId: string): Promise<ApiResponse<{ steps: ProcessFlowStep[] }>> {
    return apiClient.mes.get(`/process-flows/${flowId}/steps`);
  },

  async addStep(
    flowId: string,
    data: AddProcessFlowStepRequest
  ): Promise<ApiResponse<ProcessFlowStep>> {
    return apiClient.mes.post(`/process-flows/${flowId}/steps`, data);
  },

  async updateStep(
    flowId: string,
    stepId: string,
    data: UpdateProcessFlowStepRequest
  ): Promise<ApiResponse<ProcessFlowStep>> {
    return apiClient.mes.put(`/process-flows/${flowId}/steps/${stepId}`, data);
  },

  async removeStep(flowId: string, stepId: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/process-flows/${flowId}/steps/${stepId}`);
  },

  async analyzeCapacity(flowId: string): Promise<ApiResponse<CapacityAnalysis>> {
    return apiClient.mes.get(`/process-flows/${flowId}/capacity`);
  },
};
