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

export const getEmailLogs = async (): Promise<ApiResponse<EmailLogListResponse>> => {
  return apiClient.notification.get<EmailLogListResponse>(
    '/api/v1/email-logs'
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