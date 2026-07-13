import type { ApiResponse, ApprovalTask } from '@/types';

const mockApprovalTasks: ApprovalTask[] = [
  {
    id: 'APR-001',
    title: '采购申请 - A4打印纸',
    description: '申请采购A4打印纸10箱，用于日常办公',
    type: 'purchase',
    status: 'pending',
    priority: 'high',
    applicantId: 'user-002',
    applicantName: '李四',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    dueDate: '2024-01-18T17:00:00Z',
  },
  {
    id: 'APR-002',
    title: '报销申请 - 差旅费',
    description: '北京出差差旅费报销，共计¥2,580',
    type: 'expense',
    status: 'pending',
    priority: 'medium',
    applicantId: 'user-003',
    applicantName: '王五',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    dueDate: '2024-01-19T17:00:00Z',
  },
  {
    id: 'APR-003',
    title: '请假申请 - 年假',
    description: '申请2024年度年假5天，计划2月1日至2月5日',
    type: 'leave',
    status: 'pending',
    priority: 'low',
    applicantId: 'user-004',
    applicantName: '赵六',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-14T14:00:00Z',
    dueDate: '2024-01-17T17:00:00Z',
  },
  {
    id: 'APR-004',
    title: '采购申请 - 办公设备',
    description: '申请采购新电脑5台，配置：MacBook Pro 14寸',
    type: 'purchase',
    status: 'approved',
    priority: 'high',
    applicantId: 'user-002',
    applicantName: '李四',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-13T11:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
  },
  {
    id: 'APR-005',
    title: '报销申请 - 招待费',
    description: '客户招待费用报销，共计¥1,200',
    type: 'expense',
    status: 'rejected',
    priority: 'medium',
    applicantId: 'user-005',
    applicantName: '孙七',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-12T09:30:00Z',
    updatedAt: '2024-01-13T15:00:00Z',
  },
  {
    id: 'APR-006',
    title: '采购申请 - 办公用品',
    description: '申请采购签字笔、文件夹等办公用品',
    type: 'purchase',
    status: 'pending',
    priority: 'medium',
    applicantId: 'user-006',
    applicantName: '周八',
    assigneeId: 'user-001',
    assigneeName: '张三',
    createdAt: '2024-01-15T14:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z',
    dueDate: '2024-01-20T17:00:00Z',
  },
];

export function mockGetApprovals(params: { page?: number; pageSize?: number; status?: string; type?: string }): ApiResponse<{ items: ApprovalTask[]; total: number }> {
  let filtered = [...mockApprovalTasks];
  
  if (params?.status) {
    filtered = filtered.filter(task => task.status === params.status);
  }
  
  if (params?.type) {
    filtered = filtered.filter(task => task.type === params.type);
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

export function mockGetTasks(params: { page?: number; pageSize?: number; status?: string; type?: string }): ApiResponse<{ items: ApprovalTask[]; total: number }> {
  return mockGetApprovals(params);
}

export function mockGetPendingTasks(): ApiResponse<ApprovalTask[]> {
  const pendingTasks = mockApprovalTasks.filter(task => task.status === 'pending');
  return { success: true, data: pendingTasks };
}

export function mockGetTaskById(id: string): ApiResponse<ApprovalTask> {
  const task = mockApprovalTasks.find(t => t.id === id);
  if (task) {
    return { success: true, data: task };
  }
  return { success: false, message: '审批任务不存在', data: {} as ApprovalTask };
}

export function mockApproveApproval(id: string, _data?: { comment?: string }): ApiResponse<ApprovalTask> {
  const task = mockApprovalTasks.find(t => t.id === id);
  if (task) {
    return {
      success: true,
      data: {
        ...task,
        status: 'approved',
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return { success: false, message: '审批任务不存在', data: {} as ApprovalTask };
}

export function mockApprove(id: string, data?: { comment?: string }): ApiResponse<ApprovalTask> {
  return mockApproveApproval(id, data);
}

export function mockRejectApproval(id: string, _data?: { comment?: string }): ApiResponse<ApprovalTask> {
  const task = mockApprovalTasks.find(t => t.id === id);
  if (task) {
    return {
      success: true,
      data: {
        ...task,
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return { success: false, message: '审批任务不存在', data: {} as ApprovalTask };
}

export function mockReject(id: string, data?: { comment?: string }): ApiResponse<ApprovalTask> {
  return mockRejectApproval(id, data);
}

export function mockDelegate(id: string, data: { userId: string; reason?: string }): ApiResponse<ApprovalTask> {
  const task = mockApprovalTasks.find(t => t.id === id);
  if (task) {
    return {
      success: true,
      data: {
        ...task,
        assigneeId: data.userId,
        assigneeName: '新审批人',
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return { success: false, message: '审批任务不存在', data: {} as ApprovalTask };
}

export function mockGetHistory(params: { page?: number; pageSize?: number }): ApiResponse<{ items: ApprovalTask[]; total: number }> {
  const historyTasks = mockApprovalTasks.filter(task => task.status !== 'pending');
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    data: {
      items: historyTasks.slice(start, end),
      total: historyTasks.length,
    },
  };
}