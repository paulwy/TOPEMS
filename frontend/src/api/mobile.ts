import apiClient from './client';
import type { ApiResponse } from './client';

export interface PatrolRecord {
  id: string;
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  patrol_type: string;
  status: string;
  checked_by: string;
  checked_at: string;
  created_at: string;
}

export interface CreatePatrolRecordRequest {
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  patrol_type: string;
  status?: string;
  checked_by: string;
}

export interface ScanRecord {
  id: string;
  barcode: string;
  location: [number, number];
  item_type: string;
  quantity?: number;
  operator: string;
  scanned_at: string;
  created_at: string;
}

export interface CreateScanRecordRequest {
  barcode: string;
  location: [number, number];
  item_type: string;
  quantity?: number;
  operator: string;
}

export interface PhotoEvidence {
  id: string;
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

export interface CreatePhotoEvidenceRequest {
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  file_url?: string;
  recorded_by: string;
}

export interface AudioRecording {
  id: string;
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  duration_seconds?: number;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateAudioRecordingRequest {
  title: string;
  description?: string;
  location: [number, number];
  address?: string;
  duration_seconds?: number;
  file_url?: string;
  recorded_by: string;
}

export interface VideoRecording {
  id: string;
  title: string;
  description?: string;
  start_location: [number, number];
  location_track: [number, number][];
  duration_seconds?: number;
  file_url?: string;
  thumbnail_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

export interface CreateVideoRecordingRequest {
  title: string;
  description?: string;
  start_location: [number, number];
  duration_seconds?: number;
  file_url?: string;
  thumbnail_url?: string;
  recorded_by: string;
}

export interface MobileTask {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  assignee: string;
  location?: [number, number];
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMobileTaskRequest {
  title: string;
  description?: string;
  task_type: string;
  priority?: string;
  assignee: string;
  location?: [number, number];
  due_date?: string;
}

export const mobileApi = {
  listPatrolRecords: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/patrol-records');
  },
  createPatrolRecord: async (data: CreatePatrolRecordRequest): Promise<ApiResponse<PatrolRecord>> => {
    return apiClient.mobile.post<PatrolRecord>('/api/v1/patrol-records', data);
  },

  listScanRecords: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/scan-records');
  },
  createScanRecord: async (data: CreateScanRecordRequest): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.mobile.post<ScanRecord>('/api/v1/scan-records', data);
  },

  listPhotoEvidences: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/photo-evidences');
  },
  createPhotoEvidence: async (data: CreatePhotoEvidenceRequest): Promise<ApiResponse<PhotoEvidence>> => {
    return apiClient.mobile.post<PhotoEvidence>('/api/v1/photo-evidences', data);
  },

  listAudioRecordings: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/audio-recordings');
  },
  createAudioRecording: async (data: CreateAudioRecordingRequest): Promise<ApiResponse<AudioRecording>> => {
    return apiClient.mobile.post<AudioRecording>('/api/v1/audio-recordings', data);
  },

  listVideoRecordings: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/video-recordings');
  },
  createVideoRecording: async (data: CreateVideoRecordingRequest): Promise<ApiResponse<VideoRecording>> => {
    return apiClient.mobile.post<VideoRecording>('/api/v1/video-recordings', data);
  },

  listMobileTasks: async (): Promise<ApiResponse<any>> => {
    return apiClient.mobile.get<any>('/api/v1/mobile-tasks');
  },
  createMobileTask: async (data: CreateMobileTaskRequest): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.post<MobileTask>('/api/v1/mobile-tasks', data);
  },
  updateTaskStatus: async (id: string, status: string): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.put<MobileTask>(`/api/v1/mobile-tasks/${id}/status`, { status });
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mobile.get<string>('/health');
  },
};
