import apiClient from '../client';
import type { ApiResponse } from '../client';

interface AlertTemplate {
  id: string;
  name: string;
  description?: string;
  channel: 'email' | 'sms' | 'webhook' | 'in_app';
  subject_template?: string;
  body_template: string;
  variables?: string[];
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export const templateApi = {
  list: (params?: {
    channel?: string;
    keyword?: string;
  }): Promise<ApiResponse<AlertTemplate[]>> => {
    return apiClient.monitor.get('/templates', { params });
  },

  get: (id: string): Promise<ApiResponse<AlertTemplate>> => {
    return apiClient.monitor.get(`/templates/${id}`);
  },

  create: (data: Partial<AlertTemplate>): Promise<ApiResponse<AlertTemplate>> => {
    return apiClient.monitor.post('/templates', data);
  },

  update: (id: string, data: Partial<AlertTemplate>): Promise<ApiResponse<AlertTemplate>> => {
    return apiClient.monitor.put(`/templates/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.monitor.delete(`/templates/${id}`);
  },
};

export default templateApi;
