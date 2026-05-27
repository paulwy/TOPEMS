export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface PatrolRecord {
  id: string;
  patrol_plan_id: string;
  patroller_id: string;
  patroller_name: string;
  patrol_type: 'routine' | 'emergency' | 'special';
  start_time: string;
  end_time?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
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
  task_name: string;
  task_type: 'inspection' | 'maintenance' | 'delivery' | 'collection' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string;
  assignee_name: string;
  location?: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  attachments?: string[];
  created_at: string;
  updated_at?: string;
}

export interface DashboardStats {
  todayPatrols: number;
  todayScans: number;
  pendingTasks: number;
  completedTasks: number;
}
