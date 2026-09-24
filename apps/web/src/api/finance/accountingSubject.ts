import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface AccountingSubject {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  category?: string | null;
  level: number;
  parent_code?: string | null;
  description?: string | null;
  is_cash_flow: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  tenant_id?: string | null;
}

export interface AccountingSubjectQuery {
  page?: number;
  page_size?: number;

  search?: string;
  category?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PaginatedAccountingSubjects {
  items: AccountingSubject[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateAccountingSubjectRequest {
  code: string;
  name: string;
  category?: string;
  level?: number;
  parent_code?: string;
  description?: string;
  is_cash_flow?: boolean;
  status?: string;
  tenant_id?: string;
}

export interface UpdateAccountingSubjectRequest {
  name?: string;
  category?: string;
  level?: number;
  parent_code?: string;
  description?: string;
  is_cash_flow?: boolean;
  status?: string;
}

export const accountingSubjectApi = {
  list: (params?: AccountingSubjectQuery): Promise<ApiResponse<PaginatedAccountingSubjects>> => {
    return apiClient.finance.get('/accounting-subjects', { params });
  },

  get: (id: string): Promise<ApiResponse<AccountingSubject>> => {
    return apiClient.finance.get(`/accounting-subjects/${id}`);
  },

  create: (
    data: Partial<AccountingSubject> | CreateAccountingSubjectRequest
  ): Promise<ApiResponse<AccountingSubject>> => {
    return apiClient.finance.post('/accounting-subjects', data);
  },

  update: (
    id: string,
    data: Partial<AccountingSubject> | UpdateAccountingSubjectRequest
  ): Promise<ApiResponse<AccountingSubject>> => {
    return apiClient.finance.put(`/accounting-subjects/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient.finance.delete(`/accounting-subjects/${id}`);
  },
};

export default accountingSubjectApi;
