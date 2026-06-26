import apiClient from '../client';
import type { ListParams } from './types';

export const settingApi = {
  listSettings: (params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/settings`, { params });
  },

  getSetting: (id: string) => {
    return apiClient.workflow.get(`/api/flow/settings/${id}`);
  },

  updateSetting: (id: string, data: { value?: string }) => {
    return apiClient.workflow.put(`/api/flow/settings/${id}`, data);
  },

  getSettingByKey: (key: string) => {
    return apiClient.workflow.get(`/api/flow/settings/key/${key}`);
  },

  batchUpdateSettings: (data: { settings: { id: string; value: string }[] }) => {
    return apiClient.workflow.post('/api/flow/settings/batch', data);
  },

  resetSetting: (id: string) => {
    return apiClient.workflow.post(`/api/flow/settings/${id}/reset`);
  },
};
