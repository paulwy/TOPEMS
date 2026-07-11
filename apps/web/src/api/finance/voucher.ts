import { apiClient, downloadBlob } from '../client';
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

export const voucherApi = {
  list: (params?: VoucherQueryParams): Promise<ApiResponse<PaginatedResult<Voucher>>> => {
    return apiClient.erp.get('/finance/vouchers', { params });
  },

  get: (id: string): Promise<ApiResponse<Voucher>> => {
    return apiClient.erp.get(`/finance/vouchers/${id}`);
  },

  getWithEntries: (id: string): Promise<ApiResponse<Voucher>> => {
    return apiClient.erp.get(`/finance/vouchers/${id}/entries`);
  },

  create: (data: CreateVoucherRequest): Promise<ApiResponse<VoucherOperationResult>> => {
    return apiClient.erp.post('/finance/vouchers', data);
  },

  batchCreate: (
    vouchers: CreateVoucherRequest[]
  ): Promise<ApiResponse<{ results: VoucherOperationResult[] }>> => {
    return apiClient.erp.post('/finance/vouchers/batch', {
      vouchers,
    });
  },

  update: (
    id: string,
    data: Partial<CreateVoucherRequest>
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return apiClient.erp.put(`/finance/vouchers/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/finance/vouchers/${id}`);
  },

  batchDelete: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.erp.post('/finance/vouchers/batch-delete', {
      ids,
    });
  },

  submit: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post(`/finance/vouchers/${id}/submit`, {});
  },

  approve: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post(`/finance/vouchers/${id}/approve`, {});
  },

  batchApprove: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.erp.post('/finance/vouchers/batch-approve', {
      ids,
    });
  },

  unapprove: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post(`/finance/vouchers/${id}/unapprove`, {});
  },

  post: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.post(`/finance/vouchers/${id}/post`, {});
  },

  batchPost: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.erp.post('/finance/vouchers/batch-post', {
      ids,
    });
  },

  reverse: (id: string, reason?: string): Promise<ApiResponse<VoucherOperationResult>> => {
    return apiClient.erp.post(`/finance/vouchers/${id}/reverse`, {
      reason,
    });
  },

  getNextVoucherNo: (params?: {
    period?: string;
    voucher_type?: string;
  }): Promise<ApiResponse<{ voucher_no: string }>> => {
    return apiClient.erp.get('/finance/vouchers/next-no', {
      params,
    });
  },

  generateByTemplate: (params: {
    template_id: string;
    source_data: Record<string, any>;
  }): Promise<ApiResponse<Voucher>> => {
    return apiClient.erp.post('/finance/vouchers/generate', params);
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
    return apiClient.erp.post('/finance/vouchers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  export: async (params: VoucherQueryParams): Promise<Blob> => {
    return downloadBlob('erp', '/finance/vouchers/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default voucherApi;
