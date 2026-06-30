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

export interface Document {
  id: string;
  title: string;
  content: string;
  filename: string;
  path: string;
  file_path?: string;
  filesize?: number;
  mime_type?: string;
  status?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  description?: string;
  error_message?: string;
}

export interface DocumentQAAnswer {
  answer: string;
  confidence: number;
  sources: DocumentQASource[];
  follow_up_questions: string[];
}

export interface DocumentQASource {
  document_id: string;
  document_title: string;
  chunk_content: string;
  similarity: number;
}

export interface DocumentQAQuestionRequest {
  question: string;
  document_ids?: string[];
  top_k?: number;
}

export interface ExtractDocumentRequest {
  extract_type: string;
}

export interface ExtractDocumentResponse {
  document_id: string;
  extract_type: string;
  result: Record<string, any>;
}

export interface SummarizeDocumentRequest {
  max_length?: number;
}

export interface SummarizeDocumentResponse {
  document_id: string;
  summary: string;
}

export interface ExtractKeyPointsRequest {
  max_points?: number;
}

export interface ExtractKeyPointsResponse {
  document_id: string;
  key_points: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  query: string;
  conversation_id?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  sources?: DocumentSource[];
}

export interface DocumentSource {
  document_id: string;
  title: string;
  snippet: string;
  relevance_score: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, string>;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  query_time_ms: number;
}

export interface SentimentAnalysisRequest {
  text: string;
}

export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  details?: {
    positive_words?: string[];
    negative_words?: string[];
    emotional_intensity?: number;
  };
}

export interface ClassifyTextRequest {
  text: string;
  categories?: string[];
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface ClassifyTextResponse {
  category: string;
  confidence: number;
  all_categories?: CategoryScore[];
}

export interface ExtractEntitiesRequest {
  text: string;
  entity_types?: string[];
}

export interface Entity {
  text: string;
  entity_type: string;
  start_pos?: number;
  end_pos?: number;
  confidence: number;
}

export interface ExtractEntitiesResponse {
  entities: Entity[];
}

export interface ExtractKeywordsRequest {
  text: string;
  max_keywords?: number;
}

export interface Keyword {
  text: string;
  score: number;
  frequency: number;
}

export interface ExtractKeywordsResponse {
  keywords: Keyword[];
}

export interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  context?: Record<string, any>;
  sources?: Array<{
    title: string;
    url?: string;
    content?: string;
  }>;
  feedback?: string;
  rating?: number;
  created_at: string;
}

export interface AIGenerateRequest {
  template_id?: string;
  variables: Record<string, any>;
  outputformat?: 'text' | 'json' | 'markdown';
}

export interface AIGenerateResponse {
  content: string;
  format: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export {
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
  AITemplate,
};
