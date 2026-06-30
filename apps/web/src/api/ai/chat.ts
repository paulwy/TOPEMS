import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ChatRequest,
  ChatResponse,
  SearchRequest,
  SearchResult,
  AIGenerateRequest,
  AIGenerateResponse,
  Conversation,
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
} from './types';

export const chatApi = {
  chat: async (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiClient.ai.post<ChatResponse>('/api/ai/ai/chat', data);
  },

  search: async (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return apiClient.ai.post<SearchResult>('/api/ai/ai/search', data);
  },

  generate: async (data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>> => {
    return apiClient.ai.post<AIGenerateResponse>('/api/ai/ai/generate', data);
  },

  listConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.ai.get<Conversation[]>('/api/ai/conversations');
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.get(`/api/ai/conversations/${id}`);
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.post('/api/ai/conversations', { title });
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/api/ai/conversations/${id}`);
  },

  validate: async (data: ValidateRequest): Promise<ApiResponse<ValidateResponse>> => {
    return apiClient.ai.post<ValidateResponse>('/api/ai/ai/validate', data);
  },

  complete: async (data: CompleteRequest): Promise<ApiResponse<CompleteResponse>> => {
    return apiClient.ai.post<CompleteResponse>('/api/ai/ai/complete', data);
  },

  summarize: async (data: SummarizeRequest): Promise<ApiResponse<SummarizeResponse>> => {
    return apiClient.ai.post<SummarizeResponse>('/api/ai/ai/summarize', data);
  },
};
