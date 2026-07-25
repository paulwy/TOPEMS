import apiClient from '../client';
import type { ApiResponse } from '../client';

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
  location_track: Array<{
    lat: number;
    lng: number;
    timestamp?: string;
  }>;
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

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  work_hours?: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'business_trip';
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  type: 'check_in' | 'check_out';
  created_at: string;
}

export interface AttendanceStats {
  today_status: 'not_checked_in' | 'checked_in' | 'checked_out';
  today_check_in?: string;
  today_check_out?: string;
  work_days_this_month: number;
  late_days_this_month: number;
  early_leave_days: number;
  absent_days: number;
  total_work_hours: number;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  user_name: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'funeral' | 'other';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

export interface CreateLeaveRequest {
  leave_type: LeaveApplication['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  batch_no?: string;
  expiry_date?: string;
  status: 'normal' | 'low_stock' | 'out_of_stock' | 'frozen';
  last_updated: string;
}

export interface StocktakeTask {
  id: string;
  title: string;
  warehouse: string;
  status: 'pending' | 'in_progress' | 'completed';
  total_items: number;
  counted_items: number;
  assignee: string;
  due_date: string;
  created_at: string;
}

export interface StocktakeRecord {
  id: string;
  task_id: string;
  item_id: string;
  item_name: string;
  sku: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  status: 'normal' | 'surplus' | 'shortage';
  counted_by: string;
  counted_at: string;
}

export interface InboundOrder {
  id: string;
  order_no: string;
  supplier: string;
  type: 'purchase' | 'return' | 'transfer';
  status: 'pending' | 'in_progress' | 'completed';
  total_items: number;
  total_quantity: number;
  expected_date: string;
  created_at: string;
}

export interface OutboundOrder {
  id: string;
  order_no: string;
  customer: string;
  type: 'sales' | 'transfer' | 'return';
  status: 'pending' | 'in_progress' | 'completed';
  total_items: number;
  total_quantity: number;
  expected_date: string;
  created_at: string;
}

export interface QualityTask {
  id: string;
  task_no: string;
  type: 'incoming' | 'process' | 'finished' | 'outgoing';
  product_name: string;
  batch_no: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  inspector: string;
  due_date: string;
  created_at: string;
}

export interface DefectRecord {
  id: string;
  task_id: string;
  product_name: string;
  batch_no: string;
  defect_type: string;
  severity: 'minor' | 'major' | 'critical';
  quantity: number;
  description: string;
  images?: string[];
  reporter: string;
  reported_at: string;
  status: 'open' | 'processing' | 'closed';
}

export interface CreateDefectRequest {
  task_id: string;
  defect_type: string;
  severity: DefectRecord['severity'];
  quantity: number;
  description: string;
  images?: string[];
}

export interface ProductionOrder {
  id: string;
  order_no: string;
  product_name: string;
  quantity: number;
  completed_quantity: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed';
  workstation: string;
  start_time?: string;
  end_time?: string;
  due_date: string;
  created_at: string;
}

export interface WorkReport {
  id: string;
  order_id: string;
  order_no: string;
  workstation: string;
  operator: string;
  quantity: number;
  good_quantity: number;
  bad_quantity: number;
  start_time: string;
  end_time: string;
  duration: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  equipment_no: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'maintenance' | 'fault';
  location: string;
  last_maintenance?: string;
  next_maintenance?: string;
  running_hours: number;
}

export interface PushNotification {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'approval' | 'task' | 'alert' | 'message';
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface PushConfig {
  enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface PushTemplate {
  id: string;
  name: string;
  type: 'system' | 'approval' | 'task' | 'reminder';
  title: string;
  body: string;
  enabled: boolean;
  status: 'active' | 'draft' | 'disabled';
}

export interface OfflineSyncStatus {
  last_sync_time?: string;
  pending_records: number;
  total_records: number;
  sync_status: 'idle' | 'syncing' | 'success' | 'failed';
  last_error?: string;
}

export interface ScanResult {
  code: string;
  type: 'barcode' | 'qrcode';
  format: string;
  entity_type?: 'product' | 'material' | 'equipment' | 'location' | 'order' | 'employee';
  entity_id?: string;
  entity_data?: Record<string, unknown>;
}

export interface MobileWorkbenchData {
  pending_tasks: number;
  pending_approvals: number;
  unread_notifications: number;
  today_attendance_status: 'not_checked_in' | 'checked_in' | 'checked_out';
  today_production_output: number;
  today_quality_pass_rate: number;
  shortcuts: {
    id: string;
    name: string;
    icon: string;
    path: string;
    color: string;
  }[];
}

export const mobileApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return apiClient.mobile.get<DashboardStats>('/mobile/dashboard/stats');
  },

  getWorkbenchData: async (): Promise<ApiResponse<MobileWorkbenchData>> => {
    return apiClient.mobile.get<MobileWorkbenchData>('/mobile/workbench');
  },

  listPatrolRecords: async (): Promise<ApiResponse<ListResponse<PatrolRecord>>> => {
    return apiClient.mobile.get<ListResponse<PatrolRecord>>('/mobile/patrol-records');
  },
  createPatrolRecord: async (
    data: CreatePatrolRecordRequest
  ): Promise<ApiResponse<PatrolRecord>> => {
    return apiClient.mobile.post<PatrolRecord>('/mobile/patrol-records', data);
  },

  listScanRecords: async (): Promise<ApiResponse<ListResponse<ScanRecord>>> => {
    return apiClient.mobile.get<ListResponse<ScanRecord>>('/mobile/scan-records');
  },
  createScanRecord: async (data: CreateScanRecordRequest): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.mobile.post<ScanRecord>('/mobile/scan-records', data);
  },
  scanCode: async (code: string): Promise<ApiResponse<ScanResult>> => {
    return apiClient.mobile.post<ScanResult>('/mobile/scan', { code });
  },

  listPhotoEvidences: async (): Promise<ApiResponse<ListResponse<PhotoEvidence>>> => {
    return apiClient.mobile.get<ListResponse<PhotoEvidence>>('/mobile/photo-evidences');
  },
  createPhotoEvidence: async (
    data: CreatePhotoEvidenceRequest
  ): Promise<ApiResponse<PhotoEvidence>> => {
    return apiClient.mobile.post<PhotoEvidence>('/mobile/photo-evidences', data);
  },

  listAudioRecordings: async (): Promise<ApiResponse<ListResponse<AudioRecording>>> => {
    return apiClient.mobile.get<ListResponse<AudioRecording>>('/mobile/audio-recordings');
  },
  createAudioRecording: async (
    data: CreateAudioRecordingRequest
  ): Promise<ApiResponse<AudioRecording>> => {
    return apiClient.mobile.post<AudioRecording>('/mobile/audio-recordings', data);
  },

  listVideoRecordings: async (): Promise<ApiResponse<ListResponse<VideoRecording>>> => {
    return apiClient.mobile.get<ListResponse<VideoRecording>>('/mobile/video-recordings');
  },
  createVideoRecording: async (
    data: CreateVideoRecordingRequest
  ): Promise<ApiResponse<VideoRecording>> => {
    return apiClient.mobile.post<VideoRecording>('/mobile/video-recordings', data);
  },

  listMobileTasks: async (params?: {
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<MobileTask>>> => {
    return apiClient.mobile.get<ListResponse<MobileTask>>('/mobile/mobile-tasks', { params });
  },
  createMobileTask: async (data: CreateMobileTaskRequest): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.post<MobileTask>('/mobile/mobile-tasks', data);
  },
  updateTaskStatus: async (id: string, status: string): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.put<MobileTask>(`/mobile/mobile-tasks/${id}/status`, { status });
  },

  getAttendanceStats: async (): Promise<ApiResponse<AttendanceStats>> => {
    return apiClient.mobile.get<AttendanceStats>('/attendance/stats');
  },
  listAttendanceRecords: async (params?: {
    month?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<AttendanceRecord>>> => {
    return apiClient.mobile.get<ListResponse<AttendanceRecord>>('/attendance/records', {
      params,
    });
  },
  checkIn: async (data: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post<AttendanceRecord>('/attendance/check-in', data);
  },
  checkOut: async (data: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post<AttendanceRecord>('/attendance/check-out', data);
  },
  listLeaveApplications: async (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<LeaveApplication>>> => {
    return apiClient.mobile.get<ListResponse<LeaveApplication>>('/attendance/leaves', {
      params,
    });
  },
  applyLeave: async (data: CreateLeaveRequest): Promise<ApiResponse<LeaveApplication>> => {
    return apiClient.mobile.post<LeaveApplication>('/attendance/leaves', data);
  },

  listInventoryItems: async (params?: {
    keyword?: string;
    category?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<InventoryItem>>> => {
    return apiClient.mobile.get<ListResponse<InventoryItem>>('/mobile/inventory/items', {
      params,
    });
  },
  getInventoryItem: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    return apiClient.mobile.get<InventoryItem>(`/mobile/inventory/items/${id}`);
  },
  listStocktakeTasks: async (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<StocktakeTask>>> => {
    return apiClient.mobile.get<ListResponse<StocktakeTask>>('/mobile/inventory/stocktake', {
      params,
    });
  },
  createStocktakeRecord: async (
    taskId: string,
    data: {
      item_id: string;
      actual_quantity: number;
    }
  ): Promise<ApiResponse<StocktakeRecord>> => {
    return apiClient.mobile.post<StocktakeRecord>(
      `/mobile/inventory/stocktake/${taskId}/records`,
      data
    );
  },
  listInboundOrders: async (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<InboundOrder>>> => {
    return apiClient.mobile.get<ListResponse<InboundOrder>>('/mobile/inventory/inbound', {
      params,
    });
  },
  listOutboundOrders: async (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<OutboundOrder>>> => {
    return apiClient.mobile.get<ListResponse<OutboundOrder>>('/mobile/inventory/outbound', {
      params,
    });
  },

  listQualityTasks: async (params?: {
    type?: string;
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<QualityTask>>> => {
    return apiClient.mobile.get<ListResponse<QualityTask>>('/mobile/quality/tasks', {
      params,
    });
  },
  getQualityTask: async (id: string): Promise<ApiResponse<QualityTask>> => {
    return apiClient.mobile.get<QualityTask>(`/mobile/quality/tasks/${id}`);
  },
  listDefectRecords: async (params?: {
    status?: string;
    severity?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<DefectRecord>>> => {
    return apiClient.mobile.get<ListResponse<DefectRecord>>('/mobile/quality/defects', {
      params,
    });
  },
  reportDefect: async (data: CreateDefectRequest): Promise<ApiResponse<DefectRecord>> => {
    return apiClient.mobile.post<DefectRecord>('/mobile/quality/defects', data);
  },
  updateQualityTaskStatus: async (
    id: string,
    status: string,
    result?: { passed: boolean; remark?: string }
  ): Promise<ApiResponse<QualityTask>> => {
    return apiClient.mobile.put<QualityTask>(`/mobile/quality/tasks/${id}/status`, {
      status,
      result,
    });
  },

  listProductionOrders: async (params?: {
    status?: string;
    workstation?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<ProductionOrder>>> => {
    return apiClient.mobile.get<ListResponse<ProductionOrder>>('/mobile/production/orders', {
      params,
    });
  },
  getProductionOrder: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
    return apiClient.mobile.get<ProductionOrder>(`/mobile/production/orders/${id}`);
  },
  listWorkReports: async (params?: {
    order_id?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<WorkReport>>> => {
    return apiClient.mobile.get<ListResponse<WorkReport>>('/mobile/production/work-reports', {
      params,
    });
  },
  submitWorkReport: async (data: {
    order_id: string;
    quantity: number;
    good_quantity: number;
    bad_quantity: number;
    start_time: string;
    end_time: string;
  }): Promise<ApiResponse<WorkReport>> => {
    return apiClient.mobile.post<WorkReport>('/mobile/production/work-reports', data);
  },
  listEquipment: async (params?: {
    status?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<Equipment>>> => {
    return apiClient.mobile.get<ListResponse<Equipment>>('/mobile/production/equipment', {
      params,
    });
  },

  getPushConfig: async (): Promise<ApiResponse<PushConfig>> => {
    return apiClient.mobile.get<PushConfig>('/mobile/push/config');
  },

  updatePushConfig: async (data: Partial<PushConfig>): Promise<ApiResponse<PushConfig>> => {
    return apiClient.mobile.put<PushConfig>('/mobile/push/config', data);
  },

  listPushTemplates: async (): Promise<ApiResponse<ListResponse<PushTemplate>>> => {
    return apiClient.mobile.get<ListResponse<PushTemplate>>('/mobile/push/templates');
  },

  updatePushTemplate: async (
    id: string,
    data: Partial<PushTemplate>
  ): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.mobile.put<PushTemplate>(`/mobile/push/templates/${id}`, data);
  },

  getOfflineSyncStatus: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.get<OfflineSyncStatus>('/mobile/offline/sync-status');
  },
  startOfflineSync: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.post<OfflineSyncStatus>('/mobile/offline/sync');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mobile.get<string>('/health');
  },
};

export default mobileApi;
