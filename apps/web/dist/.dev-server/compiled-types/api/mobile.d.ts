import type { ApiResponse } from "./client";
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
export declare const mobileApi: {
    getDashboardStats: () => Promise<ApiResponse<DashboardStats>>;
    listPatrolRecords: () => Promise<ApiResponse<ListResponse<PatrolRecord>>>;
    createPatrolRecord: (data: CreatePatrolRecordRequest) => Promise<ApiResponse<PatrolRecord>>;
    listScanRecords: () => Promise<ApiResponse<ListResponse<ScanRecord>>>;
    createScanRecord: (data: CreateScanRecordRequest) => Promise<ApiResponse<ScanRecord>>;
    listPhotoEvidences: () => Promise<ApiResponse<ListResponse<PhotoEvidence>>>;
    createPhotoEvidence: (data: CreatePhotoEvidenceRequest) => Promise<ApiResponse<PhotoEvidence>>;
    listAudioRecordings: () => Promise<ApiResponse<ListResponse<AudioRecording>>>;
    createAudioRecording: (data: CreateAudioRecordingRequest) => Promise<ApiResponse<AudioRecording>>;
    listVideoRecordings: () => Promise<ApiResponse<ListResponse<VideoRecording>>>;
    createVideoRecording: (data: CreateVideoRecordingRequest) => Promise<ApiResponse<VideoRecording>>;
    listMobileTasks: () => Promise<ApiResponse<ListResponse<MobileTask>>>;
    createMobileTask: (data: CreateMobileTaskRequest) => Promise<ApiResponse<MobileTask>>;
    updateTaskStatus: (id: string, status: string) => Promise<ApiResponse<MobileTask>>;
    health: () => Promise<ApiResponse<string>>;
};
