import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateInspectionItemRequest,
  CreateInspectionPlanRequest,
  CreateInspectionRecordRequest,
  CreateRecordItemRequest,
  InspectionItem,
  InspectionPlan,
  InspectionRecord,
  InspectionRecordDetail,
  ListQueryParams,
  PaginatedResponse,
  RecordItem,
} from './types';

export const inspectionApi = {
  listInspectionPlans: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<InspectionPlan>>(
      `/api/ehs/checks/plans?${queryParams.toString()}`
    );
  },

  getInspectionPlan: async (id: string): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.get<InspectionPlan>(`/api/ehs/checks/plans/${id}`);
  },

  createInspectionPlan: async (
    data: CreateInspectionPlanRequest
  ): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.post<InspectionPlan>('/api/ehs/checks/plans', data);
  },

  updateInspectionPlan: async (
    id: string,
    data: Partial<CreateInspectionPlanRequest>
  ): Promise<ApiResponse<InspectionPlan>> => {
    return apiClient.ehs.put<InspectionPlan>(`/api/ehs/checks/plans/${id}`, data);
  },

  deleteInspectionPlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/plans/${id}`);
  },

  listInspectionItems: async (
    planId: string
  ): Promise<ApiResponse<PaginatedResponse<InspectionItem>>> => {
    return apiClient.ehs.get<PaginatedResponse<InspectionItem>>(
      `/api/ehs/checks/plans/${planId}/items`
    );
  },

  createInspectionItem: async (
    planId: string,
    data: CreateInspectionItemRequest
  ): Promise<ApiResponse<InspectionItem>> => {
    return apiClient.ehs.post<InspectionItem>(`/api/ehs/checks/plans/${planId}/items`, data);
  },

  deleteInspectionItem: async (planId: string, itemId: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/plans/${planId}/items/${itemId}`);
  },

  listInspectionRecords: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<InspectionRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<InspectionRecord>>(
      `/api/ehs/checks/records?${queryParams.toString()}`
    );
  },

  getInspectionRecord: async (id: string): Promise<ApiResponse<InspectionRecordDetail>> => {
    return apiClient.ehs.get<InspectionRecordDetail>(`/api/ehs/checks/records/${id}`);
  },

  createInspectionRecord: async (
    data: CreateInspectionRecordRequest
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.ehs.post<InspectionRecord>('/api/ehs/checks/records', data);
  },

  updateInspectionRecord: async (
    id: string,
    data: Partial<CreateInspectionRecordRequest>
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.ehs.put<InspectionRecord>(`/api/ehs/checks/records/${id}`, data);
  },

  deleteInspectionRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/records/${id}`);
  },
};

export default inspectionApi;
