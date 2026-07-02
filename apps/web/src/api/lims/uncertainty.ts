import apiClient from '../client';
import type { ApiResponse } from '../client';
import { createCrudApi } from './utils';
import type {
  UncertaintyProject,
  CreateUncertaintyProjectRequest,
  UpdateUncertaintyProjectRequest,
  UncertaintySource,
  CreateUncertaintySourceRequest,
  UpdateUncertaintySourceRequest,
  UncertaintyComponent,
  CreateUncertaintyComponentRequest,
  UpdateUncertaintyComponentRequest,
  TypeACalculationRequest,
  TypeBCalculationRequest,
  UncertaintyCalculationResult,
  UncertaintyReport,
  ListParams,
} from './types';

export const uncertaintyProjectApi = {
  ...createCrudApi<UncertaintyProject>('/uncertainty-projects'),

  listUncertaintyProjects: (params?: ListParams) =>
    createCrudApi<UncertaintyProject>('/uncertainty-projects').list(params),

  getUncertaintyProject: (id: string) =>
    createCrudApi<UncertaintyProject>('/uncertainty-projects').get(id),

  createUncertaintyProject: (data: CreateUncertaintyProjectRequest) =>
    createCrudApi<UncertaintyProject>('/uncertainty-projects').create(data),

  updateUncertaintyProject: (id: string, data: UpdateUncertaintyProjectRequest) =>
    createCrudApi<UncertaintyProject>('/uncertainty-projects').update(id, data),

  deleteUncertaintyProject: (id: string) =>
    createCrudApi<UncertaintyProject>('/uncertainty-projects').delete(id),
};

export const uncertaintySourceApi = {
  listUncertaintySources: async (projectId: string): Promise<ApiResponse<UncertaintySource[]>> => {
    return apiClient.lims.get(`/uncertainty-projects/${projectId}/sources`);
  },

  createUncertaintySource: async (
    data: CreateUncertaintySourceRequest
  ): Promise<ApiResponse<UncertaintySource>> => {
    return apiClient.lims.post('/uncertainty-sources', data);
  },

  updateUncertaintySource: async (
    id: string,
    data: UpdateUncertaintySourceRequest
  ): Promise<ApiResponse<UncertaintySource>> => {
    return apiClient.lims.put(`/uncertainty-sources/${id}`, data);
  },

  deleteUncertaintySource: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/uncertainty-sources/${id}`);
  },
};

export const uncertaintyComponentApi = {
  listUncertaintyComponents: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintyComponent[]>> => {
    return apiClient.lims.get(`/uncertainty-projects/${projectId}/components`);
  },

  createUncertaintyComponent: async (
    data: CreateUncertaintyComponentRequest
  ): Promise<ApiResponse<UncertaintyComponent>> => {
    return apiClient.lims.post('/uncertainty-components', data);
  },

  updateUncertaintyComponent: async (
    id: string,
    data: UpdateUncertaintyComponentRequest
  ): Promise<ApiResponse<UncertaintyComponent>> => {
    return apiClient.lims.put(`/uncertainty-components/${id}`, data);
  },

  deleteUncertaintyComponent: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/uncertainty-components/${id}`);
  },

  calculateTypeA: async (
    data: TypeACalculationRequest
  ): Promise<ApiResponse<UncertaintyComponent>> => {
    return apiClient.lims.post('/uncertainty/type-a', data);
  },

  calculateTypeB: async (
    data: TypeBCalculationRequest
  ): Promise<ApiResponse<UncertaintyComponent>> => {
    return apiClient.lims.post('/uncertainty/type-b', data);
  },

  calculateCombinedUncertainty: async (
    projectId: string
  ): Promise<ApiResponse<UncertaintyCalculationResult>> => {
    return apiClient.lims.post(`/uncertainty-projects/${projectId}/combined`);
  },

  generateUncertaintyReport: async (projectId: string): Promise<ApiResponse<UncertaintyReport>> => {
    return apiClient.lims.get(`/uncertainty-projects/${projectId}/report`);
  },
};
