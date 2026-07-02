import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateDrillRecordRequest,
  CreateEmergencyPlanRequest,
  DrillRecord,
  EmergencyPlan,
  ListQueryParams,
  PaginatedResponse,
} from './types';

export const emergencyApi = {
  listPlans: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<EmergencyPlan>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<EmergencyPlan>>(`/plans?${queryParams.toString()}`);
  },

  getPlan: async (id: string): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.get<EmergencyPlan>(`/plans/${id}`);
  },

  createPlan: async (data: CreateEmergencyPlanRequest): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.post<EmergencyPlan>('/plans', data);
  },

  updatePlan: async (
    id: string,
    data: Partial<CreateEmergencyPlanRequest>
  ): Promise<ApiResponse<EmergencyPlan>> => {
    return apiClient.ehs.put<EmergencyPlan>(`/plans/${id}`, data);
  },

  deletePlan: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/plans/${id}`);
  },

  listDrills: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DrillRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.ehs.get<PaginatedResponse<DrillRecord>>(`/drills?${queryParams.toString()}`);
  },

  getDrill: async (id: string): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.get<DrillRecord>(`/drills/${id}`);
  },

  createDrill: async (data: CreateDrillRecordRequest): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.post<DrillRecord>('/drills', data);
  },

  updateDrill: async (
    id: string,
    data: Partial<CreateDrillRecordRequest>
  ): Promise<ApiResponse<DrillRecord>> => {
    return apiClient.ehs.put<DrillRecord>(`/drills/${id}`, data);
  },

  deleteDrill: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/drills/${id}`);
  },
};

export default emergencyApi;
