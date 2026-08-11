/**
 * WMS · 波次拣货 (Wave Pick) API 绑定
 *
 * 后端: svc/wms/src/modules/wave_pick.rs
 * 路由:
 *   GET    /wave-picks
 *   POST   /wave-picks
 *   GET    /wave-picks/{id}
 *   PUT    /wave-picks/{id}
 *   DELETE /wave-picks/{id}
 *   GET    /wave-picks/{id}/items
 *   POST   /wave-picks/{id}/assign
 *   POST   /wave-picks/{id}/start
 *   POST   /wave-picks/{id}/complete
 *   POST   /wave-picks/{id}/cancel
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  WavePick,
  WavePickItem,
  CreateWavePickRequest,
  AssignWavePickRequest,
  PaginationParams,
} from './types';

export const wavePickApi = {
  list: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<WavePick>>> => {
    return apiClient.wms.get('/wave-picks', { params });
  },

  get: async (id: string): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.get(`/wave-picks/${id}`);
  },

  create: async (data: CreateWavePickRequest): Promise<ApiResponse<WavePick>> => {
    return apiClient.wms.post('/wave-picks', data);
  },

  update: async (id: string, data: Partial<WavePick>): Promise<ApiResponse<WavePick>> => {
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

  assign: async (id: string, data: AssignWavePickRequest): Promise<ApiResponse<WavePick>> => {
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

export async function listWavePicks(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<WavePick>>> {
  return wavePickApi.list(params);
}

export async function getWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return wavePickApi.get(id);
}

export async function createWavePick(data: CreateWavePickRequest): Promise<ApiResponse<WavePick>> {
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

export default wavePickApi;
