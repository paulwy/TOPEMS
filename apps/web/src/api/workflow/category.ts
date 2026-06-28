import apiClient from '../client';
import type { WorkflowCategory, ListParams } from './types';
import { createCrudApi } from './utils';

export const categoryApi = {
  ...createCrudApi<WorkflowCategory>('/api/flow/categories'),

  listCategories: (params?: ListParams) =>
    createCrudApi<WorkflowCategory>('/api/flow/categories').list(params),

  getCategory: (id: string) =>
    createCrudApi<WorkflowCategory>('/api/flow/categories').get(id),

  createCategory: (data: Partial<WorkflowCategory>) =>
    createCrudApi<WorkflowCategory>('/api/flow/categories').create(data),

  updateCategory: (id: string, data: Partial<WorkflowCategory>) =>
    createCrudApi<WorkflowCategory>('/api/flow/categories').update(id, data),

  deleteCategory: (id: string) =>
    createCrudApi<WorkflowCategory>('/api/flow/categories').delete(id),

  getActiveCategories: () => {
    return apiClient.workflow.get('/api/flow/categories/active');
  },

  getCategoryWorkflows: (categoryId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/categories/${categoryId}/workflows`, { params });
  },

  getCategoryTree: () => {
    return apiClient.workflow.get('/api/flow/categories/tree');
  },

  sortCategories: (data: { ids: string[] }) => {
    return apiClient.workflow.post('/api/flow/categories/sort', data);
  },
};
