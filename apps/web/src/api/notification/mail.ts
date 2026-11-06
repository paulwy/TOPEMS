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

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  cc?: string[];
  bcc?: string[];
}

const mailApi = {
  listEmails: async (): Promise<ApiResponse<Email[]>> => {
    return apiClient.mail.get('emails');
  },

  getEmail: async (id: string): Promise<ApiResponse<Email>> => {
    return apiClient.mail.get(`emails/${id}`);
  },

  sendEmail: async (data: SendEmailRequest): Promise<ApiResponse<Email>> => {
    return apiClient.mail.post('emails', data);
  },

  markEmailAsRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mail.post(`emails/${id}/read`);
  },

  deleteEmail: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mail.delete(`emails/${id}`);
  },
};

export default mailApi;
