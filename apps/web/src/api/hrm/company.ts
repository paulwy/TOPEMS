import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Company, ListParams, PaginatedResult, CrudOperations } from './types';
import { buildQueryString } from './types';

export const companyApi: CrudOperations<Company> = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/companies${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/companies/${id}`);
  },

  create: (data: Partial<Company>) => {
    return apiClient.hrm.post('/api/hrm/companies', data);
  },

  update: (id: string, data: Partial<Company>) => {
    return apiClient.hrm.put(`/api/hrm/companies/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/companies/${id}`);
  },
};

export default companyApi;
