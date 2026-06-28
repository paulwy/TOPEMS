import apiClient, { downloadBlob } from './client';
import type { ApiResponse } from './client';
import config from '../config/runtime';

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
  files: FileMetadata[];
  total: number;
  page: number;
  pagesize: number;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ListFoldersData {
  folders: Folder[];
  total: number;
  page: number;
  pagesize: number;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string;
}

// 文件上传使用 file 服务
export interface UploadFileResponse {
  id: string;
  name: string;
  size: number;
  content_type: string;
  url: string;
}

export const docApi = {
  // ========== 文档操作 (使用 /api/core/doc/*) ==========

  list: async (folderId?: string): Promise<ApiResponse<FileListResponse>> => {
    const params = folderId ? { folder_id: folderId } : {};
    // 使用 doc 服务，路径 /doc/* 会被代理到 /api/core/doc/*
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
    // 上传使用 file 服务
    return apiClient.file.post<FileMetadata>('/upload', formData);
  },

  download: async (id: string): Promise<Blob> => {
    // 使用 file 服务下载
    return downloadBlob(config.services.file, `/download/${id}`);
  },

  preview: async (id: string): Promise<string> => {
    // 使用 file 服务预览
    return `${config.services.file}/files/${id}/preview`;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/documents/${id}`);
  },

  // ========== 文件夹操作 (使用 /api/core/doc/folders) ==========

  listFolders: async (parentId?: string): Promise<ApiResponse<ListFoldersData>> => {
    const params = parentId ? { parent_id: parentId } : {};
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

  // ========== 版本历史 ==========

  getVersions: async (fileId: string): Promise<ApiResponse<FileVersion[]>> => {
    return apiClient.doc.get<FileVersion[]>(`/documents/${fileId}/versions`);
  },

  getVersion: async (fileId: string, version: number): Promise<ApiResponse<FileVersion>> => {
    return apiClient.doc.get<FileVersion>(`/documents/${fileId}/versions/${version}`);
  },

  restoreVersion: async (fileId: string, version: number): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.post<FileMetadata>(`/documents/${fileId}/versions/${version}/restore`);
  },

  // ========== 健康检查 ==========

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.doc.get<string>('/health');
  },
};
