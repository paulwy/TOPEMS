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

    return apiClient.ehs.get<PaginatedResponse<SafetyCheck>>(`/checks?${queryParams.toString()}`);
  },

  getCheck: async (id: string): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.get<SafetyCheck>(`/checks/${id}`);
  },

  createCheck: async (data: CreateSafetyCheckRequest): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.post<SafetyCheck>('/checks', data);
  },

  updateCheck: async (
    id: string,
    data: Partial<CreateSafetyCheckRequest>
  ): Promise<ApiResponse<SafetyCheck>> => {
    return apiClient.ehs.put<SafetyCheck>(`/checks/${id}`, data);
  },

  deleteCheck: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/checks/${id}`);
  },
};

export default safetyCheckApi;
