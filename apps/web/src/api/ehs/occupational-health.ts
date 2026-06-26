import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Contraindication,
  ContraindicationListQueryParams,
  CreateContraindicationRequest,
  CreateHealthCheckPlanRequest,
  CreateHealthCheckRecordRequest,
  CreateHealthRecordRequest,
  HealthCheckPlan,
  HealthCheckPlanListQueryParams,
  HealthCheckRecord,
  HealthCheckRecordListQueryParams,
  HealthCheckResultItem,
  HealthRecord,
  HealthRecordListQueryParams,
  ListQueryParams,
  PaginatedResponse,
  UpdateContraindicationRequest,
  UpdateHealthCheckPlanRequest,
  UpdateHealthCheckRecordRequest,
  UpdateHealthRecordRequest,
} from './types';

export const occupationalHealthApi = {
  listHealthRecords: async (
    params?: HealthRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.position) queryParams.append('position', params.position);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<HealthRecord>>(
      `/api/ehs/occupational-health/records?${queryParams.toString()}`
    );
  },

  getHealthRecord: async (id: string): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.get<HealthRecord>(`/api/ehs/occupational-health/records/${id}`);
  },

  createHealthRecord: async (
    data: CreateHealthRecordRequest
  ): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.post<HealthRecord>('/api/ehs/occupational-health/records', data);
  },

  updateHealthRecord: async (
    id: string,
    data: Partial<UpdateHealthRecordRequest>
  ): Promise<ApiResponse<HealthRecord>> => {
    return apiClient.ehs.put<HealthRecord>(
      `/api/ehs/occupational-health/records/${id}`,
      data
    );
  },

  deleteHealthRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/occupational-health/records/${id}`);
  },

  listHealthCheckPlans: async (
    params?: HealthCheckPlanListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthCheckPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.check_type) queryParams.append('check_type', params.check_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<HealthCheckPlan>>(
      `/api/ehs/occupational-health/check-plans?${queryParams.toString()}`
    );
  },

  getHealthCheckPlan: async (id: string): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.get<HealthCheckPlan>(
      `/api/ehs/occupational-health/check-plans/${id}`
    );
  },

  createHealthCheckPlan: async (
    data: CreateHealthCheckPlanRequest
  ): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.post<HealthCheckPlan>(
      '/api/ehs/occupational-health/check-plans',
      data
    );
  },

  updateHealthCheckPlan: async (
    id: string,
    data: Partial<UpdateHealthCheckPlanRequest>
  ): Promise<ApiResponse<HealthCheckPlan>> => {
    return apiClient.ehs.put<HealthCheckPlan>(
      `/api/ehs/occupational-health/check-plans/${id}`,
      data
    );
  },

  deleteHealthCheckPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/check-plans/${id}`
    );
  },

  listHealthCheckRecords: async (
    params?: HealthCheckRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HealthCheckRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.check_type) queryParams.append('check_type', params.check_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
  
    return apiClient.ehs.get<PaginatedResponse<HealthCheckRecord>>(
      `/api/ehs/occupational-health/check-records?${queryParams.toString()}`
    );
  },

  getHealthCheckRecord: async (id: string): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.get<HealthCheckRecord>(
      `/api/ehs/occupational-health/check-records/${id}`
    );
  },

  createHealthCheckRecord: async (
    data: CreateHealthCheckRecordRequest
  ): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.post<HealthCheckRecord>(
      '/api/ehs/occupational-health/check-records',
      data
    );
  },

  updateHealthCheckRecord: async (
    id: string,
    data: Partial<UpdateHealthCheckRecordRequest>
  ): Promise<ApiResponse<HealthCheckRecord>> => {
    return apiClient.ehs.put<HealthCheckRecord>(
      `/api/ehs/occupational-health/check-records/${id}`,
      data
    );
  },

  deleteHealthCheckRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/check-records/${id}`
    );
  },

  listContraindications: async (
    params?: ContraindicationListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Contraindication>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.hazard_factor) queryParams.append('hazard_factor', params.hazard_factor);
  
    return apiClient.ehs.get<PaginatedResponse<Contraindication>>(
      `/api/ehs/occupational-health/contraindications?${queryParams.toString()}`
    );
  },

  getContraindication: async (id: string): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.get<Contraindication>(
      `/api/ehs/occupational-health/contraindications/${id}`
    );
  },

  createContraindication: async (
    data: CreateContraindicationRequest
  ): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.post<Contraindication>(
      '/api/ehs/occupational-health/contraindications',
      data
    );
  },

  updateContraindication: async (
    id: string,
    data: Partial<UpdateContraindicationRequest>
  ): Promise<ApiResponse<Contraindication>> => {
    return apiClient.ehs.put<Contraindication>(
      `/api/ehs/occupational-health/contraindications/${id}`,
      data
    );
  },

  deleteContraindication: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(
      `/api/ehs/occupational-health/contraindications/${id}`
    );
  },
};

export default occupationalHealthApi;
