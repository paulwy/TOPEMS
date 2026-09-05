import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  TransferOrder,
  TransferOrderItem,
  CreateTransferOrderRequest,
  PaginationParams,
} from './types';

export const transferApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<TransferOrder>>> => {
    return apiClient.wms.get('/transfers', { params });
  },

  get: async (id: string): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.get(`/transfers/${id}`);
  },

  create: async (data: CreateTransferOrderRequest): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.post('/transfers', data);
  },

  update: async (id: string, data: Partial<TransferOrder>): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.put(`/transfers/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/transfers/${id}`);
  },

  listItems: async (
    transfer_id: string
  ): Promise<ApiResponse<{ items: TransferOrderItem[]; total: number }>> => {
    return apiClient.wms.get(`/transfers/${transfer_id}/items`);
  },

  confirm: async (id: string): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.post(`/transfers/${id}/confirm`);
  },

  ship: async (id: string): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.post(`/transfers/${id}/ship`);
  },

  receive: async (
    id: string,
    items?: { item_id: string; received_quantity: number }[]
  ): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.post(`/transfers/${id}/receive`, { items });
  },

  complete: async (id: string): Promise<ApiResponse<TransferOrder>> => {
    return apiClient.wms.post(`/transfers/${id}/complete`);
  },
};

export async function listTransferOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<TransferOrder>>> {
  return transferApi.list(params);
}

export async function getTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return transferApi.get(id);
}

export async function createTransferOrder(
  data: CreateTransferOrderRequest
): Promise<ApiResponse<TransferOrder>> {
  return transferApi.create(data);
}

export async function updateTransferOrder(
  id: string,
  data: Partial<TransferOrder>
): Promise<ApiResponse<TransferOrder>> {
  return transferApi.update(id, data);
}

export async function deleteTransferOrder(id: string): Promise<ApiResponse<string>> {
  return transferApi.delete(id);
}

export async function listTransferOrderItems(
  transfer_id: string
): Promise<ApiResponse<{ items: TransferOrderItem[]; total: number }>> {
  return transferApi.listItems(transfer_id);
}

export async function confirmTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return transferApi.confirm(id);
}

export async function shipTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return transferApi.ship(id);
}

export async function receiveTransferOrder(
  id: string,
  items?: { item_id: string; received_quantity: number }[]
): Promise<ApiResponse<TransferOrder>> {
  return transferApi.receive(id, items);
}

export async function completeTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return transferApi.complete(id);
}

export default transferApi;
