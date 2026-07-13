import { apiClient } from '../client';
import type { ApiResponse, PaginatedResult } from '../../types/finance';

export interface PaymentItem {
  id?: string;
  lineNo?: number;
  invoiceId?: string;
  invoiceNo?: string;
  payableId?: string;
  payableAmount: number;
  paymentAmount: number;
  writeOffAmount?: number;
  writeOffStatus?: string;
  writeOffDate?: string;
  writeOffBy?: string;
  remainingAmount?: number;
  remark?: string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  supplierId?: string;
  supplierName?: string;
  paymentMethod: string;
  bankAccountId?: string;
  bankName?: string;
  bankAccountNo?: string;
  totalAmount: number;
  currency: string;
  paymentDate?: string;
  actualPaymentDate?: string;
  bankTransactionNo?: string;
  executedBy?: string;
  executedAt?: string;
  status: string;
  remark?: string;
  items?: PaymentItem[];
  voucherId: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreatePaymentRequest {
  supplierId?: string;
  supplierName?: string;
  paymentMethod: string;
  bankAccountId?: string;
  bankName?: string;
  bankAccountNo?: string;
  totalAmount: number;
  currency?: string;
  paymentDate?: string;
  remark?: string;
  items: PaymentItem[];
}

export interface ExecutePaymentRequest {
  bankTransactionNo: string;
  actualPaymentDate: string;
}

export interface WriteOffRequest {
  itemId: string;
  writeOffAmount: number;
}

export interface PaymentQueryParams {
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ExportPaymentRequest {
  format: 'csv' | 'json';
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportPaymentResponse {
  fileName: string;
  format: string;
  totalCount: number;
  totalAmount: number;
  fileData: string;
  createdAt: string;
}

export const paymentApi = {
  list: (params?: PaymentQueryParams): Promise<ApiResponse<PaginatedResult<Payment>>> => {
    return apiClient.finance.get('/payments', { params });
  },

  get: (id: string): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.get(`/payments/${id}`);
  },

  create: (data: CreatePaymentRequest): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post('/payments', data);
  },

  update: (id: string, data: Partial<CreatePaymentRequest>): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.put(`/payments/${id}`, data);
  },

  remove: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/payments/${id}`);
  },

  submit: (id: string): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post(`/payments/${id}/submit`);
  },

  approve: (id: string): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post(`/payments/${id}/approve`);
  },

  reject: (id: string): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post(`/payments/${id}/reject`);
  },

  execute: (id: string, data: ExecutePaymentRequest): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post(`/payments/${id}/execute`, data);
  },

  writeOff: (data: WriteOffRequest): Promise<ApiResponse<Payment>> => {
    return apiClient.finance.post('/payments/write-off', data);
  },

  export: (data: ExportPaymentRequest): Promise<ApiResponse<ExportPaymentResponse>> => {
    return apiClient.finance.post('/payments/export', data);
  },
};
