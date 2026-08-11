/**
 * Mobile · 媒体管理 API 绑定
 *
 * 后端: svc/mobile/src/modules/media.rs + photo_upload.rs
 * 路由（已注册 main.rs）:
 *   GET    /media/photos
 *   GET    /media/audio
 *   GET    /media/video
 *   POST   /media/upload/{file_type}
 *   DELETE /media/{file_type}/{id}
 *   POST   /photos/upload
 *   POST   /photos/batch-upload
 *   GET    /photos
 *   GET    /photos/{id}
 *   DELETE /photos/{id}
 *   GET    /photos/{id}/progress
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type FileType = 'photo' | 'audio' | 'video' | 'document';

export interface MediaFile {
  id: string;
  file_type: FileType;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  mime_type?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  created_by: string;
  created_at: string;
}

export interface UploadResponse {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
}

export interface BatchUploadResponse {
  uploaded: UploadResponse[];
  failed: { file_name: string; error: string }[];
}

export interface UploadProgress {
  upload_id: string;
  file_name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error_message?: string;
}

export const mediaApi = {
  listPhotos: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: MediaFile[]; total: number }>> => {
    return apiClient.mobile.get('/media/photos', { params });
  },

  listAudio: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: MediaFile[]; total: number }>> => {
    return apiClient.mobile.get('/media/audio', { params });
  },

  listVideo: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: MediaFile[]; total: number }>> => {
    return apiClient.mobile.get('/media/video', { params });
  },

  uploadMedia: async (
    fileType: FileType,
    formData: FormData
  ): Promise<ApiResponse<UploadResponse>> => {
    return apiClient.mobile.post(`/media/upload/${fileType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteMedia: async (fileType: FileType, id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.delete(`/media/${fileType}/${id}`);
  },

  uploadPhoto: async (formData: FormData): Promise<ApiResponse<UploadResponse>> => {
    return apiClient.mobile.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  batchUploadPhotos: async (formData: FormData): Promise<ApiResponse<BatchUploadResponse>> => {
    return apiClient.mobile.post('/photos/batch-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listPhotos_v2: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: MediaFile[]; total: number }>> => {
    return apiClient.mobile.get('/photos', { params });
  },

  getPhoto: async (id: string): Promise<ApiResponse<MediaFile>> => {
    return apiClient.mobile.get(`/photos/${id}`);
  },

  deletePhoto: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.delete(`/photos/${id}`);
  },

  getUploadProgress: async (id: string): Promise<ApiResponse<UploadProgress>> => {
    return apiClient.mobile.get(`/photos/${id}/progress`);
  },
};

export default mediaApi;
