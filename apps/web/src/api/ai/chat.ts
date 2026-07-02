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
    return apiClient.ai.post<ChatResponse>('/ai/chat', data);
  },

  search: async (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return apiClient.ai.post<SearchResult>('/ai/search', data);
  },

  generate: async (data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>> => {
    return apiClient.ai.post<AIGenerateResponse>('/ai/generate', data);
  },

  listConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.ai.get<Conversation[]>('/conversations');
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.get(`/conversations/${id}`);
  },

  createConversation: async (title?: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.ai.post('/conversations', { title });
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/conversations/${id}`);
  },

  validate: async (data: ValidateRequest): Promise<ApiResponse<ValidateResponse>> => {
    return apiClient.ai.post<ValidateResponse>('/ai/validate', data);
  },

  complete: async (data: CompleteRequest): Promise<ApiResponse<CompleteResponse>> => {
    return apiClient.ai.post<CompleteResponse>('/ai/complete', data);
  },

  summarize: async (data: SummarizeRequest): Promise<ApiResponse<SummarizeResponse>> => {
    return apiClient.ai.post<SummarizeResponse>('/ai/summarize', data);
  },
};
