import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  asset_category: string;
  purchase_date?: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value?: number;
  depreciation_method: string;
  useful_life_months: number;
  depreciation_period?: string;
  department_id?: string;
  department_name?: string;
  location?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FixedAssetListResponse {
  items: FixedAsset[];
  total: number;
}

export interface CreateFixedAssetRequest {
  asset_code: string;
  asset_name: string;
  asset_type: string;
  asset_category: string;
  purchase_date?: string;
  original_value: number;
  depreciation_method: string;
  useful_life_months: number;
  department_id?: string;
  department_name?: string;
  location?: string;
}

export interface UpdateFixedAssetRequest {
  asset_name?: string;
  asset_type?: string;
  asset_category?: string;
  purchase_date?: string;
  original_value?: number;
  accumulated_depreciation?: number;
  depreciation_method?: string;
  useful_life_months?: number;
  department_id?: string;
  department_name?: string;
  location?: string;
  status?: string;
}

export interface DepreciateAssetsRequest {
  asset_ids?: string[];
  depreciation_date?: string;
  period?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps = (params as { pageSize?: number } | undefined)?.pageSize
    ?? (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const fixedAssetApi = {
  async list(params?: PaginationParams & { asset_type?: string; department_id?: string }): Promise<ApiResponse<FixedAssetListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if ((params as { asset_type?: string })?.asset_type) searchParams.set('asset_type', (params as { asset_type?: string }).asset_type as string);
    if ((params as { department_id?: string })?.department_id) searchParams.set('department_id', (params as { department_id?: string }).department_id as string);

    const queryString = searchParams.toString();
    return apiClient.erp.get<FixedAssetListResponse>(
      `/fixed-assets${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.get<FixedAsset>(`/fixed-assets/${id}`);
  },

  async create(data: CreateFixedAssetRequest): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.post<FixedAsset>('/fixed-assets', data);
  },

  async update(id: string, data: UpdateFixedAssetRequest): Promise<ApiResponse<FixedAsset>> {
    return apiClient.erp.put<FixedAsset>(`/fixed-assets/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/fixed-assets/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async depreciate(data: DepreciateAssetsRequest): Promise<ApiResponse<{ count: number }>> {
    return apiClient.erp.post<{ count: number }>('/fixed-assets/depreciate', data);
  },
};
