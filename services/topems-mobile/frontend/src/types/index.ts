export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

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

export interface ScanRecord {
  id: string;
  scan_type: 'equipment' | 'material' | 'location' | 'qr_code';
  scan_code: string;
  scanned_by: string;
  scanned_by_name: string;
  scan_time: string;
  location?: string;
  result?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MediaFile {
  id: string;
  file_name: string;
  file_type: 'photo' | 'audio' | 'video';
  file_url?: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  description?: string;
  tags?: string[];
  created_at: string;
}

export interface MobileTask {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  assignee?: string;
  location_lat?: number;
  location_lng?: number;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  todayPatrols: number;
  todayScans: number;
  pendingTasks: number;
  completedTasks: number;
}
