import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Employee,
  Role,
  Position,
  ListParams,
  PaginatedResult,
  CrudOperations,
  PerformanceReview,
  PerformanceGoal,
} from './types';
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

export const employeeApi: CrudOperations<Employee> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/employees${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/employees/${id}`);
  },

  create: (data: Partial<Employee>) => {
    return apiClient.hrm.post('/api/hrm/employees', data);
  },

  update: (id: string, data: Partial<Employee>) => {
    return apiClient.hrm.put(`/api/hrm/employees/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/employees/${id}`);
  },
};

export const roleApi: CrudOperations<Role> = createCrudApi<Role>('/api/hrm/roles');

export const positionApi: CrudOperations<Position> = createCrudApi<Position>('/api/hrm/positions');

export const employeePerformanceApi = {
  getReviews(
    employee_id: string
  ): Promise<ApiResponse<{ items: PerformanceReview[]; total: number }>> {
    return apiClient.hrm.get(`/api/hrm/employees/${employee_id}/performance-reviews`);
  },

  getGoals(employee_id: string): Promise<ApiResponse<{ items: PerformanceGoal[]; total: number }>> {
    return apiClient.hrm.get(`/api/hrm/employees/${employee_id}/performance-goals`);
  },
};

export default employeeApi;
