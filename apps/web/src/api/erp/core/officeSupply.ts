import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface OfficeSupply {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  price?: number;
  location?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  created_at: string;
  updated_at: string;
}

interface OfficeSupplyListResponse {
  items: OfficeSupply[];
  total: number;
}

interface CreateOfficeSupplyRequest {
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  price?: number;
  location?: string;
  status?: string;
}

interface UpdateOfficeSupplyRequest {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  location?: string;
  status?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const officeSupplyApi = {
  async list(
    params?: PaginationParams & { category?: string }
  ): Promise<ApiResponse<OfficeSupplyListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if ((params as { category?: string })?.category)
      searchParams.set('category', (params as { category?: string }).category as string);

    const queryString = searchParams.toString();
    return apiClient.erp.get<OfficeSupplyListResponse>(
      `/office-supplies${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.get<OfficeSupply>(`/office-supplies/${id}`);
  },

  async create(data: CreateOfficeSupplyRequest): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.post<OfficeSupply>('/office-supplies', data);
  },

  async update(id: string, data: UpdateOfficeSupplyRequest): Promise<ApiResponse<OfficeSupply>> {
    return apiClient.erp.put<OfficeSupply>(`/office-supplies/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/office-supplies/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },
};
