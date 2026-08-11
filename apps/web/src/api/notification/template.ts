/**
 * Notification · 通知模板 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/notification-templates
 *   GET    /notification/notification-templates/{id}
 *   POST   /notification/notification-templates
 *   PUT    /notification/notification-templates/{id}
 *   DELETE /notification/notification-templates/{id}
 *   POST   /notification/notification-templates/{id}/render
 *   POST   /notification/notification-templates/{id}/test
 *   GET    /notification/notification-templates/{id}/versions
 *   POST   /notification/notification-templates/{id}/clone
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type TemplateStatusEnum = 'active' | 'inactive' | 'draft' | 'deprecated';
export type NotificationTypeEnum =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'workflow'
  | 'reminder'
  | 'alert'
  | 'message';

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status: TemplateStatusEnum;
  variables?: string[];
  data_schema?: Record<string, unknown>;
  default_priority?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status?: TemplateStatusEnum;
  variables?: string[];
  data_schema?: Record<string, unknown>;
  default_priority?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface NotificationTemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  pagesize: number;
}

export interface TestTemplateRequest {
  recipient_user_id?: string;
  test_data: Record<string, unknown>;
  send_email?: boolean;
}

export interface TestTemplateResponse {
  success: boolean;
  rendered_title: string;
  rendered_content: string;
  sent?: boolean;
  message?: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  title_template: string;
  content_template: string;
  status: TemplateStatusEnum;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

export interface TemplateCloneRequest {
  new_name: string;
  new_description?: string;
}

export const templateApi = {
  listTemplates: async (
    page = 1,
    pageSize = 20,
    status?: TemplateStatusEnum,
    search?: string
  ): Promise<ApiResponse<NotificationTemplateListResponse>> => {
    const params: Record<string, unknown> = { page, pagesize: pageSize };
    if (status) params.status = status;
    if (search) params.search = search;
    return apiClient.notification.get('/notification-templates', { params });
  },

  getTemplate: async (id: string): Promise<ApiResponse<NotificationTemplate>> => {
    return apiClient.notification.get(`/notification-templates/${id}`);
  },

  createTemplate: async (
    data: CreateTemplateRequest
  ): Promise<ApiResponse<NotificationTemplate>> => {
    return apiClient.notification.post('/notification-templates', data);
  },

  updateTemplate: async (
    id: string,
    data: UpdateTemplateRequest
  ): Promise<ApiResponse<NotificationTemplate>> => {
    return apiClient.notification.put(`/notification-templates/${id}`, data);
  },

  deleteTemplate: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.delete(`/notification-templates/${id}`);
  },

  renderTemplate: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<{ title: string; content: string }>> => {
    return apiClient.notification.post(`/notification-templates/${id}/render`, data);
  },

  testTemplate: async (
    id: string,
    data: TestTemplateRequest
  ): Promise<ApiResponse<TestTemplateResponse>> => {
    return apiClient.notification.post(`/notification-templates/${id}/test`, data);
  },

  getTemplateVersions: async (
    id: string,
    page = 1,
    pageSize = 20
  ): Promise<
    ApiResponse<{
      versions: TemplateVersion[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    return apiClient.notification.get(`/notification-templates/${id}/versions`, {
      params: { page, pagesize: pageSize },
    });
  },

  cloneTemplate: async (
    id: string,
    data: TemplateCloneRequest
  ): Promise<ApiResponse<NotificationTemplate>> => {
    return apiClient.notification.post(`/notification-templates/${id}/clone`, data);
  },

  getTemplateVariables: async (
    id: string
  ): Promise<
    ApiResponse<{
      variables: Array<{ name: string; type: string; required: boolean; description?: string }>;
    }>
  > => {
    return apiClient.notification.get(`/notification-templates/${id}/variables`);
  },

  updateTemplateStatus: async (
    id: string,
    status: TemplateStatusEnum
  ): Promise<ApiResponse<NotificationTemplate>> => {
    return apiClient.notification.put(`/notification-templates/${id}/status`, { status });
  },

  batchUpdateTemplateStatus: async (
    ids: string[],
    status: TemplateStatusEnum
  ): Promise<ApiResponse<{ updated_count: number }>> => {
    return apiClient.notification.put('/notification-templates/batch-status', {
      ids,
      status,
    });
  },
};

export default templateApi;
