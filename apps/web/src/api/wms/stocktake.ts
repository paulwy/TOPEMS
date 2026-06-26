import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  StockTake,
  StockTakeItem,
  CreateStockTakeRequest,
  CreateStockTakeItemRequest,
  CountItemRequest,
  PaginationParams,
} from './types';

export const stockTakeApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<StockTake>>> => {
    return apiClient.wms.get('/stock-takes', { params });
  },

  get: async (id: string): Promise<ApiResponse<StockTake>> => {
    return apiClient.wms.get(`/stock-takes/${id}`);
  },

  create: async (
    data: CreateStockTakeRequest
  ): Promise<ApiResponse<StockTake>> => {
    return apiClient.wms.post('/stock-takes', data);
  },

  update: async (
    id: string,
    data: Partial<StockTake>
  ): Promise<ApiResponse<StockTake>> => {
    return apiClient.wms.put(`/stock-takes/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/stock-takes/${id}`);
  },

  listItems: async (id: string): Promise<
    ApiResponse<{
      items: StockTakeItem[];
      total: number;
      completed_count: number;
      discrepancy_count: number;
    }>
  > => {
    return apiClient.wms.get(`/stock-takes/${id}/items`);
  },

  getItem: async (
    id: string,
    item_id: string
  ): Promise<ApiResponse<StockTakeItem>> => {
    return apiClient.wms.get(`/stock-takes/${id}/items/${item_id}`);
  },

  createItem: async (
    id: string,
    data: CreateStockTakeItemRequest
  ): Promise<ApiResponse<StockTakeItem>> => {
    return apiClient.wms.post(`/stock-takes/${id}/items`, data);
  },

  updateItem: async (
    id: string,
    item_id: string,
    data: Partial<StockTakeItem>
  ): Promise<ApiResponse<StockTakeItem>> => {
    return apiClient.wms.put(`/stock-takes/${id}/items/${item_id}`, data);
  },

  deleteItem: async (
    id: string,
    item_id: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/stock-takes/${id}/items/${item_id}`);
  },

  start: async (id: string): Promise<ApiResponse<StockTake>> => {
    return apiClient.wms.post(`/stock-takes/${id}/start`);
  },

  count: async (
    id: string,
    items: CountItemRequest[]
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.wms.post(`/stock-takes/${id}/count`, items);
  },

  complete: async (id: string): Promise<ApiResponse<StockTake>> => {
    return apiClient.wms.post(`/stock-takes/${id}/complete`);
  },

  adjust: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.wms.post(`/stock-takes/${id}/adjust`);
  },
};

export async function listStockTakes(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<StockTake>>> {
  return stockTakeApi.list(params);
}

export async function getStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return stockTakeApi.get(id);
}

export async function createStockTake(
  data: CreateStockTakeRequest
): Promise<ApiResponse<StockTake>> {
  return stockTakeApi.create(data);
}

export async function updateStockTake(
  id: string,
  data: Partial<StockTake>
): Promise<ApiResponse<StockTake>> {
  return stockTakeApi.update(id, data);
}

export async function deleteStockTake(id: string): Promise<ApiResponse<string>> {
  return stockTakeApi.delete(id);
}

export async function listStockTakeItems(id: string): Promise<
  ApiResponse<{
    items: StockTakeItem[];
    total: number;
    completed_count: number;
    discrepancy_count: number;
  }>
> {
  return stockTakeApi.listItems(id);
}

export async function getStockTakeItem(
  id: string,
  item_id: string
): Promise<ApiResponse<StockTakeItem>> {
  return stockTakeApi.getItem(id, item_id);
}

export async function createStockTakeItem(
  id: string,
  data: CreateStockTakeItemRequest
): Promise<ApiResponse<StockTakeItem>> {
  return stockTakeApi.createItem(id, data);
}

export async function updateStockTakeItem(
  id: string,
  item_id: string,
  data: Partial<StockTakeItem>
): Promise<ApiResponse<StockTakeItem>> {
  return stockTakeApi.updateItem(id, item_id, data);
}

export async function deleteStockTakeItem(
  id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return stockTakeApi.deleteItem(id, item_id);
}

export async function startStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return stockTakeApi.start(id);
}

export async function countStockTake(
  id: string,
  items: CountItemRequest[]
): Promise<ApiResponse<{ message: string }>> {
  return stockTakeApi.count(id, items);
}

export async function completeStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return stockTakeApi.complete(id);
}

export async function adjustStockTake(id: string): Promise<ApiResponse<{ message: string }>> {
  return stockTakeApi.adjust(id);
}

export default stockTakeApi;
