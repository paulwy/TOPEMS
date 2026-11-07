import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Deploy, CreateDeployRequest } from './types';

export interface ListDeploysParams {
  page?: number;
  page_size?: number;
  search?: string;
  environment?: string;
  app_name?: string;
  status?: string;
  /** 批 38：按配方过滤（可选，后端支持） */
  formula_id?: string;
}

export const deployApi = {
  listDeploys: async (
    params?: ListDeploysParams
  ): Promise<
    ApiResponse<{
      items: Deploy[];
      total: number;
      page: number;
      page_size: number;
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
    return apiClient.rd.get(url);
  },

  getDeploy: async (id: string): Promise<ApiResponse<Deploy>> => {
    return apiClient.rd.get(`/deploys/${id}`);
  },

  createDeploy: async (data: CreateDeployRequest): Promise<ApiResponse<Deploy>> => {
    return apiClient.rd.post('/deploys', data);
  },
};
