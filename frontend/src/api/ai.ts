import apiClient from './client';
import type { ApiResponse } from './client';

export interface Document {
  id: string;
  title: string;
  content: string;
  filename: string;
  path: string;
}

export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  answer: string;
}

export const aiApi = {
  listDocuments: async () => {
    return apiClient.ai.get<ApiResponse<Document[]>>('/api/v1/documents');
  },

  chat: async (data: ChatRequest) => {
    return apiClient.ai.post<ApiResponse<ChatResponse>>('/api/v1/ai/chat', data);
  },

  health: async () => {
    return apiClient.ai.get<ApiResponse<string>>('/health');
  },
};
