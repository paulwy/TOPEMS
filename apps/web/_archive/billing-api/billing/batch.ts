/**
 * Billing · 批量操作 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   POST   /billing/batch/invoices
 *   POST   /billing/batch/send-reminders
 *   POST   /billing/batch/generate-invoices
 *   GET    /billing/batch/{task_id}/status
 *   POST   /billing/batch/void-invoices
 *   POST   /billing/batch/export
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

type BatchTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

interface BatchTask {
  id: string;
  task_type: string;
  status: BatchTaskStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  success_items: number;
  started_at?: string;
  completed_at?: string;
  errors: Array<{
    item_id: string;
    error: string;
  }>;
  result?: Array<Record<string, unknown>>;
}

export const batchApi = {
  batchUpdateInvoices: async (data: {
    invoice_ids: string[];
    action: 'mark_paid' | 'void' | 'send';
    params?: Record<string, unknown>;
  }): Promise<ApiResponse<BatchTask>> => {
    return apiClient.billing.post('/billing/batch/invoices', data);
  },

  batchSendReminders: async (data: {
    invoice_ids: string[];
    reminder_type: 'payment_reminder' | 'overdue_notice';
    days_overdue?: number;
  }): Promise<ApiResponse<BatchTask>> => {
    return apiClient.billing.post('/billing/batch/send-reminders', data);
  },

  batchGenerateInvoices: async (data: {
    tenant_ids: string[];
    period_start: string;
    period_end: string;
  }): Promise<ApiResponse<BatchTask>> => {
    return apiClient.billing.post('/billing/batch/generate-invoices', data);
  },

  getTaskStatus: async (taskId: string): Promise<ApiResponse<BatchTask>> => {
    return apiClient.billing.get(`/billing/batch/${taskId}/status`);
  },

  batchVoidInvoices: async (data: {
    invoice_ids: string[];
    reason: string;
  }): Promise<ApiResponse<BatchTask>> => {
    return apiClient.billing.post('/billing/batch/void-invoices', data);
  },

  batchExport: async (data: {
    type: 'invoices' | 'payments' | 'refunds' | 'statements';
    filters?: Record<string, unknown>;
    format?: 'csv' | 'xlsx' | 'pdf';
  }): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.billing.post('/billing/batch/export', data);
  },
};

export default batchApi;
