import apiClient from '../client';
import type { CreateWorkflowInstanceRequest, ListParams } from './types';

export const instanceApi = {
  list: (params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/instances`, { params });
  },

  start: (data: CreateWorkflowInstanceRequest) => {
    return apiClient.workflow.post('/api/flow/instances', data);
  },

  get: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}`);
  },

  getDetails: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/details`);
  },

  listInstances: (params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/instances`, { params });
  },

  getInstance: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}`);
  },

  cancelInstance: (id: string) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/cancel`);
  },

  suspendInstance: (id: string) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/suspend`);
  },

  resumeInstance: (id: string) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/resume`);
  },

  delete: (id: string) => {
    return apiClient.workflow.delete(`/api/flow/instances/${id}`);
  },
};
