import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  Document,
  PaginatedResult,
  PaginationParams,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
  ExtractKeyPointsRequest,
  ExtractKeyPointsResponse,
  ExtractDocumentRequest,
  ExtractDocumentResponse,
} from './types';

export const documentApi = {
  listDocuments: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<Document>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    return apiClient.ai.get(`/documents${queryString ? `?${queryString}` : ''}`);
  },

  getDocument: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.ai.get(`/documents/${id}`);
  },

  createDocument: async (data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.post('/documents', data);
  },

  updateDocument: async (id: string, data: Partial<Document>): Promise<ApiResponse<Document>> => {
    return apiClient.ai.put(`/documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.ai.delete(`/documents/${id}`);
  },

  summarizeDocument: async (
    id: string,
    data?: SummarizeDocumentRequest
  ): Promise<ApiResponse<SummarizeDocumentResponse>> => {
    return apiClient.ai.post<SummarizeDocumentResponse>(
      `/documents/${id}/summarize`,
      data || {}
    );
  },

  extractKeyPoints: async (
    id: string,
    data?: ExtractKeyPointsRequest
  ): Promise<ApiResponse<ExtractKeyPointsResponse>> => {
    return apiClient.ai.post<ExtractKeyPointsResponse>(
      `/documents/${id}/key-points`,
      data || {}
    );
  },

  extractDocument: async (
    id: string,
    data: ExtractDocumentRequest
  ): Promise<ApiResponse<ExtractDocumentResponse>> => {
    return apiClient.ai.post<ExtractDocumentResponse>(`/documents/${id}/extract`, data);
  },

  translateDocument: async (
    id: string,
    data: {
      target_language: string;
      source_language?: string;
    }
  ): Promise<
    ApiResponse<{
      document_id: string;
      translated_content: string;
      target_language: string;
      source_language: string;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/translate`, data);
  },

  ocrDocument: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      text: string;
      pages: number;
      confidence: number;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/ocr`);
  },

  classifyDocument: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      category: string;
      confidence: number;
      all_categories?: Array<{ category: string; score: number }>;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/classify`);
  },

  extractDocumentEntities: async (
    id: string
  ): Promise<
    ApiResponse<{
      document_id: string;
      entities: Array<{
        text: string;
        entity_type: string;
        start_pos?: number;
        end_pos?: number;
        confidence: number;
      }>;
    }>
  > => {
    return apiClient.ai.post(`/documents/${id}/entities`);
  },
};
