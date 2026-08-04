import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';

export interface FileMetadata {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  version?: number;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  size: number;
  content_type: string;
  created_at: string;
  created_by: string;
  change_note?: string;
  download_url?: string;
}

export interface FileListResponse {
  files?: FileMetadata[];
  items?: FileMetadata[];
  total: number;
  page: number;
  pagesize: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ListFoldersData {
  folders?: Folder[];
  items?: Folder[];
  total: number;
  page: number;
  pagesize: number;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface UploadFileResponse {
  id: string;
  name: string;
  size: number;
  content_type: string;
  url: string;
}

export interface DocDashboardStats {
  total_documents: number;
  published_documents: number;
  draft_documents: number;
  archived_documents: number;
  total_folders: number;
  total_templates: number;
  active_templates: number;
  this_month_created: number;
  this_month_updated: number;
}

export const docApi = {
  list: async (folderId?: string): Promise<ApiResponse<FileListResponse>> => {
    const params = folderId ? { folder_id: folderId } : {};
    return apiClient.doc.get<FileListResponse>('/documents', { params });
  },

  get: async (id: string): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.get<FileMetadata>(`/documents/${id}`);
  },

  upload: async (file: File, folderId?: string): Promise<ApiResponse<FileMetadata>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    return apiClient.file.post<FileMetadata>('/upload', formData);
  },

  download: async (id: string): Promise<Blob> => {
    return downloadBlob(config.services.file, `/download/${id}`);
  },

  preview: async (id: string): Promise<string> => {
    return `${config.services.file}/files/${id}/preview`;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/documents/${id}`);
  },

  listFolders: async (parentId?: string): Promise<ApiResponse<ListFoldersData>> => {
    const params = parentId ? { parentId } : {};
    return apiClient.doc.get<ListFoldersData>('/folders', { params });
  },

  createFolder: async (request: CreateFolderRequest): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.post<Folder>('/folders', request);
  },

  getFolder: async (id: string): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.get<Folder>(`/folders/${id}`);
  },

  updateFolder: async (id: string, request: CreateFolderRequest): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.put<Folder>(`/folders/${id}`, request);
  },

  deleteFolder: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/folders/${id}`);
  },

  getVersions: async (fileId: string): Promise<ApiResponse<FileVersion[]>> => {
    return apiClient.doc.get<FileVersion[]>(`/documents/${fileId}/versions`);
  },

  getVersion: async (fileId: string, version: number): Promise<ApiResponse<FileVersion>> => {
    return apiClient.doc.get<FileVersion>(`/documents/${fileId}/versions/${version}`);
  },

  restoreVersion: async (fileId: string, version: number): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.post<FileMetadata>(`/documents/${fileId}/versions/${version}/restore`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.doc.get<string>('/health');
  },

  getDashboard: async (): Promise<ApiResponse<DocDashboardStats>> => {
    return apiClient.doc.get<DocDashboardStats>('/dashboard');
  },
};

export default docApi;
