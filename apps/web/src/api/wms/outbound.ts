import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  OutboundOrder,
  OutboundOrderItem,
  CreateOutboundOrderRequest,
  CreateOutboundOrderItemRequest,
  ShipItemRequest,
  UpdateOutboundOrderRequest,
  WavePick,
  WavePickItem,
  CreateWavePickRequest,
  AssignWavePickRequest,
  PaginationParams,
} from './types';

export const outboundOrderApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> => {
    return apiClient.wms.get('/outbound-orders', { params });
  },

  get: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.get(`/outbound-orders/${id}`);
  },

  create: async (
    data: CreateOutboundOrderRequest
  ): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post('/outbound-orders', data);
  },

  update: async (
    id: string,
    data: Partial<OutboundOrder>
  ): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.put(`/outbound-orders/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/outbound-orders/${id}`);
  },

  listItems: async (
    order_id: string
  ): Promise<ApiResponse<{ items: OutboundOrderItem[]; total: number }>> => {
    return apiClient.wms.get(`/outbound-orders/${order_id}/items`);
  },

  createItem: async (
    order_id: string,
    data: CreateOutboundOrderItemRequest
  ): Promise<ApiResponse<OutboundOrderItem>> => {
    return apiClient.wms.post(`/outbound-orders/${order_id}/items`, data);
  },

  updateItem: async (
    order_id: string,
    item_id: string,
    data: Partial<OutboundOrderItem>
  ): Promise<ApiResponse<OutboundOrderItem>> => {
    return apiClient.wms.put(`/outbound-orders/${order_id}/items/${item_id}`, data);
  },

  deleteItem: async (
    order_id: string,
    item_id: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/outbound-orders/${order_id}/items/${item_id}`);
  },

  confirm: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post(`/outbound-orders/${id}/confirm`);
  },

  pick: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post(`/outbound-orders/${id}/pick`);
  },

  pack: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post(`/outbound-orders/${id}/pack`);
  },

  ship: async (
    id: string,
    items: ShipItemRequest[]
  ): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post(`/outbound-orders/${id}/ship`, items);
  },

  complete: async (id: string): Promise<ApiResponse<OutboundOrder>> => {
    return apiClient.wms.post(`/outbound-orders/${id}/complete`);
  },
};

export const wavePickApi = {
  list: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<WavePick>>> => {
    return apiClient.wms.get('/wave-picks', { params });
  },

  get: async (id: string): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.get(`/wave-picks/${id}`);
  },

  create: async (
    data: CreateWavePickRequest
  ): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post('/wave-picks', data);
  },

  update: async (
    id: string,
    data: Partial<WavePick>
  ): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.put(`/wave-picks/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.wms.delete(`/wave-picks/${id}`);
  },

  listItems: async (
    wave_id: string
  ): Promise<ApiResponse<{ items: WavePickItem[]; total: number }>> => {
    return apiClient.wms.get(`/wave-picks/${wave_id}/items`);
  },

  assign: async (
    id: string,
    data: AssignWavePickRequest
  ): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post(`/wave-picks/${id}/assign`, data);
  },

  start: async (id: string): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post(`/wave-picks/${id}/start`);
  },

  complete: async (id: string): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post(`/wave-picks/${id}/complete`);
  },

  cancel: async (id: string): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post(`/wave-picks/${id}/cancel`);
  },
};

export async function listOutboundOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> {
  return outboundOrderApi.list(params);
}

export async function getOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.get(id);
}

export async function createOutboundOrder(
  data: CreateOutboundOrderRequest
): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.create(data);
}

export async function updateOutboundOrder(
  id: string,
  data: Partial<OutboundOrder>
): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.update(id, data);
}

export async function deleteOutboundOrder(id: string): Promise<ApiResponse<string>> {
  return outboundOrderApi.delete(id);
}

export async function listOutboundOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: OutboundOrderItem[]; total: number }>> {
  return outboundOrderApi.listItems(order_id);
}

export async function createOutboundOrderItem(
  order_id: string,
  data: CreateOutboundOrderItemRequest
): Promise<ApiResponse<OutboundOrderItem>> {
  return outboundOrderApi.createItem(order_id, data);
}

export async function updateOutboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<OutboundOrderItem>
): Promise<ApiResponse<OutboundOrderItem>> {
  return outboundOrderApi.updateItem(order_id, item_id, data);
}

export async function deleteOutboundOrderItem(
  order_id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return outboundOrderApi.deleteItem(order_id, item_id);
}

export async function confirmOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.confirm(id);
}

export async function pickOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.pick(id);
}

export async function packOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.pack(id);
}

export async function shipOutboundOrder(
  id: string,
  items: ShipItemRequest[]
): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.ship(id, items);
}

export async function completeOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return outboundOrderApi.complete(id);
}

export async function listWavePicks(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<WavePick>>> {
  return wavePickApi.list(params);
}

export async function getWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return wavePickApi.get(id);
}

export async function createWavePick(
  data: CreateWavePickRequest
): Promise<ApiResponse<WavePick>> {
  return wavePickApi.create(data);
}

export async function updateWavePick(
  id: string,
  data: Partial<WavePick>
): Promise<ApiResponse<WavePick>> {
  return wavePickApi.update(id, data);
}

export async function deleteWavePick(id: string): Promise<ApiResponse<string>> {
  return wavePickApi.delete(id);
}

export async function listWavePickItems(
  wave_id: string
): Promise<ApiResponse<{ items: WavePickItem[]; total: number }>> {
  return wavePickApi.listItems(wave_id);
}

export async function assignWavePick(
  id: string,
  data: AssignWavePickRequest
): Promise<ApiResponse<WavePick>> {
  return wavePickApi.assign(id, data);
}

export async function startWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return wavePickApi.start(id);
}

export async function completeWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return wavePickApi.complete(id);
}

export async function cancelWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return wavePickApi.cancel(id);
}

export default outboundOrderApi;
