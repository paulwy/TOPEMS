import apiClient from '../client';
import type { ListParams } from './types';

export const settingApi = {
  listSettings: (params?: ListParams) => {
    return apiClient.workflow.get(`/settings`, { params });
  },

  getSetting: (id: string) => {
    return apiClient.workflow.get(`/settings/${id}`);
  },

  updateSetting: (id: string, data: { value?: string }) => {
    return apiClient.workflow.put(`/settings/${id}`, data);
  },

  getSettingByKey: (key: string) => {
    return apiClient.workflow.get(`/settings/key/${key}`);
  },

  batchUpdateSettings: (data: { settings: { id: string; value: string }[] }) => {
    return apiClient.workflow.post('/settings/batch', data);
  },

  resetSetting: (id: string) => {
    return apiClient.workflow.post(`/settings/${id}/reset`);
  },
};
