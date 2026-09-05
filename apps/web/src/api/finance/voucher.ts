import { apiClient, downloadBlob } from '../client';
import type {
  Voucher,
  VoucherEntry,
  CreateVoucherRequest,
  VoucherQueryParams,
  VoucherOperationResult,
  ApiResponse,
  BatchOperationResult,
} from '../../types/finance';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const voucherApi = {
  /**
   * V72.5 第二批 绑定样板：list_vouchers operation（openapi: GET /finance/vouchers）
   */
  list: async (
    params?: Record<string, unknown> | VoucherQueryParams
  ): Promise<TypedPaginatedResponse<Voucher>> => {
    return apiClient.finance.get('/vouchers', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * V72.5 第二批 绑定样板：get_voucher operation（openapi: GET /finance/vouchers/{voucher_id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Voucher>> => {
    return apiClient.finance.get(`/vouchers/${id}`);
  },

  getWithEntries: (id: string): Promise<ApiResponse<Voucher>> => {
    return apiClient.finance.get(`/vouchers/${id}/entries`);
  },

  getItems: (id: string): Promise<ApiResponse<VoucherEntry[]>> => {
    return apiClient.finance.get(`/vouchers/${id}/items`);
  },

  /**
   * V72.5 第二批 绑定样板：create_voucher operation（openapi: POST /finance/vouchers）
   */
  create: async (
    data: Record<string, unknown>
  ): Promise<TypedApiResponse<VoucherOperationResult>> => {
    return apiClient.finance.post('/vouchers', toOpenApiRequestBody(data));
  },

  batchCreate: (
    vouchers: CreateVoucherRequest[]
  ): Promise<ApiResponse<{ results: VoucherOperationResult[] }>> => {
    return apiClient.finance.post('/vouchers/batch', {
      vouchers,
    });
  },

  update: (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<VoucherOperationResult>> => {
    return apiClient.finance.put(`/vouchers/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/vouchers/${id}`);
  },

  batchDelete: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.finance.post('/vouchers/batch-delete', {
      ids,
    });
  },

  submit: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/vouchers/${id}/submit`, {});
  },

  approve: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/vouchers/${id}/approve`, {});
  },

  batchSubmit: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.finance.post('/vouchers/batch/submit', {
      voucher_ids: ids,
    });
  },

  batchApprove: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.finance.post('/vouchers/batch/approve', {
      voucher_ids: ids,
    });
  },

  unapprove: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/vouchers/${id}/unapprove`, {});
  },

  post: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/vouchers/${id}/post`, {});
  },

  batchPost: (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.finance.post('/vouchers/batch/post', {
      voucher_ids: ids,
    });
  },

  reverse: (id: string, reason?: string): Promise<ApiResponse<VoucherOperationResult>> => {
    return apiClient.finance.post(`/vouchers/${id}/reverse`, {
      reason,
    });
  },

  getNextVoucherNo: (params?: {
    period?: string;
    voucher_type?: string;
  }): Promise<ApiResponse<{ voucher_no: string }>> => {
    return apiClient.finance.get('/vouchers/next-no', {
      params,
    });
  },

  generateByTemplate: (params: {
    template_id: string;
    source_data: Record<string, unknown>;
  }): Promise<ApiResponse<Voucher>> => {
    return apiClient.finance.post('/vouchers/generate', params);
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
    return apiClient.finance.post('/vouchers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importU8: (data: {
    file_name: string;
    file_content: string;
    import_mode: string;
  }): Promise<
    ApiResponse<{
      success_count: number;
      failed_count: number;
      errors: string[];
    }>
  > => {
    return apiClient.finance.post('/vouchers/import/u8', data);
  },

  export: async (params: VoucherQueryParams): Promise<Blob> => {
    return downloadBlob('finance', '/vouchers/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default voucherApi;
