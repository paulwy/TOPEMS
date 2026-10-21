import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// P1-10 财务主数据：币种主表

interface Currency {
  id: string;
  tenant_id?: string | null;
  code: string;
  name: string;
  symbol?: string | null;
  exchange_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginatedCurrencies {
  items: Currency[];
  total: number;
  page: number;
  page_size: number;
}

interface CurrencyQuery {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

interface UpdateCurrencyPayload {
  name?: string;
  symbol?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

export const currencyApi = {
  list: (params?: CurrencyQuery): Promise<ApiResponse<PaginatedCurrencies>> => {
    return apiClient.finance.get('/currencies', { params });
  },
  create: (data: CreateCurrencyPayload): Promise<ApiResponse<Currency>> => {
    return apiClient.finance.post('/currencies', data);
  },
  update: (id: string, data: UpdateCurrencyPayload): Promise<ApiResponse<Currency>> => {
    return apiClient.finance.put(`/currencies/${id}`, data);
  },
  remove: (id: string): Promise<ApiResponse<{ id: string }>> => {
    return apiClient.finance.delete(`/currencies/${id}`);
  },
};

export type { Currency, PaginatedCurrencies, CurrencyQuery };
