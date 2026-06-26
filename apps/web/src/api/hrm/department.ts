import apiClient from '../client';
import type { Department, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';

export const departmentApi: CrudOperations<Department> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/departments${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/departments/${id}`);
  },

  create: (data: Partial<Department>) => {
    return apiClient.hrm.post('/api/hrm/departments', data);
  },

  update: (id: string, data: Partial<Department>) => {
    return apiClient.hrm.put(`/api/hrm/departments/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/departments/${id}`);
  },
};

export default departmentApi;
