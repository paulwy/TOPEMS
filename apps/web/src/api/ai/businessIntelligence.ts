/**
 * 智能表单与文档智能 API 调用
 *
 * 提供智能表单和文档智能的 API 调用封装，支持：
 * - 表单定义获取
 * - 表单数据验证
 * - 表单自动填充
 * - 从自然语言生成表单
 * - 文档上传/解析/摘要/生成
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ============================================================================
// 智能表单类型定义
// ============================================================================

/** 表单字段类型 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'image'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'color'
  | 'range'
  | 'richtext'
  | 'tags'
  | 'reference'
  | 'subform'
  | 'calculated'
  | 'signature'
  | 'other';

/** 表单字段定义 */
export interface FormFieldDefinition {
  field_id: string;
  name: string;
  label: string;
  field_type: FormFieldType;
  description?: string;
  placeholder?: string;
  default_value?: unknown;
  required?: boolean;
  read_only?: boolean;
  hidden?: boolean;
  options?: Array<{ value: string; label: string }>;
  group?: string;
  order?: number;
  validation?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    pattern?: string;
    error_message?: string;
  };
}

/** 表单定义 */
export interface FormDefinition {
  form_id: string;
  name: string;
  description?: string;
  category?: string;
  fields: FormFieldDefinition[];
  version?: string;
  enabled?: boolean;
}

/** 表单数据 */
export interface FormData {
  form_id: string;
  record_id?: string;
  values: Record<string, unknown>;
  status:
    'draft' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
}

/** 字段错误 */
export interface FieldError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/** 表单验证结果 */
export interface FormValidationResult {
  is_valid: boolean;
  field_errors: Record<string, FieldError[]>;
  form_errors: Array<{
    code: string;
    message: string;
    fields: string[];
  }>;
  warnings: Array<{
    code: string;
    message: string;
    fields: string[];
  }>;
  validated_at: string;
}

// ============================================================================
// 文档智能类型定义
// ============================================================================

/** 文档类型 */
export type DocumentType =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  | 'markdown'
  | 'html'
  | 'json'
  | 'csv'
  | 'image'
  | 'other';

/** 文档处理状态 */
export type DocumentProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 文档信息 */
export interface DocumentInfo {
  document_id: string;
  name: string;
  document_type: DocumentType;
  file_size: number;
  content?: string;
  metadata?: {
    author?: string;
    created_at?: string;
    modified_at?: string;
    page_count?: number;
    word_count?: number;
    language?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
  };
  uploaded_at: string;
  processing_status: DocumentProcessingStatus;
}

/** 文档摘要类型 */
export type SummaryType = 'brief' | 'standard' | 'detailed' | 'section';

/** 文档摘要 */
export interface DocumentSummary {
  document_id: string;
  summary_type: SummaryType;
  content: string;
  length: number;
  key_sentences: string[];
  keywords: Array<{
    keyword: string;
    weight: number;
    frequency: number;
  }>;
  generated_at: string;
}

/** 文档解析结果 */
export interface DocumentParseResult {
  document_id: string;
  success: boolean;
  text?: string;
  tables?: Array<{
    table_id: string;
    title?: string;
    headers: string[];
    rows: string[][];
    page?: number;
  }>;
  images?: Array<{
    image_id: string;
    description?: string;
    format: string;
    size: number;
    page?: number;
  }>;
  structure?: {
    sections: Array<{
      section_id: string;
      title: string;
      level: number;
      content: string;
      page?: number;
    }>;
    table_of_contents: Array<{
      title: string;
      level: number;
      page: number;
    }>;
  };
  error?: string;
  parsed_at: string;
}

/** 文档生成请求 */
export interface DocumentGenerationRequest {
  document_type: DocumentType;
  title: string;
  template?: string;
  content: {
    sections: Array<{
      title: string;
      level: number;
      paragraphs: string[];
      tables?: Array<{
        headers: string[];
        rows: string[][];
      }>;
      images?: string[];
    }>;
  };
  style?: {
    font_family?: string;
    font_size?: number;
    line_spacing?: number;
    theme_color?: string;
  };
}

// ============================================================================
// 智能表单 API
// ============================================================================

/**
 * 获取表单定义（模板详情）
 */
export async function getFormDefinition(form_id: string): Promise<ApiResponse<FormDefinition>> {
  // 对齐 core 契约 stub（/forms/{id} GET），svc/ai 对假模板 id 返裸 404
  return apiClient.core.get(`/forms/${form_id}`);
}

/**
 * 获取所有表单定义（模板列表）
 */
export async function getAllFormDefinitions(
  category?: string
): Promise<ApiResponse<FormDefinition[]>> {
  return apiClient.ai.get(`/dsh/smart-forms/templates`, {
    params: category ? { category } : undefined,
  });
}

/**
 * 验证表单数据
 */
export async function validateForm(
  form_id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<FormValidationResult>> {
  return apiClient.ai.post(`/dsh/smart-forms/validate`, { form_id, data });
}

/**
 * 自动填充表单（AI 填充）
 */
export async function autoFillForm(
  form_id: string,
  context: Record<string, unknown>,
  existing_values?: Record<string, unknown>
): Promise<ApiResponse<FormData>> {
  return apiClient.ai.post(`/dsh/smart-forms/ai-fill`, {
    form_id,
    context,
    existing_values: existing_values ?? {},
    target_fields: [],
  });
}

// ============================================================================
// 文档智能 API
// ============================================================================

const DOC_BASE_PATH = '/documents';

/**
 * 上传文档
 */
export async function uploadDocument(
  file: File,
  metadata?: Record<string, unknown>
): Promise<ApiResponse<DocumentInfo>> {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }
  return apiClient.ai.post(DOC_BASE_PATH, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 获取文档信息
 */
export async function getDocument(document_id: string): Promise<ApiResponse<DocumentInfo>> {
  return apiClient.ai.get(`/documents/${document_id}`);
}

/**
 * 解析文档
 */
export async function parseDocument(
  document_id: string
): Promise<ApiResponse<DocumentParseResult>> {
  // 对齐 core 契约 stub（/documents/{id}/parse POST），svc/ai 未实现该子路径
  return apiClient.core.post(`/documents/${document_id}/parse`);
}

/**
 * 生成文档摘要
 */
export async function generateDocumentSummary(
  document_id: string,
  summary_type: SummaryType = 'standard'
): Promise<ApiResponse<DocumentSummary>> {
  return apiClient.core.post(`/documents/${document_id}/summary`, { summary_type });
}

/**
 * 获取文档摘要
 */
export async function getDocumentSummary(
  document_id: string,
  summary_type?: SummaryType
): Promise<ApiResponse<DocumentSummary>> {
  return apiClient.core.get(`/documents/${document_id}/summary`, {
    params: summary_type ? { type: summary_type } : undefined,
  });
}

/**
 * 搜索文档内容
 */
export async function searchDocument(
  document_id: string,
  query: string
): Promise<
  ApiResponse<
    Array<{
      line_number: number;
      content: string;
      match_count: number;
    }>
  >
> {
  return apiClient.core.get(`/documents/${document_id}/search`, {
    params: { q: query },
  });
}

/**
 * 生成文档
 */
export async function generateDocument(
  request: DocumentGenerationRequest
): Promise<ApiResponse<DocumentInfo>> {
  return apiClient.ai.post(`/documents/generate`, request);
}

/**
 * 下载文档
 */
export async function downloadDocument(document_id: string): Promise<Blob> {
  // 后端真缺口：/documents/{id}/download 未注册（core/ai 均 404）。
  // 指到已存在的 /documents/{id}（GET 契约 stub），待上游实现真实下载后再切回。
  const response = await apiClient.core.get(`/documents/${document_id}`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

/**
 * 删除文档
 */
export async function deleteDocument(document_id: string): Promise<ApiResponse<void>> {
  return apiClient.ai.delete(`/documents/${document_id}`);
}

/**
 * 获取文档列表
 */
export async function listDocuments(params?: {
  page?: number;
  page_size?: number;
  document_type?: DocumentType;
  status?: DocumentProcessingStatus;
}): Promise<
  ApiResponse<{
    items: DocumentInfo[];
    total: number;
    page: number;
    page_size: number;
  }>
> {
  return apiClient.ai.get(DOC_BASE_PATH, { params });
}
