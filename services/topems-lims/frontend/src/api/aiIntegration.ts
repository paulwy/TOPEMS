import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface AiAnalysis {
  id: string;
  entity_type: string;
  entity_id: string;
  analysis_type: string;
  prompt: string;
  response: string;
  ai_service_url?: string;
  created_by: string;
  created_at: string;
}

export interface CreateAnalysisRequest {
  entity_type: string;
  entity_id: string;
  analysis_type: string;
  prompt: string;
  created_by: string;
}

export interface AiChatRequest {
  query: string;
}

export interface AiChatResponse {
  answer: string;
}

export const aiIntegrationApi = {
  async listAnalyses(params?: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedResponse<AiAnalysis>>> {
    const response = await apiClient.get('/api/v1/ai/analyses', { params });
    return response.data;
  },

  async createAnalysis(data: CreateAnalysisRequest): Promise<ApiResponse<AiAnalysis>> {
    const response = await apiClient.post('/api/v1/ai/analyses', data);
    return response.data;
  },

  async getAnalysis(id: string): Promise<ApiResponse<AiAnalysis>> {
    const response = await apiClient.get(`/api/v1/ai/analyses/${id}`);
    return response.data;
  },

  async aiChat(query: string): Promise<ApiResponse<AiChatResponse>> {
    const response = await apiClient.post('/api/v1/ai/chat', { query });
    return response.data;
  },

  async getEntityAnalyses(entity_type: string, entity_id: string): Promise<ApiResponse<AiAnalysis[]>> {
    const response = await apiClient.get(`/api/v1/entities/${entity_type}/${entity_id}/analyses`);
    return response.data;
  }
};
