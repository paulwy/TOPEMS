import apiClient from './client';
import type { ApiResponse } from './client';

export interface FileMetadata {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface FileListResponse {
  files: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export const docApi = {
  list: async () => {
    return apiClient.doc.get<ApiResponse<FileListResponse>>('/api/v1/files');
  },

  get: async (id: string) => {
    return apiClient.doc.get<ApiResponse<FileMetadata>>(`/api/v1/files/${id}`);
  },

  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.doc.post<ApiResponse<FileMetadata>>('/api/v1/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: async (id: string) => {
    return apiClient.doc.delete<ApiResponse<void>>(`/api/v1/files/${id}`);
  },

  health: async () => {
    return apiClient.doc.get<ApiResponse<string>>('/health');
  },
};
