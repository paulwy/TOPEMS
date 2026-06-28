import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Bug, CreateBugRequest, UpdateBugRequest } from './types';

export const bugApi = {
  listBugs: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    severity?: string;
    priority?: string;
    status?: string;
    assignee?: string;
  }): Promise<
    ApiResponse<{
      bugs: Bug[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/api/rs/bugs?${queryParams}` : '/api/rs/bugs';
    return apiClient.rs.get(url);
  },

  getBug: async (id: string): Promise<ApiResponse<Bug>> => {
    return apiClient.rs.get(`/api/rs/bugs/${id}`);
  },

  createBug: async (data: CreateBugRequest): Promise<ApiResponse<Bug>> => {
    return apiClient.rs.post('/api/rs/bugs', data);
  },

  updateBug: async (id: string, data: UpdateBugRequest): Promise<ApiResponse<Bug>> => {
    return apiClient.rs.put(`/api/rs/bugs/${id}`, data);
  },

  deleteBug: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/api/rs/bugs/${id}`);
  },
};
