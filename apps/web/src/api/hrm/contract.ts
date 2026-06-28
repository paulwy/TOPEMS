import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Contract, ContractRenewal, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const contractApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<Contract>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contracts${queryString}`);
  },

  get: async (
    id: string
  ): Promise<ApiResponse<{ contract: Contract; renewals: ContractRenewal[] }>> => {
    return apiClient.hrm.get(`/api/hrm/contracts/${id}`);
  },

  create: async (data: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    return apiClient.hrm.post('/api/hrm/contracts', data);
  },

  update: async (id: string, data: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    return apiClient.hrm.put(`/api/hrm/contracts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/contracts/${id}`);
  },

  getExpiring: async (params?: {
    days?: number;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<Contract>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contracts/expiring${queryString}`);
  },

  renew: async (
    contract_id: string,
    data: Partial<ContractRenewal>
  ): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.post(`/api/hrm/contracts/${contract_id}/renew`, data);
  },
};

export const contractRenewalApi = {
  list: async (params?: ListParams): Promise<ApiResponse<PaginatedResult<ContractRenewal>>> => {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/contract-renewals${queryString}`);
  },

  get: async (id: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.get(`/api/hrm/contract-renewals/${id}`);
  },

  update: async (
    id: string,
    data: Partial<ContractRenewal>
  ): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.hrm.delete(`/api/hrm/contract-renewals/${id}`);
  },

  approve: async (id: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/approve`);
  },

  reject: async (id: string, reason: string): Promise<ApiResponse<ContractRenewal>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/reject`, {
      reason,
    });
  },

  execute: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.hrm.put(`/api/hrm/contract-renewals/${id}/execute`);
  },
};

export default contractApi;
