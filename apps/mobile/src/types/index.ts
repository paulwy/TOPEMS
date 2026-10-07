// 与 @topems/shared-types 形状一致的类型改为共享包单一信源（薄壳），
// 避免本地重复定义。
// - ApiResponse：复用共享 HTTP 信封（success/message/data/timestamp），仅把 code
//   放宽为可选——mobile 的离线/同步合成响应不带 code（见 src/api/offline.ts）。
// - LoginCredentials：与共享 LoginRequest 形状一致（username + password），保留旧导出名。
// 其余 mobile 业务模型（camelCase UI 态，含 User 的 name/roles/full_name 等别名）
// 与共享包 dist 形状不同，保留本地定义（差异见交付说明）。
import type { ApiResponse as SharedApiResponse, LoginRequest } from '@topems/shared-types';

export type ApiResponse<T> = Omit<SharedApiResponse<T>, 'code'> & {
  code?: number;
};

/** 登录入参：与共享包 LoginRequest 形状一致（username + password），保留旧导出名。 */
export type LoginCredentials = LoginRequest;

export type User = {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  name?: string;
  isActive: boolean;
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

export type Customer = {
  id: string;
  name: string;
  code?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  industry?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
