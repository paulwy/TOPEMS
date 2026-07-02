import apiClient from '../client';
import type { WorkflowRule, ListParams } from './types';
import { createCrudApi } from './utils';

export const ruleApi = {
  ...createCrudApi<WorkflowRule>('/rules'),

  listRules: (params?: ListParams) => createCrudApi<WorkflowRule>('/rules').list(params),

  getRule: (id: string) => createCrudApi<WorkflowRule>('/rules').get(id),

  createRule: (data: Partial<WorkflowRule>) => createCrudApi<WorkflowRule>('/rules').create(data),

  updateRule: (id: string, data: Partial<WorkflowRule>) =>
    createCrudApi<WorkflowRule>('/rules').update(id, data),

  deleteRule: (id: string) => createCrudApi<WorkflowRule>('/rules').delete(id),

  getRulesByWorkflow: (workflowId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/rules/workflow/${workflowId}`, { params });
  },

  getRulesByNode: (workflowId: string, nodeId: string) => {
    return apiClient.workflow.get(`/rules/node/${workflowId}/${nodeId}`);
  },

  getRulesByType: (ruleType: string, params?: ListParams) => {
    return apiClient.workflow.get('/rules/type', {
      params: { rule_type: ruleType, ...params },
    });
  },

  activate: (id: string) => {
    return apiClient.workflow.post(`/rules/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/rules/${id}/deactivate`);
  },

  batchUpdate: (data: { rules: WorkflowRule[] }) => {
    return apiClient.workflow.post('/rules/batch', data);
  },

  testRule: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/rules/${id}/test`, data);
  },
};
