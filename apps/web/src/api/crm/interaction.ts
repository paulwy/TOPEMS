import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { Interaction, InteractionQueryParams } from './types';

export const interactionApi = {
  list: async (
    params?: InteractionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Interaction>>> => {
    return apiClient.crm.get('/interactions', { params });
  },

  create: async (data: Partial<Interaction>): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.post('/interactions', data);
  },

  get: async (id: string): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.get(`/interactions/${id}`);
  },

  update: async (id: string, data: Partial<Interaction>): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.put(`/interactions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/interactions/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/interactions/batch-delete', { ids });
  },
};

export default interactionApi;
