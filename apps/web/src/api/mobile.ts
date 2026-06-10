import apiClient from './client';
import type { ApiResponse } from './client';

export interface PatrolRecord {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
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
  location_lat: number;
  location_lng: number;
  address?: string;
  patrol_type: string;
  status?: string;
  checked_by: string;
}

export interface ScanRecord {
  id: string;
  barcode: string;
  location_lat: number;
  location_lng: number;
  item_type: string;
  quantity?: number;
  operator: string;
  scanned_at: string;
  created_at: string;
}

export interface CreateScanRecordRequest {
  barcode: string;
  location_lat: number;
  location_lng: number;
  item_type: string;
  quantity?: number;
  operator: string;
}

export interface PhotoEvidence {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

export interface CreatePhotoEvidenceRequest {
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  file_url?: string;
  recorded_by: string;
}

export interface AudioRecording {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
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
  location_lat: number;
  location_lng: number;
  address?: string;
  duration_seconds?: number;
  file_url?: string;
  recorded_by: string;
}

export interface VideoRecording {
  id: string;
  title: string;
  description?: string;
  start_location_lat: number;
  start_location_lng: number;
  location_track: any;
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
  start_location_lat: number;
  start_location_lng: number;
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
  location_lat?: number;
  location_lng?: number;
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
  location_lat?: number;
  location_lng?: number;
  due_date?: string;
}

export interface DashboardStats {
  today_patrols: number;
  today_scans: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export const mobileApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return apiClient.mobile.get<DashboardStats>('/api/v1/dashboard/stats');
  },

  listPatrolRecords: async (): Promise<ApiResponse<ListResponse<PatrolRecord>>> => {
    return apiClient.mobile.get<ListResponse<PatrolRecord>>('/api/v1/patrol-records');
  },
  createPatrolRecord: async (data: CreatePatrolRecordRequest): Promise<ApiResponse<PatrolRecord>> => {
    return apiClient.mobile.post<PatrolRecord>('/api/v1/patrol-records', data);
  },

  listScanRecords: async (): Promise<ApiResponse<ListResponse<ScanRecord>>> => {
    return apiClient.mobile.get<ListResponse<ScanRecord>>('/api/v1/scan-records');
  },
  createScanRecord: async (data: CreateScanRecordRequest): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.mobile.post<ScanRecord>('/api/v1/scan-records', data);
  },

  listPhotoEvidences: async (): Promise<ApiResponse<ListResponse<PhotoEvidence>>> => {
    return apiClient.mobile.get<ListResponse<PhotoEvidence>>('/api/v1/photo-evidences');
  },
  createPhotoEvidence: async (data: CreatePhotoEvidenceRequest): Promise<ApiResponse<PhotoEvidence>> => {
    return apiClient.mobile.post<PhotoEvidence>('/api/v1/photo-evidences', data);
  },

  listAudioRecordings: async (): Promise<ApiResponse<ListResponse<AudioRecording>>> => {
    return apiClient.mobile.get<ListResponse<AudioRecording>>('/api/v1/audio-recordings');
  },
  createAudioRecording: async (data: CreateAudioRecordingRequest): Promise<ApiResponse<AudioRecording>> => {
    return apiClient.mobile.post<AudioRecording>('/api/v1/audio-recordings', data);
  },

  listVideoRecordings: async (): Promise<ApiResponse<ListResponse<VideoRecording>>> => {
    return apiClient.mobile.get<ListResponse<VideoRecording>>('/api/v1/video-recordings');
  },
  createVideoRecording: async (data: CreateVideoRecordingRequest): Promise<ApiResponse<VideoRecording>> => {
    return apiClient.mobile.post<VideoRecording>('/api/v1/video-recordings', data);
  },

  listMobileTasks: async (): Promise<ApiResponse<ListResponse<MobileTask>>> => {
    return apiClient.mobile.get<ListResponse<MobileTask>>('/api/v1/mobile-tasks');
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
