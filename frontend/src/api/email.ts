import apiClient from './client';
import type { ApiResponse } from './client';

export interface EmailLog {
  id: string;
  fromEmail: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  templateId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  templateName: string;
  subject: string;
  body: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface EmailLogListResponse {
  items: EmailLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmailStatsResponse {
  total: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  todayCount: number;
}

export interface BatchSendEmailRequest {
  toEmails: string[];
  ccEmail?: string;
  bccEmail?: string;
  subject: string;
  body: string;
  templateId?: string;
  metadata?: any;
}

export interface BatchSendEmailResponse {
  total: number;
  successCount: number;
  failCount: number;
  results: {
    email: string;
    status: 'sent' | 'failed';
    message: string;
  }[];
}

export interface SendEmailRequest {
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  subject: string;
  body: string;
  templateId?: string;
  metadata?: any;
}

export interface SendEmailWithTemplateRequest {
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  templateId: string;
  variables?: Record<string, string>;
  metadata?: any;
}

export const getEmailLogs = async (page = 1, pageSize = 20, status?: string, toEmail?: string): Promise<ApiResponse<EmailLogListResponse>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (status) {
    params.append('status', status);
  }
  if (toEmail) {
    params.append('to_email', toEmail);
  }
  return apiClient.notification.get<EmailLogListResponse>(
    `/api/v1/email-logs?${params.toString()}`
  );
};

export const resendEmail = async (id: string): Promise<ApiResponse<{ id: string; status: string }>> => {
  return apiClient.notification.post<{ id: string; status: string }>(
    `/api/v1/email-logs/${id}/resend`
  );
};

export const batchSendEmail = async (request: BatchSendEmailRequest): Promise<ApiResponse<BatchSendEmailResponse>> => {
  return apiClient.notification.post<BatchSendEmailResponse>(
    '/api/v1/email/batch-send',
    {
      to_emails: request.toEmails,
      cc_email: request.ccEmail,
      bcc_email: request.bccEmail,
      subject: request.subject,
      body: request.body,
      template_id: request.templateId,
      metadata: request.metadata,
    }
  );
};

export const getEmailStats = async (): Promise<ApiResponse<EmailStatsResponse>> => {
  return apiClient.notification.get<EmailStatsResponse>(
    '/api/v1/email/stats'
  );
};

export const getEmailLog = async (id: string): Promise<ApiResponse<EmailLog>> => {
  return apiClient.notification.get<EmailLog>(
    `/api/v1/email-logs/${id}`
  );
};

export const deleteEmailLog = async (id: string): Promise<ApiResponse<string>> => {
  return apiClient.notification.delete<string>(
    `/api/v1/email-logs/${id}`
  );
};

export const sendEmail = async (request: SendEmailRequest): Promise<ApiResponse<EmailLog>> => {
  return apiClient.notification.post<EmailLog>(
    '/api/v1/email/send',
    {
      to_email: request.toEmail,
      cc_email: request.ccEmail,
      bcc_email: request.bccEmail,
      subject: request.subject,
      body: request.body,
      template_id: request.templateId,
      metadata: request.metadata,
    }
  );
};

export const sendEmailWithTemplate = async (request: SendEmailWithTemplateRequest): Promise<ApiResponse<EmailLog>> => {
  return apiClient.notification.post<EmailLog>(
    '/api/v1/email/send-with-template',
    {
      to_email: request.toEmail,
      cc_email: request.ccEmail,
      bcc_email: request.bccEmail,
      template_id: request.templateId,
      variables: request.variables,
      metadata: request.metadata,
    }
  );
};

export const getEmailTemplates = async (): Promise<ApiResponse<{ items: EmailTemplate[]; total: number }>> => {
  return apiClient.notification.get<{ items: EmailTemplate[]; total: number }>(
    '/api/v1/email-templates'
  );
};

export const getEmailTemplate = async (id: string): Promise<ApiResponse<EmailTemplate>> => {
  return apiClient.notification.get<EmailTemplate>(
    `/api/v1/email-templates/${id}`
  );
};

export const createEmailTemplate = async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<EmailTemplate>> => {
  return apiClient.notification.post<EmailTemplate>(
    '/api/v1/email-templates',
    {
      template_name: template.templateName,
      subject: template.subject,
      body: template.body,
      status: template.status,
    }
  );
};

export const updateEmailTemplate = async (id: string, template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<EmailTemplate>> => {
  return apiClient.notification.put<EmailTemplate>(
    `/api/v1/email-templates/${id}`,
    {
      template_name: template.templateName,
      subject: template.subject,
      body: template.body,
      status: template.status,
    }
  );
};

export const deleteEmailTemplate = async (id: string): Promise<ApiResponse<string>> => {
  return apiClient.notification.delete<string>(
    `/api/v1/email-templates/${id}`
  );
};