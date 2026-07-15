import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  PriceComparison,
  CreatePriceComparisonRequest,
  UpdatePriceComparisonRequest,
  PriceComparisonQueryParams,
  SupplierQuote,
  CreateSupplierQuoteRequest,
  PriceComparisonResult,
} from './types';

export const priceComparisonApi = {
  list: async (
    params?: PriceComparisonQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PriceComparison>>> => {
    return apiClient.scm.get('/comparisons', { params });
  },

  create: async (data: CreatePriceComparisonRequest): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.post('/comparisons', data);
  },

  get: async (id: string): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.get(`/comparisons/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePriceComparisonRequest
  ): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.put(`/comparisons/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/comparisons/${id}`);
  },

  result: async (id: string): Promise<ApiResponse<PriceComparisonResult>> => {
    return apiClient.scm.get(`/comparisons/${id}`);
  },

  quotes: async (comparisonId: string): Promise<ApiResponse<SupplierQuote[]>> => {
    return apiClient.scm.get('/quotes', { params: { comparison_id: comparisonId } });
  },

  createQuote: async (data: CreateSupplierQuoteRequest): Promise<ApiResponse<SupplierQuote>> => {
    return apiClient.scm.post('/quotes', data);
  },
};
