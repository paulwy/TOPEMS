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

  activateInstance: (id: string) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/activate`);
  },

  deleteInstance: (id: string) => {
    return apiClient.workflow.delete(`/api/flow/instances/${id}`);
  },

  terminateInstance: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/terminate`, data);
  },

  getInstanceVariables: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/variables`);
  },

  setInstanceVariables: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/instances/${id}/variables`, data);
  },

  getInstanceTasks: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/tasks`, { params });
  },

  getInstanceHistory: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/history`);
  },

  getInstanceLogs: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/logs`, { params });
  },

  getInstanceDiagram: (id: string) => {
    return apiClient.workflow.get(`/api/flow/instances/${id}/diagram`);
  },
};
