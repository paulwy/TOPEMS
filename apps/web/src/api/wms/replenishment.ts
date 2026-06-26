import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  ReplenishmentSuggestion,
  ReplenishmentOrder,
  ReplenishmentOrderItem,
  SafetyStockSetting,
  ReplenishmentStatistics,
  CreateReplenishmentOrderRequest,
  CreateReplenishmentOrderItemRequest,
  UpdateSafetyStockRequest,
  AlertPaginationParams,
  PaginationParams,
} from './types';

export const smartReplenishmentApi = {
  listSuggestions: async (
    params?: AlertPaginationParams & { priority?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResponse<ReplenishmentSuggestion>>> => {
    return apiClient.wms.get('/smart-replenishment/suggestions', { params });
  },

  getSuggestion: async (
    id: string
  ): Promise<ApiResponse<ReplenishmentSuggestion>> => {
    return apiClient.wms.get(`/smart-replenishment/suggestions/${id}`);
  },

  generateSuggestions: async (
    data?: { warehouse_id?: string; sku?: string; category_id?: string }
  ): Promise<ApiResponse<{ count: number; suggestions: ReplenishmentSuggestion[] }>> => {
    return apiClient.wms.post('/smart-replenishment/suggestions/generate', data);
  },

  listOrders: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<ReplenishmentOrder>>> => {
    return apiClient.wms.get('/smart-replenishment/orders', { params });
  },

  getOrder: async (
    id: string
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.get(`/smart-replenishment/orders/${id}`);
  },

  createOrder: async (
    data: CreateReplenishmentOrderRequest
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post('/smart-replenishment/orders', data);
  },

  updateOrder: async (
    id: string,
    data: Partial<ReplenishmentOrder>
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.put(`/smart-replenishment/orders/${id}`, data);
  },

  deleteOrder: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/smart-replenishment/orders/${id}`);
  },

  listOrderItems: async (
    order_id: string
  ): Promise<ApiResponse<{ items: ReplenishmentOrderItem[]; total: number }>> => {
    return apiClient.wms.get(`/smart-replenishment/orders/${order_id}/items`);
  },

  confirmOrder: async (
    id: string
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post(`/smart-replenishment/orders/${id}/confirm`);
  },

  completeOrder: async (
    id: string
  ): Promise<ApiResponse<ReplenishmentOrder>> => {
    return apiClient.wms.post(`/smart-replenishment/orders/${id}/complete`);
  },

  listSafetyStock: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SafetyStockSetting>>> => {
    return apiClient.wms.get('/smart-replenishment/safety-stock', { params });
  },

  getSafetyStock: async (
    id: string
  ): Promise<ApiResponse<SafetyStockSetting>> => {
    return apiClient.wms.get(`/smart-replenishment/safety-stock/${id}`);
  },

  updateSafetyStock: async (
    id: string,
    data: UpdateSafetyStockRequest
  ): Promise<ApiResponse<SafetyStockSetting>> => {
    return apiClient.wms.put(`/smart-replenishment/safety-stock/${id}`, data);
  },

  batchUpdateSafetyStock: async (
    data: UpdateSafetyStockRequest & { ids: string[] }
  ): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.wms.post('/smart-replenishment/safety-stock/batch-update', data);
  },

  calculateSafetyStock: async (
    data?: { warehouse_id?: string; sku?: string; category_id?: string }
  ): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.wms.post('/smart-replenishment/safety-stock/calculate', data);
  },

  getStatistics: async (
    params?: { warehouse_id?: string }
  ): Promise<ApiResponse<ReplenishmentStatistics>> => {
    return apiClient.wms.get('/smart-replenishment/statistics', { params });
  },
};

export async function listReplenishmentSuggestions(
  params?: AlertPaginationParams & { priority?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<ReplenishmentSuggestion>>> {
  return smartReplenishmentApi.listSuggestions(params);
}

export async function getReplenishmentSuggestion(
  id: string
): Promise<ApiResponse<ReplenishmentSuggestion>> {
  return smartReplenishmentApi.getSuggestion(id);
}

export async function generateReplenishmentSuggestions(
  data?: { warehouse_id?: string; sku?: string; category_id?: string }
): Promise<ApiResponse<{ count: number; suggestions: ReplenishmentSuggestion[] }>> {
  return smartReplenishmentApi.generateSuggestions(data);
}

export async function listReplenishmentOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<ReplenishmentOrder>>> {
  return smartReplenishmentApi.listOrders(params);
}

export async function getReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return smartReplenishmentApi.getOrder(id);
}

export async function createReplenishmentOrder(
  data: CreateReplenishmentOrderRequest
): Promise<ApiResponse<ReplenishmentOrder>> {
  return smartReplenishmentApi.createOrder(data);
}

export async function updateReplenishmentOrder(
  id: string,
  data: Partial<ReplenishmentOrder>
): Promise<ApiResponse<ReplenishmentOrder>> {
  return smartReplenishmentApi.updateOrder(id, data);
}

export async function deleteReplenishmentOrder(id: string): Promise<ApiResponse<string>> {
  return smartReplenishmentApi.deleteOrder(id);
}

export async function listReplenishmentOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: ReplenishmentOrderItem[]; total: number }>> {
  return smartReplenishmentApi.listOrderItems(order_id);
}

export async function confirmReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return smartReplenishmentApi.confirmOrder(id);
}

export async function completeReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return smartReplenishmentApi.completeOrder(id);
}

export async function listSafetyStockSettings(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<SafetyStockSetting>>> {
  return smartReplenishmentApi.listSafetyStock(params);
}

export async function getSafetyStockSetting(
  id: string
): Promise<ApiResponse<SafetyStockSetting>> {
  return smartReplenishmentApi.getSafetyStock(id);
}

export async function updateSafetyStockSetting(
  id: string,
  data: UpdateSafetyStockRequest
): Promise<ApiResponse<SafetyStockSetting>> {
  return smartReplenishmentApi.updateSafetyStock(id, data);
}

export async function batchUpdateSafetyStock(
  data: UpdateSafetyStockRequest & { ids: string[] }
): Promise<ApiResponse<{ updated_count: number }>> {
  return smartReplenishmentApi.batchUpdateSafetyStock(data);
}

export async function calculateSafetyStock(
  data?: { warehouse_id?: string; sku?: string; category_id?: string }
): Promise<ApiResponse<{ updated_count: number }>> {
  return smartReplenishmentApi.calculateSafetyStock(data);
}

export async function getReplenishmentStatistics(
  params?: { warehouse_id?: string }
): Promise<ApiResponse<ReplenishmentStatistics>> {
  return smartReplenishmentApi.getStatistics(params);
}

export default smartReplenishmentApi;
