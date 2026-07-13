import type { ApiResponse, Task } from '@/types';

const mockTasks: Task[] = [
  { id: 'TSK-001', title: '月度库存盘点', description: '完成仓库A的月度库存盘点工作', taskType: 'inventory', priority: 'high', status: 'in_progress', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-20T17:00:00Z', createdAt: '2024-01-10T09:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
  { id: 'TSK-002', title: '提交周报', description: '提交本周工作周报', taskType: 'report', priority: 'medium', status: 'pending', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-19T17:00:00Z', createdAt: '2024-01-15T09:00:00Z', updatedAt: '2024-01-15T09:00:00Z' },
  { id: 'TSK-003', title: '客户回访', description: '回访腾讯科技，了解使用情况', taskType: 'customer', priority: 'medium', status: 'pending', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-18T17:00:00Z', createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z' },
  { id: 'TSK-004', title: '系统升级', description: '协助IT部门完成系统升级测试', taskType: 'system', priority: 'high', status: 'completed', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-12T17:00:00Z', createdAt: '2024-01-08T09:00:00Z', updatedAt: '2024-01-12T17:00:00Z', completedAt: '2024-01-12T17:00:00Z' },
  { id: 'TSK-005', title: '整理文档', description: '整理采购流程文档', taskType: 'document', priority: 'low', status: 'completed', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-11T17:00:00Z', createdAt: '2024-01-05T09:00:00Z', updatedAt: '2024-01-11T17:00:00Z', completedAt: '2024-01-11T17:00:00Z' },
  { id: 'TSK-006', title: '会议准备', description: '准备下周部门会议资料', taskType: 'meeting', priority: 'medium', status: 'pending', assigneeId: 'user-001', assigneeName: '张三', dueDate: '2024-01-22T17:00:00Z', createdAt: '2024-01-15T14:00:00Z', updatedAt: '2024-01-15T14:00:00Z' },
];

export function mockGetTasks(params: { page?: number; pageSize?: number; status?: string; priority?: string; taskType?: string }): ApiResponse<{ items: Task[]; total: number }> {
  let filtered = [...mockTasks];
  
  if (params?.status) {
    filtered = filtered.filter(task => task.status === params.status);
  }
  
  if (params?.priority) {
    filtered = filtered.filter(task => task.priority === params.priority);
  }
  
  if (params?.taskType) {
    filtered = filtered.filter(task => task.taskType === params.taskType);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    data: {
      items: filtered.slice(start, end),
      total: filtered.length,
    },
  };
}

export function mockGetTaskById(id: string): ApiResponse<Task> {
  const task = mockTasks.find(t => t.id === id);
  if (task) {
    return { success: true, data: task };
  }
  return { success: false, message: '任务不存在', data: {} as Task };
}

export function mockCreateTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>): ApiResponse<Task> {
  return {
    success: true,
    data: {
      ...data,
      id: 'TSK-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function mockUpdateTask(id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>>): ApiResponse<Task> {
  const task = mockTasks.find(t => t.id === id);
  if (task) {
    return {
      success: true,
      data: {
        ...task,
        ...data,
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return { success: false, message: '任务不存在', data: {} as Task };
}

export function mockDeleteTask(_id: string): ApiResponse<void> {
  return { success: true, data: undefined as any };
}

export function mockGetPendingTasks(): ApiResponse<Task[]> {
  const pendingTasks = mockTasks.filter(task => task.status === 'pending');
  return { success: true, data: pendingTasks };
}