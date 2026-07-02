import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  BankAccount,
  BankTransaction,
  CreateBankTransactionRequest,
  PaginationParams,
  PaginatedResult,
} from '../types';

export const bankAccountApi = {
  async list(
    params?: PaginationParams & { company_id?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResult<BankAccount>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.company_id) searchParams.set('company_id', params.company_id);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/bank-accounts${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.get(`/bank-accounts/${id}`);
  },

  async create(data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.post('/bank-accounts', data);
  },

  async update(id: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return apiClient.erp.put(`/bank-accounts/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/bank-accounts/${id}`);
  },
};

export const bankTransactionApi = {
  async list(
    params?: PaginationParams & {
      account_id?: string;
      transaction_date?: string;
    }
  ): Promise<ApiResponse<PaginatedResult<BankTransaction>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.account_id) searchParams.set('account_id', params.account_id);
    if (params?.transaction_date) searchParams.set('transaction_date', params.transaction_date);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/bank-transactions${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<BankTransaction>> {
    return apiClient.erp.get(`/bank-transactions/${id}`);
  },

  async create(data: CreateBankTransactionRequest): Promise<ApiResponse<BankTransaction>> {
    return apiClient.erp.post('/bank-transactions', data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/bank-transactions/${id}`);
  },
};
