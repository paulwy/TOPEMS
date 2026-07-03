import axios from 'axios';
import type { VoucherTemplate, Voucher, PaginatedResult, ApiResponse } from '../../types/finance';

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

export const voucherTemplateApi = {
  list: (params?: {
    type?: string;
    applicable_module?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<VoucherTemplate>>> => {
    return createApiClient().get('/finance/voucher-templates', {
      params,
    });
  },

  get: (id: string): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().get(`/finance/voucher-templates/${id}`);
  },

  create: (data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post('/finance/voucher-templates', data);
  },

  update: (id: string, data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().put(`/finance/voucher-templates/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/finance/voucher-templates/${id}`);
  },

  copy: (id: string, newName: string): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post(`/finance/voucher-templates/${id}/copy`, {
      name: newName,
    });
  },

  preview: (id: string, sourceData: Record<string, any>): Promise<ApiResponse<Voucher>> => {
    return createApiClient().post(`/finance/voucher-templates/${id}/preview`, {
      source_data: sourceData,
    });
  },

  setDefault: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/finance/voucher-templates/${id}/set-default`, {});
  },
};

export default voucherTemplateApi;
