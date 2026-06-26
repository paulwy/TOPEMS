import apiClient from '../client';
import type { ListParams } from './types';

export const historyApi = {
  listHistory: (params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/history`, { params });
  },

  getHistory: (id: string) => {
    return apiClient.workflow.get(`/api/flow/history/${id}`);
  },

  getHistoryByInstance: (instanceId: string) => {
    return apiClient.workflow.get(`/api/flow/history/instance/${instanceId}`);
  },

  getHistoryByWorkflow: (workflowId: string) => {
    return apiClient.workflow.get(`/api/flow/history/workflow/${workflowId}`);
  },
};
