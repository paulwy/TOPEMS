/**
 * Notification · 邮件 (Mail) API 绑定
 *
 * 后端: svc/communication/src/mail.rs
 * 路由前缀: /api/communication/mail/*
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject?: string;
  body?: string;
  html_body?: string;
  cc?: string[];
  bcc?: string[];
  is_read: boolean;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  cc?: string[];
  bcc?: string[];
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject_template: string;
  body_template: string;
  description?: string;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject_template?: string;
  body_template?: string;
  description?: string;
}

export interface SendWithTemplateRequest {
  to: string;
  variables: Record<string, unknown>;
  cc?: string[];
  bcc?: string[];
}

export const mailApi = {
  listEmails: async (): Promise<ApiResponse<Email[]>> => {
    return apiClient.notification.get('/mail/emails');
  },

  getEmail: async (id: string): Promise<ApiResponse<Email>> => {
    return apiClient.notification.get(`/mail/emails/${id}`);
  },

  sendEmail: async (data: SendEmailRequest): Promise<ApiResponse<Email>> => {
    return apiClient.notification.post('/mail/emails', data);
  },

  markEmailAsRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.post(`/mail/emails/${id}/read`);
  },

  deleteEmail: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.notification.delete(`/mail/emails/${id}`);
  },

  listTemplates: async (): Promise<ApiResponse<EmailTemplate[]>> => {
    return apiClient.notification.get('/mail/templates');
  },

  getTemplate: async (id: string): Promise<ApiResponse<EmailTemplate>> => {
    return apiClient.notification.get(`/mail/templates/${id}`);
  },

  createTemplate: async (data: CreateEmailTemplateRequest): Promise<ApiResponse<EmailTemplate>> => {
    return apiClient.notification.post('/mail/templates', data);
  },

  updateTemplate: async (
    id: string,
    data: UpdateEmailTemplateRequest
  ): Promise<ApiResponse<EmailTemplate>> => {
    return apiClient.notification.put(`/mail/templates/${id}`, data);
  },

  sendWithTemplate: async (
    id: string,
    data: SendWithTemplateRequest
  ): Promise<ApiResponse<Email>> => {
    return apiClient.notification.post(`/mail/templates/${id}/send`, data);
  },
};

export default mailApi;
