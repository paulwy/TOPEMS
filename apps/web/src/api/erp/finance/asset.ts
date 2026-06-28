import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import { cleanEmptyUuids } from '../utils';
import type {
  Asset,
  FixedAsset,
  DepreciateRequest,
  DepreciationResult,
  PaginationParams,
  PaginatedResult,
} from '../types';

export const assetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Asset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.erp.get(`/api/erp/assets/${id}`);
  },

  async create(data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.post('/api/erp/assets', cleanEmptyUuids(data));
  },

  async update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    return apiClient.erp.put(`/api/erp/assets/${id}`, cleanEmptyUuids(data));
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/assets/${id}`);
  },
};

export const fixedAssetApi = {
  async list(
    params?: PaginationParams & { department_id?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResult<FixedAsset>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/fixed-assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.get(`/api/erp/fixed-assets/${id}`);
  },

  async create(data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.post('/api/erp/fixed-assets', data);
  },

  async update(id: string, data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.put(`/api/erp/fixed-assets/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/fixed-assets/${id}`);
  },

  async depreciate(data: DepreciateRequest): Promise<ApiResponse<DepreciationResult>> {
    return apiClient.erp.post('/api/erp/fixed-assets/depreciate', data);
  },
};
