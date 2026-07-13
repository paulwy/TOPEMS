import type { LowCodeApp, AppVersion, AppPublishParams } from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const listApps = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
}): Promise<ApiResponse<{ items: LowCodeApp[]; total: number; page: number; pageSize: number }>> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/apps${qs ? `?${qs}` : ''}`);
};

export const getApp = async (appId: string): Promise<ApiResponse<LowCodeApp>> => {
  return apiClient.core.get(`/lowcode/apps/${appId}`);
};

export const createApp = async (data: Partial<LowCodeApp>): Promise<ApiResponse<LowCodeApp>> => {
  return apiClient.core.post('/lowcode/apps', data);
};

export const updateApp = async (
  appId: string,
  data: Partial<LowCodeApp>
): Promise<ApiResponse<LowCodeApp>> => {
  return apiClient.core.put(`/lowcode/apps/${appId}`, data);
};

export const deleteApp = async (appId: string): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/apps/${appId}`);
};

export const getAppVersions = async (appId: string): Promise<ApiResponse<AppVersion[]>> => {
  return apiClient.core.get(`/lowcode/apps/${appId}/versions`);
};

export const publishApp = async (
  appId: string,
  params: AppPublishParams
): Promise<ApiResponse<AppVersion>> => {
  return apiClient.core.post(`/lowcode/apps/${appId}/publish`, params);
};

export const getAppOverview = async (appId?: string): Promise<ApiResponse<any>> => {
  if (appId) {
    return apiClient.core.get(`/lowcode/apps/${appId}/overview`);
  }
  return apiClient.core.get('/lowcode/apps/overview');
};

export const appApi = {
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  getAppVersions,
  publishApp,
  getAppOverview,
};
