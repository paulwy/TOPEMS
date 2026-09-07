import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface Document {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  file_url?: string;
  file_size?: number;
  uploader?: string;
  created_at: string;
  updated_at: string;
}

interface DocumentListResponse {
  items: Document[];
  total: number;
}

export interface CreateDocumentRequest {
  title: string;
  doc_type?: string;
  status?: string;
  file_url?: string;
  file_size?: number;
  uploader?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  doc_type?: string;
  status?: string;
  file_url?: string;
  file_size?: number;
  uploader?: string;
}

export const documentApi = {
  async list(
    params?: PaginationParams & { doc_type?: string }
  ): Promise<ApiResponse<DocumentListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if ((params as { doc_type?: string })?.doc_type)
      searchParams.set('doc_type', (params as { doc_type?: string }).doc_type as string);

    const queryString = searchParams.toString();
    return apiClient.erp.get<DocumentListResponse>(
      `/documents${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<Document>> {
    return apiClient.erp.get<Document>(`/documents/${id}`);
  },

  async create(data: CreateDocumentRequest): Promise<ApiResponse<Document>> {
    return apiClient.erp.post<Document>('/documents', data);
  },

  async update(id: string, data: UpdateDocumentRequest): Promise<ApiResponse<Document>> {
    return apiClient.erp.put<Document>(`/documents/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/documents/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },
};

function resolvePageSize(params?: PaginationParams): string | undefined {
  const v = params?.pageSize ?? params?.pagesize;
  return typeof v === 'number' && v > 0 ? v.toString() : undefined;
}
