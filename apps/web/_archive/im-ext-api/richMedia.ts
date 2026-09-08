import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type RichMediaType =
  'image' | 'video' | 'audio' | 'file' | 'document' | 'location' | 'contact_card';
export type MediaStatus = 'uploading' | 'ready' | 'processing' | 'failed' | 'expired';
export type MediaQuality = 'low' | 'medium' | 'high' | 'original';

export interface RichMedia {
  id: string;
  chat_id: string;
  message_id?: string;
  media_type: RichMediaType;
  url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  status: MediaStatus;
  quality: MediaQuality;
  metadata?: Record<string, unknown>;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  expires_at?: string;
}

export interface UploadMediaRequest {
  file_name: string;
  file_size: number;
  mime_type: string;
  media_type: RichMediaType;
  chat_id?: string;
  quality?: MediaQuality;
}

export interface UploadMediaResponse {
  media_id: string;
  upload_url: string;
  expires_at: string;
  headers: Record<string, string>;
}

export interface CreateMediaMessageRequest {
  chat_id: string;
  media_ids: string[];
  caption?: string;
  reply_to_message_id?: string;
}

export interface MediaTransformation {
  media_id: string;
  transformation: 'compress' | 'resize' | 'convert' | 'watermark' | 'extract_audio';
  options?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
}

export interface MediaStats {
  total_media: number;
  total_size: number;
  by_type: Record<RichMediaType, number>;
  today_uploads: number;
  storage_used: number;
  storage_limit: number;
}

export const imRichMediaApi = {
  requestUpload: async (data: UploadMediaRequest): Promise<ApiResponse<UploadMediaResponse>> => {
    return apiClient.im.post('/im/media/upload-request', data);
  },

  completeUpload: async (
    mediaId: string,
    data: {
      width?: number;
      height?: number;
      duration?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<RichMedia>> => {
    return apiClient.im.post(`/im/media/${mediaId}/complete`, data);
  },

  listMedia: async (params?: {
    chat_id?: string;
    media_type?: RichMediaType;
    status?: MediaStatus;
  }): Promise<ApiResponse<PaginatedResponse<RichMedia>>> => {
    return apiClient.im.get('/im/media', { params });
  },

  getMedia: async (mediaId: string): Promise<ApiResponse<RichMedia>> => {
    return apiClient.im.get(`/im/media/${mediaId}`);
  },

  deleteMedia: async (mediaId: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/media/${mediaId}`);
  },

  downloadMedia: async (
    mediaId: string
  ): Promise<ApiResponse<{ download_url: string; filename: string }>> => {
    return apiClient.im.get(`/im/media/${mediaId}/download`);
  },

  createMediaMessage: async (
    data: CreateMediaMessageRequest
  ): Promise<
    ApiResponse<{
      message_ids: string[];
      media_ids: string[];
    }>
  > => {
    return apiClient.im.post('/im/media/message', data);
  },

  transformMedia: async (
    mediaId: string,
    transformation: MediaTransformation
  ): Promise<ApiResponse<MediaTransformation>> => {
    return apiClient.im.post(`/im/media/${mediaId}/transform`, transformation);
  },

  getMediaPreview: async (
    mediaId: string,
    quality?: MediaQuality
  ): Promise<
    ApiResponse<{
      preview_url: string;
      width: number;
      height: number;
      size: number;
    }>
  > => {
    return apiClient.im.get(`/im/media/${mediaId}/preview`, { params: { quality } });
  },

  batchDeleteMedia: async (mediaIds: string[]): Promise<ApiResponse<{ deleted_count: number }>> => {
    return apiClient.im.post('/im/media/batch-delete', { media_ids: mediaIds });
  },

  listChatMedia: async (
    chatId: string,
    mediaType?: RichMediaType
  ): Promise<ApiResponse<PaginatedResponse<RichMedia>>> => {
    return apiClient.im.get(`/im/chats/${chatId}/media`, { params: { media_type: mediaType } });
  },

  getMediaStats: async (): Promise<ApiResponse<MediaStats>> => {
    return apiClient.im.get('/im/media/stats');
  },

  getStorageInfo: async (): Promise<
    ApiResponse<{
      storage_used: number;
      storage_limit: number;
      storage_percentage: number;
      media_count: number;
    }>
  > => {
    return apiClient.im.get('/im/media/storage');
  },

  cleanupExpiredMedia: async (): Promise<
    ApiResponse<{ cleaned_count: number; freed_space: number }>
  > => {
    return apiClient.im.post('/im/media/cleanup');
  },
};
