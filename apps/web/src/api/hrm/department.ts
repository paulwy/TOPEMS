import apiClient from '../client';
import type { Department, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';

export const departmentApi: CrudOperations<Department> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/departments${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/departments/${id}`);
  },

  create: (data: Partial<Department>) => {
    return apiClient.hrm.post('/departments', data);
  },

  update: (id: string, data: Partial<Department>) => {
    return apiClient.hrm.put(`/departments/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/departments/${id}`);
  },
};

export default departmentApi;
