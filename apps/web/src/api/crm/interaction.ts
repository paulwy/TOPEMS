import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Interaction,
  CreateInteractionRequest,
  UpdateInteractionRequest,
  InteractionQueryParams,
} from './types';

export const interactionApi = {
  list: async (
    params?: InteractionQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Interaction>>> => {
    return apiClient.crm.get('/api/crm/interactions', { params });
  },

  create: async (data: CreateInteractionRequest): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.post('/api/crm/interactions', data);
  },

  get: async (id: string): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.get(`/api/crm/interactions/${id}`);
  },

  update: async (id: string, data: UpdateInteractionRequest): Promise<ApiResponse<Interaction>> => {
    return apiClient.crm.put(`/api/crm/interactions/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/api/crm/interactions/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/api/crm/interactions/batch-delete', { ids });
  },
};

export default interactionApi;
