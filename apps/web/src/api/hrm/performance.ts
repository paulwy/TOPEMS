import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { PerformanceReview, PerformanceGoal, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';

function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: async (params?: ListParams) => {
      const queryString = buildQueryString(params);
      return await apiClient.hrm.get(`${endpoint}${queryString}`);
    },

    get: (id: string) => {
      return apiClient.hrm.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.hrm.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.hrm.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.hrm.delete(`${endpoint}/${id}`);
    },
  };
}

export const performanceReviewApi = {
  ...createCrudApi<PerformanceReview>('/api/hrm/performance-reviews'),

  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/performance-reviews${queryString}`);
  },

  submit(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/hrm/performance-reviews/${id}/submit`);
  },

  approve(id: string): Promise<ApiResponse<PerformanceReview>> {
    return apiClient.hrm.put(`/api/hrm/performance-reviews/${id}/approve`);
  },
};

export const performanceGoalApi: CrudOperations<PerformanceGoal> = createCrudApi<PerformanceGoal>(
  '/api/hrm/performance-goals'
);

export default performanceReviewApi;
