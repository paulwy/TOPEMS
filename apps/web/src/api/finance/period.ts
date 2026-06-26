import { apiClient } from '../client';
import type { ApiResponse } from '../../types/finance';

const createApiClient = () => {
  return apiClient.erp;
};

export const periodApi = {
  getCurrent: (): Promise<ApiResponse<{ period: string; year: number; month: number }>> => {
    return createApiClient().get('/api/finance/period/current');
  },

  list: (params?: {
    year?: number;
    status?: string;
  }): Promise<
    ApiResponse<{
      items: {
        period: string;
        year: number;
        month: number;
        start_date: string;
        end_date: string;
        status: 'open' | 'closed' | 'locked';
      }[];
    }>
  > => {
    return createApiClient().get('/api/finance/periods', { params });
  },

  open: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post('/api/finance/periods/open', { period });
  },

  close: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post('/api/finance/periods/close', { period });
  },

  closePeriodIncome: (period: string): Promise<ApiResponse<{ voucher_id: string }>> => {
    return createApiClient().post('/api/finance/periods/close-income', {
      period,
    });
  },

  yearEndClose: (
    year: number
  ): Promise<
    ApiResponse<{
      vouchers: { voucher_id: string; description: string }[];
    }>
  > => {
    return createApiClient().post('/api/finance/periods/year-end-close', {
      year,
    });
  },
};

export default periodApi;
