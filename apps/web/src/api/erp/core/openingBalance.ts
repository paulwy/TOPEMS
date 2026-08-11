import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface OpeningBalance {
  id: string;
  company_id: string;
  subject_code: string;
  subject_name: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOpeningBalanceRequest {
  company_id: string;
  subject_code: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
}

export interface UpdateOpeningBalanceRequest {
  debit_balance?: number;
  credit_balance?: number;
}

export interface CarryForwardRequest {
  from_period: string;
  to_period: string;
}

export interface OpeningBalanceListResponse {
  items: OpeningBalance[];
  total: number;
}

export interface OpeningBalanceQueryParams extends PaginationParams {
  company_id?: string;
  period?: string;
  subject_code?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps = (params as { pageSize?: number } | undefined)?.pageSize
    ?? (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const openingBalanceApi = {
  async list(params?: OpeningBalanceQueryParams): Promise<ApiResponse<OpeningBalanceListResponse>> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) sp.set('pagesize', ps);
    if (params?.company_id) sp.set('company_id', params.company_id);
    if (params?.period) sp.set('period', params.period);
    if (params?.subject_code) sp.set('subject_code', params.subject_code);
    const qs = sp.toString();
    return apiClient.erp.get<OpeningBalanceListResponse>(
      `/finance/accounts/opening-balances${qs ? `?${qs}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.get<OpeningBalance>(`/finance/accounts/opening-balances/${id}`);
  },

  async create(data: CreateOpeningBalanceRequest): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.post<OpeningBalance>(
      '/finance/accounts/opening-balances',
      data
    );
  },

  async update(id: string, data: UpdateOpeningBalanceRequest): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.erp.put<OpeningBalance>(
      `/finance/accounts/opening-balances/${id}`,
      data
    );
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/finance/accounts/opening-balances/${id}`);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async import(data: CreateOpeningBalanceRequest[]): Promise<ApiResponse<{ success_count: number; failed_count: number; errors: string[] }>> {
    return apiClient.erp.post<{ success_count: number; failed_count: number; errors: string[] }>(
      '/finance/accounts/opening-balances/batch',
      data
    );
  },

  async carryForward(data: CarryForwardRequest): Promise<ApiResponse<{ rows_affected: number }>> {
    return apiClient.erp.post<{ rows_affected: number }>(
      '/finance/accounts/opening-balances/carry-forward',
      data
    );
  },
};
