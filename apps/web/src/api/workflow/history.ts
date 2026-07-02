import apiClient from '../client';
import type { ListParams } from './types';

export const historyApi = {
  listHistory: (params?: ListParams) => {
    return apiClient.workflow.get(`/history`, { params });
  },

  getHistory: (id: string) => {
    return apiClient.workflow.get(`/history/${id}`);
  },

  getHistoryByInstance: (instanceId: string) => {
    return apiClient.workflow.get(`/history/instance/${instanceId}`);
  },

  getHistoryByWorkflow: (workflowId: string) => {
    return apiClient.workflow.get(`/history/workflow/${workflowId}`);
  },
};
