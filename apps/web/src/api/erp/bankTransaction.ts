import type { ApiResponse } from '../client';
import apiClient from '../client';

export interface BankTransaction {
  id: string;
  account_id: string;
  amount: number;
  transaction_type: string;
  counterparty?: string;
  remark?: string;
  [key: string]: unknown;
}

interface BankTransactionListResponse {
  items: BankTransaction[];
  total: number;
}

export const bankTransactionApi = {
  list: (params?: {
    page?: number;
    pagesize?: number;
    status?: string;
    keyword?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<BankTransactionListResponse>> => {
    const { page, pagesize, ...rest } = params || {};
    const searchParams: Record<string, unknown> = { ...rest };
    if (page !== undefined) searchParams.page = page;
    if (pagesize !== undefined) searchParams.pagesize = pagesize;
    return apiClient.erp.get('/bank-transactions', { params: searchParams });
  },

  get: (id: string): Promise<ApiResponse<BankTransaction>> => {
    return apiClient.erp.get(`/bank-transactions/${id}`);
  },

  create: (data: Partial<BankTransaction>): Promise<ApiResponse<BankTransaction>> => {
    return apiClient.erp.post('/bank-transactions', data);
  },

  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/bank-transactions/${id}`);
  },
};

export default bankTransactionApi;
