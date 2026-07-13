import type { ApiResponse, DashboardStats, QuickAction, Event, Task } from '@/types';

const mockStats: DashboardStats = {
  todayPatrols: 5,
  todayScans: 12,
  pendingTasks: 3,
  completedTasks: 8,
};

const mockQuickActions: QuickAction[] = [
  { id: '1', label: '扫码入库', icon: 'scan', action: 'scan_inbound', badge: 2 },
  { id: '2', label: '扫码出库', icon: 'scan', action: 'scan_outbound' },
  { id: '3', label: '快速审批', icon: 'check', action: 'quick_approval', badge: 4 },
  { id: '4', label: '发起采购', icon: 'shopping-cart', action: 'create_purchase' },
];

const mockEvents: Event[] = [
  { id: '1', title: '部门周会', description: '每周例会', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T11:00:00Z', location: '会议室A', eventType: 'meeting', status: 'confirmed', organizerId: 'user-001', organizerName: '张三', createdAt: '2024-01-10T09:00:00Z', updatedAt: '2024-01-10T09:00:00Z' },
  { id: '2', title: '客户拜访', description: '拜访阿里巴巴', startTime: '2024-01-16T14:00:00Z', endTime: '2024-01-16T17:00:00Z', location: '杭州', eventType: 'customer', status: 'confirmed', organizerId: 'user-001', organizerName: '张三', createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z' },
  { id: '3', title: '系统培训', description: '新系统使用培训', startTime: '2024-01-17T09:00:00Z', endTime: '2024-01-17T12:00:00Z', location: '培训室', eventType: 'training', status: 'confirmed', organizerId: 'user-002', organizerName: '李四', createdAt: '2024-01-11T14:00:00Z', updatedAt: '2024-01-11T14:00:00Z' },
];

const mockRecentTasks: Task[] = [
  { id: 'TSK-001', title: '月度库存盘点', description: '完成仓库A的月度库存盘点', taskType: 'inventory', priority: 'high', status: 'in_progress', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-20T17:00:00Z', createdAt: '2024-01-10T09:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
  { id: 'TSK-002', title: '提交周报', description: '提交本周工作周报', taskType: 'report', priority: 'medium', status: 'pending', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-19T17:00:00Z', createdAt: '2024-01-15T09:00:00Z', updatedAt: '2024-01-15T09:00:00Z' },
  { id: 'TSK-006', title: '会议准备', description: '准备下周部门会议资料', taskType: 'meeting', priority: 'medium', status: 'pending', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-22T17:00:00Z', createdAt: '2024-01-15T14:00:00Z', updatedAt: '2024-01-15T14:00:00Z' },
];

export function mockGetStats(): ApiResponse<DashboardStats> {
  return { success: true, data: mockStats };
}

export function mockGetQuickActions(): ApiResponse<QuickAction[]> {
  return { success: true, data: mockQuickActions };
}

export function mockGetRecentEvents(): ApiResponse<Event[]> {
  return { success: true, data: mockEvents };
}

export function mockGetRecentTasks(): ApiResponse<Task[]> {
  return { success: true, data: mockRecentTasks };
}