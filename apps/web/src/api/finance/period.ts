import axios from 'axios';
import type { ApiResponse } from '../../types/finance';

const createApiClient = () => {
  const client = axios.create({
    baseURL: '/api',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  return client;
};

export const periodApi = {
  getCurrent: (): Promise<ApiResponse<{ period: string; year: number; month: number }>> => {
    return createApiClient().get('/erp/finance/period/current');
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
    return createApiClient().get('/erp/finance/periods', { params });
  },

  open: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post('/erp/finance/periods/open', { period });
  },

  close: (period: string): Promise<ApiResponse<void>> => {
    return createApiClient().post('/erp/finance/periods/close', { period });
  },

  closePeriodIncome: (period: string): Promise<ApiResponse<{ voucher_id: string }>> => {
    return createApiClient().post('/erp/finance/periods/close-income', {
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
    return createApiClient().post('/erp/finance/periods/year-end-close', {
      year,
    });
  },
};

export default periodApi;
