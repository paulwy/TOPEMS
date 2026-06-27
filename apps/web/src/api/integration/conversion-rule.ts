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
    return apiClient.integration.get('/api/integration/rules');
  },

  getConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/api/integration/rules/${id}`);
  },

  createConversionRule: async (
    data: CreateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/api/integration/rules', data);
  },

  updateConversionRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/api/integration/rules/${id}`, data);
  },

  deleteConversionRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/rules/${id}`);
  },

  getRuleExecutions: async (id: string): Promise<ApiResponse<ConversionExecution[]>> => {
    return apiClient.integration.get(`/api/integration/rules/${id}/executions`);
  },

  executeConversionRule: async (
    id: string,
    data: ExecuteConversionRequest
  ): Promise<ApiResponse<ExecuteConversionResponse>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/execute`, data);
  },

  enableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/enable`);
  },

  disableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/disable`);
  },

  listRules: async (params?: {
    source_system?: string;
    target_system?: string;
    status?: RuleStatus;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get('/api/integration/conversion-rules', { params });
  },

  getRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/api/integration/conversion-rules/${id}`);
  },

  createRule: async (data: CreateConversionRuleRequest): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/api/integration/conversion-rules', data);
  },

  updateRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/api/integration/conversion-rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/conversion-rules/${id}`);
  },
};

export default conversionRuleApi;
