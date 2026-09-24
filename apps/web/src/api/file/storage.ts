/**
 * File · 存储管理与文件分类 API 绑定
 *
 * 后端: file 服务 /storage/*
 * 路由:
 *   GET    /storage/buckets
 *   POST   /storage/buckets
 *   GET    /storage/buckets/{id}
 *   PUT    /storage/buckets/{id}
 *   DELETE /storage/buckets/{id}
 *   GET    /storage/buckets/{id}/files
 *   GET    /storage/categories
 *   POST   /storage/categories
 *   PUT    /storage/categories/{id}
 *   DELETE /storage/categories/{id}
 *   GET    /storage/usage
 *   POST   /storage/cleanup
 *   GET    /storage/retention-policies
 *   POST   /storage/retention-policies
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface StorageBucket {
  id: string;
  name: string;
  slug: string;
  description?: string;
  provider: 'local' | 's3' | 'oss' | 'cos' | 'obs';
  region?: string;
  access_key_id?: string;
  bucket_name: string;
  base_url?: string;
  is_default: boolean;
  is_active: boolean;
  file_count: number;
  total_size: number;
  max_size?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBucketRequest {
  name: string;
  slug?: string;
  description?: string;
  provider: StorageBucket['provider'];
  region?: string;
  bucket_name: string;
  access_key_id?: string;
  access_key_secret?: string;
  base_url?: string;
  is_default?: boolean;
  max_size?: number;
}

export interface FileCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  allowed_types: string[];
  max_size?: number;
  description?: string;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
  allowed_types?: string[];
  max_size?: number;
  description?: string;
}

export interface StorageUsage {
  total_files: number;
  total_size: number;
  used_size: number;
  available_size: number;
  usage_percentage: number;
  by_provider: Array<{
    provider: string;
    file_count: number;
    size: number;
  }>;
  by_category: Array<{
    category: string;
    file_count: number;
    size: number;
  }>;
  recent_uploads: number;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  scope: 'category' | 'bucket' | 'all';
  scope_id?: string;
  retention_days: number;
  action: 'archive' | 'delete';
  auto_cleanup: boolean;
  last_cleanup_at?: string;
  created_at: string;
}

export const fileStorageApi = {
  // ==================== Bucket 管理 ====================

  listBuckets: async (params?: {
    provider?: StorageBucket['provider'];
    is_active?: boolean;
  }): Promise<ApiResponse<StorageBucket[]>> => {
    return apiClient.file.get('/storage/buckets', { params });
  },

  getBucket: async (id: string): Promise<ApiResponse<StorageBucket>> => {
    return apiClient.file.get(`/storage/buckets/${id}`);
  },

  createBucket: async (data: CreateBucketRequest): Promise<ApiResponse<StorageBucket>> => {
    return apiClient.file.post('/storage/buckets', data);
  },

  updateBucket: async (
    id: string,
    data: Partial<CreateBucketRequest>
  ): Promise<ApiResponse<StorageBucket>> => {
    return apiClient.file.put(`/storage/buckets/${id}`, data);
  },

  deleteBucket: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.file.delete(`/storage/buckets/${id}`);
  },

  listBucketFiles: async (
    bucketId: string,
    params?: { page?: number; page_size?: number; prefix?: string }
  ): Promise<ApiResponse<PaginatedResponse<Record<string, unknown>>>> => {
    return apiClient.file.get(`/storage/buckets/${bucketId}/files`, { params });
  },

  // ==================== 分类管理 ====================

  listCategories: async (): Promise<ApiResponse<FileCategory[]>> => {
    return apiClient.file.get('/storage/categories');
  },

  createCategory: async (data: CreateCategoryRequest): Promise<ApiResponse<FileCategory>> => {
    return apiClient.file.post('/storage/categories', data);
  },

  updateCategory: async (
    id: string,
    data: Partial<CreateCategoryRequest>
  ): Promise<ApiResponse<FileCategory>> => {
    return apiClient.file.put(`/storage/categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.file.delete(`/storage/categories/${id}`);
  },

  // ==================== 使用量 ====================

  getStorageUsage: async (): Promise<ApiResponse<StorageUsage>> => {
    return apiClient.file.get('/storage/usage');
  },

  cleanupStorage: async (data?: {
    category_ids?: string[];
    older_than_days?: number;
  }): Promise<ApiResponse<{ cleaned_files: number; freed_size: number }>> => {
    return apiClient.file.post('/storage/cleanup', data || {});
  },

  // ==================== 保留策略 ====================

  listRetentionPolicies: async (): Promise<ApiResponse<RetentionPolicy[]>> => {
    return apiClient.file.get('/storage/retention-policies');
  },

  createRetentionPolicy: async (
    data: Omit<RetentionPolicy, 'id' | 'last_cleanup_at' | 'created_at'>
  ): Promise<ApiResponse<RetentionPolicy>> => {
    return apiClient.file.post('/storage/retention-policies', data);
  },
};

export default fileStorageApi;
