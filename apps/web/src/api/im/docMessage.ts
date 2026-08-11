import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DocumentType = 'pdf' | 'word' | 'excel' | 'ppt' | 'text' | 'code' | 'image' | 'other';
export type AnnotationType = 'highlight' | 'underline' | 'strikeout' | 'comment' | 'signature';
export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'md' | 'txt' | 'image';
export type DocumentPermission = 'view' | 'comment' | 'edit' | 'manage';
export type WatermarkPosition =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'diagonal';

export interface DocumentPreview {
  id: string;
  document_id: string;
  document_type: DocumentType;
  page_count: number;
  current_page: number;
  preview_url: string;
  preview_html?: string;
  file_size: number;
  file_name: string;
  mime_type: string;
  thumbnail_url?: string;
  metadata?: DocumentMetadata;
  expires_at?: string;
}

export interface DocumentPage {
  page_number: number;
  content: string;
  width: number;
  height: number;
  has_text: boolean;
}

export interface DocumentSearchResult {
  query: string;
  total_matches: number;
  matches: {
    page_number: number;
    snippet: string;
    offset: number;
    length: number;
  }[];
}

export interface DocumentOutline {
  level: number;
  title: string;
  page_number: number;
  children?: DocumentOutline[];
}

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  page_number: number;
  annotation_type: AnnotationType;
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
  author_id: string;
  author_name: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  replies?: DocumentAnnotationReply[];
}

export interface DocumentAnnotationReply {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_size: number;
  change_summary: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  is_current: boolean;
}

export interface DocumentPermissionSet {
  can_view: boolean;
  can_comment: boolean;
  can_edit: boolean;
  can_manage: boolean;
  can_download: boolean;
  can_print: boolean;
  can_export: boolean;
  can_share: boolean;
}

export interface DocumentMetadata {
  id: string;
  file_name: string;
  file_size: number;
  document_type: DocumentType;
  page_count?: number;
  word_count?: number;
  author?: string;
  created_at?: string;
  modified_at?: string;
  created_by_chat_id?: string;
  created_by_message_id?: string;
  tags?: string[];
  description?: string;
  custom_properties?: Record<string, unknown>;
}

export interface DocumentReadReceipt {
  user_id: string;
  user_name: string;
  first_read_at: string;
  last_read_at: string;
  read_count: number;
  last_page_read?: number;
}

export interface DocumentActivity {
  id: string;
  document_id: string;
  activity_type: 'view' | 'edit' | 'comment' | 'share' | 'export' | 'download' | 'sign';
  actor_id: string;
  actor_name: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  position: WatermarkPosition;
  opacity: number;
  color: string;
  font_size: number;
}

export interface CreateAnnotationRequest {
  page_number: number;
  annotation_type: AnnotationType;
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
  reply_to?: string;
}

export interface ExportDocumentRequest {
  format: ExportFormat;
  page_range?: string;
  include_annotations?: boolean;
  watermark?: WatermarkConfig;
}

export interface SignDocumentRequest {
  signature_type: 'draw' | 'typed' | 'image';
  signature_data: string;
  signer_name: string;
  signer_id: string;
  position?: {
    page_number: number;
    x: number;
    y: number;
  };
}

export interface ShareDocumentLinkRequest {
  permission: DocumentPermission;
  expires_at?: string;
  password?: string;
  allow_download?: boolean;
  allow_print?: boolean;
  watermark?: WatermarkConfig;
}

export interface UpdateDocumentPermissionsRequest {
  permission: DocumentPermission;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_export?: boolean;
  require_watermark?: boolean;
  watermark_text?: string;
}

export interface DocumentStats {
  document_id: string;
  view_count: number;
  unique_viewers: number;
  download_count: number;
  share_count: number;
  comment_count: number;
  export_count: number;
  last_viewed_at?: string;
  last_activity_at?: string;
}

export const imDocMessageApi = {
  // ==================== 文档预览引擎 ====================

  getDocumentPreview: async (
    documentId: string,
    params?: { page?: number; width?: number; height?: number }
  ): Promise<ApiResponse<DocumentPreview>> => {
    return apiClient.im.get(`/im/documents/${documentId}/preview`, { params });
  },

  getDocumentPages: async (
    documentId: string,
    params?: { start_page?: number; end_page?: number }
  ): Promise<ApiResponse<DocumentPage[]>> => {
    return apiClient.im.get(`/im/documents/${documentId}/pages`, { params });
  },

  renderDocumentPage: async (
    documentId: string,
    pageNumber: number,
    params?: { format?: 'image' | 'html'; width?: number; height?: number }
  ): Promise<
    ApiResponse<{ rendered_url: string; width: number; height: number; file_size: number }>
  > => {
    return apiClient.im.get(`/im/documents/${documentId}/pages/${pageNumber}/render`, { params });
  },

  searchInDocument: async (
    documentId: string,
    query: string,
    params?: { case_sensitive?: boolean; whole_word?: boolean }
  ): Promise<ApiResponse<DocumentSearchResult>> => {
    return apiClient.im.get(`/im/documents/${documentId}/search`, {
      params: { query, ...params },
    });
  },

  getDocumentOutline: async (documentId: string): Promise<ApiResponse<DocumentOutline[]>> => {
    return apiClient.im.get(`/im/documents/${documentId}/outline`);
  },

  getDocumentThumbnails: async (
    documentId: string,
    params?: { page_numbers?: number[]; size?: 'small' | 'medium' | 'large' }
  ): Promise<ApiResponse<{ page_number: number; thumbnail_url: string }[]>> => {
    return apiClient.im.get(`/im/documents/${documentId}/thumbnails`, { params });
  },

  // ==================== 文档批注与协作 ====================

  listDocumentAnnotations: async (
    documentId: string,
    params?: { page_number?: number; annotation_type?: AnnotationType; resolved?: boolean }
  ): Promise<ApiResponse<PaginatedResponse<DocumentAnnotation>>> => {
    return apiClient.im.get(`/im/documents/${documentId}/annotations`, { params });
  },

  addDocumentAnnotation: async (
    documentId: string,
    data: CreateAnnotationRequest
  ): Promise<ApiResponse<DocumentAnnotation>> => {
    return apiClient.im.post(`/im/documents/${documentId}/annotations`, data);
  },

  resolveDocumentAnnotation: async (
    documentId: string,
    annotationId: string
  ): Promise<ApiResponse<DocumentAnnotation>> => {
    return apiClient.im.post(`/im/documents/${documentId}/annotations/${annotationId}/resolve`);
  },

  deleteDocumentAnnotation: async (
    documentId: string,
    annotationId: string
  ): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/documents/${documentId}/annotations/${annotationId}`);
  },

  getDocumentActivity: async (
    documentId: string,
    params?: {
      activity_type?: DocumentActivity['activity_type'];
      page?: number;
      page_size?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<DocumentActivity>>> => {
    return apiClient.im.get(`/im/documents/${documentId}/activity`, { params });
  },

  // ==================== 文档操作 ====================

  exportDocument: async (
    documentId: string,
    data: ExportDocumentRequest
  ): Promise<ApiResponse<{ export_url: string; file_name: string; file_size: number }>> => {
    return apiClient.im.post(`/im/documents/${documentId}/export`, data);
  },

  printDocument: async (
    documentId: string,
    params?: { page_range?: string; include_annotations?: boolean }
  ): Promise<ApiResponse<{ print_url: string }>> => {
    return apiClient.im.get(`/im/documents/${documentId}/print`, { params });
  },

  signDocument: async (
    documentId: string,
    data: SignDocumentRequest
  ): Promise<ApiResponse<DocumentAnnotation>> => {
    return apiClient.im.post(`/im/documents/${documentId}/sign`, data);
  },

  shareDocumentLink: async (
    documentId: string,
    data: ShareDocumentLinkRequest
  ): Promise<ApiResponse<{ share_url: string; expires_at?: string; password?: string }>> => {
    return apiClient.im.post(`/im/documents/${documentId}/share`, data);
  },

  getDocumentVersion: async (
    documentId: string,
    versionId: string
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.im.get(`/im/documents/${documentId}/versions/${versionId}`);
  },

  // ==================== 文档安全与权限 ====================

  getDocumentPermissions: async (
    documentId: string
  ): Promise<ApiResponse<DocumentPermissionSet>> => {
    return apiClient.im.get(`/im/documents/${documentId}/permissions`);
  },

  updateDocumentPermissions: async (
    documentId: string,
    data: UpdateDocumentPermissionsRequest
  ): Promise<ApiResponse<DocumentPermissionSet>> => {
    return apiClient.im.put(`/im/documents/${documentId}/permissions`, data);
  },

  getDocumentWatermark: async (documentId: string): Promise<ApiResponse<WatermarkConfig>> => {
    return apiClient.im.get(`/im/documents/${documentId}/watermark`);
  },

  setDocumentWatermark: async (
    documentId: string,
    data: WatermarkConfig
  ): Promise<ApiResponse<WatermarkConfig>> => {
    return apiClient.im.put(`/im/documents/${documentId}/watermark`, data);
  },

  checkDocumentSensitivity: async (
    documentId: string
  ): Promise<
    ApiResponse<{
      has_sensitive_data: boolean;
      sensitive_types: string[];
      details: { type: string; page: number; snippet: string }[];
    }>
  > => {
    return apiClient.im.post(`/im/documents/${documentId}/check-sensitivity`);
  },

  // ==================== 文档元数据与统计 ====================

  getDocumentMetadata: async (documentId: string): Promise<ApiResponse<DocumentMetadata>> => {
    return apiClient.im.get(`/im/documents/${documentId}/metadata`);
  },

  updateDocumentMetadata: async (
    documentId: string,
    data: Partial<Pick<DocumentMetadata, 'tags' | 'description' | 'custom_properties'>>
  ): Promise<ApiResponse<DocumentMetadata>> => {
    return apiClient.im.put(`/im/documents/${documentId}/metadata`, data);
  },

  getDocumentReadReceipts: async (
    documentId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<DocumentReadReceipt>>> => {
    return apiClient.im.get(`/im/documents/${documentId}/read-receipts`, { params });
  },

  getDocumentStats: async (documentId: string): Promise<ApiResponse<DocumentStats>> => {
    return apiClient.im.get(`/im/documents/${documentId}/stats`);
  },

  listDocumentVersions: async (
    documentId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<DocumentVersion>>> => {
    return apiClient.im.get(`/im/documents/${documentId}/versions`, { params });
  },
};
