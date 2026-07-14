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
    const url = queryParams ? `/bugs?${queryParams}` : '/bugs';
    return apiClient.rd.get(url);
  },

  getBug: async (id: string): Promise<ApiResponse<Bug>> => {
    return apiClient.rd.get(`/bugs/${id}`);
  },

  createBug: async (data: CreateBugRequest): Promise<ApiResponse<Bug>> => {
    return apiClient.rd.post('/bugs', data);
  },

  updateBug: async (id: string, data: UpdateBugRequest): Promise<ApiResponse<Bug>> => {
    return apiClient.rd.put(`/bugs/${id}`, data);
  },

  deleteBug: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rd.delete(`/bugs/${id}`);
  },
};
