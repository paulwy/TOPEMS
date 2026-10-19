import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  SupplyChainOverview,
  SupplyChainFullLinkStat,
  SupplierPerformance,
  SupplierPerformanceQueryParams,
  SupplyChainRealTimeStatus,
} from './types';

export const supplyChainDashboardApi = {
  overview: async (): Promise<ApiResponse<SupplyChainOverview>> => {
    return apiClient.scm.get('/dashboard/overview');
  },

  fullLinkStats: async (): Promise<ApiResponse<SupplyChainFullLinkStat>> => {
    return apiClient.scm.get('/dashboard/purchase-inbound-outbound');
  },

  supplierPerformance: async (
    params?: SupplierPerformanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SupplierPerformance>>> => {
    return apiClient.scm.get('/dashboard/supplier-performance', { params });
  },

  realTimeStatus: async (): Promise<ApiResponse<SupplyChainRealTimeStatus>> => {
    return apiClient.scm.get('/dashboard/real-time-status');
  },
};
