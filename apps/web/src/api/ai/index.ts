import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
  AITemplate,
} from '@/types/ai';
import type {
  Conversation,
  Message,
  ChatResponse,
  PaginationParams,
  PaginatedResult,
} from './types';

import { documentApi } from './documents';
import { chatApi } from './chat';
import { analysisApi } from './analysis';
import { codeApi } from './code';
import { qaApi } from './qa';
import { vectorApi } from './vector';
import { recommendationApi } from './recommendation';
import { assistantApi } from './assistant';

export * from './types';
export * from './assistant';

export const aiApi = {
  ...documentApi,
  ...chatApi,
  ...analysisApi,
  ...codeApi,
  ...qaApi,
  ...vectorApi,
  ...recommendationApi,
  ...assistantApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.ai.get<string>('/health');
  },

  listTemplates: async (): Promise<ApiResponse<AITemplate[]>> => {
    return apiClient.ai.get<AITemplate[]>('/ai/templates');
  },

  // ========== 对话聊天增强模块 ==========
  updateConversation: async (
    id: string,
    data: {
      title?: string;
      model_id?: string;
      system_prompt?: string;
    }
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.put(`/conversations/${id}`, data);
  },

  getConversationMessages: async (
    id: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ): Promise<ApiResponse<Message[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.before) searchParams.set('before', params.before);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/conversations/${id}/messages${queryString ? `?${queryString}` : ''}`);
  },

  regenerateMessage: async (
    conversationId: string,
    messageId: string
  ): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post(`/conversations/${conversationId}/messages/${messageId}/regenerate`);
  },

  // ========== AI 仪表盘统计 ==========
  getDashboardStats: async (): Promise<
    ApiResponse<{
      total_conversations: number;
      total_messages: number;
      total_documents: number;
      total_tokens: number;
      active_users: number;
      satisfaction_rate: number;
      trend: {
        conversations: number;
        messages: number;
        tokens: number;
      };
    }>
  > => {
    return apiClient.ai.get('/dashboard/stats');
  },

  getActivityTrend: async (params?: {
    days?: number;
    group_by?: 'day' | 'hour';
  }): Promise<
    ApiResponse<
      Array<{
        date: string;
        conversations: number;
        messages: number;
        tokens: number;
      }>
    >
  > => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set('days', params.days.toString());
    if (params?.group_by) searchParams.set('group_by', params.group_by);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/dashboard/activity-trend${queryString ? `?${queryString}` : ''}`);
  },

  getFeatureUsage: async (): Promise<
    ApiResponse<
      Array<{
        feature: string;
        label: string;
        count: number;
        percentage: number;
      }>
    >
  > => {
    return apiClient.ai.get('/dashboard/feature-usage');
  },

  // ========== 模型管理模块 ==========
  listModels: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        provider: string;
        type: 'chat' | 'embedding' | 'image' | 'audio';
        description?: string;
        status: 'active' | 'inactive' | 'maintenance';
        max_tokens?: number;
        pricing?: {
          input_per_1k?: number;
          output_per_1k?: number;
        };
        capabilities?: string[];
      }>
    >
  > => {
    return apiClient.ai.get('/models');
  },

  getModelConfig: async (
    modelId: string
  ): Promise<
    ApiResponse<{
      model_id: string;
      temperature: number;
      max_tokens: number;
      top_p: number;
      frequency_penalty: number;
      presence_penalty: number;
      system_prompt?: string;
    }>
  > => {
    return apiClient.ai.get(`/models/${modelId}/config`);
  },

  updateModelConfig: async (
    modelId: string,
    data: Partial<{
      temperature: number;
      max_tokens: number;
      top_p: number;
      frequency_penalty: number;
      presence_penalty: number;
      system_prompt: string;
    }>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.ai.put(`/models/${modelId}/config`, data);
  },

  getUsageStats: async (params?: {
    start_date?: string;
    end_date?: string;
    model_id?: string;
    group_by?: 'day' | 'week' | 'month';
  }): Promise<
    ApiResponse<{
      total_tokens: number;
      total_requests: number;
      total_cost: number;
      breakdown: Array<{
        date: string;
        model_id: string;
        tokens: number;
        requests: number;
        cost: number;
      }>;
    }>
  > => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.model_id) searchParams.set('model_id', params.model_id);
    if (params?.group_by) searchParams.set('group_by', params.group_by);
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/models/usage${queryString ? `?${queryString}` : ''}`);
  },

  // ========== Prompt 模板模块 ==========
  listPromptTemplates: async (
    params?: PaginationParams & {
      category?: string;
      is_favorite?: boolean;
    }
  ): Promise<
    ApiResponse<
      PaginatedResult<
        AITemplate & {
          is_favorite?: boolean;
          usage_count?: number;
        }
      >
    >
  > => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.is_favorite !== undefined)
      searchParams.set('is_favorite', String(params.is_favorite));
    const queryString = searchParams.toString();
    return apiClient.ai.get(`/prompts/templates${queryString ? `?${queryString}` : ''}`);
  },

  getPromptTemplate: async (
    id: string
  ): Promise<
    ApiResponse<
      AITemplate & {
        is_favorite?: boolean;
        usage_count?: number;
        created_at?: string;
        updated_at?: string;
      }
    >
  > => {
    return apiClient.ai.get(`/prompts/templates/${id}`);
  },

  createPromptTemplate: async (data: Partial<AITemplate>): Promise<ApiResponse<AITemplate>> => {
    return apiClient.ai.post('/prompts/templates', data);
  },

  updatePromptTemplate: async (
    id: string,
    data: Partial<AITemplate>
  ): Promise<ApiResponse<AITemplate>> => {
    return apiClient.ai.put(`/prompts/templates/${id}`, data);
  },

  deletePromptTemplate: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/prompts/templates/${id}`);
  },

  togglePromptFavorite: async (
    id: string
  ): Promise<
    ApiResponse<{
      id: string;
      is_favorite: boolean;
    }>
  > => {
    return apiClient.ai.post(`/prompts/templates/${id}/favorite`);
  },

  getPromptCategories: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        count: number;
      }>
    >
  > => {
    return apiClient.ai.get('/prompts/categories');
  },

  usePromptTemplate: async (
    id: string,
    variables: Record<string, unknown>
  ): Promise<
    ApiResponse<{
      result: string;
      formatted_prompt: string;
    }>
  > => {
    return apiClient.ai.post(`/prompts/templates/${id}/use`, { variables });
  },
};

export default aiApi;
