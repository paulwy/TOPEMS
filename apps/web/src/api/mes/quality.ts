import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface QualityInspection {
  id: string;
  inspection_no: string;
  order_id?: string;
  order_number?: string;
  product_code: string;
  product_name: string;
  process_id?: string;
  process_name?: string;
  inspection_type: string;
  quantity: number;
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate: number;
  inspector?: string;
  inspection_time: string;
  status: string;
  result?: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}

interface CreateQualityInspectionRequest {
  order_id?: string;
  product_code: string;
  product_name: string;
  process_id?: string;
  inspection_type: string;
  quantity: number;
  inspector?: string;
  inspection_time?: string;
  result?: string;
  memo?: string;
}

interface UpdateQualityInspectionRequest {
  qualified_quantity?: number;
  unqualified_quantity?: number;
  inspector?: string;
  inspection_time?: string;
  status?: string;
  result?: string;
  memo?: string;
}

interface PatrolInspection {
  id: string;
  patrol_no: string;
  production_line?: string;
  workstation_id?: string;
  workstation_name?: string;
  inspector: string;
  patrol_time: string;
  status: string;
  result?: string;
  findings?: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}

interface CreatePatrolInspectionRequest {
  production_line?: string;
  workstation_id?: string;
  inspector: string;
  patrol_time?: string;
  status?: string;
  result?: string;
  findings?: string;
  memo?: string;
}

interface UpdatePatrolInspectionRequest {
  status?: string;
  result?: string;
  findings?: string;
  memo?: string;
}

interface PatrolInspectionItem {
  id: string;
  patrol_id: string;
  item_name: string;
  standard?: string;
  actualValue?: string;
  status: string;
  remark?: string;
}

interface AddPatrolInspectionItemRequest {
  item_name: string;
  standard?: string;
  actualValue?: string;
  status?: string;
  remark?: string;
}

export interface QualityStandard {
  id: string;
  code: string;
  name: string;
  product_code?: string;
  product_name?: string;
  inspection_type: string;
  standard_values: QualityStandardValue[];
  status: string;
  version?: string;
  effective_date?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface QualityStandardValue {
  id: string;
  standard_id: string;
  item_name: string;
  lower_limit?: number;
  upper_limit?: number;
  unit?: string;
  inspection_method?: string;
  remark?: string;
}

export interface CreateQualityStandardRequest {
  code: string;
  name: string;
  product_code?: string;
  product_name?: string;
  inspection_type: string;
  standard_values?: Array<{
    item_name: string;
    lower_limit?: number;
    upper_limit?: number;
    unit?: string;
    inspection_method?: string;
    remark?: string;
  }>;
  version?: string;
  effective_date?: string;
  description?: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}

export const qualityApi = {
  async listInspections(params?: PaginationParams): Promise<
    ApiResponse<{
      inspections: QualityInspection[];
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
    return apiClient.mes.get(`/quality/inspections${queryString ? `?${queryString}` : ''}`);
  },

  async getInspection(id: string): Promise<ApiResponse<QualityInspection>> {
    return apiClient.mes.get(`/quality/inspections/${id}`);
  },

  async createInspection(
    data: CreateQualityInspectionRequest
  ): Promise<ApiResponse<QualityInspection>> {
    return apiClient.mes.post('/quality/inspections', data);
  },

  async updateInspection(
    id: string,
    data: UpdateQualityInspectionRequest
  ): Promise<ApiResponse<QualityInspection>> {
    return apiClient.mes.put(`/quality/inspections/${id}`, data);
  },

  async deleteInspection(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/quality/inspections/${id}`);
  },

  async listPatrolInspections(params?: PaginationParams): Promise<
    ApiResponse<{
      patrols: PatrolInspection[];
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
    return apiClient.mes.get(`/quality/patrols${queryString ? `?${queryString}` : ''}`);
  },

  async getPatrolInspection(id: string): Promise<ApiResponse<PatrolInspection>> {
    return apiClient.mes.get(`/quality/patrols/${id}`);
  },

  async createPatrolInspection(
    data: CreatePatrolInspectionRequest
  ): Promise<ApiResponse<PatrolInspection>> {
    return apiClient.mes.post('/quality/patrols', data);
  },

  async updatePatrolInspection(
    id: string,
    data: UpdatePatrolInspectionRequest
  ): Promise<ApiResponse<PatrolInspection>> {
    return apiClient.mes.put(`/quality/patrols/${id}`, data);
  },

  async deletePatrolInspection(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/quality/patrols/${id}`);
  },

  async getPatrolItems(patrolId: string): Promise<ApiResponse<{ items: PatrolInspectionItem[] }>> {
    return apiClient.mes.get(`/quality/patrols/${patrolId}/items`);
  },

  async addPatrolItem(
    patrolId: string,
    data: AddPatrolInspectionItemRequest
  ): Promise<ApiResponse<PatrolInspectionItem>> {
    return apiClient.mes.post(`/quality/patrols/${patrolId}/items`, data);
  },

  async listStandards(params?: PaginationParams): Promise<
    ApiResponse<{
      standards: QualityStandard[];
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
    return apiClient.mes.get(`/quality/standards${queryString ? `?${queryString}` : ''}`);
  },

  async getStandard(id: string): Promise<ApiResponse<QualityStandard>> {
    return apiClient.mes.get(`/quality/standards/${id}`);
  },

  async createStandard(data: CreateQualityStandardRequest): Promise<ApiResponse<QualityStandard>> {
    return apiClient.mes.post('/quality/standards', data);
  },

  async updateStandard(
    id: string,
    data: Partial<CreateQualityStandardRequest>
  ): Promise<ApiResponse<QualityStandard>> {
    return apiClient.mes.put(`/quality/standards/${id}`, data);
  },

  async deleteStandard(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/quality/standards/${id}`);
  },
};
