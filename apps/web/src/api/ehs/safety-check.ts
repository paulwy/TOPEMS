import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateSafetyCheckRequest,
  ListQueryParams,
  PaginatedResponse,
  SafetyCheck,
} from './types';

export const safetyCheckApi = {
  listChecks: async (
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyCheck>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<SafetyCheck>>(
      `/api/ehs/checks?${queryParams.toString()}`
    );
  },

  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/api/ehs/checks/${id}`);
  },

  createCheck: async (data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>('/api/ehs/checks', data);
  },

  updateCheck: async (
    id: string,
    data: Partial<CreateSafetyCheckRequest>
  ): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/api/ehs/checks/${id}`, data);
  },

  deleteCheck: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/checks/${id}`);
  },
};

export default safetyCheckApi;
