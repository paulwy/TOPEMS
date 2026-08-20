/**
 * WMS · 循环盘点 API 绑定
 *
 * 后端: svc/wms/src/modules/cycle_count.rs
 * 路由:
 *   GET    /cycle-counts
 *   POST   /cycle-counts
 *   GET    /cycle-counts/{id}
 *   PUT    /cycle-counts/{id}
 *   DELETE /cycle-counts/{id}
 *   POST   /cycle-counts/{id}/generate
 *   POST   /cycle-counts/generate-all
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

interface CycleCountConfig {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  material_category?: string;
  count_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  priority_level?: number;
  last_count_date?: string;
  next_count_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateCycleCountConfigRequest {
  warehouse_id: string;
  location_id?: string;
  material_category?: string;
  count_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  priority_level?: number;
}

interface UpdateCycleCountConfigRequest {
  warehouse_id?: string;
  location_id?: string;
  material_category?: string;
  count_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  priority_level?: number;
  is_active?: boolean;
}

interface CycleCountQueryParams {
  page?: number;
  page_size?: number;
  warehouse_id?: string;
  is_active?: boolean;
}

const buildQuery = (params?: CycleCountQueryParams): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set('page', String(params.page));
  if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
  if (params.warehouse_id) usp.set('warehouse_id', params.warehouse_id);
  if (params.is_active !== undefined) usp.set('is_active', String(params.is_active));
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const cycleCountApi = {
  listConfigs: async (
    params?: CycleCountQueryParams
  ): Promise<
    ApiResponse<{
      configs: CycleCountConfig[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    return apiClient.wms.get(`/cycle-counts${buildQuery(params)}`);
  },

  getConfig: async (id: string): Promise<ApiResponse<CycleCountConfig>> => {
    return apiClient.wms.get(`/cycle-counts/${id}`);
  },

  createConfig: async (
    data: CreateCycleCountConfigRequest
  ): Promise<ApiResponse<CycleCountConfig>> => {
    return apiClient.wms.post('/cycle-counts', data);
  },

  updateConfig: async (
    id: string,
    data: UpdateCycleCountConfigRequest
  ): Promise<ApiResponse<CycleCountConfig>> => {
    return apiClient.wms.put(`/cycle-counts/${id}`, data);
  },

  deleteConfig: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.wms.delete(`/cycle-counts/${id}`);
  },

  generateCount: async (
    id: string
  ): Promise<
    ApiResponse<{
      stock_take_id: string;
      message: string;
    }>
  > => {
    return apiClient.wms.post(`/cycle-counts/${id}/generate`);
  },

  generateAll: async (): Promise<
    ApiResponse<{
      generated_count: number;
      message: string;
    }>
  > => {
    return apiClient.wms.post('/cycle-counts/generate-all');
  },
};

export default cycleCountApi;
