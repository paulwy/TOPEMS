import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type { Reagent, CreateReagentRequest, UpdateReagentRequest, ListParams } from './types';

export const reagentApi = {
  ...createCrudApi<Reagent>('/api/lims/reagents'),

  listReagents: (params?: ListParams) => createCrudApi<Reagent>('/api/lims/reagents').list(params),

  getReagent: (id: string) => createCrudApi<Reagent>('/api/lims/reagents').get(id),

  createReagent: (data: CreateReagentRequest) =>
    createCrudApi<Reagent>('/api/lims/reagents').create(data),

  updateReagent: (id: string, data: UpdateReagentRequest) =>
    createCrudApi<Reagent>('/api/lims/reagents').update(id, data),

  deleteReagent: (id: string) => createCrudApi<Reagent>('/api/lims/reagents').delete(id),

  listLowStock: async (): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/api/lims/reagents/low-stock');
  },

  listExpiring: async (days?: number): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/api/lims/reagents/expiring', { params: { days } });
  },
};
