import apiClient from '../client';
import type { ApiResponse } from '../client';

/**
 * AI 知识库 API（遗留⑩闭环，2026-09-08）
 * 后端：svc/ai 模块 ai_knowledge，路由 /knowledge/*（经网关 /api/ai/knowledge/*）
 * 功能：知识库 CRUD + 文档管理 + RAG 问答 + 语义检索 + QA 历史
 */

// ---- 类型（对齐 svc/ai/src/modules/ai_knowledge/models.rs）----

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  kb_type: string;
  status: string;
  document_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  kb_id: string;
  title: string;
  content?: string | null;
  doc_type: string;
  file_path?: string | null;
  file_size?: number | null;
  chunk_count: number;
  status: string;
  error_message?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  tenant_id: string;
  document_id: string;
  kb_id: string;
  chunk_index: number;
  content: string;
  token_count?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface QaHistory {
  id: string;
  tenant_id: string;
  kb_id?: string | null;
  question: string;
  answer: string;
  sources: unknown[];
  confidence?: number | null;
  feedback?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface KnowledgeAskRequest {
  question: string;
  kb_id?: string;
  top_k?: number;
  temperature?: number;
}

export interface KnowledgeSource {
  document_id: string;
  document_title?: string;
  chunk_id?: string;
  content?: string;
  score?: number;
  page?: number;
}

export interface KnowledgeAskResult {
  question: string;
  answer: string;
  sources: KnowledgeSource[];
  confidence: number;
  kb_id?: string;
  document_id?: string;
  follow_up_questions?: string[];
}

export interface KnowledgeSemanticSearchRequest {
  query: string;
  kb_id?: string;
  top_k?: number;
  min_score?: number;
}

export interface KnowledgeSemanticSearchItem {
  chunk_id: string;
  document_id: string;
  kb_id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeBasePayload {
  name: string;
  description?: string;
  kb_type?: string;
}

export interface KnowledgeDocumentUpdatePayload {
  title?: string;
  status?: string;
}

export interface KnowledgeQaFeedbackPayload {
  rating?: 'up' | 'down';
  comment?: string;
}

export interface KnowledgeBaseQuery {
  page?: number;
  page_size?: number;
  keyword?: string;
}

export interface KnowledgeDocumentQuery {
  kb_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
  keyword?: string;
}

// ---- API 客户端 ----

export const knowledgeApi = {
  // 知识库
  listKnowledgeBases: (params?: KnowledgeBaseQuery): Promise<ApiResponse<KnowledgeBase[]>> =>
    apiClient.ai.get<KnowledgeBase[]>('/knowledge/bases', { params }),
  getKnowledgeBase: (id: string): Promise<ApiResponse<KnowledgeBase>> =>
    apiClient.ai.get<KnowledgeBase>(`/knowledge/bases/${id}`),
  createKnowledgeBase: (data: KnowledgeBasePayload): Promise<ApiResponse<KnowledgeBase>> =>
    apiClient.ai.post<KnowledgeBase>('/knowledge/bases', data),
  updateKnowledgeBase: (
    id: string,
    data: Partial<KnowledgeBasePayload>
  ): Promise<ApiResponse<KnowledgeBase>> =>
    apiClient.ai.put<KnowledgeBase>(`/knowledge/bases/${id}`, data),
  deleteKnowledgeBase: (id: string): Promise<ApiResponse<null>> =>
    apiClient.ai.delete<null>(`/knowledge/bases/${id}`),

  // 文档
  listDocuments: (params?: KnowledgeDocumentQuery): Promise<ApiResponse<KnowledgeDocument[]>> =>
    apiClient.ai.get<KnowledgeDocument[]>('/knowledge/documents', { params }),
  getDocument: (id: string): Promise<ApiResponse<KnowledgeDocument>> =>
    apiClient.ai.get<KnowledgeDocument>(`/knowledge/documents/${id}`),
  uploadDocument: (kbId: string, file: File): Promise<ApiResponse<KnowledgeDocument>> => {
    const form = new FormData();
    form.append('kb_id', kbId);
    form.append('file', file);
    return apiClient.ai.post<KnowledgeDocument>('/knowledge/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateDocument: (
    id: string,
    data: KnowledgeDocumentUpdatePayload
  ): Promise<ApiResponse<KnowledgeDocument>> =>
    apiClient.ai.put<KnowledgeDocument>(`/knowledge/documents/${id}`, data),
  deleteDocument: (id: string): Promise<ApiResponse<null>> =>
    apiClient.ai.delete<null>(`/knowledge/documents/${id}`),
  reprocessDocument: (id: string): Promise<ApiResponse<KnowledgeDocument>> =>
    apiClient.ai.post<KnowledgeDocument>(`/knowledge/documents/${id}/reprocess`),

  // 问答 / 检索
  askQuestion: (data: KnowledgeAskRequest): Promise<ApiResponse<KnowledgeAskResult>> =>
    apiClient.ai.post<KnowledgeAskResult>('/knowledge/ask', data),
  semanticSearch: (
    data: KnowledgeSemanticSearchRequest
  ): Promise<ApiResponse<KnowledgeSemanticSearchItem[]>> =>
    apiClient.ai.post<KnowledgeSemanticSearchItem[]>('/knowledge/search', data),
  listQaHistory: (params?: {
    kb_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<QaHistory[]>> =>
    apiClient.ai.get<QaHistory[]>('/knowledge/qa-history', { params }),
  submitFeedback: (qaId: string, data: KnowledgeQaFeedbackPayload): Promise<ApiResponse<null>> =>
    apiClient.ai.post<null>(`/knowledge/qa/${qaId}/feedback`, data),
};

export default knowledgeApi;
