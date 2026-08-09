import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryAlertRule,
  CreateInventoryAlertRuleRequest,
  UpdateInventoryAlertRuleRequest,
  InventoryAlertRecord,
  InventoryAlertStatistics,
  AlertPaginationParams,
  InventoryStatistics,
  ABCAnalysisItem,
  InventoryTurnoverData,
  InventoryValueByWarehouse,
  InventoryStatisticsParams,
  PaginationParams,
} from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const inventoryApi = {
  /**
   * V72.5 第二批 绑定样板：wms_list_inventory operation（openapi: GET /api/wms/inventory）
   * 注意：operationId 经 aggregate.py 去重为 wms_list_inventory（与 erp_list_inventory 区分）
   */
  list: async (
    params?: AdaptedQuery<'wms_list_inventory'> | PaginationParams,
  ): Promise<TypedPaginatedResponse<InventoryItem>> => {
    return apiClient.wms.get('/inventory', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * V72.5 第二批 绑定样板：wms_get_inventory operation（openapi: GET /api/wms/inventory/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<InventoryItem, 'wms_get_inventory'>> => {
    return apiClient.wms.get(`/inventory/${id}`);
  },

  /**
   * V72.5 第二批 绑定样板：wms_create_inventory operation（openapi: POST /api/wms/inventory）
   */
  create: async (
    data: AdaptedRequestBody<'wms_create_inventory'> | CreateInventoryItemRequest,
  ): Promise<TypedApiResponse<InventoryItem, 'wms_create_inventory'>> => {
    return apiClient.wms.post(
      '/inventory',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  update: async (
    id: string,
    data: UpdateInventoryItemRequest
  ): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.wms.put(`/inventory/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/inventory/${id}`);
  },

  listLowStock: async (): Promise<ApiResponse<{ items: InventoryItem[]; total: number }>> => {
    return apiClient.wms.get('/inventory/low-stock');
  },

  listByWarehouse: async (
    warehouse_id: string
  ): Promise<
    ApiResponse<{
      items: InventoryItem[];
      total: number;
      total_quantity: number;
      total_value: number;
    }>
  > => {
    return apiClient.wms.get(`/inventory/warehouse/${warehouse_id}`);
  },
};

export const inventoryAlertsApi = {
  listRules: async (
    params?: AlertPaginationParams
  ): Promise<ApiResponse<PaginatedResponse<InventoryAlertRule>>> => {
    return apiClient.wms.get('/inventory-alerts/rules', { params });
  },

  getRule: async (id: string): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.get(`/inventory-alerts/rules/${id}`);
  },

  createRule: async (
    data: CreateInventoryAlertRuleRequest
  ): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.post('/inventory-alerts/rules', data);
  },

  updateRule: async (
    id: string,
    data: UpdateInventoryAlertRuleRequest
  ): Promise<ApiResponse<InventoryAlertRule>> => {
    return apiClient.wms.put(`/inventory-alerts/rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/inventory-alerts/rules/${id}`);
  },

  listRecords: async (
    params?: AlertPaginationParams
  ): Promise<ApiResponse<PaginatedResponse<InventoryAlertRecord>>> => {
    return apiClient.wms.get('/inventory-alerts/records', { params });
  },

  getRecord: async (id: string): Promise<ApiResponse<InventoryAlertRecord>> => {
    return apiClient.wms.get(`/inventory-alerts/records/${id}`);
  },

  confirm: async (
    id: string,
    data?: { notes?: string }
  ): Promise<ApiResponse<InventoryAlertRecord>> => {
    return apiClient.wms.post(`/inventory-alerts/records/${id}/confirm`, data);
  },

  getStatistics: async (params?: {
    warehouse_id?: string;
  }): Promise<ApiResponse<InventoryAlertStatistics>> => {
    return apiClient.wms.get('/inventory-alerts/statistics', { params });
  },
};

export const inventoryStatsApi = {
  getStatistics: async (
    params?: InventoryStatisticsParams
  ): Promise<ApiResponse<InventoryStatistics>> => {
    return apiClient.wms.get('/inventory/statistics', { params });
  },

  getABCAnalysis: async (
    params?: InventoryStatisticsParams & { a_threshold?: number; b_threshold?: number }
  ): Promise<ApiResponse<{ items: ABCAnalysisItem[]; total_sku: number; total_value: number }>> => {
    return apiClient.wms.get('/inventory/abc-analysis', { params });
  },

  getTurnover: async (
    params?: InventoryStatisticsParams & { period_type?: string; periods?: number }
  ): Promise<ApiResponse<{ items: InventoryTurnoverData[] }>> => {
    return apiClient.wms.get('/inventory/turnover', { params });
  },

  getValueByWarehouse: async (params?: {
    category_id?: string;
  }): Promise<ApiResponse<{ items: InventoryValueByWarehouse[]; total_value: number }>> => {
    return apiClient.wms.get('/inventory/value-by-warehouse', { params });
  },
};

export async function listInventory(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
  return inventoryApi.list(params);
}

export async function getInventory(id: string): Promise<ApiResponse<InventoryItem>> {
  return inventoryApi.get(id);
}

export async function createInventory(
  data: CreateInventoryItemRequest
): Promise<ApiResponse<InventoryItem>> {
  return inventoryApi.create(data);
}

export async function updateInventory(
  id: string,
  data: UpdateInventoryItemRequest
): Promise<ApiResponse<InventoryItem>> {
  return inventoryApi.update(id, data);
}

export async function deleteInventory(id: string): Promise<ApiResponse<string>> {
  return inventoryApi.delete(id);
}

export async function listLowStockInventory(): Promise<
  ApiResponse<{ items: InventoryItem[]; total: number }>
> {
  return inventoryApi.listLowStock();
}

export async function listInventoryByWarehouse(warehouse_id: string): Promise<
  ApiResponse<{
    items: InventoryItem[];
    total: number;
    total_quantity: number;
    total_value: number;
  }>
> {
  return inventoryApi.listByWarehouse(warehouse_id);
}

export async function listInventoryAlertRules(
  params?: AlertPaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryAlertRule>>> {
  return inventoryAlertsApi.listRules(params);
}

export async function getInventoryAlertRule(id: string): Promise<ApiResponse<InventoryAlertRule>> {
  return inventoryAlertsApi.getRule(id);
}

export async function createInventoryAlertRule(
  data: CreateInventoryAlertRuleRequest
): Promise<ApiResponse<InventoryAlertRule>> {
  return inventoryAlertsApi.createRule(data);
}

export async function updateInventoryAlertRule(
  id: string,
  data: UpdateInventoryAlertRuleRequest
): Promise<ApiResponse<InventoryAlertRule>> {
  return inventoryAlertsApi.updateRule(id, data);
}

export async function deleteInventoryAlertRule(id: string): Promise<ApiResponse<string>> {
  return inventoryAlertsApi.deleteRule(id);
}

export async function listInventoryAlertRecords(
  params?: AlertPaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryAlertRecord>>> {
  return inventoryAlertsApi.listRecords(params);
}

export async function getInventoryAlertRecord(
  id: string
): Promise<ApiResponse<InventoryAlertRecord>> {
  return inventoryAlertsApi.getRecord(id);
}

export async function confirmInventoryAlert(
  id: string,
  data?: { notes?: string }
): Promise<ApiResponse<InventoryAlertRecord>> {
  return inventoryAlertsApi.confirm(id, data);
}

export async function getInventoryAlertStatistics(params?: {
  warehouse_id?: string;
}): Promise<ApiResponse<InventoryAlertStatistics>> {
  return inventoryAlertsApi.getStatistics(params);
}

export async function getInventoryStatistics(
  params?: InventoryStatisticsParams
): Promise<ApiResponse<InventoryStatistics>> {
  return inventoryStatsApi.getStatistics(params);
}

export async function getInventoryABCAnalysis(
  params?: InventoryStatisticsParams & { a_threshold?: number; b_threshold?: number }
): Promise<ApiResponse<{ items: ABCAnalysisItem[]; total_sku: number; total_value: number }>> {
  return inventoryStatsApi.getABCAnalysis(params);
}

export async function getInventoryTurnover(
  params?: InventoryStatisticsParams & { period_type?: string; periods?: number }
): Promise<ApiResponse<{ items: InventoryTurnoverData[] }>> {
  return inventoryStatsApi.getTurnover(params);
}

export async function getInventoryValueByWarehouse(params?: {
  category_id?: string;
}): Promise<ApiResponse<{ items: InventoryValueByWarehouse[]; total_value: number }>> {
  return inventoryStatsApi.getValueByWarehouse(params);
}

export default inventoryApi;
