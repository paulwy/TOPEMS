import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type { Reagent, CreateReagentRequest, UpdateReagentRequest, ListParams } from './types';

export const reagentApi = {
  ...createCrudApi<Reagent>('/reagents'),

  listReagents: (params?: ListParams) => createCrudApi<Reagent>('/reagents').list(params),

  getReagent: (id: string) => createCrudApi<Reagent>('/reagents').get(id),

  createReagent: (data: CreateReagentRequest) => createCrudApi<Reagent>('/reagents').create(data),

  updateReagent: (id: string, data: UpdateReagentRequest) =>
    createCrudApi<Reagent>('/reagents').update(id, data),

  deleteReagent: (id: string) => createCrudApi<Reagent>('/reagents').delete(id),

  // @deprecated 无页面消费（预埋端点，后端未提供），保留以兼容存量引用
  listLowStock: async (): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/reagents/low-stock');
  },

  // @deprecated 无页面消费（预埋端点，后端未提供），保留以兼容存量引用
  listExpiring: async (days?: number): Promise<ApiResponse<Reagent[]>> => {
    return apiClient.lims.get('/reagents/expiring', { params: { days } });
  },
};
