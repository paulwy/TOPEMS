import type { WorkflowDefinition } from './types';

const mockWorkflows: WorkflowDefinition[] = [
  {
    id: 'wf-001',
    name: '客户审批流程',
    description: '新增客户信息的审批流程',
    appId: 'app-001',
    status: 'published',
    version: '1.0.0',
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-20T14:30:00Z',
    definition: {
      nodes: [
        { id: 'start', type: 'start', name: '开始', x: 100, y: 100 },
        { id: 'apply', type: 'userTask', name: '提交申请', x: 300, y: 100, assignee: 'applicant' },
        { id: 'manager_approve', type: 'userTask', name: '经理审批', x: 500, y: 100, assignee: 'manager' },
        { id: 'end', type: 'end', name: '结束', x: 700, y: 100 },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'apply' },
        { id: 'e2', source: 'apply', target: 'manager_approve' },
        { id: 'e3', source: 'manager_approve', target: 'end' },
      ],
    },
  },
  {
    id: 'wf-002',
    name: '订单审批流程',
    description: '销售订单的多级审批流程',
    appId: 'app-001',
    status: 'published',
    version: '2.0.0',
    createdBy: 'admin',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-05-15T11:00:00Z',
    definition: {
      nodes: [
        { id: 'start', type: 'start', name: '开始', x: 100, y: 150 },
        { id: 'create_order', type: 'userTask', name: '创建订单', x: 300, y: 150, assignee: 'sales' },
        { id: 'sales_manager', type: 'userTask', name: '销售经理审批', x: 550, y: 100, assignee: 'sales_manager' },
        { id: 'finance_confirm', type: 'userTask', name: '财务确认', x: 550, y: 200, assignee: 'finance' },
        { id: 'end', type: 'end', name: '结束', x: 800, y: 150 },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'create_order' },
        { id: 'e2', source: 'create_order', target: 'sales_manager' },
        { id: 'e3', source: 'sales_manager', target: 'finance_confirm' },
        { id: 'e4', source: 'finance_confirm', target: 'end' },
      ],
    },
  },
  {
    id: 'wf-003',
    name: '入职审批流程',
    description: '员工入职审批流程',
    appId: 'app-002',
    status: 'draft',
    version: '0.1.0',
    createdBy: 'hr_admin',
    createdAt: '2024-05-20T10:00:00Z',
    updatedAt: '2024-06-25T16:00:00Z',
  },
  {
    id: 'wf-004',
    name: '采购申请流程',
    description: '采购申请的审批流程',
    appId: 'app-005',
    status: 'published',
    version: '1.2.0',
    createdBy: 'admin',
    createdAt: '2024-02-20T11:00:00Z',
    updatedAt: '2024-06-10T09:30:00Z',
    definition: {
      nodes: [
        { id: 'start', type: 'start', name: '开始', x: 100, y: 150 },
        { id: 'apply', type: 'userTask', name: '提交申请', x: 300, y: 150, assignee: 'applicant' },
        { id: 'dept_manager', type: 'userTask', name: '部门经理审批', x: 550, y: 100, assignee: 'dept_manager' },
        { id: 'purchase_manager', type: 'userTask', name: '采购经理审批', x: 550, y: 200, assignee: 'purchase_manager' },
        { id: 'end', type: 'end', name: '结束', x: 800, y: 150 },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'apply' },
        { id: 'e2', source: 'apply', target: 'dept_manager' },
        { id: 'e3', source: 'dept_manager', target: 'purchase_manager' },
        { id: 'e4', source: 'purchase_manager', target: 'end' },
      ],
    },
  },
];

export async function listWorkflows(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  appId?: string;
}) {
  let data = [...mockWorkflows];
  
  if (params?.search) {
    const search = params.search.toLowerCase();
    data = data.filter(w => 
      w.name.toLowerCase().includes(search) || 
      w.description?.toLowerCase().includes(search)
    );
  }
  
  if (params?.status) {
    data = data.filter(w => w.status === params.status);
  }

  if (params?.appId) {
    data = data.filter(w => w.appId === params.appId);
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = data.length;
  const start = (page - 1) * pageSize;
  const items = data.slice(start, start + pageSize);

  return {
    code: 0,
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function getWorkflow(id: string) {
  const workflow = mockWorkflows.find(w => w.id === id);
  return {
    code: 0,
    success: true,
    data: workflow,
    message: 'success',
    timestamp: new Date().toISOString(),
  };
}

export async function createWorkflow(data: Partial<WorkflowDefinition>) {
  const newWorkflow: WorkflowDefinition = {
    id: `wf-${Date.now()}`,
    name: data.name || '',
    description: data.description,
    appId: data.appId,
    status: 'draft',
    version: '0.1.0',
    definition: data.definition,
    createdBy: 'current_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockWorkflows.unshift(newWorkflow);
  return {
    code: 0,
    success: true,
    data: newWorkflow,
    message: '创建成功',
    timestamp: new Date().toISOString(),
  };
}

export async function updateWorkflow(id: string, data: Partial<WorkflowDefinition>) {
  const index = mockWorkflows.findIndex(w => w.id === id);
  if (index !== -1) {
    mockWorkflows[index] = {
      ...mockWorkflows[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return {
      code: 0,
      success: true,
      data: mockWorkflows[index],
      message: '更新成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '流程不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function deleteWorkflow(id: string) {
  const index = mockWorkflows.findIndex(w => w.id === id);
  if (index !== -1) {
    mockWorkflows.splice(index, 1);
    return {
      code: 0,
      success: true,
      data: null,
      message: '删除成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '流程不存在',
    timestamp: new Date().toISOString(),
  };
}

export async function publishWorkflow(id: string) {
  const workflow = mockWorkflows.find(w => w.id === id);
  if (workflow) {
    workflow.status = 'published';
    workflow.updatedAt = new Date().toISOString();
    return {
      code: 0,
      success: true,
      data: workflow,
      message: '发布成功',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    code: 404,
    success: false,
    data: null,
    message: '流程不存在',
    timestamp: new Date().toISOString(),
  };
}
