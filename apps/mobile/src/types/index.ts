

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  code?: number;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at?: string;
  roles: string[];
  permissions: string[];
  phone?: string;
  avatar?: string;
  departmentId?: string;
  departmentName?: string;
  status?: 'active' | 'inactive' | 'locked';
  createdAt?: string;
  updatedAt?: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  taskType: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  locationLat?: number;
  locationLng?: number;
};

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type Event = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  status: string;
  organizerId: string;
  organizerName?: string;
  attendees?: Array<{
    userId: string;
    userName: string;
    status: 'accepted' | 'declined' | 'pending';
  }>;
  createdAt: string;
  updatedAt: string;
};

export type DeviceInfo = {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android';
  deviceModel?: string;
  appVersion?: string;
  osVersion?: string;
  isActive: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  todayPatrols: number;
  todayScans: number;
  pendingTasks: number;
  completedTasks: number;
};

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  action: string;
  badge?: number;
};

export type Approval = ApprovalTask;

export type ApprovalTask = {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  applicantId: string;
  applicantName?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName?: string;
  checkInTime: string;
  checkOutTime?: string;
  date?: string;
  locationLat?: number;
  locationLng?: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'overtime';
  createdAt: string;
  updatedAt: string;
};

export type AttendanceStats = {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  overtimeHours: number;
  attendanceDays?: number;
  lateCount?: number;
  earlyLeaveCount?: number;
  absentCount?: number;
};

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  module?: string;
  entityId?: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  title: string;
  description?: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
};

export type OfflineSyncRecord = {
  id: string;
  module: string;
  action: string;
  data: Record<string, unknown>;
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrder = {
  id: string;
  code: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
};
