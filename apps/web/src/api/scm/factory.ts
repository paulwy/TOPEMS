import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import { normalizePageParams } from '@/utils/normalizePageParams';

export interface ScmCrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (
    params?: PaginationParams & Record<string, unknown>
  ) => Promise<ApiResponse<PaginatedResponse<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: TCreate) => Promise<ApiResponse<T>>;
  update: (id: string, data: TUpdate) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

export interface CreateScmCrudApiOptions {
  singularName?: string;
}

export function createScmCrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  resource: string,
  _options: CreateScmCrudApiOptions = {}
): ScmCrudApi<T, TCreate, TUpdate> {
  return {
    list: async (params?: PaginationParams & Record<string, unknown>) => {
      const normalizedParams = params ? normalizePageParams(params) : params;
      return apiClient.scm.get(`/${resource}`, { params: normalizedParams });
    },

    get: async (id: string) => {
      return apiClient.scm.get(`/${resource}/${id}`);
    },

    create: async (data: TCreate) => {
      return apiClient.scm.post(`/${resource}`, data);
    },

    update: async (id: string, data: TUpdate) => {
      return apiClient.scm.put(`/${resource}/${id}`, data);
    },

    delete: async (id: string) => {
      return apiClient.scm.delete(`/${resource}/${id}`);
    },
  };
}

export default createScmCrudApi;
