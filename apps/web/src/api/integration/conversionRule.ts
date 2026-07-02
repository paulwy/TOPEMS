import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ConversionRule,
  RuleStatus,
  CreateConversionRuleRequest,
  UpdateConversionRuleRequest,
  ConversionExecution,
  ExecuteConversionRequest,
  ExecuteConversionResponse,
} from './types';

export const conversionRuleApi = {
  listConversionRules: async (): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get('/rules');
  },

  getConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/rules/${id}`);
  },

  createConversionRule: async (
    data: CreateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/rules', data);
  },

  updateConversionRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/rules/${id}`, data);
  },

  deleteConversionRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/rules/${id}`);
  },

  getRuleExecutions: async (id: string): Promise<ApiResponse<ConversionExecution[]>> => {
    return apiClient.integration.get(`/rules/${id}/executions`);
  },

  executeConversionRule: async (
    id: string,
    data: ExecuteConversionRequest
  ): Promise<ApiResponse<ExecuteConversionResponse>> => {
    return apiClient.integration.post(`/rules/${id}/execute`, data);
  },

  enableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/rules/${id}/enable`);
  },

  disableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/rules/${id}/disable`);
  },

  listRules: async (params?: {
    source_system?: string;
    target_system?: string;
    status?: RuleStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get('/conversion-rules', { params });
  },

  getRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/conversion-rules/${id}`);
  },

  createRule: async (data: CreateConversionRuleRequest): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/conversion-rules', data);
  },

  updateRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/conversion-rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/conversion-rules/${id}`);
  },
};

export default conversionRuleApi;
