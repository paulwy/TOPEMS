import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  FinancialVoucher,
  VoucherItem,
  CreateFinancialVoucherRequest,
  VoucherImportResult,
  PaginationParams,
  PaginatedResult,
} from '../types';

export const voucherApi = {
  async list(
    params?: PaginationParams & { period?: string }
  ): Promise<ApiResponse<PaginatedResult<FinancialVoucher>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.period) searchParams.set('period', params.period);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/vouchers${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.get(`/vouchers/${id}`);
  },

  async getItems(id: string): Promise<ApiResponse<VoucherItem[]>> {
    return apiClient.erp.get(`/vouchers/${id}/items`);
  },

  async create(data: CreateFinancialVoucherRequest): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.post('/vouchers', data);
  },

  async update(
    id: string,
    data: Partial<FinancialVoucher>
  ): Promise<ApiResponse<FinancialVoucher>> {
    return apiClient.erp.put(`/vouchers/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/vouchers/${id}`);
  },

  async importU8(data: {
    file_name: string;
    file_content: string;
    import_mode: string;
  }): Promise<ApiResponse<VoucherImportResult>> {
    return apiClient.erp.post('/vouchers/import/u8', data);
  },
};
