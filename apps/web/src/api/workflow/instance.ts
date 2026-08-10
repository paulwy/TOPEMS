import apiClient from '../client';
import type { CreateWorkflowInstanceRequest, ListParams } from './types';

export const instanceApi = {
  list: (params?: ListParams) => {
    return apiClient.workflow.get(`/instances`, { params });
  },

  start: (data: CreateWorkflowInstanceRequest) => {
    return apiClient.workflow.post('/instances', data);
  },

  get: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}`);
  },

  getDetails: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}/details`);
  },

  listInstances: (params?: ListParams) => {
    return apiClient.workflow.get(`/instances`, { params });
  },

  getInstance: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}`);
  },

  cancelInstance: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/cancel`);
  },

  suspendInstance: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/suspend`);
  },

  resumeInstance: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/resume`);
  },

  delete: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/cancel`);
  },

  activateInstance: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/activate`);
  },

  deleteInstance: (id: string) => {
    return apiClient.workflow.post(`/instances/${id}/cancel`);
  },

  terminateInstance: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/instances/${id}/terminate`, data);
  },

  getInstanceVariables: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}/variables`);
  },

  setInstanceVariables: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/instances/${id}/variables`, data);
  },

  getInstanceTasks: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/instances/${id}/tasks`, { params });
  },

  getInstanceHistory: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}/history`);
  },

  getInstanceLogs: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/instances/${id}/logs`, { params });
  },

  getInstanceDiagram: (id: string) => {
    return apiClient.workflow.get(`/instances/${id}/diagram`);
  },
};
