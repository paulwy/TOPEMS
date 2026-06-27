import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  TestMethod,
  CreateTestMethodRequest,
  UpdateTestMethodRequest,
  MethodVersion,
  CreateMethodVersionRequest,
  MethodCategory,
  CreateMethodCategoryRequest,
  UpdateMethodCategoryRequest,
  MethodValidation,
  CreateMethodValidationRequest,
  ListParams,
} from './types';

export const testMethodApi = {
  ...createCrudApi<TestMethod>('/api/lims/test-methods'),

  listTestMethods: (params?: ListParams) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').list(params),

  getTestMethod: (id: string) => createCrudApi<TestMethod>('/api/lims/test-methods').get(id),

  createTestMethod: (data: CreateTestMethodRequest) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').create(data),

  updateTestMethod: (id: string, data: UpdateTestMethodRequest) =>
    createCrudApi<TestMethod>('/api/lims/test-methods').update(id, data),

  deleteTestMethod: (id: string) => createCrudApi<TestMethod>('/api/lims/test-methods').delete(id),

  listMethodVersions: async (methodId: string): Promise<ApiResponse<MethodVersion[]>> => {
    return apiClient.lims.get(`/api/lims/test-methods/${methodId}/versions`);
  },

  createNewVersion: async (
    methodId: string,
    data: CreateMethodVersionRequest
  ): Promise<ApiResponse<MethodVersion>> => {
    return apiClient.lims.post(`/api/lims/test-methods/${methodId}/new-version`, data);
  },
};

export const methodCategoryApi = {
  listMethodCategories: async (params?: ListParams): Promise<ApiResponse<MethodCategory[]>> => {
    return apiClient.lims.get('/api/lims/method-categories', { params });
  },

  createCategory: async (
    data: CreateMethodCategoryRequest
  ): Promise<ApiResponse<MethodCategory>> => {
    return apiClient.lims.post('/api/lims/method-categories', data);
  },

  updateCategory: async (
    id: string,
    data: UpdateMethodCategoryRequest
  ): Promise<ApiResponse<MethodCategory>> => {
    return apiClient.lims.put(`/api/lims/method-categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/method-categories/${id}`);
  },
};

export const methodValidationApi = {
  listMethodValidations: async (params?: ListParams): Promise<ApiResponse<MethodValidation[]>> => {
    return apiClient.lims.get('/api/lims/method-validations', { params });
  },

  createValidation: async (
    data: CreateMethodValidationRequest
  ): Promise<ApiResponse<MethodValidation>> => {
    return apiClient.lims.post('/api/lims/method-validations', data);
  },
};
