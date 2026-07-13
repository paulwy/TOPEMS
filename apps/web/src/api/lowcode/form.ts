import type { FormSchema, AppVersion } from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const formApi = {
  listForms: async (params?: {
    page?: number;
    pageSize?: number;
    appId?: string;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{ items: FormSchema[]; total: number; page: number; pageSize: number }>
  > => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.appId) query.set('app_id', params.appId);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiClient.core.get(`/lowcode/forms${qs ? `?${qs}` : ''}`);
  },

  getForm: async (formId: string): Promise<ApiResponse<FormSchema>> => {
    return apiClient.core.get(`/lowcode/forms/${formId}`);
  },

  createForm: async (data: Partial<FormSchema>): Promise<ApiResponse<FormSchema>> => {
    return apiClient.core.post('/lowcode/forms', data);
  },

  updateForm: async (
    formId: string,
    data: Partial<FormSchema>
  ): Promise<ApiResponse<FormSchema>> => {
    return apiClient.core.put(`/lowcode/forms/${formId}`, data);
  },

  deleteForm: async (formId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/lowcode/forms/${formId}`);
  },

  publishForm: async (formId: string): Promise<ApiResponse<AppVersion>> => {
    return apiClient.core.post(`/lowcode/forms/${formId}/publish`);
  },

  getFormVersions: async (formId: string): Promise<ApiResponse<AppVersion[]>> => {
    return apiClient.core.get(`/lowcode/forms/${formId}/versions`);
  },

  submitFormData: async (formId: string, data: Record<string, any>): Promise<ApiResponse<any>> => {
    return apiClient.core.post(`/lowcode/forms/${formId}/submit`, data);
  },

  getFormData: async (
    formId: string,
    dataId: string
  ): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.core.get(`/lowcode/forms/${formId}/data/${dataId}`);
  },
};
