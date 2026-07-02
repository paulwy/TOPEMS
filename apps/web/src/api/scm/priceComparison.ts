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
    return apiClient.scm.get('/price-comparisons', { params });
  },

  create: async (data: CreatePriceComparisonRequest): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.post('/price-comparisons', data);
  },

  get: async (id: string): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.get(`/price-comparisons/${id}`);
  },

  update: async (
    id: string,
    data: UpdatePriceComparisonRequest
  ): Promise<ApiResponse<PriceComparison>> => {
    return apiClient.scm.put(`/price-comparisons/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.scm.delete(`/price-comparisons/${id}`);
  },

  result: async (id: string): Promise<ApiResponse<PriceComparisonResult>> => {
    return apiClient.scm.get(`/price-comparisons/${id}/result`);
  },

  quotes: async (comparisonId: string): Promise<ApiResponse<SupplierQuote[]>> => {
    return apiClient.scm.get(`/price-comparisons/${comparisonId}/quotes`);
  },

  createQuote: async (data: CreateSupplierQuoteRequest): Promise<ApiResponse<SupplierQuote>> => {
    return apiClient.scm.post('/price-comparisons/quotes', data);
  },
};
