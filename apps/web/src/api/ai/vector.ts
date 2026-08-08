import apiClient from '../client';
import type { ApiResponse } from '../client';

export const vectorApi = {
  vectorSearch: async (data: {
    query: string;
    collection?: string;
    top_k?: number;
    filters?: Record<string, unknown>;
  }): Promise<
    ApiResponse<{
      results: Array<{
        id: string;
        content: string;
        metadata: Record<string, unknown>;
        similarity: number;
        document_title?: string;
      }>;
      total: number;
      query_time_ms: number;
    }>
  > => {
    return apiClient.ai.post('/vector/search', data);
  },

  getVectorCollections: async (): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description?: string;
        document_count: number;
        vector_count: number;
        created_at: string;
        updated_at: string;
      }>
    >
  > => {
    return apiClient.ai.get('/vector/collections');
  },

  createVectorCollection: async (data: {
    name: string;
    description?: string;
    embedding_model?: string;
  }): Promise<ApiResponse<{ id: string; name: string }>> => {
    return apiClient.ai.post('/vector/collections', data);
  },

  deleteVectorCollection: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/vector/collections/${id}`);
  },

  indexDocument: async (
    documentId: string,
    collectionId?: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      chunks_indexed: number;
      status: string;
    }>
  > => {
    return apiClient.ai.post(`/vector/index/${documentId}`, { collection_id: collectionId });
  },
};
