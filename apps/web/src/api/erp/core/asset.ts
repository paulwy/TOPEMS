import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  category?: string;
  specification?: string;
  location?: string;
  owner?: string;
  purchase_date?: string;
  purchase_price?: number;
  salvage_value?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
  depreciation_rate?: number;
  accumulated_depreciation?: number;
  net_value?: number;
  status: 'in_stock' | 'in_use' | 'maintenance' | 'scrapped' | 'transferred';
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
}

export interface CreateAssetRequest {
  asset_code: string;
  asset_name: string;
  category?: string;
  specification?: string;
  location?: string;
  owner?: string;
  purchase_date?: string;
  purchase_price?: number;
  salvage_value?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
  depreciation_rate?: number;
  status?: string;
  remark?: string;
}

export interface UpdateAssetRequest {
  asset_name?: string;
  category?: string;
  specification?: string;
  location?: string;
  owner?: string;
  purchase_price?: number;
  salvage_value?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
  depreciation_rate?: number;
  status?: string;
  remark?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const assetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<AssetListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.erp.get<AssetListResponse>(`/assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.erp.get<Asset>(`/assets/${id}`);
  },

  async create(data: CreateAssetRequest): Promise<ApiResponse<Asset>> {
    return apiClient.erp.post<Asset>('/assets', data);
  },

  async update(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>> {
    return apiClient.erp.put<Asset>(`/assets/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/assets/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },
};
