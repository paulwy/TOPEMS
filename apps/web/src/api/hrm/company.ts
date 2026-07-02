import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Company, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';

export const companyApi: CrudOperations<Company> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/companies${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/companies/${id}`);
  },

  create: (data: Partial<Company>) => {
    return apiClient.hrm.post('/companies', data);
  },

  update: (id: string, data: Partial<Company>) => {
    return apiClient.hrm.put(`/companies/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/companies/${id}`);
  },
};

export default companyApi;
