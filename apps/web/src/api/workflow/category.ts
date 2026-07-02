import apiClient from '../client';
import type { WorkflowCategory, ListParams } from './types';
import { createCrudApi } from './utils';

export const categoryApi = {
  ...createCrudApi<WorkflowCategory>('/categories'),

  listCategories: (params?: ListParams) =>
    createCrudApi<WorkflowCategory>('/categories').list(params),

  getCategory: (id: string) => createCrudApi<WorkflowCategory>('/categories').get(id),

  createCategory: (data: Partial<WorkflowCategory>) =>
    createCrudApi<WorkflowCategory>('/categories').create(data),

  updateCategory: (id: string, data: Partial<WorkflowCategory>) =>
    createCrudApi<WorkflowCategory>('/categories').update(id, data),

  deleteCategory: (id: string) => createCrudApi<WorkflowCategory>('/categories').delete(id),

  getActiveCategories: () => {
    return apiClient.workflow.get('/categories/active');
  },

  getCategoryWorkflows: (categoryId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/categories/${categoryId}/workflows`, { params });
  },

  getCategoryTree: () => {
    return apiClient.workflow.get('/categories/tree');
  },

  sortCategories: (data: { ids: string[] }) => {
    return apiClient.workflow.post('/categories/sort', data);
  },
};
