import { apiClient } from '../client';
import type { VoucherTemplate, Voucher, PaginatedResult, ApiResponse } from '../../types/finance';

export const voucherTemplateApi = {
  list: (params?: {
    type?: string;
    applicable_module?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<VoucherTemplate>>> => {
    return apiClient.finance.get('/voucher-templates', {
      params,
    });
  },

  get: (id: string): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.get(`/voucher-templates/${id}`);
  },

  create: (data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.post('/voucher-templates', data);
  },

  update: (id: string, data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.put(`/voucher-templates/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/voucher-templates/${id}`);
  },

  copy: (id: string, newName: string): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.post(`/voucher-templates/${id}/copy`, {
      name: newName,
    });
  },

  preview: (id: string, sourceData: Record<string, any>): Promise<ApiResponse<Voucher>> => {
    return apiClient.finance.post(`/voucher-templates/${id}/preview`, {
      source_data: sourceData,
    });
  },

  setDefault: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/voucher-templates/${id}/set-default`, {});
  },
};

export default voucherTemplateApi;
