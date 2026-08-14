import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';

import { fileStorageApi } from './storage';
import type {
  StorageBucket,
  CreateBucketRequest,
  FileCategory,
  CreateCategoryRequest,
  StorageUsage,
  RetentionPolicy,
} from './storage';
import i18n from '@/i18n';

import { fileImageApi } from './image';
import type {
  ThumbnailSize,
  ImageFormat,
  ThumbnailOptions,
  Thumbnail,
  ImageMetadata,
  ConvertRequest,
  CompressRequest,
  CropRequest,
  ResizeRequest,
} from './image';

import { fileScanApi } from './scan';
import type {
  ScanStatus,
  ThreatSeverity,
  ScanResult,
  Threat,
  ScanRule,
  CreateScanRuleRequest,
  QuarantineItem,
  ScanStats,
} from './scan';

export interface FileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  content_type: string;
  path: string;
  visibility: 'private' | 'public' | 'department';
  category?: string;
  owner_id: string;
  owner_department_id?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ShareFileRequest {
  principal_type: 'user' | 'group' | 'department';
  principal_id: string;
  permission: 'read' | 'write' | 'manage';
}

export interface FilePermission {
  id: string;
  file_id: string;
  principal_type: 'user' | 'group' | 'department';
  principal_id: string;
  principal_name?: string;
  permission: 'read' | 'write' | 'manage';
  granted_by?: string;
  granted_at?: string;
  created_at: string;
}

export interface FileStats {
  total_files: number;
  totalsize: number;
  today_uploads: number;
  storage_used: number;
  storage_limit: number;
}

export interface ListFilesQuery {
  page?: number;
  pagesize?: number;
  search?: string;
  category?: string;
  owner_id?: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export interface ShareInfo {
  file_id: string;
  file_name: string;
  shared_with: SharedWith[];
}

export interface SharedWith {
  id: string;
  name: string;
  type: 'user' | 'group' | 'department';
  permission: 'read' | 'write' | 'manage';
}

export interface ExportRequest {
  ids?: string[];
  format?: string;
}

export const fileApi = {
  // ==================== 核心 CRUD ====================

  async upload(
    file: File,
    options?: {
      category?: string;
      visibility?: 'private' | 'public' | 'department';
      external_id?: string;
    }
  ): Promise<ApiResponse<FileMetadata>> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) {
      formData.append('category', options.category);
    }
    if (options?.visibility) {
      formData.append('visibility', options.visibility);
    }
    if (options?.external_id) {
      formData.append('external_id', options.external_id);
    }

    const token = localStorage.getItem('token');

    return apiClient.file.post<FileMetadata>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  },

  async list(params?: ListFilesQuery): Promise<ApiResponse<PagedResponse<FileMetadata>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id);

    const queryString = searchParams.toString();
    return apiClient.file.get<PagedResponse<FileMetadata>>(
      `/files${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<FileMetadata>> {
    return apiClient.file.get<FileMetadata>(`/files/${id}`);
  },

  async download(id: string): Promise<Blob> {
    const baseURL = apiClient.file.defaults?.baseURL || config.services.file;
    return downloadBlob(baseURL, `/download/${id}`);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.file.delete<string>(`/files/${id}`);
  },

  // ==================== 分享与权限 ====================

  async share(id: string, request: ShareFileRequest): Promise<ApiResponse<FilePermission>> {
    return apiClient.file.post<FilePermission>(`/files/${id}/share`, request);
  },

  async getPermissions(id: string): Promise<ApiResponse<FilePermission[]>> {
    return apiClient.file.get<FilePermission[]>(`/files/${id}/permissions`);
  },

  async revokePermission(
    id: string,
    principal_type: string,
    principal_id: string,
    permission: string
  ): Promise<ApiResponse<string>> {
    return apiClient.file.delete<string>(
      `/files/${id}/permissions/revoke/${principal_type}/${principal_id}/${permission}`
    );
  },

  async getSharedFiles(): Promise<ApiResponse<ShareInfo[]>> {
    return apiClient.file.get<ShareInfo[]>('/files/shared');
  },

  async getStats(): Promise<ApiResponse<FileStats>> {
    return apiClient.file.get<FileStats>('/files/stats');
  },

  async export(request: ExportRequest): Promise<ApiResponse<unknown>> {
    return apiClient.file.post('/files/export', request);
  },

  async health(): Promise<ApiResponse<string>> {
    return apiClient.file.get<string>('/health');
  },

  // ==================== 子域：存储管理 ====================

  storage: fileStorageApi,

  // ==================== 子域：图像处理 ====================

  image: fileImageApi,

  // ==================== 子域：安全扫描 ====================

  scan: fileScanApi,

  // ==================== 顶层快捷方法 ====================

  // 存储快捷方法
  listBuckets: fileStorageApi.listBuckets,
  createBucket: fileStorageApi.createBucket,
  listCategories: fileStorageApi.listCategories,
  getStorageUsage: fileStorageApi.getStorageUsage,
  cleanupStorage: fileStorageApi.cleanupStorage,
  listRetentionPolicies: fileStorageApi.listRetentionPolicies,

  // 图像处理快捷方法
  generateThumbnail: fileImageApi.generateThumbnail,
  convertImage: fileImageApi.convert,
  compressImage: fileImageApi.compress,
  resizeImage: fileImageApi.resize,
  getImageMetadata: fileImageApi.getMetadata,
  batchProcess: fileImageApi.batchProcess,

  // 安全扫描快捷方法
  scanFile: fileScanApi.scanFile,
  getScanResult: fileScanApi.getScanResult,
  batchScan: fileScanApi.batchScan,
  listScanRules: fileScanApi.listScanRules,
  listQuarantine: fileScanApi.listQuarantine,
  getScanStats: fileScanApi.getScanStats,
};

// ==================== 常量 ====================

export const VISIBILITY_OPTIONS = [
  { value: 'private', label: i18n.t('shared.index.k1'), description: i18n.t('shared.index.k0') },
  { value: 'public', label: i18n.t('shared.index.k3'), description: i18n.t('shared.index.k2') },
  { value: 'department', label: i18n.t('shared.index.k5'), description: i18n.t('shared.index.k4') },
];

export const PERMISSION_OPTIONS = [
  { value: 'read', label: i18n.t('shared.index.k7'), description: i18n.t('shared.index.k6') },
  { value: 'write', label: i18n.t('shared.index.k9'), description: i18n.t('shared.index.k8') },
  { value: 'manage', label: i18n.t('shared.index.k11'), description: i18n.t('shared.index.k10') },
];

export const PRINCIPAL_TYPE_OPTIONS = [
  { value: 'user', label: i18n.t('shared.index.k12') },
  { value: 'group', label: i18n.t('shared.index.k13') },
  { value: 'department', label: i18n.t('shared.index.k14') },
];

// ==================== 工具函数 ====================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('word') || contentType.includes('document')) return 'word';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'excel';
  if (contentType.includes('powerpoint') || contentType.includes('presentation')) return 'ppt';
  if (contentType.includes('zip') || contentType.includes('archive')) return 'archive';
  if (contentType.includes('video/')) return 'video';
  if (contentType.includes('audio/')) return 'audio';
  return 'file';
}

// ==================== 类型导出 ====================

export type {
  StorageBucket,
  CreateBucketRequest,
  FileCategory,
  CreateCategoryRequest,
  StorageUsage,
  RetentionPolicy,
  ThumbnailSize,
  ImageFormat,
  ThumbnailOptions,
  Thumbnail,
  ImageMetadata,
  ConvertRequest,
  CompressRequest,
  CropRequest,
  ResizeRequest,
  ScanStatus,
  ThreatSeverity,
  ScanResult,
  Threat,
  ScanRule,
  CreateScanRuleRequest,
  QuarantineItem,
  ScanStats,
};

export default fileApi;
