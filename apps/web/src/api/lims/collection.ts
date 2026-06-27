import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CollectionTask,
  CreateCollectionTaskRequest,
  UpdateCollectionTaskRequest,
  ParseRule,
  CreateParseRuleRequest,
  UpdateParseRuleRequest,
  InstrumentData,
  ListParams,
} from './types';

export const collectionTaskApi = {
  listCollectionTasks: async (params?: ListParams): Promise<ApiResponse<CollectionTask[]>> => {
    return apiClient.lims.get('/api/lims/collection-tasks', { params });
  },

  getCollectionTask: async (id: string): Promise<ApiResponse<CollectionTask>> => {
    return apiClient.lims.get(`/api/lims/collection-tasks/${id}`);
  },

  createCollectionTask: async (
    data: CreateCollectionTaskRequest
  ): Promise<ApiResponse<CollectionTask>> => {
    return apiClient.lims.post('/api/lims/collection-tasks', data);
  },

  updateCollectionTask: async (
    id: string,
    data: UpdateCollectionTaskRequest
  ): Promise<ApiResponse<CollectionTask>> => {
    return apiClient.lims.put(`/api/lims/collection-tasks/${id}`, data);
  },

  deleteCollectionTask: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/collection-tasks/${id}`);
  },

  triggerCollection: async (id: string): Promise<ApiResponse<InstrumentData>> => {
    return apiClient.lims.post(`/api/lims/collection-tasks/${id}/trigger`);
  },
};

export const parseRuleApi = {
  listParseRules: async (params?: ListParams): Promise<ApiResponse<ParseRule[]>> => {
    return apiClient.lims.get('/api/lims/parse-rules', { params });
  },

  getParseRule: async (id: string): Promise<ApiResponse<ParseRule>> => {
    return apiClient.lims.get(`/api/lims/parse-rules/${id}`);
  },

  createParseRule: async (data: CreateParseRuleRequest): Promise<ApiResponse<ParseRule>> => {
    return apiClient.lims.post('/api/lims/parse-rules', data);
  },

  updateParseRule: async (
    id: string,
    data: UpdateParseRuleRequest
  ): Promise<ApiResponse<ParseRule>> => {
    return apiClient.lims.put(`/api/lims/parse-rules/${id}`, data);
  },

  deleteParseRule: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.lims.delete(`/api/lims/parse-rules/${id}`);
  },
};
