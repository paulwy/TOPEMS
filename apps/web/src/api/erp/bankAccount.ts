/**
 * 银行账户 API
 */
import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch_name?: string;
  currency?: string;
  balance?: number;
  is_default: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface BankAccountListResponse {
  items: BankAccount[];
  total: number;
  [key: string]: unknown;
}

interface PaginationParams {
  page?: number;
  pagesize?: number;
  status?: string;
  keyword?: string;
  [key: string]: unknown;
}

export const bankAccountApi = {
  list: (params?: PaginationParams): Promise<ApiResponse<BankAccountListResponse>> => {
    const { page, pagesize, ...rest } = params || {};
    const searchParams: Record<string, unknown> = { ...rest };
    if (page !== undefined) searchParams.page = page;
    if (pagesize !== undefined) searchParams.pagesize = pagesize;
    return apiClient.erp.get('/bank-accounts', { params: searchParams });
  },

  get: (id: string): Promise<ApiResponse<BankAccount>> => {
    return apiClient.erp.get(`/bank-accounts/${id}`);
  },

  create: (data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> => {
    return apiClient.erp.post('/bank-accounts', data);
  },

  update: (id: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> => {
    return apiClient.erp.put(`/bank-accounts/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/bank-accounts/${id}`);
  },
};

export default bankAccountApi;
