import { apiClient } from '../client';
import type { ApiResponse } from '../../types/finance';

export const periodApi = {
  getCurrent: (): Promise<ApiResponse<{ period: string; year: number; month: number }>> => {
    return apiClient.erp.get('/finance/period/current');
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
    return apiClient.erp.get('/finance/periods', { params });
  },

  open: (period: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post('/finance/periods/open', { period });
  },

  close: (period: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post('/finance/periods/close', { period });
  },

  closePeriodIncome: (period: string): Promise<ApiResponse<{ voucher_id: string }>> => {
    return apiClient.erp.post('/finance/periods/close-income', {
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
    return apiClient.erp.post('/finance/periods/year-end-close', {
      year,
    });
  },
};

export default periodApi;
