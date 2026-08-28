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
  status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
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

const FORM_BASE_PATH = '/api/ai/forms';

/**
 * 获取表单定义
 */
export async function getFormDefinition(form_id: string): Promise<ApiResponse<FormDefinition>> {
  return apiClient.get(`${FORM_BASE_PATH}/${form_id}`);
}

/**
 * 获取所有表单定义
 */
export async function getAllFormDefinitions(
  category?: string
): Promise<ApiResponse<FormDefinition[]>> {
  return apiClient.get(FORM_BASE_PATH, {
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
  return apiClient.post(`${FORM_BASE_PATH}/${form_id}/validate`, { values: data });
}

/**
 * 自动填充表单
 */
export async function autoFillForm(
  form_id: string,
  context: Record<string, unknown>
): Promise<ApiResponse<FormData>> {
  return apiClient.post(`${FORM_BASE_PATH}/${form_id}/auto-fill`, { context });
}

/**
 * 从自然语言生成表单数据
 */
export async function generateFormFromText(
  form_id: string,
  text: string
): Promise<ApiResponse<FormData>> {
  return apiClient.post(`${FORM_BASE_PATH}/${form_id}/generate`, { text });
}

/**
 * 提交表单
 */
export async function submitForm(
  form_id: string,
  data: Record<string, unknown>,
  record_id?: string
): Promise<ApiResponse<FormData>> {
  return apiClient.post(`${FORM_BASE_PATH}/${form_id}/submit`, {
    values: data,
    record_id,
  });
}

/**
 * 保存表单草稿
 */
export async function saveFormDraft(
  form_id: string,
  data: Record<string, unknown>,
  record_id?: string
): Promise<ApiResponse<FormData>> {
  return apiClient.post(`${FORM_BASE_PATH}/${form_id}/draft`, {
    values: data,
    record_id,
  });
}

// ============================================================================
// 文档智能 API
// ============================================================================

const DOC_BASE_PATH = '/api/ai/documents';

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
  return apiClient.post(DOC_BASE_PATH, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 获取文档信息
 */
export async function getDocument(document_id: string): Promise<ApiResponse<DocumentInfo>> {
  return apiClient.get(`${DOC_BASE_PATH}/${document_id}`);
}

/**
 * 解析文档
 */
export async function parseDocument(document_id: string): Promise<ApiResponse<DocumentParseResult>> {
  return apiClient.post(`${DOC_BASE_PATH}/${document_id}/parse`);
}

/**
 * 生成文档摘要
 */
export async function generateDocumentSummary(
  document_id: string,
  summary_type: SummaryType = 'standard'
): Promise<ApiResponse<DocumentSummary>> {
  return apiClient.post(`${DOC_BASE_PATH}/${document_id}/summary`, { summary_type });
}

/**
 * 获取文档摘要
 */
export async function getDocumentSummary(
  document_id: string,
  summary_type?: SummaryType
): Promise<ApiResponse<DocumentSummary>> {
  return apiClient.get(`${DOC_BASE_PATH}/${document_id}/summary`, {
    params: summary_type ? { type: summary_type } : undefined,
  });
}

/**
 * 搜索文档内容
 */
export async function searchDocument(
  document_id: string,
  query: string
): Promise<ApiResponse<Array<{
  line_number: number;
  content: string;
  match_count: number;
}>>> {
  return apiClient.get(`${DOC_BASE_PATH}/${document_id}/search`, {
    params: { q: query },
  });
}

/**
 * 生成文档
 */
export async function generateDocument(
  request: DocumentGenerationRequest
): Promise<ApiResponse<DocumentInfo>> {
  return apiClient.post(`${DOC_BASE_PATH}/generate`, request);
}

/**
 * 下载文档
 */
export async function downloadDocument(document_id: string): Promise<Blob> {
  const response = await apiClient.get(`${DOC_BASE_PATH}/${document_id}/download`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

/**
 * 删除文档
 */
export async function deleteDocument(document_id: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`${DOC_BASE_PATH}/${document_id}`);
}

/**
 * 获取文档列表
 */
export async function listDocuments(
  params?: {
    page?: number;
    page_size?: number;
    document_type?: DocumentType;
    status?: DocumentProcessingStatus;
  }
): Promise<ApiResponse<{
  items: DocumentInfo[];
  total: number;
  page: number;
  page_size: number;
}>> {
  return apiClient.get(DOC_BASE_PATH, { params });
}
