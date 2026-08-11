/**
 * File · 图像处理与缩略图 API 绑定
 *
 * 后端: file 服务 /images/*
 * 路由:
 *   POST   /images/thumbnail
 *   GET    /images/{id}/thumbnails
 *   DELETE /images/{id}/thumbnails/{size}
 *   POST   /images/{id}/convert
 *   POST   /images/{id}/compress
 *   POST   /images/{id}/crop
 *   POST   /images/{id}/resize
 *   POST   /images/batch-process
 *   GET    /images/formats
 *   GET    /images/{id}/metadata
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ThumbnailSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type ImageFormat = 'jpg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tiff';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  mode?: 'fit' | 'cover' | 'contain' | 'fill';
}

export interface Thumbnail {
  id: string;
  file_id: string;
  size: ThumbnailSize;
  width: number;
  height: number;
  url: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ImageMetadata {
  file_id: string;
  width: number;
  height: number;
  color_depth?: number;
  color_space?: string;
  format: ImageFormat;
  file_size: number;
  has_alpha: boolean;
  is_animated: boolean;
  frame_count?: number;
  dpi?: { x: number; y: number };
  exif?: Record<string, unknown>;
  created_at?: string;
}

export interface ConvertRequest {
  target_format: ImageFormat;
  quality?: number;
  width?: number;
  height?: number;
  maintain_aspect_ratio?: boolean;
}

export interface CompressRequest {
  quality?: number;
  max_width?: number;
  max_height?: number;
  target_size_bytes?: number;
  format?: ImageFormat;
}

export interface CropRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  aspect_ratio?: string;
}

export interface ResizeRequest {
  width?: number;
  height?: number;
  mode?: 'fit' | 'cover' | 'stretch';
  maintain_aspect_ratio?: boolean;
}

export const fileImageApi = {
  // ==================== 缩略图 ====================

  generateThumbnail: async (
    fileId: string,
    data: ThumbnailOptions & { size?: ThumbnailSize }
  ): Promise<ApiResponse<Thumbnail>> => {
    return apiClient.file.post(`/images/thumbnail`, { file_id: fileId, ...data });
  },

  listThumbnails: async (fileId: string): Promise<ApiResponse<Thumbnail[]>> => {
    return apiClient.file.get(`/images/${fileId}/thumbnails`);
  },

  deleteThumbnail: async (fileId: string, size: ThumbnailSize): Promise<ApiResponse<string>> => {
    return apiClient.file.delete(`/images/${fileId}/thumbnails/${size}`);
  },

  // ==================== 图片操作 ====================

  convert: async (
    fileId: string,
    data: ConvertRequest
  ): Promise<ApiResponse<{ url: string; format: string; size: number }>> => {
    return apiClient.file.post(`/images/${fileId}/convert`, data);
  },

  compress: async (
    fileId: string,
    data: CompressRequest
  ): Promise<
    ApiResponse<{ url: string; original_size: number; compressed_size: number; ratio: number }>
  > => {
    return apiClient.file.post(`/images/${fileId}/compress`, data);
  },

  crop: async (
    fileId: string,
    data: CropRequest
  ): Promise<ApiResponse<{ url: string; width: number; height: number }>> => {
    return apiClient.file.post(`/images/${fileId}/crop`, data);
  },

  resize: async (
    fileId: string,
    data: ResizeRequest
  ): Promise<ApiResponse<{ url: string; width: number; height: number }>> => {
    return apiClient.file.post(`/images/${fileId}/resize`, data);
  },

  // ==================== 批量处理 ====================

  batchProcess: async (data: {
    file_ids: string[];
    operations: Array<
      | { type: 'convert'; params: ConvertRequest }
      | { type: 'compress'; params: CompressRequest }
      | { type: 'resize'; params: ResizeRequest }
    >;
  }): Promise<
    ApiResponse<{
      processed: number;
      failed: number;
      results: Array<{ file_id: string; success: boolean; url?: string; error?: string }>;
    }>
  > => {
    return apiClient.file.post('/images/batch-process', data);
  },

  // ==================== 元数据 ====================

  getSupportedFormats: async (): Promise<ApiResponse<ImageFormat[]>> => {
    return apiClient.file.get('/images/formats');
  },

  getMetadata: async (fileId: string): Promise<ApiResponse<ImageMetadata>> => {
    return apiClient.file.get(`/images/${fileId}/metadata`);
  },
};

export default fileImageApi;
