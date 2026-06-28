import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  AccountingSubject,
  OpeningBalance,
  CreateOpeningBalanceRequest,
  CarryForwardRequest,
  PaginationParams,
  PaginatedResult,
} from '../types';

export const accountingSubjectApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<AccountingSubject>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/accounting-subjects${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.get(`/api/erp/accounting-subjects/${id}`);
  },

  async create(data: Partial<AccountingSubject>): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.post('/api/erp/accounting-subjects', data);
  },

  async update(
    id: string,
    data: Partial<AccountingSubject>
  ): Promise<ApiResponse<AccountingSubject>> {
    return apiClient.erp.put(`/api/erp/accounting-subjects/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/accounting-subjects/${id}`);
  },
};

export const openingBalanceApi = {
  async list(
    params?: PaginationParams & { period?: string; company_id?: string }
  ): Promise<ApiResponse<PaginatedResult<OpeningBalance>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.period) searchParams.set('period', params.period);
    if (params?.company_id) searchParams.set('company_id', params.company_id);

    const queryString = searchParams.toString();
    return apiClient.erp.get(
      `/api/erp/finance/accounts/opening-balances${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.get(`/api/erp/finance/accounts/opening-balances/${id}`);
  },

  async create(data: CreateOpeningBalanceRequest): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.post('/api/erp/finance/accounts/opening-balances', data);
  },

  async update(id: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.put(`/api/erp/finance/accounts/opening-balances/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/finance/accounts/opening-balances/${id}`);
  },

  async batchImport(
    data: CreateOpeningBalanceRequest[]
  ): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.erp.post('/api/erp/finance/accounts/opening-balances/batch', data);
  },

  async carryForward(data: CarryForwardRequest): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.erp.post('/api/erp/finance/accounts/opening-balances/carry-forward', data);
  },
};
