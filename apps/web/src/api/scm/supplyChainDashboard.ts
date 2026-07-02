import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SupplyChainOverview,
  SupplyChainFullLinkStat,
  SupplierPerformance,
  SupplierPerformanceQueryParams,
} from './types';

export const supplyChainDashboardApi = {
  overview: async (): Promise<ApiResponse<SupplyChainOverview>> => {
    return apiClient.scm.get('/supply-chain-dashboard/overview');
  },

  fullLinkStats: async (): Promise<ApiResponse<SupplyChainFullLinkStat>> => {
    return apiClient.scm.get('/supply-chain-dashboard/full-link-stats');
  },

  supplierPerformance: async (
    params?: SupplierPerformanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierPerformance>>> => {
    return apiClient.scm.get('/supply-chain-dashboard/supplier-performance', { params });
  },
};
