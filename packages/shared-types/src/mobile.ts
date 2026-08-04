export interface DashboardStats {
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  pending_approvals: number;
  overdue_tasks: number;
  today_attendance: number;
  this_week_tasks: number;
  this_month_tasks: number;
}

export interface Task {
  id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  assignee: string;
  assignee_id?: string;
  location_lat?: number;
  location_lng?: number;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  event_type: string;
  attendees?: string[];
  status?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  tenant_id?: string;
  user_id: string;
  user_name?: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  location_lat?: number;
  location_lng?: number;
  remarks?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id?: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  min_stock?: number;
  max_stock?: number;
  location?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrder {
  id: string;
  tenant_id?: string;
  orderNo: string;
  product_name: string;
  product_code: string;
  quantity: number;
  status: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  tenant_id?: string;
  title: string;
  body: string;
  notification_type: string;
  data?: Record<string, unknown>;
  read: boolean;
  target_type?: string;
  created_at: string;
}

export interface ApprovalTask {
  id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  approval_type: string;
  status: string;
  task_name?: string;
  task_id?: string;
  priority?: string;
  due_date?: string;
  assignee_name?: string;
  assignee_id?: string;
  applicant_name?: string;
  applicant_id?: string;
  created_at: string;
}

export interface QuickAction {
  id: string;
  code: string;
  name: string;
  icon: string;
  path: string;
  module?: string;
  sort_order?: number;
}

export interface OfflineSyncRecord {
  id: string;
  tenant_id?: string;
  operation_type: string;
  entity_type: string;
  entity_id: string;
  operation_data: Record<string, unknown>;
  sync_status: string;
  sync_attempts?: number;
  last_sync_error?: string;
  created_at: string;
  synced_at?: string;
}

export interface DeviceInfo {
  id: string;
  tenant_id?: string;
  device_token: string;
  platform: string;
  device_model?: string;
  app_version?: string;
  os_version?: string;
  isActive?: boolean;
  created_at: string;
  updated_at: string;
}