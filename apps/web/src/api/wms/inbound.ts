import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  InboundOrder,
  InboundOrderItem,
  CreateInboundOrderRequest,
  CreateInboundOrderItemRequest,
  ReceiveItemRequest,
  PaginationParams,
} from './types';

export const inboundOrderApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> => {
    return apiClient.wms.get('/inbound-orders', { params });
  },

  get: async (id: string): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.get(`/inbound-orders/${id}`);
  },

  create: async (data: CreateInboundOrderRequest): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.post('/inbound-orders', data);
  },

  update: async (id: string, data: Partial<InboundOrder>): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.put(`/inbound-orders/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/inbound-orders/${id}`);
  },

  listItems: async (
    order_id: string
  ): Promise<ApiResponse<{ items: InboundOrderItem[]; total: number }>> => {
    return apiClient.wms.get(`/inbound-orders/${order_id}/items`);
  },

  createItem: async (
    order_id: string,
    data: CreateInboundOrderItemRequest
  ): Promise<ApiResponse<InboundOrderItem>> => {
    return apiClient.wms.post(`/inbound-orders/${order_id}/items`, data);
  },

  updateItem: async (
    order_id: string,
    item_id: string,
    data: Partial<InboundOrderItem>
  ): Promise<ApiResponse<InboundOrderItem>> => {
    return apiClient.wms.put(`/inbound-orders/${order_id}/items/${item_id}`, data);
  },

  deleteItem: async (order_id: string, item_id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/inbound-orders/${order_id}/items/${item_id}`);
  },

  confirm: async (id: string): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.post(`/inbound-orders/${id}/confirm`);
  },

  receive: async (id: string, items: ReceiveItemRequest[]): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.post(`/inbound-orders/${id}/receive`, items);
  },

  complete: async (id: string): Promise<ApiResponse<InboundOrder>> => {
    return apiClient.wms.post(`/inbound-orders/${id}/complete`);
  },
};

export async function listInboundOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> {
  return inboundOrderApi.list(params);
}

export async function getInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.get(id);
}

export async function createInboundOrder(
  data: CreateInboundOrderRequest
): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.create(data);
}

export async function updateInboundOrder(
  id: string,
  data: Partial<InboundOrder>
): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.update(id, data);
}

export async function deleteInboundOrder(id: string): Promise<ApiResponse<string>> {
  return inboundOrderApi.delete(id);
}

export async function listInboundOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: InboundOrderItem[]; total: number }>> {
  return inboundOrderApi.listItems(order_id);
}

export async function createInboundOrderItem(
  order_id: string,
  data: CreateInboundOrderItemRequest
): Promise<ApiResponse<InboundOrderItem>> {
  return inboundOrderApi.createItem(order_id, data);
}

export async function updateInboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<InboundOrderItem>
): Promise<ApiResponse<InboundOrderItem>> {
  return inboundOrderApi.updateItem(order_id, item_id, data);
}

export async function deleteInboundOrderItem(
  order_id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return inboundOrderApi.deleteItem(order_id, item_id);
}

export async function confirmInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.confirm(id);
}

export async function receiveInboundOrder(
  id: string,
  items: ReceiveItemRequest[]
): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.receive(id, items);
}

export async function completeInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return inboundOrderApi.complete(id);
}

export default inboundOrderApi;
