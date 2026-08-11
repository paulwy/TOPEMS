/**
 * Billing · 账单提醒 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /billing/reminders
 *   POST   /billing/reminders
 *   GET    /billing/reminders/{id}
 *   PUT    /billing/reminders/{id}
 *   DELETE /billing/reminders/{id}
 *   POST   /billing/reminders/{id}/send
 *   GET    /billing/reminders/overdue
 *   GET    /billing/reminders/upcoming
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ReminderType = 'payment_reminder' | 'overdue_notice' | 'subscription_renewal';

export interface BillReminder {
  id: string;
  tenant_id: string;
  invoice_id?: string;
  reminder_type: ReminderType;
  recipient: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string;
  sent_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface CreateReminderRequest {
  tenant_id: string;
  invoice_id?: string;
  reminder_type: ReminderType;
  recipient?: string;
  scheduled_at: string;
  days_before?: number;
  message_template?: string;
}

export const reminderApi = {
  listReminders: async (params?: {
    status?: string;
    reminder_type?: ReminderType;
    tenant_id?: string;
  }): Promise<ApiResponse<BillReminder[]>> => {
    return apiClient.billing.get('/billing/reminders', { params });
  },

  getReminder: async (id: string): Promise<ApiResponse<BillReminder>> => {
    return apiClient.billing.get(`/billing/reminders/${id}`);
  },

  createReminder: async (data: CreateReminderRequest): Promise<ApiResponse<BillReminder>> => {
    return apiClient.billing.post('/billing/reminders', data);
  },

  updateReminder: async (
    id: string,
    data: Partial<CreateReminderRequest>
  ): Promise<ApiResponse<BillReminder>> => {
    return apiClient.billing.put(`/billing/reminders/${id}`, data);
  },

  deleteReminder: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.billing.delete(`/billing/reminders/${id}`);
  },

  sendReminder: async (id: string): Promise<ApiResponse<BillReminder>> => {
    return apiClient.billing.post(`/billing/reminders/${id}/send`);
  },

  listOverdue: async (): Promise<ApiResponse<BillReminder[]>> => {
    return apiClient.billing.get('/billing/reminders/overdue');
  },

  listUpcoming: async (params?: { days?: number }): Promise<ApiResponse<BillReminder[]>> => {
    return apiClient.billing.get('/billing/reminders/upcoming', { params });
  },
};

export default reminderApi;
