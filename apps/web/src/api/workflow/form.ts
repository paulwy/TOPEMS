import apiClient from '../client';
import type {
  FormDefinition,
  FormInstance,
  CreateFormDefinitionRequest,
  UpdateFormDefinitionRequest,
  CreateFormInstanceRequest,
  UpdateFormInstanceRequest,
  ListParams,
} from './types';
import { createCrudApi } from './utils';

export const formDefinitionApi = {
  ...createCrudApi<FormDefinition>('/api/flow/form-definitions'),

  listFormDefinitions: (params?: ListParams) =>
    createCrudApi<FormDefinition>('/api/flow/form-definitions').list(params),

  getFormDefinition: (id: string) =>
    createCrudApi<FormDefinition>('/api/flow/form-definitions').get(id),

  createFormDefinition: (data: CreateFormDefinitionRequest) =>
    createCrudApi<FormDefinition>('/api/flow/form-definitions').create(data),

  updateFormDefinition: (id: string, data: UpdateFormDefinitionRequest) =>
    createCrudApi<FormDefinition>('/api/flow/form-definitions').update(id, data),

  deleteFormDefinition: (id: string) =>
    createCrudApi<FormDefinition>('/api/flow/form-definitions').delete(id),

  activate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/deactivate`);
  },

  publish: (id: string) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/publish`);
  },

  copy: (id: string, data?: { name?: string }) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/copy`, data);
  },

  getByWorkflow: (workflowId: string) => {
    return apiClient.workflow.get(`/api/flow/form-definitions/workflow/${workflowId}`);
  },

  listCategories: () => {
    return apiClient.workflow.get('/api/flow/form-definitions/categories');
  },

  getVersion: (formId: string, versionId: string) => {
    return apiClient.workflow.get(`/api/flow/form-definitions/${formId}/versions/${versionId}`);
  },

  listVersions: (formId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/form-definitions/${formId}/versions`, { params });
  },

  rollbackVersion: (formId: string, versionId: string) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${formId}/versions/${versionId}/rollback`);
  },

  preview: (id: string, data?: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/preview`, { data });
  },

  validateForm: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/form-definitions/${id}/validate`, { data });
  },

  exportForm: (id: string, format: 'json' | 'xml' = 'json') => {
    return apiClient.workflow.get(`/api/flow/form-definitions/${id}/export`, {
      params: { format },
    });
  },

  importForm: (data: { file: File; name?: string; category?: string }) => {
    return apiClient.workflow.post('/api/flow/form-definitions/import', data);
  },
};

export const formInstanceApi = {
  ...createCrudApi<FormInstance>('/api/flow/form-instances'),

  listFormInstances: (params?: ListParams) =>
    createCrudApi<FormInstance>('/api/flow/form-instances').list(params),

  getFormInstance: (id: string) =>
    createCrudApi<FormInstance>('/api/flow/form-instances').get(id),

  createFormInstance: (data: CreateFormInstanceRequest) =>
    createCrudApi<FormInstance>('/api/flow/form-instances').create(data),

  updateFormInstance: (id: string, data: UpdateFormInstanceRequest) =>
    createCrudApi<FormInstance>('/api/flow/form-instances').update(id, data),

  deleteFormInstance: (id: string) =>
    createCrudApi<FormInstance>('/api/flow/form-instances').delete(id),

  getByWorkflowInstance: (workflowInstanceId: string) => {
    return apiClient.workflow.get(
      `/api/flow/form-instances/workflow-instance/${workflowInstanceId}`
    );
  },

  getByFormDefinition: (formDefinitionId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/form-instances/form-definition/${formDefinitionId}`, {
      params,
    });
  },

  submit: (id: string, data?: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/form-instances/${id}/submit`, data);
  },

  saveDraft: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/form-instances/${id}/draft`, { data });
  },

  getFormData: (id: string) => {
    return apiClient.workflow.get(`/api/flow/form-instances/${id}/data`);
  },

  updateFormData: (id: string, data: Record<string, unknown>) => {
    return apiClient.workflow.put(`/api/flow/form-instances/${id}/data`, { data });
  },

  getHistory: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/form-instances/${id}/history`, { params });
  },

  getMyForms: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/form-instances/my', { params });
  },

  getMyDrafts: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/form-instances/my/drafts', { params });
  },

  exportInstance: (id: string, format: 'json' | 'pdf' = 'json') => {
    return apiClient.workflow.get(`/api/flow/form-instances/${id}/export`, {
      params: { format },
    });
  },
};
