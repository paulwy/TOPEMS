import apiClient from '../client';
import type { ApiResponse, PaginationParams as BasePaginationParams } from '../client';
import i18n from '@/i18n';

import type { PaginatedResult } from '@/api/client';

export interface Email {
  id: string;
  subject: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  body: string;
  body_html?: string;
  status: string;
  priority: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailRequest {
  subject: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  body: string;
  body_html?: string;
  priority?: string;
}

export interface PaginationParams extends BasePaginationParams {
  status?: string;
  priority?: string;
}
export type { PaginatedResult };

export interface EmailStats {
  total: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  today_count: number;
  last_sent_at?: string;
}

interface ResendResult {
  total: number;
  success: number;
  failed: number;
  failed_ids: string[];
}

export const emailApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Email>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);

    const queryString = searchParams.toString();
    return apiClient.mail.get(`/emails${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Email>> {
    return apiClient.mail.get(`/emails/${id}`);
  },

  async send(data: SendEmailRequest): Promise<ApiResponse<Email>> {
    return apiClient.mail.post('/emails', data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mail.delete(`/emails/${id}`);
  },

  async resend(emailIds: string[]): Promise<ApiResponse<ResendResult>> {
    return apiClient.mail.post('/emails/resend', {
      email_ids: emailIds,
    });
  },

  async getStats(): Promise<ApiResponse<EmailStats>> {
    return apiClient.mail.get('/emails/stats');
  },
};

export const mailApi = {
  async health(): Promise<ApiResponse<string>> {
    return apiClient.mail.get<string>('/health');
  },
};

export const PRIORITY_OPTIONS = [
  { value: 'low', label: i18n.t('shared.index.k5') },
  { value: 'normal', label: i18n.t('shared.index.k6') },
  { value: 'high', label: i18n.t('shared.index.k7') },
  { value: 'urgent', label: i18n.t('shared.index.k8') },
];

export const STATUS_OPTIONS = [
  { value: 'pending', label: i18n.t('shared.index.k9') },
  { value: 'sent', label: i18n.t('shared.index.k10') },
  { value: 'failed', label: i18n.t('shared.index.k11') },
];

export default mailApi;
