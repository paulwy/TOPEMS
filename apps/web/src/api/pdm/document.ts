import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PdmDocument {
  id: string;
  document_no: string;
  name: string;
  type: 'specification' | 'manual' | 'drawing' | 'report' | 'procedure' | 'other';
  category?: string;
  current_version: string;
  version_count: number;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  filesize?: number;
  file_type?: string;
  uploader_id?: string;
  uploader_name?: string;
  tags?: string[];
  description?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface CreatePdmDocumentRequest {
  document_no: string;
  name: string;
  type: string;
  category?: string;
  status?: string;
  tags?: string[];
  description?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  type?: string;
  version_number: string;
  title: string;
  description?: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  file_url?: string;
  filesize?: number;
  file_type?: string;
  changes: string[];
  created_by: string;
  created_by_name?: string;
  reviewed_by?: string;
  approved_by?: string;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}

interface CreateDocumentVersionRequest {
  document_id: string;
  version_number: string;
  title: string;
  description?: string;
  file_url?: string;
  changes: string[];
}

interface DocumentSearchParams {
  keyword?: string;
  type?: string;
  category?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface DocumentSearchResult {
  documents: PdmDocument[];
  total: number;
  page: number;
  page_size: number;
}

export const documentApi = {
  // Documents
  listDocuments: async (params?: DocumentSearchParams): Promise<ApiResponse<PdmDocument[]>> => {
    return documentApi.list(params);
  },
  list: async (params?: DocumentSearchParams): Promise<ApiResponse<PdmDocument[]>> => {
    return apiClient.pdm.get<PdmDocument[]>('/documents', { params });
  },
  search: async (params: DocumentSearchParams): Promise<ApiResponse<DocumentSearchResult>> => {
    return apiClient.pdm.post<DocumentSearchResult>('/documents/search', params);
  },
  get: async (id: string): Promise<ApiResponse<PdmDocument>> => {
    return apiClient.pdm.get<PdmDocument>(`/documents/${id}`);
  },
  create: async (data: CreatePdmDocumentRequest): Promise<ApiResponse<PdmDocument>> => {
    return apiClient.pdm.post<PdmDocument>('/documents', data);
  },
  update: async (
    id: string,
    data: Partial<CreatePdmDocumentRequest>
  ): Promise<ApiResponse<PdmDocument>> => {
    return apiClient.pdm.put<PdmDocument>(`/documents/${id}`, data);
  },
  delete: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/documents/${id}`);
  },
  updateStatus: async (id: string, status: string): Promise<ApiResponse<PdmDocument>> => {
    return apiClient.pdm.put<PdmDocument>(`/documents/${id}/status`, { status });
  },

  // Document Versions
  listVersions: async (documentId: string): Promise<ApiResponse<DocumentVersion[]>> => {
    return apiClient.pdm.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
  },
  getVersion: async (
    documentId: string,
    versionId: string
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.get<DocumentVersion>(`/documents/${documentId}/versions/${versionId}`);
  },
  createVersion: async (
    data: CreateDocumentVersionRequest
  ): Promise<ApiResponse<DocumentVersion>> => {
    const documentId = data.document_id;
    return apiClient.pdm.post<DocumentVersion>(`/documents/${documentId}/versions`, data);
  },
  updateVersion: async (
    documentId: string,
    versionId: string,
    data: Partial<CreateDocumentVersionRequest>
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.put<DocumentVersion>(
      `/documents/${documentId}/versions/${versionId}`,
      data
    );
  },
  deleteVersion: async (documentId: string, versionId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.pdm.delete<boolean>(`/documents/${documentId}/versions/${versionId}`);
  },
  publishVersion: async (
    documentId: string,
    versionId: string
  ): Promise<ApiResponse<DocumentVersion>> => {
    return apiClient.pdm.post<DocumentVersion>(
      `/documents/${documentId}/versions/${versionId}/publish`,
      {}
    );
  },

  // Document Upload
  upload: async (documentId: string, file: File): Promise<ApiResponse<DocumentVersion>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.pdm.post<DocumentVersion>(`/documents/${documentId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Document Download
  downloadVersion: async (documentId: string, versionId: string): Promise<ApiResponse<string>> => {
    return apiClient.pdm.get<string>(`/documents/${documentId}/versions/${versionId}/download`);
  },
};
