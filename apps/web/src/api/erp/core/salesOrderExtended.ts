import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { SalesOrder, CreateSalesOrderRequest, UpdateSalesOrderRequest } from './types';

interface BulkApproveRequest {
  ids: string[];
}

interface BulkShipRequest {
  ids: string[];
  ship_date?: string;
}

interface BulkCompleteRequest {
  ids: string[];
}

interface BulkCancelRequest {
  ids: string[];
  reason?: string;
}

interface SalesOrderStatsResponse {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byCustomer: Array<{ customer_id: string; customer_name: string; total: number }>;
  pendingTotalAmount: number;
  shippedTotalAmount: number;
  completedTotalAmount: number;
}

export const salesOrderExtendedApi = {
  async createBatch(data: CreateSalesOrderRequest[]): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.post<SalesOrder[]>('/sales-orders/batch', { orders: data });
  },

  async updateBatch(
    updates: Array<{ id: string; payload: UpdateSalesOrderRequest }>
  ): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.put<SalesOrder[]>('/sales-orders/batch', { updates });
  },

  async approveBatch(req: BulkApproveRequest): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.post<SalesOrder[]>('/sales-orders/batch/approve', req);
  },

  async shipBatch(req: BulkShipRequest): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.post<SalesOrder[]>('/sales-orders/batch/ship', req);
  },

  async completeBatch(req: BulkCompleteRequest): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.post<SalesOrder[]>('/sales-orders/batch/complete', req);
  },

  async cancelBatch(req: BulkCancelRequest): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.post<SalesOrder[]>('/sales-orders/batch/cancel', req);
  },

  async getStats(): Promise<ApiResponse<SalesOrderStatsResponse>> {
    return apiClient.erp.get<SalesOrderStatsResponse>('/sales-orders/stats');
  },

  async listByCustomer(customerId: string): Promise<ApiResponse<SalesOrder[]>> {
    return apiClient.erp.get<SalesOrder[]>(`/sales-orders?customer_id=${customerId}`);
  },
};
