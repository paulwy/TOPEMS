export {
  ApiResponse,
  User,
  LoginCredentials,
  Account,
  Voucher,
  InvoiceStatus,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ResponsiveProps,
  EmployeeFinance,
  ProjectFinance,
  Task,
  TaskPriority,
  TaskStatus,
  Event,
  DeviceInfo,
  DashboardStats,
  QuickAction,
} from '@topems/shared-types';

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
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
  updatedAt: string;
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
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  todayEvents: number;
  pendingApprovals: number;
  inventoryAlerts: number;
  productionAlerts: number;
};

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  action: string;
  badge?: number;
};