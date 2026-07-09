import axios from 'axios';
import { downloadBlob } from '../client';
import type {
  Voucher,
  CreateVoucherRequest,
  VoucherQueryParams,
  VoucherTemplate,
  VoucherOperationResult,
  PaginatedResult,
  ApiResponse,
  BatchOperationResult,
} from '../../types/finance';

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

export const voucherApi = {
  list: (params?: VoucherQueryParams): Promise<ApiResponse<PaginatedResult<Voucher>>> => {
    return createApiClient().get('/erp/finance/vouchers', { params });
  },

  get: (id: string): Promise<ApiResponse<Voucher>> => {
    return createApiClient().get(`/erp/finance/vouchers/${id}`);
  },

  getWithEntries: (id: string): Promise<ApiResponse<Voucher>> => {
    return createApiClient().get(`/erp/finance/vouchers/${id}/entries`);
  },

  create: (data: CreateVoucherRequest): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().post('/erp/finance/vouchers', data);
  },

  batchCreate: (
    vouchers: CreateVoucherRequest[]
  ): Promise<ApiResponse<{ results: VoucherOperationResult[] }>> => {
    return createApiClient().post('/erp/finance/vouchers/batch', {
      vouchers,
    });
  },

  update: (
    id: string,
    data: Partial<CreateVoucherRequest>
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().put(`/erp/finance/vouchers/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/erp/finance/vouchers/${id}`);
  },

  batchDelete: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post('/erp/finance/vouchers/batch-delete', {
      ids,
    });
  },

  submit: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/erp/finance/vouchers/${id}/submit`, {});
  },

  approve: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/erp/finance/vouchers/${id}/approve`, {});
  },

  batchApprove: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post('/erp/finance/vouchers/batch-approve', {
      ids,
    });
  },

  unapprove: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/erp/finance/vouchers/${id}/unapprove`, {});
  },

  post: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().post(`/erp/finance/vouchers/${id}/post`, {});
  },

  batchPost: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return createApiClient().post('/erp/finance/vouchers/batch-post', {
      ids,
    });
  },

  reverse: (id: string, reason?: string): Promise<ApiResponse<VoucherOperationResult>> => {
    return createApiClient().post(`/erp/finance/vouchers/${id}/reverse`, {
      reason,
    });
  },

  getNextVoucherNo: (params?: {
    period?: string;
    voucher_type?: string;
  }): Promise<ApiResponse<{ voucher_no: string }>> => {
    return createApiClient().get('/erp/finance/vouchers/next-no', {
      params,
    });
  },

  generateByTemplate: (params: {
    template_id: string;
    source_data: Record<string, any>;
  }): Promise<ApiResponse<Voucher>> => {
    return createApiClient().post('/erp/finance/vouchers/generate', params);
  },

  import: (
    file: File
  ): Promise<
    ApiResponse<{
      total: number;
      success: number;
      failed: number;
      errors: string[];
    }>
  > => {
    const formData = new FormData();
    formData.append('file', file);
    return createApiClient().post('/erp/finance/vouchers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  export: async (params: VoucherQueryParams): Promise<Blob> => {
    return downloadBlob('/api', '/erp/finance/vouchers/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default voucherApi;
