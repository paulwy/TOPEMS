/**
 * WMS · 差异处理 API 绑定
 *
 * 后端: svc/wms/src/modules/discrepancy.rs
 * 路由:
 *   GET    /discrepancies
 *   POST   /discrepancies
 *   GET    /discrepancies/{id}
 *   POST   /discrepancies/{id}/approve
 *   POST   /discrepancies/{id}/adjust
 *   POST   /discrepancies/process-stock-take/{stock_take_id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface DiscrepancyRecord {
  id: string;
  stock_take_id: string;
  stock_take_item_id?: string;
  inventory_id?: string;
  material_code?: string;
  material_name?: string;
  system_quantity: number;
  counted_quantity: number;
  discrepancy_quantity: number;
  discrepancy_type: 'surplus' | 'shortage' | 'damaged' | 'expired';
  adjustment_quantity?: number;
  adjustment_status: 'pending' | 'approved' | 'adjusted' | 'rejected';
  approved_by?: string;
  approval_date?: string;
  adjustment_date?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscrepancyRequest {
  stock_take_id: string;
  stock_take_item_id?: string;
  inventory_id?: string;
  material_code?: string;
  material_name?: string;
  system_quantity: number;
  counted_quantity: number;
  discrepancy_type: 'surplus' | 'shortage' | 'damaged' | 'expired';
  reason?: string;
  notes?: string;
}

export interface ApproveDiscrepancyRequest {
  approved?: boolean;
  reason?: string;
  adjustment_quantity?: number;
}

export interface DiscrepancyQueryParams {
  page?: number;
  page_size?: number;
  stock_take_id?: string;
  adjustment_status?: 'pending' | 'approved' | 'adjusted' | 'rejected';
}

const buildQuery = (params?: DiscrepancyQueryParams): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.page !== undefined) usp.set('page', String(params.page));
  if (params.page_size !== undefined) usp.set('page_size', String(params.page_size));
  if (params.stock_take_id) usp.set('stock_take_id', params.stock_take_id);
  if (params.adjustment_status) usp.set('adjustment_status', params.adjustment_status);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

export const discrepancyApi = {
  listDiscrepancies: async (
    params?: DiscrepancyQueryParams
  ): Promise<
    ApiResponse<{
      records: DiscrepancyRecord[];
      total: number;
      page: number;
      page_size: number;
    }>
  > => {
    return apiClient.wms.get(`/discrepancies${buildQuery(params)}`);
  },

  getDiscrepancy: async (id: string): Promise<ApiResponse<DiscrepancyRecord>> => {
    return apiClient.wms.get(`/discrepancies/${id}`);
  },

  createDiscrepancy: async (
    data: CreateDiscrepancyRequest
  ): Promise<ApiResponse<DiscrepancyRecord>> => {
    return apiClient.wms.post('/discrepancies', data);
  },

  approveDiscrepancy: async (
    id: string,
    data?: ApproveDiscrepancyRequest
  ): Promise<ApiResponse<DiscrepancyRecord>> => {
    return apiClient.wms.post(`/discrepancies/${id}/approve`, data || {});
  },

  adjustInventory: async (
    id: string,
    data?: { adjustment_quantity?: number; reason?: string }
  ): Promise<ApiResponse<DiscrepancyRecord>> => {
    return apiClient.wms.post(`/discrepancies/${id}/adjust`, data || {});
  },

  processStockTakeDiscrepancies: async (
    stockTakeId: string
  ): Promise<
    ApiResponse<{
      processed_count: number;
      adjusted_count: number;
      message: string;
    }>
  > => {
    return apiClient.wms.post(`/discrepancies/process-stock-take/${stockTakeId}`);
  },
};

export default discrepancyApi;
