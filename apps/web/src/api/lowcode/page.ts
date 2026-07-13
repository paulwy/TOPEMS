import type { PageSchema, AppVersion } from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const pageApi = {
  listPages: async (params?: {
    page?: number;
    pageSize?: number;
    appId?: string;
    search?: string;
    status?: string;
  }): Promise<
    ApiResponse<{ items: PageSchema[]; total: number; page: number; pageSize: number }>
  > => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.appId) query.set('app_id', params.appId);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiClient.core.get(`/lowcode/pages${qs ? `?${qs}` : ''}`);
  },

  getPage: async (pageId: string): Promise<ApiResponse<PageSchema>> => {
    return apiClient.core.get(`/lowcode/pages/${pageId}`);
  },

  createPage: async (data: Partial<PageSchema>): Promise<ApiResponse<PageSchema>> => {
    return apiClient.core.post('/lowcode/pages', data);
  },

  updatePage: async (
    pageId: string,
    data: Partial<PageSchema>
  ): Promise<ApiResponse<PageSchema>> => {
    return apiClient.core.put(`/lowcode/pages/${pageId}`, data);
  },

  deletePage: async (pageId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/lowcode/pages/${pageId}`);
  },

  publishPage: async (pageId: string): Promise<ApiResponse<AppVersion>> => {
    return apiClient.core.post(`/lowcode/pages/${pageId}/publish`);
  },

  getPageVersions: async (pageId: string): Promise<ApiResponse<AppVersion[]>> => {
    return apiClient.core.get(`/lowcode/pages/${pageId}/versions`);
  },

  previewPage: async (pageId: string): Promise<ApiResponse<any>> => {
    return apiClient.core.get(`/lowcode/pages/${pageId}/preview`);
  },
};
