import { apiClient } from '../client';
import type { VoucherTemplate, Voucher, PaginatedResult, ApiResponse } from '../../types/finance';

const createApiClient = () => {
  return apiClient.erp;
};

export const voucherTemplateApi = {
  list: (params?: {
    type?: string;
    applicable_module?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<VoucherTemplate>>> => {
    return createApiClient().get('/api/finance/voucher-templates', {
      params,
    });
  },

  get: (id: string): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().get(`/api/finance/voucher-templates/${id}`);
  },

  create: (data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post('/api/finance/voucher-templates', data);
  },

  update: (id: string, data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().put(`/api/finance/voucher-templates/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/api/finance/voucher-templates/${id}`);
  },

  copy: (id: string, newName: string): Promise<ApiResponse<VoucherTemplate>> => {
    return createApiClient().post(`/api/finance/voucher-templates/${id}/copy`, {
      name: newName,
    });
  },

  preview: (id: string, sourceData: Record<string, any>): Promise<ApiResponse<Voucher>> => {
    return createApiClient().post(`/api/finance/voucher-templates/${id}/preview`, {
      source_data: sourceData,
    });
  },

  setDefault: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/api/finance/voucher-templates/${id}/set-default`, {});
  },
};

export default voucherTemplateApi;
