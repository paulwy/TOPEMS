/**
 * 应收 / 应付 API（Receivable / Payable）
 */
import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Receivable, Payable } from './types';

interface Paginated<T> {
  items: T[];
  total: number;
  [key: string]: unknown;
}

interface QueryParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  [key: string]: unknown;
}

const buildParams = (params?: QueryParams): Record<string, unknown> | undefined => {
  if (!params) return undefined;
  const { page, pagesize, ...rest } = params;
  const out: Record<string, unknown> = { ...rest };
  if (page !== undefined) out.page = page;
  if (pagesize !== undefined) out.pagesize = pagesize;
  return out;
};

export const receivableApi = {
  list: (params?: QueryParams): Promise<ApiResponse<Paginated<Receivable>>> => {
    return apiClient.finance.get('/receivables', { params: buildParams(params) });
  },
  get: (id: string): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.get(`/receivables/${id}`);
  },
  create: (data: Partial<Receivable>): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.post('/receivables', data);
  },
  update: (id: string, data: Partial<Receivable>): Promise<ApiResponse<Receivable>> => {
    return apiClient.finance.put(`/receivables/${id}`, data);
  },
  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.finance.delete(`/receivables/${id}`);
  },
};

export const payableApi = {
  list: (params?: QueryParams): Promise<ApiResponse<Paginated<Payable>>> => {
    return apiClient.finance.get('/payables', { params: buildParams(params) });
  },
  get: (id: string): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.get(`/payables/${id}`);
  },
  create: (data: Partial<Payable>): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.post('/payables', data);
  },
  update: (id: string, data: Partial<Payable>): Promise<ApiResponse<Payable>> => {
    return apiClient.finance.put(`/payables/${id}`, data);
  },
  delete: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.finance.delete(`/payables/${id}`);
  },
};

export default { receivableApi, payableApi };
