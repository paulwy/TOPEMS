import apiClient from '../client';
import type { ListParams, PaginatedResult } from './types';
import type { ApiResponse } from '../client';

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
      return apiClient.workflow.get(endpoint, { params });
    },

    get: (id: string) => {
      return apiClient.workflow.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.workflow.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.workflow.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.workflow.delete(`${endpoint}/${id}`);
    },
  };
}
