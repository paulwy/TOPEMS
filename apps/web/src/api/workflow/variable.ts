import apiClient from '../client';
import type { WorkflowVariable, ListParams } from './types';

export const variableApi = {
  list: (instanceId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}`, { params });
  },

  get: (instanceId: string, key: string) => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}/${key}`);
  },

  set: (instanceId: string, key: string, value: unknown, value_type?: string) => {
    return apiClient.workflow.post(`/api/flow/variables/instance/${instanceId}/${key}`, {
      value,
      value_type,
    });
  },

  remove: (instanceId: string, key: string) => {
    return apiClient.workflow.delete(`/api/flow/variables/instance/${instanceId}/${key}`);
  },

  listVariables: (instanceId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}`, { params });
  },

  getVariable: (instanceId: string, key: string) => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}/${key}`);
  },

  setVariable: (instanceId: string, key: string, value: unknown, value_type?: string) => {
    return apiClient.workflow.post(`/api/flow/variables/instance/${instanceId}/${key}`, {
      value,
      value_type,
    });
  },

  setVariables: (instanceId: string, variables: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/variables/instance/${instanceId}`, { variables });
  },

  deleteVariable: (instanceId: string, key: string) => {
    return apiClient.workflow.delete(`/api/flow/variables/instance/${instanceId}/${key}`);
  },

  getTaskVariables: (taskId: string) => {
    return apiClient.workflow.get(`/api/flow/variables/task/${taskId}`);
  },

  setTaskVariable: (taskId: string, key: string, value: unknown, value_type?: string) => {
    return apiClient.workflow.post(`/api/flow/variables/task/${taskId}/${key}`, {
      value,
      value_type,
    });
  },

  getGlobalVariables: (workflowId?: string, params?: ListParams) => {
    const endpoint = workflowId
      ? `/api/flow/variables/global/${workflowId}`
      : '/api/flow/variables/global';
    return apiClient.workflow.get(endpoint, { params });
  },

  setGlobalVariable: (
    workflowId: string,
    key: string,
    value: unknown,
    value_type?: string
  ) => {
    return apiClient.workflow.post(`/api/flow/variables/global/${workflowId}/${key}`, {
      value,
      value_type,
    });
  },

  getVariablesByScope: (instanceId: string, scope: 'global' | 'local') => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}/scope/${scope}`);
  },

  getVariableHistory: (instanceId: string, key: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/variables/instance/${instanceId}/${key}/history`, {
      params,
    });
  },
};
