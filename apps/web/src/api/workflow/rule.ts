import apiClient from '../client';
import type { WorkflowRule, ListParams } from './types';
import { createCrudApi } from './utils';

export const ruleApi = {
  ...createCrudApi<WorkflowRule>('/api/flow/rules'),

  listRules: (params?: ListParams) =>
    createCrudApi<WorkflowRule>('/api/flow/rules').list(params),

  getRule: (id: string) =>
    createCrudApi<WorkflowRule>('/api/flow/rules').get(id),

  createRule: (data: Partial<WorkflowRule>) =>
    createCrudApi<WorkflowRule>('/api/flow/rules').create(data),

  updateRule: (id: string, data: Partial<WorkflowRule>) =>
    createCrudApi<WorkflowRule>('/api/flow/rules').update(id, data),

  deleteRule: (id: string) =>
    createCrudApi<WorkflowRule>('/api/flow/rules').delete(id),

  getRulesByWorkflow: (workflowId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/rules/workflow/${workflowId}`, { params });
  },

  getRulesByNode: (workflowId: string, nodeId: string) => {
    return apiClient.workflow.get(`/api/flow/rules/node/${workflowId}/${nodeId}`);
  },

  getRulesByType: (ruleType: string, params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/rules/type', {
      params: { rule_type: ruleType, ...params },
    });
  },

  activate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/rules/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/rules/${id}/deactivate`);
  },

  batchUpdate: (data: { rules: WorkflowRule[] }) => {
    return apiClient.workflow.post('/api/flow/rules/batch', data);
  },

  testRule: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/rules/${id}/test`, data);
  },
};
