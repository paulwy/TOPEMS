import apiClient from './client';
import type { ApiResponse } from './client';

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
  template_data?: Record<string, any>;
}

export interface SendEmailWithTemplateRequest {
  template_code: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  template_data: Record<string, any>;
  priority?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
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
    return apiClient.mail.get(`/api/v1/mail/emails${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Email>> {
    return apiClient.mail.get(`/api/v1/mail/emails/${id}`);
  },

  async send(data: SendEmailRequest): Promise<ApiResponse<Email>> {
    return apiClient.mail.post('/api/v1/mail/emails', data);
  },

  async sendWithTemplate(data: SendEmailWithTemplateRequest): Promise<ApiResponse<Email>> {
    return apiClient.mail.post('/api/v1/mail/emails/send-with-template', data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mail.delete(`/api/v1/mail/emails/${id}`);
  },
};

export const templateApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<EmailTemplate>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mail.get(`/api/v1/mail/templates${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.get(`/api/v1/mail/templates/${id}`);
  },

  async create(data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.post('/api/v1/mail/templates', data);
  },

  async update(id: string, data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.mail.put(`/api/v1/mail/templates/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mail.delete(`/api/v1/mail/templates/${id}`);
  },

  async render(
    templateCode: string,
    data: Record<string, any>
  ): Promise<ApiResponse<{ subject: string; body: string; body_html?: string }>> {
    return apiClient.mail.post('/api/v1/mail/templates/render', { template_code: templateCode, data });
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
