import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { ListParams, PaginatedResult } from './types';

export function buildQueryString(params?: ListParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export interface CrudOperations<T> {
  list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

export function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: (params?: ListParams) => {
      return apiClient.lims.get(endpoint, { params });
    },

    get: (id: string) => {
      return apiClient.lims.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.lims.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.lims.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.lims.delete(`${endpoint}/${id}`);
    },
  };
}
