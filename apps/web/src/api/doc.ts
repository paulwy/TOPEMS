import apiClient, { createBaseAxiosClient } from "./client";
import type { ApiResponse } from "./client";
import config from "../config/runtime";

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
  page_size: number;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string;
}

export const docApi = {
  list: async (folderId?: string): Promise<ApiResponse<FileListResponse>> => {
    const params = folderId ? { folder_id: folderId } : {};
    return apiClient.doc.get<FileListResponse>("/api/v1/files", { params });
  },

  get: async (id: string): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.get<FileMetadata>(`/api/v1/files/${id}`);
  },

  upload: async (
    file: File,
    folderId?: string,
  ): Promise<ApiResponse<FileMetadata>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) {
      formData.append("folder_id", folderId);
    }
    return apiClient.doc.post<FileMetadata>("/api/v1/files", formData);
  },

  download: async (id: string): Promise<Blob> => {
    const baseURL =
      (apiClient.doc as any).defaults?.baseURL || config.services.doc;
    const client = createBaseAxiosClient(baseURL);
    const response = await client.get(`/api/v1/files/${id}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  preview: async (id: string): Promise<string> => {
    const baseURL =
      (apiClient.doc as any).defaults?.baseURL || config.services.doc;
    return `${baseURL}/api/v1/files/${id}/preview`;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/api/v1/files/${id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.doc.get<string>("/health");
  },

  listFolders: async (
    parentId?: string,
  ): Promise<ApiResponse<ListFoldersData>> => {
    const params = parentId ? { parent_id: parentId } : {};
    return apiClient.doc.get<ListFoldersData>("/api/v1/folders", { params });
  },

  createFolder: async (
    request: CreateFolderRequest,
  ): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.post<Folder>("/api/v1/folders", request);
  },

  getFolder: async (id: string): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.get<Folder>(`/api/v1/folders/${id}`);
  },

  updateFolder: async (
    id: string,
    request: CreateFolderRequest,
  ): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.put<Folder>(`/api/v1/folders/${id}`, request);
  },

  deleteFolder: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/api/v1/folders/${id}`);
  },
};
