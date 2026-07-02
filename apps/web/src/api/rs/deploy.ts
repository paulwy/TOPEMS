import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Deploy, CreateDeployRequest } from './types';

export const deployApi = {
  listDeploys: async (params?: {
    page?: number;
    pagesize?: number;
    search?: string;
    environment?: string;
    app_name?: string;
    status?: string;
  }): Promise<
    ApiResponse<{
      deploys: Deploy[];
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
    const url = queryParams ? `/deploys?${queryParams}` : '/deploys';
    return apiClient.rs.get(url);
  },

  getDeploy: async (id: string): Promise<ApiResponse<Deploy>> => {
    return apiClient.rs.get(`/deploys/${id}`);
  },

  createDeploy: async (data: CreateDeployRequest): Promise<ApiResponse<Deploy>> => {
    return apiClient.rs.post('/deploys', data);
  },
};
