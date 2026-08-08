import apiClient from '../client';
import type { ApiResponse } from '../client';

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
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  subject_template: string;
  body_template: string;
  body_html_template?: string;
  category: string;
  tags?: string[];
  status: string;
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
  template_id?: string;
  template_data?: Record<string, unknown>;
}

export interface SendEmailWithTemplateRequest {
  template_code: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  template_data: Record<string, unknown>;
  priority?: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export interface EmailStats {
  total: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  today_count: number;
  last_sent_at?: string;
}

export interface ResendResult {
  total: number;
  success: number;
  failed: number;
  failed_ids: string[];
}

export const emailApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Email>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
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

  async sendWithTemplate(data: SendEmailWithTemplateRequest): Promise<ApiResponse<Email>> {
    return apiClient.mail.post('/emails/send-with-template', data);
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

export const templateApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<EmailTemplate>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mail.get(`/templates${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.get(`/templates/${id}`);
  },

  async create(data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.post('/templates', data);
  },

  async update(id: string, data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.put(`/templates/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mail.delete(`/templates/${id}`);
  },

  async updateStatus(id: string, status: string): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.put(`/templates/${id}/status`, {
      status,
    });
  },

  async render(
    templateCode: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<{ subject: string; body: string; body_html?: string }>> {
    return apiClient.mail.post('/templates/render', {
      template_code: templateCode,
      data,
    });
  },
};

export const mailApi = {
  async health(): Promise<ApiResponse<string>> {
    return apiClient.mail.get<string>('/health');
  },
};

export const TEMPLATE_CATEGORIES = [
  { value: 'general', label: '通用' },
  { value: 'workflow', label: '流程审批' },
  { value: 'system', label: '系统通知' },
  { value: 'contract', label: '合同管理' },
  { value: 'user', label: '用户管理' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export const STATUS_OPTIONS = [
  { value: 'pending', label: '待发送' },
  { value: 'sent', label: '已发送' },
  { value: 'failed', label: '发送失败' },
];

export default mailApi;
