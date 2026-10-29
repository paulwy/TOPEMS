import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const knowledgeArticleApi = {
  createKnowledgeArticle: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.post('/knowledge-articles', data);
  },

  getKnowledgeArticle: async (
    id: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.get(`/knowledge-articles/${id}`);
  },

  updateKnowledgeArticle: async (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.put(`/knowledge-articles/${id}`, data);
  },

  deleteKnowledgeArticle: async (
    id: string
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.ticket.delete(`/knowledge-articles/${id}`);
  },
};
