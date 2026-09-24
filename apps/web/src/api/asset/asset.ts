import apiClient from '../client';
import type { ApiResponse } from '../client';
import { cleanEmptyUuids } from '../erp/utils';
import type {
  Asset,
  FixedAsset,
  DepreciateRequest,
  DepreciationResult,
  PaginationParams,
  PaginatedResult,
} from '@/api/erp/types';

export const assetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Asset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.erp.get(`/assets/${id}`);
  },

  async create(data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.post('/assets', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.put(`/assets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/assets/${id}`);
  },
};

export const fixedAssetApi = {
  async list(
    params?: PaginationParams & { department_id?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResult<FixedAsset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/fixed-assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.get(`/fixed-assets/${id}`);
  },

  async create(data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.post('/fixed-assets', data);
  },

  async update(id: string, data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.put(`/fixed-assets/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/fixed-assets/${id}`);
  },

  async depreciate(data: DepreciateRequest): Promise<ApiResponse<DepreciationResult>> {
    return apiClient.erp.post('/fixed-assets/depreciate', data);
  },
};
