import { createRequest } from '@topems/shared-utils';
import type { FileRecord } from '@topems/shared-types';

const api = createRequest('/api/core/file');

export interface FileItem extends FileRecord {
  folderId?: string;
  updatedAt: string;
  visibility?: 'private' | 'public' | 'department';
  tags?: string[];
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListFilesParams {
  page?: number;
  pageSize?: number;
  folderId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadOptions {
  folderId?: string;
  visibility?: 'private' | 'public' | 'department';
  onProgress?: (percent: number) => void;
}

export const fileApi = {
  uploadFile: async (file: File, options?: UploadOptions): Promise<FileItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.folderId) {
      formData.append('folderId', options.folderId);
    }
    if (options?.visibility) {
      formData.append('visibility', options.visibility);
    }

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && options?.onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(percent);
        }
      },
    });
    return response.data;
  },

  uploadMultiple: async (files: File[], options?: UploadOptions): Promise<FileItem[]> => {
    const results: FileItem[] = [];
    for (const file of files) {
      const result = await fileApi.uploadFile(file, options);
      results.push(result);
    }
    return results;
  },

  downloadFile: async (id: string): Promise<Blob> => {
    const response = await api.get(`/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getFileUrl: (id: string): string => {
    return `/api/core/file/${id}/download`;
  },

  listFiles: async (params?: ListFilesParams): Promise<PaginatedResponse<FileItem>> => {
    const response = await api.get('', { params });
    return response.data;
  },

  getFile: async (id: string): Promise<FileItem> => {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  deleteFile: async (id: string): Promise<void> => {
    await api.delete(`/${id}`);
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await api.post('/bulk-delete', { ids });
  },

  renameFile: async (id: string, name: string): Promise<FileItem> => {
    const response = await api.put(`/${id}/rename`, { name });
    return response.data;
  },

  searchFiles: async (keyword: string, params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<FileItem>> => {
    const response = await api.get('/search', {
      params: { keyword, ...params },
    });
    return response.data;
  },

  listFolders: async (parentId?: string | null): Promise<FolderItem[]> => {
    const response = await api.get('/folders', {
      params: { parentId: parentId || undefined },
    });
    return response.data;
  },

  createFolder: async (name: string, parentId?: string): Promise<FolderItem> => {
    const response = await api.post('/folders', { name, parentId });
    return response.data;
  },

  deleteFolder: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`);
  },

  renameFolder: async (id: string, name: string): Promise<FolderItem> => {
    const response = await api.put(`/folders/${id}/rename`, { name });
    return response.data;
  },

  getFolderTree: async (): Promise<FolderItem[]> => {
    const response = await api.get('/folders/tree');
    return response.data;
  },
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return 'archive';
  if (mimeType.includes('video/')) return 'video';
  if (mimeType.includes('audio/')) return 'audio';
  if (mimeType.includes('text/')) return 'text';
  return 'file';
}
