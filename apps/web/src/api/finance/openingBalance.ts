import apiClient from '../client';
import type { ApiResponse } from '../client';

interface PaginationParams {
  page?: number;
  pageSize?: number;
  page_size?: number;
}

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

interface CreateOpeningBalanceRequest {
  company_id: string;
  subject_code: string;
  subject_name: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
}

interface UpdateOpeningBalanceRequest {
  company_id?: string;
  subject_code?: string;
  subject_name?: string;
  period?: string;
  debit_balance?: number;
  credit_balance?: number;
}

interface CarryForwardRequest {
  from_period: string;
  to_period: string;
}

interface OpeningBalanceListResponse {
  items: OpeningBalance[];
  total: number;
}

interface OpeningBalanceQueryParams extends PaginationParams {
  company_id?: string;
  period?: string;
  subject_code?: string;
  search?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { page_size?: number } | undefined)?.page_size;
  return ps ? ps.toString() : undefined;
};

export const openingBalanceApi = {
  async list(params?: OpeningBalanceQueryParams): Promise<ApiResponse<OpeningBalanceListResponse>> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) sp.set('page_size', ps);
    if (params?.company_id) sp.set('company_id', params.company_id);
    if (params?.period) sp.set('period', params.period);
    if (params?.subject_code) sp.set('subject_code', params.subject_code);
    const qs = sp.toString();
    return apiClient.finance.get<OpeningBalanceListResponse>(
      `/accounts/opening-balances${qs ? `?${qs}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.finance.get<OpeningBalance>(`/accounts/opening-balances/${id}`);
  },

  async create(data: CreateOpeningBalanceRequest): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.finance.post<OpeningBalance>('/accounts/opening-balances', data);
  },

  async update(
    id: string,
    data: UpdateOpeningBalanceRequest
  ): Promise<ApiResponse<OpeningBalance>> {
    return apiClient.finance.put<OpeningBalance>(`/accounts/opening-balances/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.finance.delete<string>(`/accounts/opening-balances/${id}`);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async import(
    data: CreateOpeningBalanceRequest[]
  ): Promise<ApiResponse<{ success_count: number; failed_count: number; errors: string[] }>> {
    return apiClient.finance.post<{ success_count: number; failed_count: number; errors: string[] }>(
      '/accounts/opening-balances/batch',
      data
    );
  },

  async carryForward(data: CarryForwardRequest): Promise<ApiResponse<{ rows_affected: number }>> {
    return apiClient.finance.post<{ rows_affected: number }>(
      '/accounts/opening-balances/carry-forward',
      data
    );
  },
};
